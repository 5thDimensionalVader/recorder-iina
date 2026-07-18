import type {
  ClipStatusPayload,
  PluginToWebviewMessages,
  ProcessVideoClipPayload,
} from '@recorder/contracts';
import {
  createAvailableClipOutputPath,
  createFfmpegArguments,
  isLocalSourcePath,
  isValidClipRange,
  resolveFfmpegPath,
} from './ffmpeg';

type Sidebar = IINA.API.SidebarView;
type OverlayTone = 'neutral' | 'success' | 'error';

let overlayHideTimer: ReturnType<typeof setTimeout> | undefined;

function postToSidebar<Name extends keyof PluginToWebviewMessages>(
  sidebar: Sidebar,
  name: Name,
  payload: PluginToWebviewMessages[Name],
): void {
  sidebar.postMessage(name, payload);
}

function isProcessVideoClipPayload(value: unknown): value is ProcessVideoClipPayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Partial<ProcessVideoClipPayload>;

  return (
    typeof payload.startPos === 'string' &&
    typeof payload.endPos === 'string' &&
    isValidClipRange(payload.startPos, payload.endPos) &&
    typeof payload.hwaccel === 'boolean' &&
    typeof payload.verticalCrop === 'boolean'
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function displayOverlay(
  api: IINA.IINAGlobal,
  message: string,
  tone: OverlayTone = 'neutral',
  duration = 3_000,
): void {
  const color = tone === 'error' ? '#ff6961' : tone === 'success' ? '#70d594' : '#f5f6f8';
  api.overlay.simpleMode();
  api.overlay.setContent(`<p>${escapeHtml(message)}</p>`);
  api.overlay.setStyle(
    `p { color: ${color}; font: 600 18px -apple-system, BlinkMacSystemFont, sans-serif; margin-top: 40px; text-align: center; }`,
  );
  api.overlay.show();
  if (overlayHideTimer !== undefined) clearTimeout(overlayHideTimer);
  overlayHideTimer = setTimeout(() => {
    api.overlay.hide();
    overlayHideTimer = undefined;
  }, duration);
}

function postClipStatus(sidebar: Sidebar, payload: ClipStatusPayload): void {
  postToSidebar(sidebar, 'ffmpeg-status-out', payload);
}

function detectFfmpeg(api: IINA.IINAGlobal): string | undefined {
  return resolveFfmpegPath(api.preferences.get('ffmpeg_path'), (path) =>
    api.utils.fileInPath(path),
  );
}

function postFfmpegAvailability(api: IINA.IINAGlobal): void {
  const path = detectFfmpeg(api);
  postToSidebar(api.sidebar, 'is-ffmpeg-installed', {
    isInstalled: path !== undefined,
    path: path ?? '',
  });
}

function postCurrentTime(api: IINA.IINAGlobal): void {
  postToSidebar(api.sidebar, 'currentTime', { time: api.mpv.getNumber('time-pos') });
}

async function processVideoClip(
  api: IINA.IINAGlobal,
  request: ProcessVideoClipPayload,
): Promise<void> {
  const ffmpegPath = detectFfmpeg(api);
  if (!ffmpegPath) {
    const message = 'FFmpeg was not found. Check Recorder preferences.';
    postClipStatus(api.sidebar, { status: false, message, tone: 'error' });
    displayOverlay(api, message, 'error');
    return;
  }

  const sourcePath = api.mpv.getString('path');
  const filename = api.mpv.getString('filename');
  if (!filename || !isLocalSourcePath(sourcePath)) {
    const message = 'Open a local video before creating a clip.';
    postClipStatus(api.sidebar, { status: false, message, tone: 'error' });
    displayOverlay(api, message, 'error');
    return;
  }

  const outputPath = createAvailableClipOutputPath(sourcePath, filename, (path) =>
    api.utils.fileInPath(path),
  );
  const args = createFfmpegArguments({
    sourcePath,
    startPosition: request.startPos,
    endPosition: request.endPos,
    hardwareAcceleration: request.hwaccel,
    verticalCrop: request.verticalCrop,
    outputPath,
  });

  api.console.log(`FFmpeg found at ${ffmpegPath}; creating ${outputPath}`);
  postClipStatus(api.sidebar, {
    status: true,
    message: 'Creating your clip…',
    tone: 'neutral',
  });
  displayOverlay(api, 'Creating clip…');

  try {
    const result = await api.utils.exec(ffmpegPath, args);
    if (result.status !== 0) {
      const message = `FFmpeg stopped with error code ${result.status}.`;
      api.console.error(result.stderr || message);
      postClipStatus(api.sidebar, { status: false, message, tone: 'error' });
      displayOverlay(api, message, 'error');
      return;
    }

    const lastSlash = outputPath.lastIndexOf('/');
    const outputDirectory = lastSlash >= 0 ? outputPath.slice(0, lastSlash) : 'the video folder';
    const message = `Clip saved in ${outputDirectory}`;
    postClipStatus(api.sidebar, { status: false, message, tone: 'success' });
    displayOverlay(api, message, 'success');
    api.sidebar.hide();
    api.core.resume();
  } catch (error) {
    const message = `Could not create the clip: ${String(error)}`;
    api.console.error(message);
    postClipStatus(api.sidebar, { status: false, message, tone: 'error' });
    displayOverlay(api, message, 'error');
  }
}

function registerSidebarMessages(api: IINA.IINAGlobal): void {
  api.sidebar.onMessage('getEndTime', () => {
    postToSidebar(api.sidebar, 'endTime', { time: api.mpv.getNumber('time-pos') });
    api.core.pause();
  });

  api.sidebar.onMessage('processVideoClip', (payload: unknown) => {
    if (!isProcessVideoClipPayload(payload)) {
      postClipStatus(api.sidebar, {
        status: false,
        message: 'Recorder received an invalid clip request.',
        tone: 'error',
      });
      return;
    }
    void processVideoClip(api, payload);
  });

  api.sidebar.onMessage('closeWindow', () => api.sidebar.hide());
  api.sidebar.onMessage('requestCurrentTime', () => postCurrentTime(api));
  api.sidebar.onMessage('requestFfmpegCheck', () => postFfmpegAvailability(api));
}

export function setupRecorder(api: IINA.IINAGlobal): void {
  let sidebarLoaded = false;
  const loadSidebar = (): void => {
    if (sidebarLoaded) return;
    api.sidebar.loadFile('dist/ui/window/index.html');
    registerSidebarMessages(api);
    sidebarLoaded = true;
  };

  const startRecorderMenuItem = api.menu.item(
    'Start Clipping',
    () => {
      if (!api.core.window.loaded) return;
      loadSidebar();
      api.sidebar.show();
      postCurrentTime(api);
      postFfmpegAvailability(api);
    },
    { keyBinding: 'Alt+Shift+r' },
  );

  api.menu.addItem(startRecorderMenuItem);

  if (api.core.window.loaded) {
    loadSidebar();
  } else {
    api.event.on('iina.window-loaded', loadSidebar);
  }
}
