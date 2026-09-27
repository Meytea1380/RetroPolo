# RetroVibe Emulator - Complete Project Architecture & Continuation Guide

> **Notice for Coding Agents / LLM Collaborators**: This document provides an exhaustive specification of RetroVibe Emulator's architecture, state flow, backend API contracts, emulator cores, and planned roadmap items to enable seamless continuation from any agent without breaking changes.

---

## 1. Project Overview

**RetroVibe** is a high-performance, full-stack browser-based retro console emulator with real-time CRT post-processing, authentic Web Audio chiptune synthesis, client-side IndexedDB persistence, skinnable virtual gamepads, and a Node.js/Express backend for real ROM uploads and test execution.

- **Stack**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Motion + Express 4 + Multer
- **Port**: `3000` (Unified Express server with Vite middlewares mounted via `tsx server.ts`)
- **Primary Design Paradigm**: Neo-Retro (80s/90s CRT arcade nostalgia merged with clean 2025 typography and zero-pill discipline).

---

## 2. Directory & File Structure

```
/
├── index.html                   # HTML entry point (fonts: Press Start 2P, Inter, Space Grotesk)
├── metadata.json                # Project name, capabilities & permissions
├── package.json                 # Dependencies & scripts ("dev": "tsx server.ts", "start": "node server.ts")
├── server.ts                    # Express backend + Vite dev middlewares + ROM upload API
├── tsconfig.json                # TypeScript compiler options
├── vite.config.ts               # Vite configuration with Tailwind 4 plugin
├── public/
│   ├── test-roms/               # Real hardware test ROM binaries generated on server start
│   │   ├── retro_pilot.nes      # Valid iNES 16KB PRG + 8KB CHR header + reset vectors
│   │   ├── pocket_monk.gb       # Valid DMG Game Boy 32KB binary with Nintendo logo & checksum
│   │   ├── speedway.gba         # Valid 32-bit GBA hardware image with ARM boot vectors
│   │   └── sonic_strike.bin     # Valid 16-bit Sega Genesis M68000 stack & header image
│   └── uploads/                 # Static destination for multipart uploaded user ROMs
└── src/
    ├── main.tsx                 # React entry mount point
    ├── App.tsx                  # Master application orchestrator & page routing
    ├── index.css                # Tailwind 4 theme, CRT scanlines, barrel distortion & flicker keyframes
    ├── types.ts                 # Full TypeScript interfaces & domain types
    ├── components/
    │   ├── Navbar.tsx           # Strict Top Bar: Wordmark, Nav links, CRT switch, SFX toggle
    │   ├── Hero.tsx             # Animated 3D floor grid, system badges, spotlight vault
    │   ├── Library.tsx          # Real-time search, filters, sorting, Grid/List view
    │   ├── GameDetailsModal.tsx # Metadata inspection, achievements, .sav export, in-place edit
    │   ├── UploadGame.tsx       # 3-way upload: Backend API (/api/upload-rom), Real Test ROMs, IndexedDB
    │   ├── Player.tsx           # Fullscreen player, CRT overlay, Rewind, Multi-slot Saves, Gamepad skins
    │   ├── CrtOverlay.tsx       # WebGL/CSS CRT shader wrapper: curvature, scanlines, shadow mask, chromatic aberration
    │   ├── CrtStudio.tsx        # CRT lab monitor with SMPTE bars, convergence grid & parameter controls
    │   ├── Settings.tsx         # Theme presets, Web Audio volume, custom keybinding remapper, JSON backup
    │   └── StartupAnimation.tsx # Optional 90s console boot fanfare, glowing pixel explosion
    └── utils/
        ├── audio.ts             # Web Audio API 8-bit synthesizer (no external audio assets required)
        ├── constants.ts         # Console configurations (NES, SNES, GB, GBC, GBA, Genesis, N64, PS1)
        ├── db.ts                # Client IndexedDB manager (ROM blob storage & save states)
        └── gameArt.ts           # Procedural SVG retro box art generator (100% self-contained data URIs)
```

---

## 3. Backend Architecture & REST Endpoints (`server.ts`)

The server runs on **port 3000** using Express with Vite middlewares mounted in development.

### Endpoints
1. `GET /api/health`
   - Returns `{ status: 'online', uptime, storageReady: true, uploadsCount, testRomsCount }`.
2. `GET /api/test-roms`
   - Returns an array of real, valid binary ROMs hosted under `/test-roms/` with console metadata.
3. `POST /api/upload-rom`
   - Multipart form-data endpoint handling file field `romFile` (up to 100MB).
   - Fields: `title`, `consoleId`, `genre`, `year`.
   - Saves file to `/public/uploads/[timestamp]_[filename]` and returns `{ success: true, game: GameItem }`.
4. Static Mounts:
   - `/uploads` -> points to `public/uploads`
   - `/test-roms` -> points to `public/test-roms`

---

## 4. State Management & Storage Contracts

### Storage Layer 1: Client IndexedDB (`src/utils/db.ts`)
- **Database**: `retrovibe_emulator_db` (Version 1)
- **Object Stores**:
  - `roms`: Keys are `gameId`, values are binary `Blob` or `ArrayBuffer`.
  - `save_states`: Keys are `${gameId}_slot_${slot}`, values are `Blob` or JSON state.
  - `games`: Complete `GameItem` metadata records.

