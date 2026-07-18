export interface TimePayload {
  time: number;
}

export interface FfmpegAvailabilityPayload {
  isInstalled: boolean;
  path: string;
}

export type ClipStatusTone = 'neutral' | 'success' | 'error';

export interface ClipStatusPayload {
  status: boolean;
  message?: string;
  tone?: ClipStatusTone;
}

export interface ProcessVideoClipPayload {
  startPos: string;
  endPos: string;
  hwaccel: boolean;
  verticalCrop: boolean;
}

export interface PluginToWebviewMessages {
  currentTime: TimePayload;
  endTime: TimePayload;
  'is-ffmpeg-installed': FfmpegAvailabilityPayload;
  'ffmpeg-status-out': ClipStatusPayload;
}

export interface WebviewToPluginMessages {
  getEndTime: undefined;
  processVideoClip: ProcessVideoClipPayload;
  closeWindow: undefined;
  requestCurrentTime: undefined;
  requestFfmpegCheck: undefined;
}

export type MessageName<TMessages> = Extract<keyof TMessages, string>;
