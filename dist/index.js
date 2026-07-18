"use strict";
(() => {
  // packages/plugin/src/ffmpeg.ts
  var FFMPEG_FALLBACK_PATHS = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  function resolveFfmpegPath(preferredPath, fileInPath) {
    const preferred = typeof preferredPath === "string" ? preferredPath.trim() : "";
    const candidates = [preferred, ...FFMPEG_FALLBACK_PATHS];
    return candidates.find((candidate) => candidate.length > 0 && fileInPath(candidate));
  }
  function isLocalSourcePath(sourcePath) {
    return sourcePath.length > 0 && !sourcePath.includes("://");
  }
  function timestampToSeconds(timestamp) {
    const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(timestamp);
    if (!match) return void 0;
    const [, hours, minutes, seconds] = match;
    if (hours === void 0 || minutes === void 0 || seconds === void 0) return void 0;
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }
  function isValidClipRange(startPosition, endPosition) {
    const start = timestampToSeconds(startPosition);
    const end = timestampToSeconds(endPosition);
    return start !== void 0 && end !== void 0 && end > start;
  }
  function createClipOutputPath(sourcePath, filename) {
    const lastSlash = sourcePath.lastIndexOf("/");
    const directory = lastSlash >= 0 ? sourcePath.slice(0, lastSlash) : "";
    const lastDot = filename.lastIndexOf(".");
    const basename = (lastDot > 0 ? filename.slice(0, lastDot) : filename).trim() || "clip";
    const outputName = `${basename}_clip.mov`;
    return directory ? `${directory}/${outputName}` : lastSlash === 0 ? `/${outputName}` : outputName;
  }
  function createAvailableClipOutputPath(sourcePath, filename, fileExists) {
    const preferredPath = createClipOutputPath(sourcePath, filename);
    if (!fileExists(preferredPath)) return preferredPath;
    const stem = preferredPath.slice(0, -".mov".length);
    let index = 2;
    while (fileExists(`${stem}_${index}.mov`)) index += 1;
    return `${stem}_${index}.mov`;
  }
  function createFfmpegArguments(options) {
    const args = [];
    if (options.hardwareAcceleration) {
      args.push("-hwaccel", "videotoolbox");
    }
    args.push("-i", options.sourcePath, "-ss", options.startPosition, "-to", options.endPosition);
    if (options.verticalCrop) {
      args.push("-vf", "crop=w=ih*(9/16):h=ih:x=(iw-ow)/2:y=0,format=yuv420p");
    }
    if (options.hardwareAcceleration) {
      args.push("-c:v", "h264_videotoolbox", "-q:v", "70");
    } else {
      args.push("-c:v", "libx264", "-crf", "23");
    }
    args.push("-c:a", "copy", "-movflags", "+faststart", options.outputPath);
    return args;
  }

  // packages/plugin/src/recorder.ts
  var overlayHideTimer;
  function postToSidebar(sidebar, name, payload) {
    sidebar.postMessage(name, payload);
  }
  function isProcessVideoClipPayload(value) {
    if (typeof value !== "object" || value === null) return false;
    const payload = value;
    return typeof payload.startPos === "string" && typeof payload.endPos === "string" && isValidClipRange(payload.startPos, payload.endPos) && typeof payload.hwaccel === "boolean" && typeof payload.verticalCrop === "boolean";
  }
  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function displayOverlay(api, message, tone = "neutral", duration = 3e3) {
    const color = tone === "error" ? "#ff6961" : tone === "success" ? "#70d594" : "#f5f6f8";
    api.overlay.simpleMode();
    api.overlay.setContent(`<p>${escapeHtml(message)}</p>`);
    api.overlay.setStyle(
      `p { color: ${color}; font: 600 18px -apple-system, BlinkMacSystemFont, sans-serif; margin-top: 40px; text-align: center; }`
    );
    api.overlay.show();
    if (overlayHideTimer !== void 0) clearTimeout(overlayHideTimer);
    overlayHideTimer = setTimeout(() => {
      api.overlay.hide();
      overlayHideTimer = void 0;
    }, duration);
  }
  function postClipStatus(sidebar, payload) {
    postToSidebar(sidebar, "ffmpeg-status-out", payload);
  }
  function detectFfmpeg(api) {
    return resolveFfmpegPath(
      api.preferences.get("ffmpeg_path"),
      (path) => api.utils.fileInPath(path)
    );
  }
  function postFfmpegAvailability(api) {
    const path = detectFfmpeg(api);
    postToSidebar(api.sidebar, "is-ffmpeg-installed", {
      isInstalled: path !== void 0,
      path: path ?? ""
    });
  }
  function postCurrentTime(api) {
    postToSidebar(api.sidebar, "currentTime", { time: api.mpv.getNumber("time-pos") });
  }
  async function processVideoClip(api, request) {
    const ffmpegPath = detectFfmpeg(api);
    if (!ffmpegPath) {
      const message = "FFmpeg was not found. Check Recorder preferences.";
      postClipStatus(api.sidebar, { status: false, message, tone: "error" });
      displayOverlay(api, message, "error");
      return;
    }
    const sourcePath = api.mpv.getString("path");
    const filename = api.mpv.getString("filename");
    if (!filename || !isLocalSourcePath(sourcePath)) {
      const message = "Open a local video before creating a clip.";
      postClipStatus(api.sidebar, { status: false, message, tone: "error" });
      displayOverlay(api, message, "error");
      return;
    }
    const outputPath = createAvailableClipOutputPath(
      sourcePath,
      filename,
      (path) => api.utils.fileInPath(path)
    );
    const args = createFfmpegArguments({
      sourcePath,
      startPosition: request.startPos,
      endPosition: request.endPos,
      hardwareAcceleration: request.hwaccel,
      verticalCrop: request.verticalCrop,
      outputPath
    });
    api.console.log(`FFmpeg found at ${ffmpegPath}; creating ${outputPath}`);
    postClipStatus(api.sidebar, {
      status: true,
      message: "Creating your clip…",
      tone: "neutral"
    });
    displayOverlay(api, "Creating clip…");
    try {
      const result = await api.utils.exec(ffmpegPath, args);
      if (result.status !== 0) {
        const message2 = `FFmpeg stopped with error code ${result.status}.`;
        api.console.error(result.stderr || message2);
        postClipStatus(api.sidebar, { status: false, message: message2, tone: "error" });
        displayOverlay(api, message2, "error");
        return;
      }
      const lastSlash = outputPath.lastIndexOf("/");
      const outputDirectory = lastSlash >= 0 ? outputPath.slice(0, lastSlash) : "the video folder";
      const message = `Clip saved in ${outputDirectory}`;
      postClipStatus(api.sidebar, { status: false, message, tone: "success" });
      displayOverlay(api, message, "success");
      api.sidebar.hide();
      api.core.resume();
    } catch (error) {
      const message = `Could not create the clip: ${String(error)}`;
      api.console.error(message);
      postClipStatus(api.sidebar, { status: false, message, tone: "error" });
      displayOverlay(api, message, "error");
    }
  }
  function registerSidebarMessages(api) {
    api.sidebar.onMessage("getEndTime", () => {
      postToSidebar(api.sidebar, "endTime", { time: api.mpv.getNumber("time-pos") });
      api.core.pause();
    });
    api.sidebar.onMessage("processVideoClip", (payload) => {
      if (!isProcessVideoClipPayload(payload)) {
        postClipStatus(api.sidebar, {
          status: false,
          message: "Recorder received an invalid clip request.",
          tone: "error"
        });
        return;
      }
      void processVideoClip(api, payload);
    });
    api.sidebar.onMessage("closeWindow", () => api.sidebar.hide());
    api.sidebar.onMessage("requestCurrentTime", () => postCurrentTime(api));
    api.sidebar.onMessage("requestFfmpegCheck", () => postFfmpegAvailability(api));
  }
  function setupRecorder(api) {
    let sidebarLoaded = false;
    const loadSidebar = () => {
      if (sidebarLoaded) return;
      api.sidebar.loadFile("dist/ui/window/index.html");
      registerSidebarMessages(api);
      sidebarLoaded = true;
    };
    const startRecorderMenuItem = api.menu.item(
      "Start Clipping",
      () => {
        if (!api.core.window.loaded) return;
        loadSidebar();
        api.sidebar.show();
        postCurrentTime(api);
        postFfmpegAvailability(api);
      },
      { keyBinding: "Alt+Shift+r" }
    );
    api.menu.addItem(startRecorderMenuItem);
    if (api.core.window.loaded) {
      loadSidebar();
    } else {
      api.event.on("iina.window-loaded", loadSidebar);
    }
  }

  // packages/plugin/src/index.ts
  setupRecorder(iina);
})();
