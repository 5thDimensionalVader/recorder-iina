import type {
  ClipStatusPayload,
  FfmpegAvailabilityPayload,
  PluginToWebviewMessages,
  TimePayload,
  WebviewToPluginMessages,
} from '@recorder/contracts';

declare global {
  interface Window {
    iina?: {
      postMessage(name: string, data?: unknown): void;
      onMessage(name: string, handler: (data: unknown) => void): void;
    };
  }
}

type PluginMessageName = keyof PluginToWebviewMessages;
type Listener = (payload: never) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTimePayload(value: unknown): TimePayload | undefined {
  return isRecord(value) && typeof value.time === 'number' && Number.isFinite(value.time)
    ? { time: value.time }
    : undefined;
}

function parseAvailability(value: unknown): FfmpegAvailabilityPayload | undefined {
  return isRecord(value) && typeof value.isInstalled === 'boolean' && typeof value.path === 'string'
    ? { isInstalled: value.isInstalled, path: value.path }
    : undefined;
}

function parseClipStatus(value: unknown): ClipStatusPayload | undefined {
  if (!isRecord(value) || typeof value.status !== 'boolean') return undefined;
  if (value.message !== undefined && typeof value.message !== 'string') return undefined;
  if (
    value.tone !== undefined &&
    value.tone !== 'neutral' &&
    value.tone !== 'success' &&
    value.tone !== 'error'
  ) {
    return undefined;
  }

  return {
    status: value.status,
    ...(typeof value.message === 'string' ? { message: value.message } : {}),
    ...(value.tone === 'neutral' || value.tone === 'success' || value.tone === 'error'
      ? { tone: value.tone }
      : {}),
  };
}

class RecorderBridge {
  private readonly nativeBridge = window.iina;
  private readonly listeners = new Map<PluginMessageName, Set<Listener>>();

  constructor() {
    this.nativeBridge?.onMessage('currentTime', (value) => {
      const payload = parseTimePayload(value);
      if (payload) this.emit('currentTime', payload);
    });
    this.nativeBridge?.onMessage('endTime', (value) => {
      const payload = parseTimePayload(value);
      if (payload) this.emit('endTime', payload);
    });
    this.nativeBridge?.onMessage('is-ffmpeg-installed', (value) => {
      const payload = parseAvailability(value);
      if (payload) this.emit('is-ffmpeg-installed', payload);
    });
    this.nativeBridge?.onMessage('ffmpeg-status-out', (value) => {
      const payload = parseClipStatus(value);
      if (payload) this.emit('ffmpeg-status-out', payload);
    });
  }

  subscribe<Name extends PluginMessageName>(
    name: Name,
    handler: (payload: PluginToWebviewMessages[Name]) => void,
  ): () => void {
    const handlers = this.listeners.get(name) ?? new Set<Listener>();
    handlers.add(handler as Listener);
    this.listeners.set(name, handlers);
    return () => handlers.delete(handler as Listener);
  }

  post<Name extends keyof WebviewToPluginMessages>(
    name: Name,
    payload: WebviewToPluginMessages[Name],
  ): void {
    if (this.nativeBridge) {
      this.nativeBridge.postMessage(name, payload);
      return;
    }

    this.handlePreviewMessage(name);
  }

  private emit<Name extends PluginMessageName>(
    name: Name,
    payload: PluginToWebviewMessages[Name],
  ): void {
    for (const handler of this.listeners.get(name) ?? []) {
      handler(payload as never);
    }
  }

  private handlePreviewMessage(name: keyof WebviewToPluginMessages): void {
    if (name === 'requestCurrentTime') {
      queueMicrotask(() => this.emit('currentTime', { time: 3_723 }));
    }
    if (name === 'requestFfmpegCheck') {
      queueMicrotask(() =>
        this.emit('is-ffmpeg-installed', {
          isInstalled: true,
          path: '/opt/homebrew/bin/ffmpeg',
        }),
      );
    }
    if (name === 'getEndTime') {
      queueMicrotask(() => this.emit('endTime', { time: 3_748 }));
    }
    if (name === 'processVideoClip') {
      this.emit('ffmpeg-status-out', {
        status: true,
        message: 'Creating your clip…',
        tone: 'neutral',
      });
      setTimeout(
        () =>
          this.emit('ffmpeg-status-out', {
            status: false,
            message: 'Clip saved in /Users/you/Movies',
            tone: 'success',
          }),
        1_200,
      );
    }
  }
}

export const recorderBridge = new RecorderBridge();
