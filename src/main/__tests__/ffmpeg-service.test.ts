import { buildOutputPath } from '../ffmpeg-service';
import type { Preset } from '../../shared/types';

describe('buildOutputPath', () => {
  const preset: Preset = {
    id: 'h264',
    name: 'H.264',
    description: 'H.264 video',
    category: 'video',
    format: 'h264',
    container: 'mp4',
    videoCodec: 'libx264',
    videoBitrate: '5000k',
  };

  it('should build output path with custom directory', () => {
    const result = buildOutputPath('/home/user/input.mp4', '/home/user/output', preset);
    expect(result).toBe('/home/user/output/input_h264.mp4');
  });

  it('should use source directory when output dir is empty', () => {
    const result = buildOutputPath('/home/user/input.mp4', '', preset);
    expect(result).toBe('/home/user/input_h264.mp4');
  });

  it('should handle different file extensions', () => {
    const result = buildOutputPath('/path/to/video.mov', '/output', preset);
    expect(result).toBe('/output/video_h264.mp4');
  });

  it('should handle nested paths', () => {
    const result = buildOutputPath('/a/b/c/file.mkv', '/x/y/z', preset);
    expect(result).toBe('/x/y/z/file_h264.mp4');
  });
});
