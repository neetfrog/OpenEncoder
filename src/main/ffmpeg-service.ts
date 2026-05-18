import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { existsSync, promises as fsPromises } from 'fs';
import { join, basename, dirname, parse as parsePath } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { pathToFileURL } from 'url';
import type {
  MediaInfo,
  Preset,
  EncodeProgressPayload,
  EncodeCompletePayload,
  EncodeErrorPayload,
} from '../shared/types';

// ─── Configure FFmpeg paths ────────────────────────────────────────────────────

function resolveBinaryPath(candidates: string[]): string {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1] ?? '';
}

function resolveFfmpegPath(): string {
  const executable = typeof ffmpegPath === 'string' ? ffmpegPath : '';
  const candidates: string[] = [];

  if (process.resourcesPath) {
    candidates.push(
      join(
        process.resourcesPath,
        'ffmpeg-static',
        process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
      )
    );
  }

  candidates.push(executable);
  return resolveBinaryPath(candidates);
}

function resolveFfprobePath(): string {
  const executable = typeof ffprobePath === 'string' ? ffprobePath : (ffprobePath?.path ?? '');
  const candidates: string[] = [];

  if (process.resourcesPath) {
    candidates.push(
      join(
        process.resourcesPath,
        'ffprobe-static',
        'bin',
        process.platform,
        process.arch,
        process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
      )
    );
  }

  candidates.push(executable);
  return resolveBinaryPath(candidates);
}

ffmpeg.setFfmpegPath(resolveFfmpegPath());
ffmpeg.setFfprobePath(resolveFfprobePath());

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.avif']);

function isImageFile(filePath: string): boolean {
  return imageExtensions.has(parsePath(filePath).ext.toLowerCase());
}

async function generateThumbnail(filePath: string): Promise<string | undefined> {
  if (isImageFile(filePath)) {
    return pathToFileURL(filePath).href;
  }

  const fileName = `mediaforge-thumb-${randomUUID()}.png`;
  const outputPath = join(tmpdir(), fileName);

  return new Promise((resolve) => {
    ffmpeg(filePath)
      .seekInput(1)
      .outputOptions(['-frames:v 1'])
      .size('240x?')
      .output(outputPath)
      .on('end', async () => {
        try {
          const buffer = await fsPromises.readFile(outputPath);
          await fsPromises.unlink(outputPath).catch(() => {});
          resolve(`data:image/png;base64,${buffer.toString('base64')}`);
        } catch {
          resolve(undefined);
        }
      })
      .on('error', async () => {
        await fsPromises.unlink(outputPath).catch(() => {});
        resolve(undefined);
      })
      .run();
  });
}

// ─── Active jobs map ──────────────────────────────────────────────────────────

interface ActiveJob {
  cmd: ffmpeg.FfmpegCommand;
  startTime: number;
}

const activeJobs = new Map<string, ActiveJob>();

// ─── Probe ────────────────────────────────────────────────────────────────────

export function probeFile(filePath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      const audioStream = data.streams.find((s) => s.codec_type === 'audio');
      const format = data.format;

      const fps = videoStream?.r_frame_rate
        ? (() => {
            const parts = videoStream.r_frame_rate.split('/');
            return parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : undefined;
          })()
        : undefined;

      generateThumbnail(filePath)
        .catch(() => undefined)
        .then((thumbnail) => {
          resolve({
            path: filePath,
            fileName: basename(filePath),
            duration: parseFloat(String(format.duration ?? '0')),
            size: parseInt(String(format.size ?? '0'), 10),
            format: format.format_long_name ?? format.format_name ?? '',
            width: videoStream?.width,
            height: videoStream?.height,
            fps: fps ? Math.round(fps * 100) / 100 : undefined,
            videoBitrate: videoStream?.bit_rate
              ? parseInt(String(videoStream.bit_rate), 10)
              : undefined,
            videoCodec: videoStream?.codec_name,
            audioBitrate: audioStream?.bit_rate
              ? parseInt(String(audioStream.bit_rate), 10)
              : undefined,
            audioCodec: audioStream?.codec_name,
            audioChannels: audioStream?.channels,
            audioSampleRate: audioStream?.sample_rate
              ? parseInt(String(audioStream.sample_rate), 10)
              : undefined,
            thumbnail,
          });
        });
    });
  });
}

// ─── Build output path ────────────────────────────────────────────────────────

