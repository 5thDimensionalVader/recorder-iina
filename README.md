
# Recorder
Clip your favourite moments from your videos.


## Features

### 🎬 Batch Clipping
Found multiple funny moments in one video? No need to clip them one by one! You can now add multiple timestamps and export them all at once.

### 📱 Vertical Crop for Social Media
Want to share a landscape video on TikTok, Instagram Reels, or YouTube Shorts?
- **Vertical Crop**: Automatically crops your video to a 9:16 vertical ratio.
- **Smart Positioning**: Choose to focus on the **Left**, **Center**, or **Right** side of the video so you never miss the action.

### 💾 Format Selection
Choose the best format for your needs:
- **Original**: Keep the original video quality.
- **MP4 / MOV**: Convert to common formats compatiable with all devices.

### 👀 Instant Preview
Not sure if you got the timing right? Use the **Preview** button to watch your selected clip before saving it.


## Prerequisites
This plugin requires **ffmpeg** to be installed to function properly.

### Installing ffmpeg (macOS)
The easiest way is using Homebrew:
```bash
brew install ffmpeg
```

## Installation
Before you setup the plugin, make sure the version of IINA you're using is `>=1.4.0`. These are the steps to take when setting up the plugin:

- Open IINA and navigate to "Settings"
- On the left sidebar, find the menu for "Plugins" and click on the "Install with GitHub" button
- Copy the plugin's repo URL and click on "Install"

ℹ️ *Other installations for IINA will be updated soon!*


## Known Issues
### start the plugin (from Menu Bar)
- Go to plugin --> reload plugins
![alt text](image.png)
- click on plugin --> start clipping
![alt text](image-1.png)

### preview clip
- preview clip only work when you click on start button on the timestamp
- if you start clip by pressing plugin --> star clipping, it won't show preview icon
- workaround: click on start button on the timestamp, even though you click on plugin --> start clipping