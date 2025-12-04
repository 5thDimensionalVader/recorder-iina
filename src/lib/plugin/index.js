const {
  core,
  mpv,
  utils,
  overlay,
} = iina;

// DISPLAY UI FUNCTION
export function displaySimpleOverlay(message, size = "15px", isError = false, duration = 3000){
  overlay.simpleMode();
  overlay.setContent(`<p>${message}</p>`);
  overlay.setStyle(`p { color: ${isError ? "red" : "green"}; font-size: ${size}; margin-top: 40px;}`);
  overlay.show();

  setTimeout(() => {
    overlay.hide();
  }, duration);
}

// ACTION LISTENERS FOR UI
export function postEndTimeMessage (window) {
  window.onMessage("getEndTime", () => {
    let time = mpv.getNumber("time-pos");
    window.postMessage("endTime", {
      time: time,
    });
    core.pause();
  })
}

export function processVideoClip(window) {
    window.onMessage("processVideoClip", ({ startPos, endPos }) => {
      ffmpegExecFn(startPos, endPos, window);
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

// LOCAL PLUGIN FUNCTION
export async function ffmpegExecFn(start, finish, window, ffmpegPath = "/opt/homebrew/bin/ffmpeg") {
  if(utils.fileInPath(ffmpegPath)){
    displaySimpleOverlay("Processing ...");
    const { status, stderr } = await utils.exec(ffmpegPath, [
      "-i", mpv.getString("path"),
      "-ss", start,
      "-to", finish,
      "-crf", "21",
      "-c:v", "libx264",
      "-c:a", "copy",
      "-movflags", "+faststart",
      `${mpv.getString("path").substring(0, mpv.getString("path").lastIndexOf("/"))}/${mpv.getString("filename")}_clip.mov`,
    ]);
    if (status == 0){
      displaySimpleOverlay("Clipping processed successfully!", "18px");
      window.hide();
      core.resume();
    } else {
      displaySimpleOverlay(`FFmpeg error code ${status}`, "18px", true);
    }
  } else {
    displaySimpleOverlay("ffmpeg not found", true);
  }
}


// EVENTS - FOR LATER
// event.on("mpv.time-pos.changed", () => {
//   let time = mpv.getNumber("time-pos");
//   postCurrentTimeMessage(time);
// });