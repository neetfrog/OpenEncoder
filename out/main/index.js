"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const Store = require("electron-store");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static");
const fs = require("fs");
function resolveFfmpegPath() {
  const resourcesPath = process.resourcesPath;
  const candidates = [
    path.join(resourcesPath, "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
    ffmpegPath
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return ffmpegPath;
}
function resolveFfprobePath() {
  const resourcesPath = process.resourcesPath;
  const bin = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
  const candidates = [
    path.join(resourcesPath, "ffprobe-static", "bin", process.platform, process.arch, bin),
    ffprobePath.path
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return ffprobePath.path;
}
ffmpeg.setFfmpegPath(resolveFfmpegPath());
ffmpeg.setFfprobePath(resolveFfprobePath());
const activeJobs = /* @__PURE__ */ new Map();
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const videoStream = data.streams.find((s) => s.codec_type === "video");
      const audioStream = data.streams.find((s) => s.codec_type === "audio");
      const format = data.format;
      const fps = videoStream?.r_frame_rate ? (() => {
        const parts = videoStream.r_frame_rate.split("/");
        return parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : void 0;
      })() : void 0;
      resolve({
        path: filePath,
        fileName: path.basename(filePath),
        duration: parseFloat(String(format.duration ?? "0")),
        size: parseInt(String(format.size ?? "0"), 10),
        format: format.format_long_name ?? format.format_name ?? "",
        width: videoStream?.width,
        height: videoStream?.height,
        fps: fps ? Math.round(fps * 100) / 100 : void 0,
        videoBitrate: videoStream?.bit_rate ? parseInt(String(videoStream.bit_rate), 10) : void 0,
        videoCodec: videoStream?.codec_name,
        audioBitrate: audioStream?.bit_rate ? parseInt(String(audioStream.bit_rate), 10) : void 0,
        audioCodec: audioStream?.codec_name,
        audioChannels: audioStream?.channels,
        audioSampleRate: audioStream?.sample_rate ? parseInt(String(audioStream.sample_rate), 10) : void 0
      });
    });
  });
}
function buildOutputPath(inputPath, outputDir, preset) {
  const { name } = path.parse(inputPath);
  const resolvedDir = outputDir || path.dirname(inputPath);
  return path.join(resolvedDir, `${name}_${preset.id}.${preset.container}`);
}
function encodeFile(jobId, inputPath, outputPath, preset, duration, callbacks) {
  let cmd = ffmpeg(inputPath);
  if (preset.videoCodec) {
    cmd = cmd.videoCodec(preset.videoCodec);
    if (preset.crf !== void 0 && preset.videoCodec !== "gif") {
      cmd = cmd.outputOptions([`-crf ${preset.crf}`]);
    }
    if (preset.videoBitrate && preset.videoBitrate !== "0") {
      cmd = cmd.videoBitrate(preset.videoBitrate);
    }
    if (preset.preset) {
      cmd = cmd.outputOptions([`-preset ${preset.preset}`]);
    }
    if (preset.width && preset.height) {
      cmd = cmd.outputOptions([`-vf scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease`]);
    } else if (preset.width) {
      cmd = cmd.outputOptions([`-vf scale=${preset.width}:-2`]);
    }
    if (preset.fps) {
      cmd = cmd.fps(preset.fps);
    }
  } else if (preset.category === "audio") {
    cmd = cmd.noVideo();
  }
  if (preset.audioCodec) {
    cmd = cmd.audioCodec(preset.audioCodec);
    if (preset.audioBitrate) cmd = cmd.audioBitrate(preset.audioBitrate);
    if (preset.audioSampleRate) cmd = cmd.audioFrequency(preset.audioSampleRate);
    if (preset.audioChannels) cmd = cmd.audioChannels(preset.audioChannels);
  } else if (!preset.videoCodec) {
    cmd = cmd.noAudio();
  }
  if (preset.extraArgs && preset.extraArgs.length > 0) {
    cmd = cmd.outputOptions(preset.extraArgs);
  }
  cmd = cmd.format(preset.container);
  cmd.on("progress", (progress) => {
    let percent = progress.percent ?? 0;
    if ((percent <= 0 || percent > 100) && progress.timemark && duration > 0) {
      const parts = progress.timemark.split(":").map(Number);
      const secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      percent = Math.min(100, secs / duration * 100);
    }
    const remaining = duration > 0 && percent > 0 ? Math.round((100 - percent) / percent * (Date.now() / 1e3)) : 0;
    callbacks.onProgress({
      jobId,
      percent: Math.round(percent * 10) / 10,
      currentFps: progress.currentFps ?? 0,
      currentBitrate: progress.currentKbps ? `${progress.currentKbps}kbps` : "—",
      timemark: progress.timemark ?? "00:00:00",
      eta: remaining
    });
  });
  cmd.on("end", () => {
    activeJobs.delete(jobId);
    callbacks.onComplete({ jobId, outputPath });
  });
  cmd.on("error", (err) => {
    activeJobs.delete(jobId);
    if (err.message.includes("SIGKILL") || err.message.includes("ffmpeg was killed")) {
      return;
    }
    callbacks.onError({ jobId, error: err.message });
  });
  cmd.save(outputPath);
  activeJobs.set(jobId, cmd);
}
function cancelJob(jobId) {
  const cmd = activeJobs.get(jobId);
  if (cmd) {
    cmd.kill("SIGKILL");
    activeJobs.delete(jobId);
  }
}
function cancelAllJobs() {
  for (const [id, cmd] of activeJobs) {
    cmd.kill("SIGKILL");
    activeJobs.delete(id);
  }
}
const IPC = {
  PROBE: "ffprobe:analyze",
  ENCODE_START: "encode:start",
  ENCODE_CANCEL: "encode:cancel",
  ENCODE_CANCEL_ALL: "encode:cancelAll",
  ENCODE_PROGRESS: "encode:progress",
  ENCODE_COMPLETE: "encode:complete",
  ENCODE_ERROR: "encode:error",
  DIALOG_OPEN_FILES: "dialog:openFiles",
  DIALOG_OPEN_FOLDER: "dialog:openFolder",
  STORE_GET: "store:get",
  STORE_SET: "store:set",
  APP_VERSION: "app:version"
};
const store = new Store({
  defaults: {
    outputDir: "",
    concurrentJobs: 2,
    theme: "dark",
    autoStart: false,
    customPresets: []
  }
});
const pendingQueue = [];
let activeCount = 0;
function getMaxConcurrent() {
  return store.get("concurrentJobs") || 2;
}
function drainQueue(win) {
  while (activeCount < getMaxConcurrent() && pendingQueue.length > 0) {
    const job = pendingQueue.shift();
    activeCount++;
    const outputPath = buildOutputPath(job.inputPath, job.outputDir, job.preset);
    encodeFile(job.id, job.inputPath, outputPath, job.preset, job.duration, {
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
      }
    });
  }
}
function registerIpcHandlers() {
  electron.ipcMain.handle(IPC.PROBE, async (_event, filePath) => {
    try {
      return await probeFile(filePath);
    } catch (err) {
      throw new Error(err.message);
    }
  });
  electron.ipcMain.handle(IPC.ENCODE_START, async (event, payload) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    for (const job of payload.jobs) {
      let duration = 0;
      try {
        const info = await probeFile(job.inputPath);
        duration = info.duration;
      } catch {
      }
      pendingQueue.push({
        id: job.id,
        inputPath: job.inputPath,
        outputDir: job.outputDir,
        presetId: job.preset.id,
        preset: job.preset,
        duration
      });
    }
    drainQueue(win);
  });
  electron.ipcMain.handle(IPC.ENCODE_CANCEL, async (_event, jobId) => {
    cancelJob(jobId);
    const idx = pendingQueue.findIndex((j) => j.id === jobId);
    if (idx !== -1) pendingQueue.splice(idx, 1);
  });
  electron.ipcMain.handle(IPC.ENCODE_CANCEL_ALL, async () => {
    cancelAllJobs();
    pendingQueue.length = 0;
    activeCount = 0;
  });
  electron.ipcMain.handle(IPC.DIALOG_OPEN_FILES, async (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showOpenDialog(win, {
      title: "Add Media Files",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Media Files",
          extensions: [
            "mp4",
            "mov",
            "mkv",
            "avi",
            "wmv",
            "flv",
            "webm",
            "m4v",
            "ts",
            "mts",
            "m2ts",
            "mxf",
            "r3d",
            "braw",
            "mp3",
            "aac",
            "flac",
            "wav",
            "ogg",
            "opus",
            "m4a",
            "wma",
            "gif",
            "apng"
          ]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return result.canceled ? [] : result.filePaths;
  });
  electron.ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showOpenDialog(win, {
      title: "Select Output Folder",
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle(IPC.STORE_GET, (_event, key) => store.get(key));
  electron.ipcMain.handle(IPC.STORE_SET, (_event, key, value) => store.set(key, value));
  electron.ipcMain.handle(IPC.APP_VERSION, () => electron.app.getVersion());
}
exports.mainWindow = null;
function createWindow() {
  exports.mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  exports.mainWindow.on("ready-to-show", () => {
    exports.mainWindow.show();
  });
  exports.mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  electron.ipcMain.on("window:minimize", () => exports.mainWindow?.minimize());
  electron.ipcMain.on("window:maximize", () => {
    if (exports.mainWindow?.isMaximized()) {
      exports.mainWindow.unmaximize();
    } else {
      exports.mainWindow?.maximize();
    }
  });
  electron.ipcMain.on("window:close", () => exports.mainWindow?.close());
  electron.ipcMain.handle("window:isMaximized", () => exports.mainWindow?.isMaximized() ?? false);
  exports.mainWindow.on("maximize", () => exports.mainWindow?.webContents.send("window:maximized", true));
  exports.mainWindow.on("unmaximize", () => exports.mainWindow?.webContents.send("window:maximized", false));
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    exports.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    exports.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.mediaforge.app");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
