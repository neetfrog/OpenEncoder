import type { Preset } from './types'

export const BUILT_IN_PRESETS: Preset[] = [
  // ─── Video: H.264 ───────────────────────────────────────────────────────────
  {
    id: 'h264-1080p',
    name: 'H.264 1080p',
    description: 'High compatibility, 1920×1080, great for web & streaming',
    category: 'video',
    format: 'H.264',
    container: 'mp4',
    videoCodec: 'libx264',
    crf: 23,
    preset: 'medium',
    width: 1920,
    height: 1080,
    audioCodec: 'aac',
    audioBitrate: '192k'
  },
  {
    id: 'h264-720p',
    name: 'H.264 720p',
    description: 'Balanced quality and size at 1280×720',
    category: 'video',
    format: 'H.264',
    container: 'mp4',
    videoCodec: 'libx264',
    crf: 23,
    preset: 'medium',
    width: 1280,
    height: 720,
    audioCodec: 'aac',
    audioBitrate: '128k'
  },
  {
    id: 'h264-4k',
    name: 'H.264 4K',
    description: 'Ultra HD 3840×2160, high quality',
    category: 'video',
    format: 'H.264',
    container: 'mp4',
    videoCodec: 'libx264',
    crf: 20,
    preset: 'slow',
    width: 3840,
    height: 2160,
    audioCodec: 'aac',
    audioBitrate: '256k'
  },
  {
    id: 'h264-source',
    name: 'H.264 (Source Size)',
    description: 'H.264 keeping original resolution',
    category: 'video',
    format: 'H.264',
    container: 'mp4',
    videoCodec: 'libx264',
    crf: 23,
    preset: 'medium',
    audioCodec: 'aac',
    audioBitrate: '192k'
  },
  // ─── Video: H.265 / HEVC ────────────────────────────────────────────────────
  {
    id: 'h265-1080p',
    name: 'H.265 1080p',
    description: 'Efficient HEVC at 1080p — half the size of H.264',
    category: 'video',
    format: 'H.265',
    container: 'mp4',
    videoCodec: 'libx265',
    crf: 28,
    preset: 'medium',
    width: 1920,
    height: 1080,
    audioCodec: 'aac',
    audioBitrate: '192k',
    extraArgs: ['-tag:v', 'hvc1']
  },
  {
    id: 'h265-4k',
    name: 'H.265 4K',
    description: 'Efficient HEVC ultra HD — ideal for archiving 4K content',
    category: 'video',
    format: 'H.265',
    container: 'mp4',
    videoCodec: 'libx265',
    crf: 24,
    preset: 'slow',
    width: 3840,
    height: 2160,
    audioCodec: 'aac',
    audioBitrate: '256k',
    extraArgs: ['-tag:v', 'hvc1']
  },
  // ─── Video: WebM / VP9 ──────────────────────────────────────────────────────
  {
    id: 'webm-1080p',
    name: 'WebM VP9 1080p',
    description: 'Open format for the web — excellent quality',
    category: 'video',
    format: 'VP9',
    container: 'webm',
    videoCodec: 'libvpx-vp9',
    crf: 33,
    videoBitrate: '0',
    width: 1920,
    height: 1080,
    audioCodec: 'libopus',
    audioBitrate: '192k'
  },
  {
    id: 'webm-720p',
    name: 'WebM VP9 720p',
    description: 'Optimized web video at 720p',
    category: 'video',
    format: 'VP9',
    container: 'webm',
    videoCodec: 'libvpx-vp9',
    crf: 33,
    videoBitrate: '0',
    width: 1280,
    height: 720,
    audioCodec: 'libopus',
    audioBitrate: '128k'
  },
  // ─── Video: ProRes ──────────────────────────────────────────────────────────
  {
    id: 'prores-422',
    name: 'Apple ProRes 422',
    description: 'Professional editing codec — high quality, large files',
    category: 'video',
    format: 'ProRes 422',
    container: 'mov',
    videoCodec: 'prores_ks',
    audioCodec: 'pcm_s16le',
    extraArgs: ['-profile:v', '2']
  },
  {
    id: 'prores-4444',
    name: 'Apple ProRes 4444',
    description: 'Highest quality ProRes with alpha support',
    category: 'video',
    format: 'ProRes 4444',
    container: 'mov',
    videoCodec: 'prores_ks',
    audioCodec: 'pcm_s16le',
    extraArgs: ['-profile:v', '4']
  },
  // ─── Video: AV1 ─────────────────────────────────────────────────────────────
  {
    id: 'av1-1080p',
    name: 'AV1 1080p',
    description: 'Next-gen codec — smallest files, slow to encode',
    category: 'video',
    format: 'AV1',
    container: 'mp4',
    videoCodec: 'libaom-av1',
    crf: 30,
    videoBitrate: '0',
    width: 1920,
    height: 1080,
    audioCodec: 'libopus',
    audioBitrate: '192k'
  },
  // ─── Video: GIF ─────────────────────────────────────────────────────────────
  {
    id: 'gif',
    name: 'Animated GIF',
    description: 'Looping animation — 480px wide, 15fps',
    category: 'video',
    format: 'GIF',
    container: 'gif',
    videoCodec: 'gif',
    width: 480,
    fps: 15,
    extraArgs: ['-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse']
  },
  // ─── Audio ──────────────────────────────────────────────────────────────────
  {
    id: 'mp3-320',
    name: 'MP3 320kbps',
    description: 'High-quality MP3 — wide compatibility',
    category: 'audio',
    format: 'MP3',
    container: 'mp3',
    audioCodec: 'libmp3lame',
    audioBitrate: '320k',
    audioSampleRate: 44100
  },
  {
    id: 'mp3-192',
    name: 'MP3 192kbps',
    description: 'Standard quality MP3',
    category: 'audio',
    format: 'MP3',
    container: 'mp3',
    audioCodec: 'libmp3lame',
    audioBitrate: '192k',
    audioSampleRate: 44100
  },
  {
    id: 'aac-256',
    name: 'AAC 256kbps',
    description: 'High-quality AAC — ideal for Apple devices',
    category: 'audio',
    format: 'AAC',
    container: 'm4a',
    audioCodec: 'aac',
    audioBitrate: '256k',
    audioSampleRate: 44100
  },
  {
    id: 'flac',
    name: 'FLAC Lossless',
    description: 'Lossless audio compression — perfect quality',
    category: 'audio',
    format: 'FLAC',
    container: 'flac',
    audioCodec: 'flac',
    audioSampleRate: 44100
  },
  {
    id: 'opus-160',
    name: 'Opus 160kbps',
    description: 'Modern lossy codec — excellent quality-to-size ratio',
    category: 'audio',
    format: 'Opus',
    container: 'ogg',
    audioCodec: 'libopus',
    audioBitrate: '160k',
    audioSampleRate: 48000
  },
  {
    id: 'wav-pcm',
    name: 'WAV PCM',
    description: 'Uncompressed audio — maximum quality',
    category: 'audio',
    format: 'WAV',
    container: 'wav',
    audioCodec: 'pcm_s16le',
    audioSampleRate: 44100
  }
]

export const PRESET_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'image', label: 'Image' }
] as const
