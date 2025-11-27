const {
  console,
  menu,
  core,
  event,
  mpv
} = iina;

// load the react file
const window = iina.standaloneWindow;

// functions
// function postCurrentTimeMessage(timeValue) {
//   window.postMessage("currentTime", {
//     time: timeValue,
//   });
// }

function postEndTimeMessage () {
  window.onMessage("getEndTime", () => {
    let time = mpv.getNumber("time-pos");
    window.postMessage("endTime", {
      time: time,
    });
    core.pause();
  })
}

// Add this function to get current time on demand
function postCurrentTimeOnce() {
  let time = mpv.getNumber("time-pos");
  window.postMessage("currentTime", {
    time: time,
  });
}

window.setFrame(500, 300);
window.loadFile("dist/ui/window/index.html");
window.setProperty({title: "Start Recording"});
postEndTimeMessage();

// start recording menu item
const startRecorderMenuItem = menu.item("Start Recording", () => {
  window.open();
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
