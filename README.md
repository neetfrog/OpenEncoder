# MediaForge

**Open-source Adobe Media Encoder replacement** powered by FFmpeg.

A full-featured local video/audio transcoder with a modern dark UI. No subscriptions, no watermarks, no cloud dependency.

---

## Features

- **Batch encoding queue** — drag & drop or browse for files
- **16+ built-in presets** — H.264, H.265, AV1, VP9, ProRes, GIF, MP3, AAC, FLAC, Opus, WAV
- **Per-job preset selection** — assign different settings per file
- **Live progress** — real-time progress bars, FPS, and ETA per job
- **Media info probing** — FFprobe detects resolution, duration, codec, bitrate
- **Concurrent encoding** — 1–4 parallel jobs (configurable)
- **Custom output folder** — or output next to source
- **Frameless dark UI** — custom title bar, keyboard-friendly
- **Persistent settings** — output dir and concurrency saved across sessions

---

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (opens the app)
npm run dev

# Build for distribution
npm run dist:win   # Windows installer
npm run dist:mac   # macOS DMG
npm run dist:linux # Linux AppImage
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 31 |
| Build | electron-vite + Vite 5 |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Encoding | FFmpeg (via fluent-ffmpeg) |
| Binaries | ffmpeg-static + ffprobe-static |
| Storage | electron-store |

---

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── index.ts       # App lifecycle, window creation
│   ├── ffmpeg-service.ts  # FFmpeg probe + encode engine
│   └── ipc-handlers.ts    # IPC channel registration
├── preload/
│   └── index.ts       # Secure renderer ↔ main bridge
├── shared/
│   ├── types.ts       # Shared TypeScript types + IPC constants
│   └── presets.ts     # Built-in encoding presets
└── renderer/src/
    ├── App.tsx
    ├── components/
    │   ├── TitleBar.tsx
    │   ├── Sidebar.tsx
    │   ├── EncodeBar.tsx
    │   ├── Queue/       # Queue panel, items, drop zone
    │   ├── Presets/     # Preset browser
    │   └── Settings/    # Settings panel
    ├── hooks/
    │   └── useFFmpeg.ts # FFmpeg event listeners
    ├── store/
    │   └── useEncoderStore.ts  # Zustand global state
    └── utils.ts
```

---

## Adding Custom Presets

Edit `src/shared/presets.ts` and add a new entry following the `Preset` interface from `src/shared/types.ts`. The preset will automatically appear in the queue dropdown and the Presets browser.

---

## License

MIT
