export const FFMPEG_FALLBACK_PATHS = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', '/bin/ffmpeg'] as const;

export interface FfmpegArgumentsOptions {
  sourcePath: string;
  startPosition: string;
  endPosition: string;
  hardwareAcceleration: boolean;
  verticalCrop: boolean;
  outputPath: string;
}

export function resolveFfmpegPath(
  preferredPath: unknown,
  fileInPath: (path: string) => boolean,
): string | undefined {
  const preferred = typeof preferredPath === 'string' ? preferredPath.trim() : '';
  const candidates = [preferred, ...FFMPEG_FALLBACK_PATHS];

  return candidates.find((candidate) => candidate.length > 0 && fileInPath(candidate));
}

export function isLocalSourcePath(sourcePath: string): boolean {
  return sourcePath.length > 0 && !sourcePath.includes('://');
}

export function timestampToSeconds(timestamp: string): number | undefined {
  const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(timestamp);
  if (!match) return undefined;

  const [, hours, minutes, seconds] = match;
  if (hours === undefined || minutes === undefined || seconds === undefined) return undefined;
  return Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds);
}

export function isValidClipRange(startPosition: string, endPosition: string): boolean {
  const start = timestampToSeconds(startPosition);
  const end = timestampToSeconds(endPosition);
  return start !== undefined && end !== undefined && end > start;
}

export function createClipOutputPath(sourcePath: string, filename: string): string {
  const lastSlash = sourcePath.lastIndexOf('/');
  const directory = lastSlash >= 0 ? sourcePath.slice(0, lastSlash) : '';
  const lastDot = filename.lastIndexOf('.');
  const basename = (lastDot > 0 ? filename.slice(0, lastDot) : filename).trim() || 'clip';
  const outputName = `${basename}_clip.mov`;

  return directory ? `${directory}/${outputName}` : lastSlash === 0 ? `/${outputName}` : outputName;
}

export function createAvailableClipOutputPath(
  sourcePath: string,
  filename: string,
  fileExists: (path: string) => boolean,
): string {
  const preferredPath = createClipOutputPath(sourcePath, filename);
  if (!fileExists(preferredPath)) return preferredPath;

  const stem = preferredPath.slice(0, -'.mov'.length);
  let index = 2;
  while (fileExists(`${stem}_${index}.mov`)) index += 1;
  return `${stem}_${index}.mov`;
}

export function createFfmpegArguments(options: FfmpegArgumentsOptions): string[] {
  const args: string[] = [];

  if (options.hardwareAcceleration) {
    args.push('-hwaccel', 'videotoolbox');
  }

  args.push('-i', options.sourcePath, '-ss', options.startPosition, '-to', options.endPosition);

  if (options.verticalCrop) {
    args.push('-vf', 'crop=w=ih*(9/16):h=ih:x=(iw-ow)/2:y=0,format=yuv420p');
  }

  if (options.hardwareAcceleration) {
    args.push('-c:v', 'h264_videotoolbox', '-q:v', '70');
  } else {
    args.push('-c:v', 'libx264', '-crf', '23');
  }

  args.push('-c:a', 'copy', '-movflags', '+faststart', options.outputPath);
  return args;
}
