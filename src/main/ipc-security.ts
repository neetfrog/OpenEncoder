import { validateFilePath, validateDirPath, sanitizePathForLogging } from './ipc-validation';
import type { EncodeStartPayload } from '../shared/types';

/**
 * Wrap IPC handlers with validation and error logging
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R> | R,
  name: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`IPC Error in ${name}:`, message);
      throw err;
    }
  };
}

/**
 * Validate file path before probe or encode
 */
export function validateFilePathForEncoding(filePath: string): void {
  if (!validateFilePath(filePath)) {
    throw new Error(`Invalid file path: ${sanitizePathForLogging(filePath)}`);
  }
}

/**
 * Validate output directory before writing
 */
export function validateOutputDirectory(dirPath: string): void {
  if (dirPath && !validateDirPath(dirPath)) {
    throw new Error(`Invalid output directory: ${sanitizePathForLogging(dirPath)}`);
  }
}

/**
 * Validate encode start payload
 */
export function validateEncodePayload(payload: EncodeStartPayload): void {
  if (!Array.isArray(payload.jobs) || payload.jobs.length === 0) {
    throw new Error('Invalid encode payload: empty jobs array');
  }

  for (const job of payload.jobs) {
    if (!job.id || typeof job.id !== 'string') {
      throw new Error('Invalid job: missing or invalid id');
    }
    if (!job.inputPath || typeof job.inputPath !== 'string') {
      throw new Error(`Invalid job ${job.id}: missing or invalid inputPath`);
    }
    validateFilePathForEncoding(job.inputPath);

    if (job.outputDir !== undefined && typeof job.outputDir !== 'string') {
      throw new Error(`Invalid job ${job.id}: outputDir must be a string`);
    }
    if (job.outputDir) {
      validateOutputDirectory(job.outputDir);
    }

    if (job.trimStart !== undefined) {
      if (typeof job.trimStart !== 'number' || !Number.isFinite(job.trimStart) || job.trimStart < 0) {
        throw new Error(`Invalid job ${job.id}: trimStart must be a non-negative number`);
      }
    }

    if (job.trimEnd !== undefined) {
      if (typeof job.trimEnd !== 'number' || !Number.isFinite(job.trimEnd) || job.trimEnd <= 0) {
        throw new Error(`Invalid job ${job.id}: trimEnd must be a positive number`);
      }
      if (job.trimStart !== undefined && job.trimEnd <= job.trimStart) {
        throw new Error(`Invalid job ${job.id}: trimEnd must be greater than trimStart`);
      }
    }

    if (job.hwAccel !== undefined) {
      if (
        job.hwAccel !== 'auto' &&
        job.hwAccel !== 'none' &&
        job.hwAccel !== 'nvenc' &&
        job.hwAccel !== 'qsv' &&
        job.hwAccel !== 'amf'
      ) {
        throw new Error(`Invalid job ${job.id}: unknown hwAccel value`);
      }
    }
  }
}
