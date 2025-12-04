import { postEndTimeMessage, processVideoClip, closeWindow, postCurrentTimeOnce, isFfmpegInstalled, postFfmpegStdoutMessage } from "./lib/plugin";

const {
  menu,
} = iina;

// create sidebar instance
const window = iina.sidebar;

// load the ui 
window.loadFile("dist/ui/window/index.html");
postEndTimeMessage(window);
processVideoClip(window);
closeWindow(window);

// "Start Clipping" menu item with keyBinding
const startRecorderMenuItem = menu.item("Start Clipping", () => {
  window.show();
  postCurrentTimeOnce(window);
  isFfmpegInstalled(window);
}, {
  keyBinding: "Alt+Shift+r",
})
// add menu item
menu.addItem(startRecorderMenuItem);
