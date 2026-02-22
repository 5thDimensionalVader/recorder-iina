import {
  postEndTimeMessage,
  processVideoClip,
  closeWindow,
  postCurrentTimeOnce,
  isFfmpegInstalled,
} from "./lib/plugin";

const { menu, sidebar } = iina;

// load the ui
sidebar.loadFile("dist/ui/window/index.html");
postEndTimeMessage(sidebar);
processVideoClip(sidebar);
closeWindow(sidebar);

// "Start Clipping" menu item with keyBinding
const startRecorderMenuItem = menu.item(
  "Start Clipping",
  () => {
    sidebar.show();
    postCurrentTimeOnce(sidebar);
    isFfmpegInstalled(sidebar);
  },
  {
    keyBinding: "Alt+Shift+r",
  }
);
// add menu item
menu.addItem(startRecorderMenuItem);
