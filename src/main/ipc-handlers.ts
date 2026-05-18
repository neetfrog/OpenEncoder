import { ipcMain, dialog, app, BrowserWindow, Menu, clipboard, shell } from 'electron';
import Store from 'electron-store';
import { probeFile, encodeFile, buildOutputPath, cancelJob, cancelAllJobs } from './ffmpeg-service';
import {
  validateFilePathForEncoding,
  validateEncodePayload,
  withErrorHandling,
} from './ipc-security';
import type { AppSettings, EncodeStartPayload } from '../shared/types';
import { IPC } from '../shared/types';

// ─── Persistent store ─────────────────────────────────────────────────────────

const store = new Store<AppSettings>({
  defaults: {
    outputDir: '',
    concurrentJobs: 2,
    theme: 'dark',
    autoStart: false,
    customPresets: [],
  },
});

// ─── Job queue ────────────────────────────────────────────────────────────────

interface QueuedJob {
  id: string;
  inputPath: string;
  outputDir: string;
  presetId: string;
  preset: import('../shared/types').Preset;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
  hwAccel?: import('../shared/types').HardwareAcceleration;
}

const pendingQueue: QueuedJob[] = [];
let activeCount = 0;

function getMaxConcurrent(): number {
  return (store.get('concurrentJobs') as number) || 2;
}

function drainQueue(win: BrowserWindow): void {
  while (activeCount < getMaxConcurrent() && pendingQueue.length > 0) {
    const job = pendingQueue.shift()!;
    activeCount++;

    const outputPath = buildOutputPath(job.inputPath, job.outputDir, job.preset);

    encodeFile(
      job.id,
      job.inputPath,
      outputPath,
      job.preset,
      job.duration,
      job.trimStart,
      job.trimEnd,
      job.hwAccel,
      {
        onProgress: (payload) => win.webContents.send(IPC.ENCODE_PROGRESS, payload),
        onComplete: (payload) => {
          activeCount--;
          win.webContents.send(IPC.ENCODE_COMPLETE, payload);
          drainQueue(win);
        },
        onError: (payload) => {
          activeCount--;
          win.webContents.send(IPC.ENCODE_ERROR, payload);
          drainQueue(win);
        },
      }
    );
  }
}

// ─── Register all handlers ────────────────────────────────────────────────────

export function registerIpcHandlers(): void {
  // Probe a media file
  ipcMain.handle(
    IPC.PROBE,
    withErrorHandling(async (_event, filePath: string) => {
      validateFilePathForEncoding(filePath);
      return await probeFile(filePath);
    }, 'PROBE')
  );

  // Start encoding jobs
  ipcMain.handle(
    IPC.ENCODE_START,
    withErrorHandling(async (event, payload: EncodeStartPayload) => {
      validateEncodePayload(payload);
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;

      for (const job of payload.jobs) {
        let duration = 0;
        try {
          const info = await probeFile(job.inputPath);
          duration = info.duration;
        } catch {
          // proceed with 0 duration (progress will fall back to timemark)
        }

        pendingQueue.push({
          id: job.id,
          inputPath: job.inputPath,
          outputDir: job.outputDir,
          presetId: job.preset.id,
          preset: job.preset,
          duration,
          trimStart: job.trimStart,
          trimEnd: job.trimEnd,
          hwAccel: job.hwAccel,
        });
      }

      drainQueue(win);
    }, 'ENCODE_START')
  );

  // Cancel a single job
  ipcMain.handle(IPC.ENCODE_CANCEL, async (_event, jobId: string) => {
    cancelJob(jobId);
    // Remove from pending queue too
    const idx = pendingQueue.findIndex((j) => j.id === jobId);
    if (idx !== -1) pendingQueue.splice(idx, 1);
  });

  // Cancel all
  ipcMain.handle(IPC.ENCODE_CANCEL_ALL, async () => {
    cancelAllJobs();
    pendingQueue.length = 0;
    activeCount = 0;
  });

  // Open file dialog
  ipcMain.handle(IPC.DIALOG_OPEN_FILES, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: 'Add Media Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Media Files',
          extensions: [
            'mp4',
            'mov',
            'mkv',
            'avi',
            'wmv',
            'flv',
            'webm',
            'm4v',
            'ts',
            'mts',
            'm2ts',
            'mxf',
            'r3d',
            'braw',
            'mp3',
            'aac',
            'flac',
            'wav',
            'ogg',
            'opus',
            'm4a',
            'wma',
            'gif',
            'apng',
          ],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // Open folder dialog
  ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Output Folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Show a job-specific context menu
  ipcMain.handle(
    IPC.SHOW_JOB_CONTEXT_MENU,
    async (event, jobId: string, jobStatus: string, filePath: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return null;

      let selectedAction: 'remove' | 'cancel' | 'copyPath' | 'reveal' | null = null;
      const menu = Menu.buildFromTemplate([
        {
          label: 'Copy file path',
          click: () => {
            clipboard.writeText(filePath);
            selectedAction = 'copyPath';
          },
        },
        {
          label: 'Reveal in Explorer',
          click: () => {
            shell.showItemInFolder(filePath);
            selectedAction = 'reveal';
          },
        },
        { type: 'separator' },
        jobStatus === 'encoding'
          ? {
              label: 'Cancel encoding',
              click: () => {
                selectedAction = 'cancel';
              },
            }
          : {
              label: 'Remove from queue',
              click: () => {
                selectedAction = 'remove';
              },
            },
      ]);

      return new Promise<typeof selectedAction>((resolve) => {
        menu.popup({
          window: win,
          callback: () => resolve(selectedAction),
        });
      });
    }
  );

  // Show a message dialog with error details
  ipcMain.handle(
    IPC.DIALOG_SHOW_MESSAGE,
    async (_event, title: string, message: string, detail?: string) => {
      const result = await dialog.showMessageBox({
        type: 'error',
        title,
        message,
        detail: detail ?? '',
        buttons: ['Copy error', 'OK'],
        defaultId: 1,
        cancelId: 1,
      });

      if (result.response === 0) {
        clipboard.writeText(detail ? `${message}\n\n${detail}` : message);
      }
    }
  );

  // Persistent store
  ipcMain.handle(IPC.STORE_GET, (_event, key: string) => store.get(key));
  ipcMain.handle(IPC.STORE_SET, (_event, key: string, value: unknown) => store.set(key, value));

  // App version
  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion());
}
