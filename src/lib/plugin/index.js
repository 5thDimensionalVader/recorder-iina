const { core, mpv, utils, overlay, preferences, console } = iina;

const FFMPEG_FALLBACK_PATHS = [
  "/opt/homebrew/bin/ffmpeg", // Apple Silicon Homebrew
  "/usr/local/bin/ffmpeg", // Intel Homebrew
];

/**
 * Resolve a usable ffmpeg binary path.
 * Preference wins when non-empty and valid; otherwise probe common Homebrew paths.
 * Empty/whitespace preference values are treated as unset (IINA fileInPath rejects "").
 */
export function resolveFfmpegPath() {
  const preferred = preferences.get("ffmpeg_path");
  const candidates = [
    typeof preferred === "string" ? preferred.trim() : "",
    ...FFMPEG_FALLBACK_PATHS,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (utils.fileInPath(candidate)) {
      return candidate;
    }
  }

  return null;
}

// DISPLAY UI FUNCTION
export function displaySimpleOverlay(
  message,
  size = "15px",
  isError = false,
  duration = 3000
) {
  overlay.simpleMode();
  overlay.setContent(`<p>${message}</p>`);
  overlay.setStyle(
    `p { color: ${
      isError ? "red" : "green"
    }; font-size: ${size}; margin-top: 40px;}`
  );
  overlay.show();

  setTimeout(() => {
    overlay.hide();
  }, duration);
}

// ACTION LISTENERS FOR UI
export function postEndTimeMessage(window) {
  window.onMessage("getEndTime", () => {
    let time = mpv.getNumber("time-pos");
    window.postMessage("endTime", {
      time: time,
    });
    core.pause();
  });
}

export function processVideoClip(window) {
  window.onMessage(
    "processVideoClip",
    ({ startPos, endPos, hwaccel, verticalCrop }) => {
      ffmpegExecFn(startPos, endPos, hwaccel, verticalCrop, window);
    }
  );
}

export function closeWindow(window) {
  window.onMessage("closeWindow", () => {
    window.hide();
  });
}

export function postCurrentTimeOnce(window) {
  let time = mpv.getNumber("time-pos");
  window.postMessage("currentTime", {
    time: time,
  });
}

export function isFfmpegInstalled(window) {
  const ffmpegPath = resolveFfmpegPath();
  window.postMessage("is-ffmpeg-installed", {
    isInstalled: Boolean(ffmpegPath),
    path: ffmpegPath ?? "",
  });
}

/** Re-run detection when the sidebar UI mounts or asks for a refresh. */
export function listenFfmpegCheck(window) {
  window.onMessage("requestFfmpegCheck", () => {
    isFfmpegInstalled(window);
  });
}

function postFfmpegStatus(window, status = false) {
  window.postMessage("ffmpeg-status-out", {
    status: status,
  });
}

// LOCAL PLUGIN FUNCTION
async function ffmpegExecFn(
  start,
  finish,
  hwaccel = false,
  verticalCrop = false,
  window
) {
  let isFfmpegRunning = false;
  const ffmpegPath = resolveFfmpegPath();

  if (ffmpegPath) {
    console.log(`ffmpeg found at ${ffmpegPath}, processing clip`);

    displaySimpleOverlay("Processing ...", "18px");
    try {
      isFfmpegRunning = true;
      postFfmpegStatus(window, isFfmpegRunning);
      const { status } = await utils.exec(
        ffmpegPath,
        [
          hwaccel && "-hwaccel",
          hwaccel && "videotoolbox",
          "-i",
          mpv.getString("path"),
          "-ss",
          start,
          "-to",
          finish,
          verticalCrop && "-vf",
          verticalCrop &&
            "crop=w=ih*(9/16):h=ih:x=(iw-ow)/2:y=0,format=yuv420p",
          hwaccel && "-c:v",
          hwaccel && "h264_videotoolbox",
          hwaccel && "-q:v",
          hwaccel && "70",
          !hwaccel && "-c:v",
          !hwaccel && "libx264",
          !hwaccel && "-crf",
          !hwaccel && "23",
          "-c:a",
          "copy",
          "-movflags",
          "+faststart",
          `${mpv
            .getString("path")
            .substring(0, mpv.getString("path").lastIndexOf("/"))}/${mpv
            .getString("filename")
            .slice(0, mpv.getString("filename").lastIndexOf("."))}_clip.mov`,
        ].filter(Boolean)
      );

      if (status === 0) {
        isFfmpegRunning = false;
        postFfmpegStatus(window, isFfmpegRunning);
        displaySimpleOverlay(
          "Clip saved in " +
            mpv
              .getString("path")
              .substring(0, mpv.getString("path").lastIndexOf("/")),
          "18px"
        );
        window.hide();
        core.resume();
      } else {
        displaySimpleOverlay(`FFmpeg error code ${status}`, "18px", true);
      }
    } catch (error) {
      displaySimpleOverlay(`An error occured: ${error}`, "18px", true);
    }
  } else {
    displaySimpleOverlay("ffmpeg not found", "18px", true);
  }
}
