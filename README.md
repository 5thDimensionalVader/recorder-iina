
# Table of Contents
- [Features](#features)
  - [Batch Clipping](#-batch-clipping)
  - [Vertical Crop for Social Media](#-vertical-crop-for-social-media)
  - [Format Selection](#-format-selection)
  - [Instant Preview](#-instant-preview)
- [Prerequisites](#prerequisites)
  - [Installing ffmpeg (macOS)](#installing-ffmpeg-macos)
- [Installation](#installation)
- [How to Use plugin](#how-to-use-plugin)
- [Known Issues](#known-issues)
  - [start the plugin (from Menu Bar)](#start-the-plugin-from-menu-bar)
  - [preview clip](#preview-clip)
- [Acknowledgements](#acknowledgements)

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

## How to Use plugin
- Open IINA and navigate to "Plugins" (Top Menu bar) Click on "reload plugins" --> agin go to plugin and click on "Start Clipping"
- Go to timestamp you want to clip, and Click on start button and play your video, to stop click on stop button
- ***Add another timestamp*** and repeat the process
- you can ***preview*** the clip by clicking on preview button, and ajust the timestamp to get the perfect clip.
- Click on "Clip All" button to start processing, a ***progress bar*** will show up to show the progress
- ***Vertical crop*** is optional, if you want to crop your video to 9:16, enable it
- select which region you want to crop from the split region and select the format
- when your on vertical crop mode, it will show preview of the video by ***graying out the rest of the video***
<p align="center">
  <img src="screenshots/image-2.png" width="30%" />
  <img src="screenshots/image-4.png" width="30%" />
  <img src="screenshots/image-3.png" width="30%" />
</p>

## Known Issues
### start the plugin (from Menu Bar)
- Go to plugin --> reload plugins
<img src="screenshots/image.png" width="500" />
- click on plugin --> start clipping
<img src="screenshots/image-1.png" width="500" />

### preview clip
- preview clip only work when you click on start button on the timestamp
- if you start clip by pressing plugin --> star clipping, it won't show preview icon
- workaround: click on start button on the timestamp, even though you click on plugin --> start clipping

## Acknowledgements
A huge thank you to the following contributors who inspired this plugin:

- **[@5thDimensionalVader](https://github.com/5thDimensionalVader)** for the [recorder-iina](https://github.com/5thDimensionalVader/recorder-iina) plugin, which served as the foundation for this project.
- **[@NapoleonWils0n](https://github.com/NapoleonWils0n)** for the incredible [ffmpeg-scripts](https://github.com/NapoleonWils0n/ffmpeg-scripts), without which the advanced clipping features wouldn't be possible.

> 🎓 **Want to master FFmpeg?**  
> Highly recommended: **@NapoleonWils0n** has an excellent [YouTube Playlist](https://www.youtube.com/watch?v=UHshlQvdwcQ&list=PL7hhhG5qUoXlVUkHAhgw_px_x0zB29okR) that is a goldmine for learning! 🚀