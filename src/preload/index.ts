import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/types';
import type {
  MediaInfo,
  EncodeStartPayload,
  EncodeProgressPayload,
  EncodeCompletePayload,
  EncodeErrorPayload,
} from '../shared/types';

// ─── Expose typed API to renderer ─────────────────────────────────────────────

const api = {
  // Probe
  probe: (filePath: string): Promise<MediaInfo> => ipcRenderer.invoke(IPC.PROBE, filePath),

  // Encoding
  encodeStart: (payload: EncodeStartPayload): Promise<void> =>
    ipcRenderer.invoke(IPC.ENCODE_START, payload),
  encodeCancel: (jobId: string): Promise<void> => ipcRenderer.invoke(IPC.ENCODE_CANCEL, jobId),
  encodeCancelAll: (): Promise<void> => ipcRenderer.invoke(IPC.ENCODE_CANCEL_ALL),

  // Events
  onEncodeProgress: (cb: (payload: EncodeProgressPayload) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: EncodeProgressPayload) => cb(payload);
    ipcRenderer.on(IPC.ENCODE_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.ENCODE_PROGRESS, handler);
  },
  onEncodeComplete: (cb: (payload: EncodeCompletePayload) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: EncodeCompletePayload) => cb(payload);
    ipcRenderer.on(IPC.ENCODE_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC.ENCODE_COMPLETE, handler);
  },
  onEncodeError: (cb: (payload: EncodeErrorPayload) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: EncodeErrorPayload) => cb(payload);
    ipcRenderer.on(IPC.ENCODE_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.ENCODE_ERROR, handler);
  },

  // Dialogs
  openFiles: (): Promise<string[]> => ipcRenderer.invoke(IPC.DIALOG_OPEN_FILES),
  openFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER),

  // Store
  storeGet: (key: string): Promise<unknown> => ipcRenderer.invoke(IPC.STORE_GET, key),
  storeSet: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.STORE_SET, key, value),

  // App
  appVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_VERSION),
  showErrorDialog: (title: string, message: string, detail?: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DIALOG_SHOW_MESSAGE, title, message, detail),
  showJobContextMenu: (
    jobId: string,
    jobStatus: string,
    filePath: string
  ): Promise<'remove' | 'cancel' | 'copyPath' | 'reveal' | null> =>
    ipcRenderer.invoke(IPC.SHOW_JOB_CONTEXT_MENU, jobId, jobStatus, filePath),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (cb: (maximized: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, maximized: boolean) => cb(maximized);
    ipcRenderer.on('window:maximized', handler);
    return () => ipcRenderer.removeListener('window:maximized', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
