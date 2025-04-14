# AkaiGrid

AkaiGrid is a fancy frontend for displaying and organizing your video folders on Windows.

## Features

- Fancy UI - displays your video libraries in a fancy layout
- Respects your folder structure
- Support local and network drives (SMB)
- Launches video in your favorite video player
- Generates thumbnails for each video and folder
  - Supports `cover.jpg` / `cover.png` for folders
- Tracks your watched status easily
  - Display the last playback position of videos (MPC-HC only)
  - Mark videos as "watched/done" by right-clicking
  - Highlights episode numbers in filenames for easier reading
- Sets Grid view, List view, and sorting options for each folder
- Portable

## Requirements

- Windows 10 or 11 (x64)
- Modern browser like Firefox or Chrome
- Your favorite video player (MPC-HC is recommended)
- Resolution: 1920x1080 (100 dpi) or higher
- (Optional) [K-Lite Codec Pack](https://codecguide.com/download_kl.htm) - `Full` version is recommended, includes MPC-HC
- (Optional) [MPC-HC extra settings - improve user experience]()
- (Optional) Deno 2.3.1 or higher - in case you would like to run the project directly using source code.

## Installation

### Method 1: Download the compiled binary (.exe)

1. Download []()
2. Edit `config.yaml` to set your video folder paths
3. Run `AkaiGrid.exe` to start the server

### Method 2: Run the source code using Deno

1. Install Deno (https://docs.deno.com/runtime/)
2. Clone this repository
3. One-time setup: `deno task setup`
4. Edit `config.yaml` to set your video folder paths
5. Start the server: `deno task start`

## Motivation

I used Jellyfin and Chromecast to stream videos to my TV for a while. Jellyfin is great, but I faced issues with subtitles, fonts, naming, and audio sync. At times, I spent more time fixing problems
than enjoying videos.

Recently, I switched to a Windows mini PC (Intel N100 CPU) with MPC-HC and K-Lite Codec Pack. This combo plays videos smoothly with minimal issues.

However, there aren’t many frontends for managing videos on Windows. So, I decided to create one.

I also wanted to try developing with Deno 2 and learn the Vue 3 Composition API.

## FAQ

### Akai?

Akai (赤い / あかい / a-ka-i) is a Japanese word meaning "red". It is an adjective. So AkaiGrid means "Red Grid".

Why red? I don't know, but some popular online video platforms are also red, haha.

### Can I use it on my phone?

No.

### Can I use it on Mac/Linux Desktop?

No. AkaiGrid is built for Windows. For other systems, someone else would need to fork it.

### Jellyfin replacement?

No. AkaiGrid focuses on displaying your video libraries on Windows and relies on video players like MPC-HC for playback.

If you want to stream videos to your phone or play music, you may still need Jellyfin.
