// ─── Media Info ───────────────────────────────────────────────────────────────

export type HardwareAcceleration = 'auto' | 'none' | 'nvenc' | 'qsv' | 'amf';

export interface MediaInfo {
  path: string;
  fileName: string;
  duration: number; // seconds
  size: number; // bytes
  format: string;
  // Video
  width?: number;
  height?: number;
  fps?: number;
  videoBitrate?: number;
  videoCodec?: string;
  // Audio
  audioBitrate?: number;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  thumbnail?: string;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export type PresetCategory = 'video' | 'audio' | 'image';

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  icon?: string;
  format: string;
  container: string;
  // Video
  videoCodec?: string;
  videoBitrate?: string;
  crf?: number;
  width?: number;
  height?: number;
  fps?: number;
  preset?: string; // ffmpeg preset (ultrafast, fast, medium, slow, etc.)
  hwAccel?: HardwareAcceleration;
  // Audio
  audioCodec?: string;
  audioBitrate?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  // Advanced
  extraArgs?: string[];
  isCustom?: boolean;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'encoding' | 'done' | 'error' | 'cancelled';

export interface EncodeJob {
  id: string;
  inputPath: string;
  outputPath: string;
  outputDir: string;
  preset: Preset;
  status: JobStatus;
  progress: number; // 0–100
  currentFps?: number;
  currentBitrate?: string;
  eta?: number; // seconds remaining
  timemark?: string;
  error?: string;
  errorDetails?: string;
  log?: string;
  mediaInfo?: MediaInfo;
  trimStart?: number;
  trimEnd?: number;
  addedAt: number; // timestamp
  startedAt?: number;
  finishedAt?: number;
}

// ─── IPC Channels ─────────────────────────────────────────────────────────────

export const IPC = {
  PROBE: 'ffprobe:analyze',
  ENCODE_START: 'encode:start',
  ENCODE_CANCEL: 'encode:cancel',
  ENCODE_CANCEL_ALL: 'encode:cancelAll',
  ENCODE_PROGRESS: 'encode:progress',
  ENCODE_COMPLETE: 'encode:complete',
  ENCODE_ERROR: 'encode:error',
  DIALOG_OPEN_FILES: 'dialog:openFiles',
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',
  DIALOG_SHOW_MESSAGE: 'dialog:showMessage',
  SHOW_JOB_CONTEXT_MENU: 'contextMenu:job',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  APP_VERSION: 'app:version',
} as const;

// ─── Store Schema ─────────────────────────────────────────────────────────────

export interface AppSettings {
  outputDir: string;
  concurrentJobs: number;
  theme: 'dark' | 'darker';
  autoStart: boolean;
  hwAccel: HardwareAcceleration;
  customPresets: Preset[];
}

// ─── IPC Payload Types ────────────────────────────────────────────────────────

export interface EncodeStartPayload {
  jobs: Array<{
    id: string;
    inputPath: string;
    outputDir: string;
    preset: Preset;
    trimStart?: number;
    trimEnd?: number;
    hwAccel?: HardwareAcceleration;
  }>;
}

export interface EncodeProgressPayload {
  jobId: string;
  percent: number;
  currentFps: number;
  currentBitrate: string;
  timemark: string;
  eta: number;
}

export interface EncodeCompletePayload {
  jobId: string;
  outputPath: string;
  log?: string;
}

export interface EncodeErrorPayload {
  jobId: string;
  error: string;
  details?: string;
  log?: string;
}
