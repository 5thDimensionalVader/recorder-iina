import { describe, expect, it, vi } from 'vitest';
import { setupRecorder } from '../src/recorder';

type MenuAction = () => void;

function createApi(windowLoaded: boolean) {
  let isWindowLoaded = windowLoaded;
  let windowLoadedHandler: (() => void) | undefined;
  let menuAction: MenuAction | undefined;

  const sidebarMessageHandlers = new Map<string, (payload?: unknown) => void>();
  const onMessage = vi.fn((name: string, handler: (payload?: unknown) => void) => {
    sidebarMessageHandlers.set(name, handler);
  });
  const loadFile = vi.fn(() => sidebarMessageHandlers.clear());
  const showSidebar = vi.fn();
  const hideSidebar = vi.fn();
  const addMenuItem = vi.fn();
  const onEvent = vi.fn((event: string, handler: () => void) => {
    if (event === 'iina.window-loaded') windowLoadedHandler = handler;
    return 'event-id';
  });

  const api = {
    sidebar: {
      loadFile,
      onMessage,
      postMessage: vi.fn(),
      show: showSidebar,
      hide: hideSidebar,
    },
    menu: {
      item: vi.fn((_title: string, action: MenuAction) => {
        menuAction = action;
        return { title: 'Start Clipping' };
      }),
      addItem: addMenuItem,
    },
    core: {
      window: {
        get loaded() {
          return isWindowLoaded;
        },
      },
    },
    event: {
      on: onEvent,
    },
    mpv: {
      getNumber: vi.fn(() => 12),
    },
    preferences: {
      get: vi.fn(() => ''),
    },
    utils: {
      fileInPath: vi.fn(() => false),
    },
  } as unknown as IINA.IINAGlobal;

  return {
    api,
    loadFile,
    onMessage,
    showSidebar,
    hideSidebar,
    addMenuItem,
    onEvent,
    setWindowLoaded: (loaded: boolean) => {
      isWindowLoaded = loaded;
    },
    getSidebarMessageNames: () => [...sidebarMessageHandlers.keys()],
    invokeSidebarMessage: (name: string, payload?: unknown) => {
      sidebarMessageHandlers.get(name)?.(payload);
    },
    getWindowLoadedHandler: () => windowLoadedHandler,
    getMenuAction: () => menuAction,
  };
}

describe('setupRecorder', () => {
  it('registers the menu immediately and waits for the player window before loading the sidebar', () => {
    const recorder = createApi(false);

    setupRecorder(recorder.api);

    expect(recorder.addMenuItem).toHaveBeenCalledOnce();
    expect(recorder.loadFile).not.toHaveBeenCalled();
    expect(recorder.onMessage).not.toHaveBeenCalled();
    expect(recorder.onEvent).toHaveBeenCalledWith('iina.window-loaded', expect.any(Function));

    recorder.setWindowLoaded(true);
    recorder.getWindowLoadedHandler()?.();
    recorder.getWindowLoadedHandler()?.();

    expect(recorder.loadFile).toHaveBeenCalledOnce();
    expect(recorder.loadFile).toHaveBeenCalledWith('dist/ui/window/index.html');
    expect(recorder.getSidebarMessageNames()).toEqual([
      'getEndTime',
      'processVideoClip',
      'closeWindow',
      'requestCurrentTime',
      'requestFfmpegCheck',
    ]);

    recorder.invokeSidebarMessage('closeWindow');
    expect(recorder.hideSidebar).toHaveBeenCalledOnce();
  });

  it('loads the sidebar immediately when plugins are reloaded into an existing window', () => {
    const recorder = createApi(true);

    setupRecorder(recorder.api);

    expect(recorder.addMenuItem).toHaveBeenCalledOnce();
    expect(recorder.loadFile).toHaveBeenCalledOnce();
    expect(recorder.onEvent).not.toHaveBeenCalled();
  });

  it('does not access the sidebar from the menu action until the player window is loaded', () => {
    const recorder = createApi(false);

    setupRecorder(recorder.api);
    recorder.getMenuAction()?.();

    expect(recorder.loadFile).not.toHaveBeenCalled();
    expect(recorder.showSidebar).not.toHaveBeenCalled();

    recorder.setWindowLoaded(true);
    recorder.getMenuAction()?.();
    recorder.getWindowLoadedHandler()?.();

    expect(recorder.loadFile).toHaveBeenCalledOnce();
    expect(recorder.showSidebar).toHaveBeenCalledOnce();
  });
});
