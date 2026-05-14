import { existsSync } from 'fs';

/**
 * Validate that a file path is safe and accessible
 * Prevents directory traversal and path manipulation attacks
 */
export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;

  // Reject paths with .. to prevent directory traversal
  if (filePath.includes('..')) return false;

  // Check if path exists and is accessible
  try {
    return existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Validate that a directory path is safe
 */
export function validateDirPath(dirPath: string): boolean {
  if (!dirPath || typeof dirPath !== 'string') return false;

  if (dirPath.includes('..')) return false;

  try {
    return existsSync(dirPath);
  } catch {
    return false;
  }
}

/**
 * Validate IPC payload structure
 */
export function validateEncodeStartPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;

  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.jobs)) return false;

  return p.jobs.every((job: unknown) => {
    if (typeof job !== 'object' || !job) return false;
    const j = job as Record<string, unknown>;
    return (
      typeof j.id === 'string' &&
      typeof j.inputPath === 'string' &&
      typeof j.outputDir === 'string' &&
      typeof j.preset === 'object'
    );
  });
}

/**
 * Sanitize file paths for logging (no sensitive data)
 */
export function sanitizePathForLogging(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || 'unknown';
}
