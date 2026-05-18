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
const os = require("os");
const crypto = require("crypto");
const url = require("url");
function resolveBinaryPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1] ?? "";
}
function resolveFfmpegPath() {
  const executable = typeof ffmpegPath === "string" ? ffmpegPath : "";
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(
      path.join(
        process.resourcesPath,
        "ffmpeg-static",
        process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
      )
    );
  }
  candidates.push(executable);
  return resolveBinaryPath(candidates);
}
function resolveFfprobePath() {
  const executable = typeof ffprobePath === "string" ? ffprobePath : ffprobePath?.path ?? "";
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(
      path.join(
        process.resourcesPath,
        "ffprobe-static",
        "bin",
        process.platform,
        process.arch,
        process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
      )
    );
  }
  candidates.push(executable);
  return resolveBinaryPath(candidates);
}
ffmpeg.setFfmpegPath(resolveFfmpegPath());
ffmpeg.setFfprobePath(resolveFfprobePath());
const imageExtensions = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".avif"]);
function isImageFile(filePath) {
  return imageExtensions.has(path.parse(filePath).ext.toLowerCase());
}
async function generateThumbnail(filePath) {
  if (isImageFile(filePath)) {
    return url.pathToFileURL(filePath).href;
  }
  const fileName = `mediaforge-thumb-${crypto.randomUUID()}.png`;
  const outputPath = path.join(os.tmpdir(), fileName);
  return new Promise((resolve) => {
    ffmpeg(filePath).seekInput(1).outputOptions(["-frames:v 1"]).size("240x?").output(outputPath).on("end", async () => {
      try {
        const buffer = await fs.promises.readFile(outputPath);
        await fs.promises.unlink(outputPath).catch(() => {
        });
        resolve(`data:image/png;base64,${buffer.toString("base64")}`);
      } catch {
        resolve(void 0);
      }
    }).on("error", async () => {
      await fs.promises.unlink(outputPath).catch(() => {
      });
      resolve(void 0);
    }).run();
  });
}
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
      generateThumbnail(filePath).catch(() => void 0).then((thumbnail) => {
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
          audioSampleRate: audioStream?.sample_rate ? parseInt(String(audioStream.sample_rate), 10) : void 0,
          thumbnail
        });
      });
    });
  });
}
function buildOutputPath(inputPath, outputDir, preset) {
  const { name } = path.parse(inputPath);
  const resolvedDir = outputDir || path.dirname(inputPath);
  return path.join(resolvedDir, `${name}_${preset.id}.${preset.container}`);
}
function resolveHardwareEncoder(videoCodec, hwAccel) {
  if (!videoCodec || !hwAccel || hwAccel === "none" || hwAccel === "auto") {
    return videoCodec;
  }
  const normalized = videoCodec.toLowerCase();
  if (hwAccel === "nvenc") {
    if (normalized.includes("264")) return "h264_nvenc";
    if (normalized.includes("265") || normalized.includes("hevc")) return "hevc_nvenc";
  }
  if (hwAccel === "qsv") {
    if (normalized.includes("264")) return "h264_qsv";
    if (normalized.includes("265") || normalized.includes("hevc")) return "hevc_qsv";
  }
  if (hwAccel === "amf") {
    if (normalized.includes("264")) return "h264_amf";
    if (normalized.includes("265") || normalized.includes("hevc")) return "hevc_amf";
  }
  return videoCodec;
}
function encodeFile(jobId, inputPath, outputPath, preset, duration, trimStart, trimEnd, hwAccel, callbacks) {
  let cmd = ffmpeg(inputPath);
  const encoderCodec = resolveHardwareEncoder(preset.videoCodec, hwAccel ?? preset.hwAccel);
  const startOffset = trimStart && trimStart > 0 ? trimStart : 0;
  const endOffset = trimEnd && trimEnd > startOffset ? trimEnd : void 0;
  const effectiveDuration = endOffset !== void 0 ? Math.max(0, endOffset - startOffset) : Math.max(0, duration - startOffset);
  if (startOffset > 0) {
    cmd = cmd.seekInput(startOffset);
  }
  if (effectiveDuration > 0 && (startOffset > 0 || endOffset !== void 0)) {
    cmd = cmd.duration(effectiveDuration);
  }
  if (encoderCodec) {
    cmd = cmd.videoCodec(encoderCodec);
    if (preset.crf !== void 0 && encoderCodec !== "gif") {
      cmd = cmd.outputOptions([`-crf ${preset.crf}`]);
    }
    if (preset.videoBitrate && preset.videoBitrate !== "0") {
      cmd = cmd.videoBitrate(preset.videoBitrate);
    }
    if (preset.preset) {
      cmd = cmd.outputOptions([`-preset ${preset.preset}`]);
    }
    if (preset.width && preset.height) {
      cmd = cmd.outputOptions([
        `-vf scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`
      ]);
    } else if (preset.width) {
      cmd = cmd.outputOptions([
        `-vf scale=${preset.width}:-2,pad=ceil(iw/2)*2:ceil(ih/2)*2`
      ]);
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
  } else if (!encoderCodec) {
    cmd = cmd.noAudio();
  }
  if (preset.extraArgs && preset.extraArgs.length > 0) {
    cmd = cmd.outputOptions(preset.extraArgs);
  }
  cmd = cmd.format(preset.container);
  cmd = cmd.outputOptions(["-y"]);
  let stderrLog = "";
  cmd.on("stderr", (line) => {
    stderrLog += `${line}
`;
  });
  const startTime = Date.now();
  cmd.on("progress", (progress) => {
    const trackDuration = effectiveDuration > 0 ? effectiveDuration : duration;
    let percent = progress.percent ?? 0;
    if ((percent <= 0 || percent > 100) && progress.timemark && trackDuration > 0) {
      const parts = progress.timemark.split(":").map(Number);
      const secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      percent = Math.min(100, secs / trackDuration * 100);
    }
    const elapsed = (Date.now() - startTime) / 1e3;
    const remaining = trackDuration > 0 && percent > 0 && elapsed > 0 ? Math.round((100 - percent) / percent * elapsed) : 0;
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
    callbacks.onComplete({ jobId, outputPath, log: stderrLog.trim() || void 0 });
  });
  cmd.on("error", (err) => {
    activeJobs.delete(jobId);
    if (err.message.includes("SIGKILL") || err.message.includes("ffmpeg was killed")) {
      return;
    }
    const extraDetails = stderrLog.trim() || (err.stderr ? String(err.stderr).trim() : "") || (err.output ? String(err.output).trim() : "");
    callbacks.onError({
      jobId,
      error: err.message,
      details: extraDetails || void 0,
      log: stderrLog.trim() || void 0
    });
  });
  cmd.save(outputPath);
  activeJobs.set(jobId, { cmd, startTime });
}
function cancelJob(jobId) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.cmd.kill("SIGKILL");
    activeJobs.delete(jobId);
  }
}
function cancelAllJobs() {
  for (const [id, job] of activeJobs) {
    job.cmd.kill("SIGKILL");
    activeJobs.delete(id);
  }
}
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  if (filePath.includes("..")) return false;
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
function validateDirPath(dirPath) {
  if (!dirPath || typeof dirPath !== "string") return false;
  if (dirPath.includes("..")) return false;
  try {
    return fs.existsSync(dirPath);
  } catch {
    return false;
  }
}
function sanitizePathForLogging(filePath) {
  return filePath.split(/[\\/]/).pop() || "unknown";
}
function withErrorHandling(handler, name) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`IPC Error in ${name}:`, message);
      throw err;
    }
  };
}
function validateFilePathForEncoding(filePath) {
  if (!validateFilePath(filePath)) {
    throw new Error(`Invalid file path: ${sanitizePathForLogging(filePath)}`);
  }
}
function validateOutputDirectory(dirPath) {
  if (dirPath && !validateDirPath(dirPath)) {
    throw new Error(`Invalid output directory: ${sanitizePathForLogging(dirPath)}`);
  }
}
function validateEncodePayload(payload) {
  if (!Array.isArray(payload.jobs) || payload.jobs.length === 0) {
    throw new Error("Invalid encode payload: empty jobs array");
  }
  for (const job of payload.jobs) {
    if (!job.id || typeof job.id !== "string") {
      throw new Error("Invalid job: missing or invalid id");
    }
    if (!job.inputPath || typeof job.inputPath !== "string") {
      throw new Error(`Invalid job ${job.id}: missing or invalid inputPath`);
    }
    validateFilePathForEncoding(job.inputPath);
    if (job.outputDir !== void 0 && typeof job.outputDir !== "string") {
      throw new Error(`Invalid job ${job.id}: outputDir must be a string`);
    }
    if (job.outputDir) {
      validateOutputDirectory(job.outputDir);
    }
    if (job.trimStart !== void 0) {
      if (typeof job.trimStart !== "number" || !Number.isFinite(job.trimStart) || job.trimStart < 0) {
        throw new Error(`Invalid job ${job.id}: trimStart must be a non-negative number`);
      }
    }
    if (job.trimEnd !== void 0) {
      if (typeof job.trimEnd !== "number" || !Number.isFinite(job.trimEnd) || job.trimEnd <= 0) {
        throw new Error(`Invalid job ${job.id}: trimEnd must be a positive number`);
      }
      if (job.trimStart !== void 0 && job.trimEnd <= job.trimStart) {
        throw new Error(`Invalid job ${job.id}: trimEnd must be greater than trimStart`);
      }
    }
    if (job.hwAccel !== void 0) {
      if (job.hwAccel !== "auto" && job.hwAccel !== "none" && job.hwAccel !== "nvenc" && job.hwAccel !== "qsv" && job.hwAccel !== "amf") {
        throw new Error(`Invalid job ${job.id}: unknown hwAccel value`);
      }
    }
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
  DIALOG_SHOW_MESSAGE: "dialog:showMessage",
  SHOW_JOB_CONTEXT_MENU: "contextMenu:job",
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
        }
      }
    );
  }
}
function registerIpcHandlers() {
  electron.ipcMain.handle(
    IPC.PROBE,
    withErrorHandling(async (_event, filePath) => {
      validateFilePathForEncoding(filePath);
      return await probeFile(filePath);
    }, "PROBE")
  );
  electron.ipcMain.handle(
    IPC.ENCODE_START,
    withErrorHandling(async (event, payload) => {
      validateEncodePayload(payload);
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
          duration,
          trimStart: job.trimStart,
          trimEnd: job.trimEnd,
          hwAccel: job.hwAccel
        });
      }
      drainQueue(win);
    }, "ENCODE_START")
  );
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
  electron.ipcMain.handle(
    IPC.SHOW_JOB_CONTEXT_MENU,
    async (event, jobId, jobStatus, filePath) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (!win) return null;
      let selectedAction = null;
      const menu = electron.Menu.buildFromTemplate([
        {
          label: "Copy file path",
          click: () => {
            electron.clipboard.writeText(filePath);
            selectedAction = "copyPath";
          }
        },
        {
          label: "Reveal in Explorer",
          click: () => {
            electron.shell.showItemInFolder(filePath);
            selectedAction = "reveal";
          }
        },
        { type: "separator" },
        jobStatus === "encoding" ? {
          label: "Cancel encoding",
          click: () => {
            selectedAction = "cancel";
          }
        } : {
          label: "Remove from queue",
          click: () => {
            selectedAction = "remove";
          }
        }
      ]);
      return new Promise((resolve) => {
        menu.popup({
          window: win,
          callback: () => resolve(selectedAction)
        });
      });
    }
  );
  electron.ipcMain.handle(
    IPC.DIALOG_SHOW_MESSAGE,
    async (_event, title, message, detail) => {
      const result = await electron.dialog.showMessageBox({
        type: "error",
        title,
        message,
        detail: detail ?? "",
        buttons: ["Copy error", "OK"],
        defaultId: 1,
        cancelId: 1
      });
      if (result.response === 0) {
        electron.clipboard.writeText(detail ? `${message}

${detail}` : message);
      }
    }
  );
  electron.ipcMain.handle(IPC.STORE_GET, (_event, key) => store.get(key));
  electron.ipcMain.handle(IPC.STORE_SET, (_event, key, value) => store.set(key, value));
  electron.ipcMain.handle(IPC.APP_VERSION, () => electron.app.getVersion());
}
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  if (process.env.NODE_ENV === "development") {
    console.error(error.stack);
  }
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
function setupErrorHandling() {
  electron.app.on("renderer-process-crashed", (event, webContents, killed) => {
    console.error(`Renderer process crashed. Killed: ${killed}`);
  });
}
electron.app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
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
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      allowRunningInsecureContent: false
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
  setupErrorHandling();
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