### Storage Layer 2: LocalStorage
- `retrovibe_crt_settings`: Stores active `CrtSettings` object.
- `retrovibe_keymapping`: Stores custom keyboard bindings (`KeyMapping`).

---

## 5. CRT Post-Processing Engine Specifications

All CRT shaders are handled through `src/components/CrtOverlay.tsx` and custom styles in `src/index.css`:

1. **Curvature**: `.crt-barrel` with radial gradient vignette (`perspective(1000px)`).
2. **Scanlines**:
   - `none`: Disabled.
   - `subtle`: 2px pattern with 40% opacity.
   - `medium`: 4px pattern with 65% opacity.
   - `heavy`: 6px high-contrast pattern with 85% opacity.
3. **Phosphor Shadow Mask**: `.crt-phosphor-grid` 3x3 dot matrix aperture simulation.
4. **Chromatic Aberration**: `.crt-chromatic` splitting red and cyan color channels.
5. **60Hz Flicker**: `.crt-flicker` with micro-opacity cycling.
6. **Color Presets**:
   - `standard`: Balanced warm arcade phosphor.
   - `trinitron`: Sony PVM broadcast monitor sharpness & deep blacks.
   - `gameboy`: DMG-01 olive LCD green matrix tint.
   - `amber`: 70s/80s monochrome terminal phosphor.
   - `cyberpunk`: Saturated neon synthwave cyan & hot pink.

---

## 6. Audio Architecture (`src/utils/audio.ts`)

Zero external audio MP3/WAV dependencies are required. All sound effects are generated procedurally on demand via the browser **Web Audio API**:

- `soundFx.playClick()`: Triangle wave 600Hz -> 150Hz fast ramp blip.
- `soundFx.playCoin()`: Square wave dual-frequency arcade coin chime (987Hz -> 1318Hz).
- `soundFx.playPowerUp()`: Ascending 6-note arpeggio chord.
- `soundFx.playCrtSwitch(turnOn)`: Sawtooth cathode flyback whine.
- `soundFx.playStartupSound()`: Multi-oscillator 90s console boot progression.

---

## 7. Supported Console Hardware Systems

| Console ID | Hardware Name | Release | Core Identifier | Native Aspect |
|---|---|---|---|---|
| `nes` | Nintendo Entertainment System | 1983 | `fceumm` | 4:3 |
| `snes` | Super Nintendo Entertainment System | 1990 | `snes9x` | 4:3 |
| `gb` | Game Boy (DMG-01) | 1989 | `gambatte` | 10:9 |
| `gbc` | Game Boy Color | 1998 | `gambatte` | 10:9 |
| `gba` | Game Boy Advance | 2001 | `mgba` | 3:2 |
| `genesis`| Sega Genesis / Mega Drive | 1988 | `genesis_plus_gx` | 4:3 |
| `n64` | Nintendo 64 | 1996 | `mupen64plus_next` | 4:3 |
| `ps1` | Sony PlayStation 1 | 1994 | `mednafen_psx_hw` | 4:3 |

---

## 8. Player & Emulation Engine Dual Architecture

The Player component (`src/components/Player.tsx`) operates in two operational modes:

1. **Vibe Core (Hardware Arcade Runner)**:
   - High-performance, zero-latency 60 FPS vector canvas simulation.
   - Features real-time **Time Rewind** (`Backspace` or on-screen button) using a circular 180-frame state buffer.
   - Multi-slot save state manager (`Slot 1`, `Slot 2`, `Slot 3`) with `F5` quick save and `F8` quick load.
   - Background **Auto-Save** running every 30 seconds into Slot 99.
   - **Skinnable Gamepads**: Toggle on-the-fly between authentic **SNES** (4-button diamond), **NES** (horizontal red 2-button), and **Game Boy** (angled maroon 2-button).

2. **EJS Core (EmulatorJS WebAssembly Core)**:
   - Clicking the **"Vibe Core / EJS Core"** toggle in the Player HUD switches to loading external WebAssembly Libretro cores dynamically via CDN.
   - Sets `window.EJS_player`, `window.EJS_core`, and passes `romUrl` or Blob URLs directly to the wasm runtime.

---

## 9. Next Steps / Continuation Roadmap for Incoming Agents

If continuing feature development, prioritize the following tasks in order:

1. **Gamepad API Integration**:
   - Connect standard physical USB / Bluetooth gamepads (Xbox, PlayStation, 8BitDo) via `navigator.getGamepads()` in `Player.tsx`.
2. **Cheat Code Engine**:
   - Add Game Genie / Action Replay hexadecimal memory patchers inside `GameDetailsModal.tsx` and pass them to the emulation memory space.
3. **IGDB / ScreenScraper Cover Art Scraping**:
   - Add a server proxy route `/api/fetch-cover?title=...` to query open game databases and auto-populate box art for uploaded ROMs.
4. **Netplay / Local 2-Player Split Controls**:
   - Extend `src/types.ts` `KeyMapping` to support Player 1 and Player 2 mappings concurrently.

---

## 10. Development & Verification Commands

```bash
# Start full-stack development server (Express backend + Vite frontend)
npm run dev

# Verify TypeScript compilation and linter
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start
```
