"use strict";
const electron = require("electron");
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
const api = {
  // Probe
  probe: (filePath) => electron.ipcRenderer.invoke(IPC.PROBE, filePath),
  // Encoding
  encodeStart: (payload) => electron.ipcRenderer.invoke(IPC.ENCODE_START, payload),
  encodeCancel: (jobId) => electron.ipcRenderer.invoke(IPC.ENCODE_CANCEL, jobId),
  encodeCancelAll: () => electron.ipcRenderer.invoke(IPC.ENCODE_CANCEL_ALL),
  // Events
  onEncodeProgress: (cb) => {
    const handler = (_, payload) => cb(payload);
    electron.ipcRenderer.on(IPC.ENCODE_PROGRESS, handler);
    return () => electron.ipcRenderer.removeListener(IPC.ENCODE_PROGRESS, handler);
  },
  onEncodeComplete: (cb) => {
    const handler = (_, payload) => cb(payload);
    electron.ipcRenderer.on(IPC.ENCODE_COMPLETE, handler);
    return () => electron.ipcRenderer.removeListener(IPC.ENCODE_COMPLETE, handler);
  },
  onEncodeError: (cb) => {
    const handler = (_, payload) => cb(payload);
    electron.ipcRenderer.on(IPC.ENCODE_ERROR, handler);
    return () => electron.ipcRenderer.removeListener(IPC.ENCODE_ERROR, handler);
  },
  // Dialogs
  openFiles: () => electron.ipcRenderer.invoke(IPC.DIALOG_OPEN_FILES),
  openFolder: () => electron.ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER),
  // Store
  storeGet: (key) => electron.ipcRenderer.invoke(IPC.STORE_GET, key),
  storeSet: (key, value) => electron.ipcRenderer.invoke(IPC.STORE_SET, key, value),
  // App
  appVersion: () => electron.ipcRenderer.invoke(IPC.APP_VERSION),
  // Window controls
  windowMinimize: () => electron.ipcRenderer.send("window:minimize"),
  windowMaximize: () => electron.ipcRenderer.send("window:maximize"),
  windowClose: () => electron.ipcRenderer.send("window:close"),
  windowIsMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
  onWindowMaximized: (cb) => {
    const handler = (_, maximized) => cb(maximized);
    electron.ipcRenderer.on("window:maximized", handler);
    return () => electron.ipcRenderer.removeListener("window:maximized", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