export function buildOutputPath(inputPath: string, outputDir: string, preset: Preset): string {
  const { name } = parsePath(inputPath);
  const resolvedDir = outputDir || dirname(inputPath);
  return join(resolvedDir, `${name}_${preset.id}.${preset.container}`);
}

// ─── Encode ───────────────────────────────────────────────────────────────────

export interface EncodeCallbacks {
  onProgress: (payload: EncodeProgressPayload) => void;
  onComplete: (payload: EncodeCompletePayload) => void;
  onError: (payload: EncodeErrorPayload) => void;
}

export function encodeFile(
  jobId: string,
  inputPath: string,
  outputPath: string,
  preset: Preset,
  duration: number,
  callbacks: EncodeCallbacks
): void {
  let cmd = ffmpeg(inputPath);

  // ── Video settings ──────────────────────────────────────────────────────────
  if (preset.videoCodec) {
    cmd = cmd.videoCodec(preset.videoCodec);

    if (preset.crf !== undefined && preset.videoCodec !== 'gif') {
      cmd = cmd.outputOptions([`-crf ${preset.crf}`]);
    }

    if (preset.videoBitrate && preset.videoBitrate !== '0') {
      cmd = cmd.videoBitrate(preset.videoBitrate);
    }

    if (preset.preset) {
      cmd = cmd.outputOptions([`-preset ${preset.preset}`]);
    }

    // Scale / resolution
    if (preset.width && preset.height) {
      cmd = cmd.outputOptions([
        `-vf scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease`,
      ]);
    } else if (preset.width) {
      cmd = cmd.outputOptions([`-vf scale=${preset.width}:-2`]);
    }

    if (preset.fps) {
      cmd = cmd.fps(preset.fps);
    }
  } else if (preset.category === 'audio') {
    // Audio-only: strip video
    cmd = cmd.noVideo();
  }

  // ── Audio settings ──────────────────────────────────────────────────────────
  if (preset.audioCodec) {
    cmd = cmd.audioCodec(preset.audioCodec);
    if (preset.audioBitrate) cmd = cmd.audioBitrate(preset.audioBitrate);
    if (preset.audioSampleRate) cmd = cmd.audioFrequency(preset.audioSampleRate);
    if (preset.audioChannels) cmd = cmd.audioChannels(preset.audioChannels);
  } else if (!preset.videoCodec) {
    cmd = cmd.noAudio();
  }

  // ── Extra args ──────────────────────────────────────────────────────────────
  if (preset.extraArgs && preset.extraArgs.length > 0) {
    cmd = cmd.outputOptions(preset.extraArgs);
  }

  // ── Output format ───────────────────────────────────────────────────────────
  cmd = cmd.format(preset.container);

  // ── Progress ────────────────────────────────────────────────────────────────
  const startTime = Date.now();
  cmd.on('progress', (progress) => {
    // Calculate percent from timemark when percent is unreliable
    let percent = progress.percent ?? 0;
    if ((percent <= 0 || percent > 100) && progress.timemark && duration > 0) {
      const parts = progress.timemark.split(':').map(Number);
      const secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      percent = Math.min(100, (secs / duration) * 100);
    }

    // Calculate remaining time based on elapsed time and progress rate
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const remaining =
      duration > 0 && percent > 0 && elapsed > 0
        ? Math.round(((100 - percent) / percent) * elapsed)
        : 0;

    callbacks.onProgress({
      jobId,
      percent: Math.round(percent * 10) / 10,
      currentFps: progress.currentFps ?? 0,
      currentBitrate: progress.currentKbps ? `${progress.currentKbps}kbps` : '—',
      timemark: progress.timemark ?? '00:00:00',
      eta: remaining,
    });
  });

  cmd.on('end', () => {
    activeJobs.delete(jobId);
    callbacks.onComplete({ jobId, outputPath });
  });

  cmd.on('error', (err) => {
    activeJobs.delete(jobId);
    if (err.message.includes('SIGKILL') || err.message.includes('ffmpeg was killed')) {
      // cancelled — don't report as error
      return;
    }
    callbacks.onError({ jobId, error: err.message });
  });

  cmd.save(outputPath);
  activeJobs.set(jobId, { cmd, startTime });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function cancelJob(jobId: string): void {
  const job = activeJobs.get(jobId);
  if (job) {
    job.cmd.kill('SIGKILL');
    activeJobs.delete(jobId);
  }
}

export function cancelAllJobs(): void {
  for (const [id, job] of activeJobs) {
    job.cmd.kill('SIGKILL');
    activeJobs.delete(id);
  }
}
