const {
  core,
  mpv,
  utils,
  overlay,
} = iina;

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

export function processVideoClip(window) {
  window.onMessage("processVideoClip", ({ startPos, endPos, hwaccel, verticalCrop }) => {
    ffmpegExecFn(startPos, endPos, hwaccel, verticalCrop, window);
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
async function ffmpegExecFn(start, finish, hwaccel=false, verticalCrop=false, window, ffmpegPath = "/opt/homebrew/bin/ffmpeg") {
  let isFfmpegRunning = false;
  if (utils.fileInPath(ffmpegPath)) {
    displaySimpleOverlay("Processing ...", "18px");
    try {
      isFfmpegRunning = true;
      postFfmpegStatus(window, isFfmpegRunning);
      const { status } = await utils.exec(ffmpegPath, [
        hwaccel && '-hwaccel', hwaccel && 'videotoolbox',
        '-i', mpv.getString("path"),
        '-ss', start,
        '-to', finish,
        verticalCrop && '-vf', verticalCrop && 'crop=w=ih*(9/16):h=ih:x=(iw-ow)/2:y=0,format=yuv420p',
        hwaccel && '-c:v', hwaccel && 'h264_videotoolbox',
        hwaccel && '-q:v', hwaccel && '70',
        !hwaccel && '-c:v', !hwaccel && 'libx264',
        !hwaccel && '-crf', !hwaccel && '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        `${mpv.getString("path").substring(0, mpv.getString("path").lastIndexOf("/"))}/${mpv.getString("filename").slice(0, mpv.getString("filename").lastIndexOf("."))}_clip.mov`,
      ].filter(Boolean));

      if (status === 0) {
        isFfmpegRunning = false;
        postFfmpegStatus(window, isFfmpegRunning);
        displaySimpleOverlay("Clip saved in " + mpv.getString("path").substring(0, mpv.getString("path").lastIndexOf("/")), "18px");
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


// EVENTS - FOR LATER
// event.on("mpv.time-pos.changed", () => {
//   let time = mpv.getNumber("time-pos");
//   postCurrentTimeMessage(time);
// });