import { describe, expect, it, vi } from 'vitest';
import {
  createAvailableClipOutputPath,
  createClipOutputPath,
  createFfmpegArguments,
  isLocalSourcePath,
  isValidClipRange,
  resolveFfmpegPath,
} from '../src/ffmpeg';

describe('resolveFfmpegPath', () => {
  it('prefers a configured executable path', () => {
    const fileInPath = vi.fn((path: string) => path === '/custom/bin/ffmpeg');

    expect(resolveFfmpegPath('  /custom/bin/ffmpeg  ', fileInPath)).toBe('/custom/bin/ffmpeg');
    expect(fileInPath).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Apple Silicon Homebrew path', () => {
    const fileInPath = vi.fn((path: string) => path === '/opt/homebrew/bin/ffmpeg');

    expect(resolveFfmpegPath('', fileInPath)).toBe('/opt/homebrew/bin/ffmpeg');
  });

  it('returns undefined when no executable exists', () => {
    expect(resolveFfmpegPath(undefined, () => false)).toBeUndefined();
  });
});

describe('clip input and output paths', () => {
  it('accepts local files and rejects remote media URLs', () => {
    expect(isLocalSourcePath('/Users/example/Movies/demo.mp4')).toBe(true);
    expect(isLocalSourcePath('https://example.com/demo.mp4')).toBe(false);
  });

  it('requires the end timestamp to follow the start timestamp', () => {
    expect(isValidClipRange('00:01:10', '00:01:25')).toBe(true);
    expect(isValidClipRange('00:01:25', '00:01:10')).toBe(false);
    expect(isValidClipRange('invalid', '00:01:25')).toBe(false);
  });

  it('places the clip beside the source file', () => {
    expect(createClipOutputPath('/Users/example/Movies/demo.mp4', 'demo.mp4')).toBe(
      '/Users/example/Movies/demo_clip.mov',
    );
  });

  it('supports filenames without an extension', () => {
    expect(createClipOutputPath('demo', 'demo')).toBe('demo_clip.mov');
  });

  it('adds a numeric suffix instead of overwriting an existing clip', () => {
    const existingPaths = new Set([
      '/Users/example/Movies/demo_clip.mov',
      '/Users/example/Movies/demo_clip_2.mov',
    ]);

    expect(
      createAvailableClipOutputPath('/Users/example/Movies/demo.mp4', 'demo.mp4', (path) =>
        existingPaths.has(path),
      ),
    ).toBe('/Users/example/Movies/demo_clip_3.mov');
  });
});

describe('createFfmpegArguments', () => {
  const baseOptions = {
    sourcePath: '/Movies/demo.mp4',
    startPosition: '00:01:10',
    endPosition: '00:01:25',
    outputPath: '/Movies/demo_clip.mov',
  };

  it('builds software encoding arguments', () => {
    expect(
      createFfmpegArguments({
        ...baseOptions,
        hardwareAcceleration: false,
        verticalCrop: false,
      }),
    ).toEqual([
      '-i',
      '/Movies/demo.mp4',
      '-ss',
      '00:01:10',
      '-to',
      '00:01:25',
      '-c:v',
      'libx264',
      '-crf',
      '23',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      '/Movies/demo_clip.mov',
    ]);
  });

  it('adds VideoToolbox and vertical crop arguments', () => {
    const args = createFfmpegArguments({
      ...baseOptions,
      hardwareAcceleration: true,
      verticalCrop: true,
    });

    expect(args.slice(0, 4)).toEqual(['-hwaccel', 'videotoolbox', '-i', '/Movies/demo.mp4']);
    expect(args).toContain('crop=w=ih*(9/16):h=ih:x=(iw-ow)/2:y=0,format=yuv420p');
    expect(args).toContain('h264_videotoolbox');
    expect(args).not.toContain('libx264');
  });
});
