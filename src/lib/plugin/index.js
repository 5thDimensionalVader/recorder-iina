const {
  core,
  mpv,
  utils,
  overlay,
  event,
} = iina;

// ...

export function handlePreviewMessage(window) {
  let previewListener = null;

  window.onMessage("previewClip", ({ start, end }) => {
    // 1. Convert start (HH:MM:SS) to seconds
    const [h, m, s] = start.split(':').map(Number);
    const startSeconds = h * 3600 + m * 60 + s;

    // 2. Convert end (HH:MM:SS) to seconds
    const [eh, em, es] = end.split(':').map(Number);
    const endSeconds = eh * 3600 + em * 60 + es;

    // 3. Seek to start
    mpv.set("time-pos", startSeconds);
    core.resume(); // Ensure playing

    // 4. Remove existing listener if any
    if (previewListener) {
      event.off("mpv.time-pos.changed", previewListener);
      previewListener = null;
    }

    // 5. Add listener to stop at end
    previewListener = (time) => {
      if (time >= endSeconds) {
        core.pause();
        event.off("mpv.time-pos.changed", previewListener);
        previewListener = null;
      }
    };
    event.on("mpv.time-pos.changed", previewListener);
  });
}

// DISPLAY UI FUNCTION
export function displaySimpleOverlay(message, size = "15px", isError = false, duration = 3000) {
  overlay.simpleMode();
  overlay.setContent(`<p>${message}</p>`);
  overlay.setStyle(`p { color: ${isError ? "red" : "green"}; font-size: ${size}; margin-top: 40px;}`);
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
  })
}

export function postStartTimeMessage(window) {
  window.onMessage("getStartTime", () => {
    let time = mpv.getNumber("time-pos");
    window.postMessage("startTime", {
      time: time,
    });
    core.pause();
  })
}

export function processVideoClip(window) {
  window.onMessage("processVideoClip", async ({ clips, hwaccel, verticalCrop, format }) => {
    // Sequential processing
    for (const clip of clips) {
      if (clip.status !== "COMPLETED") {
        // 1. Notify UI: WAITING -> PROCESSING
        window.postMessage("clip-status-update", { id: clip.id, status: "PROCESSING" });

        // 2. Execute
        await ffmpegExecFn(clip.start, clip.end, hwaccel, verticalCrop, format, window, clip.id);
      }
    }
    // 3. Notify Global Done
    window.postMessage("batch-complete", {});
  });
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
  let bool = utils.fileInPath("/opt/homebrew/bin/ffmpeg");
  if (!bool) bool = utils.fileInPath("/usr/local/bin/ffmpeg");
  window.postMessage("is-ffmpeg-installed", {
    isInstalled: bool,
  });
}

function postFfmpegStatus(window, status = false) {
  window.postMessage("ffmpeg-status-out", {
    status: status,
  });
}

// LOCAL PLUGIN FUNCTION
async function ffmpegExecFn(start, finish, hwaccel = false, verticalCrop = false, format = "original", window, id, ffmpegPath = "/opt/homebrew/bin/ffmpeg") {
  let isFfmpegRunning = false;
  if (utils.fileInPath(ffmpegPath)) {
    displaySimpleOverlay(`Processing Clip ${id}...`, "18px");
    try {
      isFfmpegRunning = true;
      postFfmpegStatus(window, isFfmpegRunning);

      // Determine extension
      const originalPath = mpv.getString("path");
      const filename = mpv.getString("filename");
      const directory = originalPath.substring(0, originalPath.lastIndexOf("/"));
      const nameNoExt = filename.slice(0, filename.lastIndexOf("."));

      let extension = format;
      if (format === "original") {
        extension = filename.split('.').pop();
      }

      // Sanitize start time for filename (replace : with -)
      const sanitizedStart = start.replace(/:/g, "-");

      const { status } = await utils.exec(ffmpegPath, [
        hwaccel && '-hwaccel', hwaccel && 'videotoolbox',
        '-i', originalPath,
        '-ss', start,
        '-to', finish,
        verticalCrop && '-vf', verticalCrop && 'crop=w=ih*(9/16):h=ih:x=(iw-ow)/2:y=0,format=yuv420p',
        hwaccel && '-c:v', hwaccel && 'h264_videotoolbox',
        hwaccel && '-q:v', hwaccel && '70',
        !hwaccel && '-c:v', !hwaccel && 'libx264',
        !hwaccel && '-crf', !hwaccel && '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        `${directory}/${nameNoExt}_clip_${sanitizedStart}.${extension}`,
      ].filter(Boolean));

      if (status === 0) {
        isFfmpegRunning = false;
        postFfmpegStatus(window, isFfmpegRunning);
        window.postMessage("clip-status-update", { id: id, status: "COMPLETED" });
        displaySimpleOverlay("Clip saved", "18px");
      } else {
        window.postMessage("clip-status-update", { id: id, status: "ERROR" });
        displaySimpleOverlay(`FFmpeg error code ${status}`, "18px", true);
      }
    } catch (error) {
      window.postMessage("clip-status-update", { id: id, status: "ERROR" });
      displaySimpleOverlay(`An error occured: ${error}`, "18px", true);
    }
  } else {
    window.postMessage("clip-status-update", { id: id, status: "ERROR" });
    displaySimpleOverlay("ffmpeg not found", "18px", true);
  }
}



export function handleUiReady(window) {
  window.onMessage("ui-ready", () => {
    isFfmpegInstalled(window);
    postCurrentTimeOnce(window);
  });
}

// EVENTS - FOR LATER
// event.on("mpv.time-pos.changed", () => {
//   let time = mpv.getNumber("time-pos");
//   postCurrentTimeMessage(time);
// });