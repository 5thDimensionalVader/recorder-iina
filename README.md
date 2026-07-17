# Recorder

Clip your favourite moments from your videos.

## Features

- Clip comedic or thrilling moments from your videos, all from your IINA sidebar.
- Share your clip to devices with the right encoding.

## Installation

Before you setup the plugin, make sure the version of IINA you're using is `>=1.4.0`. These are the steps to take when setting up the plugin:

- Open IINA and navigate to "Settings"
- On the left sidebar, find the menu for "Plugins" and click on the "Install with GitHub" button
- Copy the plugin's repo URL and click on "Install"

ℹ️ _Other installations for IINA will be updated soon!_

## Local development & testing

Use the IINA plugin CLI to link this repo into your local plugins folder while developing.

### 1. Make the CLI available

If `iina-plugin` is not already on your `PATH`, create a symlink:

```sh
ln -s /Applications/IINA.app/Contents/MacOS/iina-plugin /usr/local/bin/iina-plugin
```

### 2. Clone and install dependencies

```sh
git clone https://github.com/5thDimensionalVader/recorder-iina.git
cd recorder-iina
pnpm install
pnpm run build
```

### 3. Link the plugin for local testing

From the project root (or pass the project path as `<dir>`):

```sh
iina-plugin link .
```

Reload plugins in IINA (or restart IINA), then open the Recorder sidebar or use **Alt+Shift+R**.

### 4. Unlink when you're done

```sh
iina-plugin unlink .
```
