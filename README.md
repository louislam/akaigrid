# AkaiGrid

AkaiGrid is a fancy frontend for browsing your video folders on Windows.

![](https://github.com/user-attachments/assets/1d5c2191-b0a8-4c6c-9b00-9f34b666203a)

## Features

- ✨ Fancy UI - displays your video libraries in a fancy layout
- 📂 Respects your folder structure
- 🚗 Support local and network drives (SMB)
- 📺 Launches video in your favorite video player
- 🖼️ Generates thumbnails for each video and folder
  - Supports `cover.jpg` / `cover.png` for folders
- 🛤️ Tracks your watched status easily
  - ⏯️ Display the last playback position of videos (MPC-HC only)
  - ✅ Mark videos as "watched/done" by right-clicking
  - 🔢 Highlights episode numbers in filenames for easier reading
- 🪟 Sets Grid view, List view, and sorting options for each folder
- 📦 Portable

## Demo

You can feel it by visiting the demo site, but there is no actual video content.

Please note that AkaiGrid is a local app, you need to download and run it on your own computer to have the full experience.

[https://akaigrid.kuma.pet](https://akaigrid.kuma.pet/list/**app**videos)

## Requirements

- Windows 10 or 11 (x64)
- Modern browser like Firefox or Chrome
- Your favorite video player (MPC-HC is recommended)
- Resolution: 1920x1080 (100 dpi) or higher
- (Optional) [K-Lite Codec Pack](https://codecguide.com/download_kl.htm) - `Full` version is recommended, includes MPC-HC
- (Optional) [MPC-HC extra settings - improve user experience](https://github.com/louislam/akaigrid/wiki/MPC%E2%80%90HC-Settings)

## How to Use

### Method 1: Download the compiled binary (.exe)

1. Download [akaigrid-win-x64.7z](https://github.com/louislam/akaigrid/releases/latest)
2. Decompress with 7-Zip or WinRAR
3. Edit `config.yaml` to set your video folder paths

   ```yaml
   folders:
       - C:\My Videos Folder
       - \\SMB\My Videos Folder
   ```
4. Run `AkaiGrid.exe` to start the server

### Method 2: Run the source code using Deno

Extra requirements:

- Install Deno 2.3.1 or higher (https://docs.deno.com/runtime/)
- Install Git (https://git-scm.com/downloads)

1. Clone this repository and install dependencies:

   ```bash
   git clone https://github.com/louislam/akaigrid
   cd akaigrid
   deno task setup
   ```

2. Edit `config.yaml` to set your video folder paths:

   ```yaml
   folders:
       - C:\My Videos Folder
       - \\SMB\My Videos Folder
   ```

3. Start the server:

   ```bash
   deno task start
   ```

## Gallery

It is how it feels on my 48" TV:

<img src="https://github.com/user-attachments/assets/04c5bc33-7297-48ea-8a65-393d86841651" width="600" />

Playback position and mark as watched features:

<img src="https://github.com/user-attachments/assets/5866abc8-6113-4875-8753-61e082e8e452" width="600" />


## Motivation

I used Jellyfin and Chromecast (with Google TV) to stream videos to my TV for a while. Jellyfin is great, but I faced issues with subtitles, fonts, naming, and audio sync. At times, I spent more time
fixing problems than enjoying videos.

Recently, I switched to a Windows mini PC (Intel N100 CPU) as my "video player" in my living room. With MPC-HC and K-Lite Codec Pack, this combo plays videos smoothly with minimal issues, and the
performance is much better than Chromecast.

However, there aren’t many frontends for managing videos on Windows. So, I decided to create one.

I also wanted to try developing with Deno 2 and learn the Vue 3 Composition API in this project.

## FAQ

### Akai?

Akai (赤い / あかい / a-ka-i) is a Japanese word meaning "red". It is an adjective. So AkaiGrid means "Red Grid".

Why red? I don't know, but some popular online video platforms are also red, haha.

### How to refresh cached thumbnails in browser?

Ctrl + F5 in your browser.

### Can I use it on my phone?

No.

### Can I use it on Mac/Linux Desktop?

No. AkaiGrid is built for Windows. For other systems, someone else would need to fork it.

### Jellyfin replacement?

No. AkaiGrid focuses on displaying your video libraries on Windows and relies on video players like MPC-HC for playback.

If you want to stream videos to your phone or play music, you may still need Jellyfin.
