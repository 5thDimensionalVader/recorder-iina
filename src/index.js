const {
  console,
  menu,
  core,
  event,
  mpv,
  utils,
  overlay,
} = iina;

// load the react file
const window = iina.sidebar;

// functions
function postEndTimeMessage () {
  window.onMessage("getEndTime", () => {
    let time = mpv.getNumber("time-pos");
    window.postMessage("endTime", {
      time: time,
    });
    core.pause();
  })
}

function displaySimpleOverlay(message, size = "15px", isError = false){
  overlay.simpleMode();
  overlay.setContent(`<p>${message}</p>`);
  overlay.setStyle(`p { color: ${isError ? "red" : "green"}; font-size: ${size}; margin-top: 40px;}`);
  overlay.show();

  setTimeout(() => {
    overlay.hide();
  }, 3000);
}

async function ffmpegExecFn(start, finish, window) {
  if(utils.fileInPath("/opt/homebrew/bin/ffmpeg")){
    displaySimpleOverlay("Processing ...");
    const { status, stderr } = await utils.exec("/opt/homebrew/bin/ffmpeg", [
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
    } else {
      displaySimpleOverlay(`FFmpeg error code ${status}`, "18px", true);
    }
  } else {
    displaySimpleOverlay("ffmpeg not found", true);
  }
}

 function processVideoClip() {
    window.onMessage("processVideoClip", ({ startPos, endPos }) => {
      ffmpegExecFn(startPos, endPos, window);
    });
}

// Add this function to get current time on demand
function postCurrentTimeOnce() {
  let time = mpv.getNumber("time-pos");
  window.postMessage("currentTime", {
    time: time,
  });
}

function closeWindow() {
  window.onMessage("closeWindow", () => {
    window.hide();
  });
}

window.loadFile("dist/ui/window/index.html");
postEndTimeMessage();
processVideoClip();
closeWindow();

// start recording menu item
const startRecorderMenuItem = menu.item("Start Clipping", () => {
  window.show();
  postCurrentTimeOnce();
}, {
  keyBinding: "Alt+Shift+r",
})
menu.addItem(startRecorderMenuItem);

// events
// event.on("mpv.time-pos.changed", () => {
//   let time = mpv.getNumber("time-pos");
//   postCurrentTimeMessage(time);
// });
