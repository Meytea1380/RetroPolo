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
├── testRoms.ts                  # Mini assembler + NES / Game Boy homebrew test ROM builders
├── tsconfig.json                # TypeScript compiler options
├── vite.config.ts               # Vite configuration with Tailwind 4 plugin
├── public/
│   ├── emulator.html            # Isolated EmulatorJS host page (loaded in an iframe by Player.tsx)
│   ├── ps2.html                 # Play! PlayStation 2 host page (same postMessage protocol)
│   ├── emulatorjs/              # Vendored EmulatorJS runtime + libretro cores (see npm run fetch:cores)
│   ├── ps2/                     # Vendored Play! WebAssembly core (Play.js, Play.wasm, LICENSE.txt)
│   ├── test-roms/               # Homebrew test ROMs rebuilt on server start (see testRoms.ts)
│   │   ├── retro_pilot.nes      # Runnable NROM test cart (text, movable sprite, beep)
│   │   └── pocket_monk.gb       # Runnable DMG test cart (text, movable sprite, beep)
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
    │   ├── Player.tsx           # Fullscreen player: EmulatorJS bridge, CRT overlay, multi-slot saves, gamepad skins, demo engine
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
   - `/emulatorjs` -> points to `public/emulatorjs` with `Cache-Control: immutable, max-age=1y` (vendored EmulatorJS runtime + cores)

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
| `ps2` | Sony PlayStation 2 | 2000 | Play! (`public/ps2.html`) | 4:3 |

---

## 8. Player & Emulation Engine Architecture

`src/components/Player.tsx` picks the engine automatically when a game is launched:

1. **EJS Core (real emulation, default for every game that has a ROM)**
   - ROM source is resolved in this order: IndexedDB blob (`retroDb.getRom(game.id)`) -> `game.romBlob` -> `game.romUrl` (server uploads / test ROMs).
   - EmulatorJS runs inside an isolated iframe (`public/emulator.html`), one iframe per play session, because EmulatorJS keeps global state and cannot be torn down cleanly.
   - The Player drives it over `postMessage` (`init`, then `cmd` RPCs: `saveState`, `loadState`, `screenshot`, `setVolume`, `setSpeed`, `restart`, `input`). The frame answers with `ready`, `started`, `error`, `result` and forwards the `F5`/`F8` hotkeys.
   - `ConsoleMeta.ejsCore` maps each console to its EmulatorJS system id (`nes`, `snes`, `gb`, `gba`, `segaMD`, `n64`, `psx`); the runtime and cores are vendored in `public/emulatorjs/` and served same-origin, so playing a game needs no internet connection.
   - Save states are the raw core state (`application/octet-stream`) stored in IndexedDB slots 1-3, auto-save every 30s into slot 99.
   - Speed: 1x / 2x / 4x (fast-forward) / 0.5x (slow motion). Physical USB/Bluetooth gamepads work through EmulatorJS' built-in Gamepad API support.
   - The on-screen virtual gamepad sends RetroPad inputs (`simulateInput`).
   - Default keyboard: Arrows = D-Pad, Z = A, X = B, Enter = Start, V = Select.

2. **Vibe Core (arcade demo)**
   - Used only for library cards without any ROM file (the built-in demo cards) or when the core fails to start and the user chooses the demo.
   - 60 FPS canvas shooter with rewind (`Backspace`), JSON save states and skinnable gamepad.

### Vendored EmulatorJS runtime and cores
EmulatorJS normally loads its runtime and libretro cores from `cdn.emulatorjs.org` on every play session. RetroPolo vendors them instead, so nothing is fetched from a third party at runtime:

- `npm run fetch:cores` (`scripts/fetch-emulatorjs-core.mjs`) downloads EmulatorJS `4.2.3` into `public/emulatorjs/4.2.3/`: `loader.js`, `emulator.min.js`, `emulator.min.css`, `version.json`, `compression/*` (the core archives are 7z containers), `localization/*` and the cores themselves. Files already on disk are skipped; pass `--force` to re-download.
- Cores are the 7 systems in `CONSOLES` plus every alternative offered by the in-game **Core** menu: `fceumm`/`nestopia` (nes), `snes9x` (snes), `gambatte` (gb/gbc), `mgba` (gba), `genesis_plus_gx`/`picodrive` (segaMD), `mupen64plus_next`/`parallel_n64` (n64), `pcsx_rearmed`/`mednafen_psx_hw` (psx). All four builds of each core are kept — `-thread` for the Threads option and `-legacy` when WebGL2 is off — plus `cores/reports/*.json`, which EmulatorJS uses to key its IndexedDB cache. ~50MB total.
- `public/emulator.html` points `EJS_pathtodata` at `/emulatorjs/4.2.3/` (keep in sync with `VERSION` in the fetch script), and `server.ts` serves `/emulatorjs` with `Cache-Control: immutable, max-age=1y`. Because the version is part of the URL, the first play session transfers a core once and every later session is served entirely from the browser cache, while a version bump lands on a fresh URL instead of racing existing caches.
- EmulatorJS' "check for updates" ping hardcodes `cdn.emulatorjs.org` and fires on `localhost`, so the fetch script rewrites that one string in `emulator.min.js` to the vendored `version.json`; the script fails loudly if a future EmulatorJS release moves it. No other runtime fetch leaves our origin.
- EmulatorJS is **GPL-3.0** (the PS2 core below is BSD-2-Clause). The license text is vendored at `public/emulatorjs/LICENSE.txt`, and each core archive carries its own `license.txt` which EmulatorJS surfaces in the menu.
- `.gitattributes` marks `public/emulatorjs/` as binary so `core.autocrlf` cannot corrupt the 7z archives or WebAssembly modules.

### PlayStation 2 (Play! core, experimental)
EmulatorJS has no PS2 core, so PS2 games run on [Play!](https://github.com/jpd002/Play-) (BSD-2-Clause) compiled to WebAssembly:
- `public/ps2/Play.js` + `Play.wasm` are vendored from the official web build (`npm run fetch:ps2` re-downloads them; license in `public/ps2/LICENSE.txt`).
- `public/ps2.html` hosts the core and speaks the same `postMessage` protocol as `emulator.html`; `ConsoleMeta.emulator === 'playjs'` makes the Player load it.
- The core uses WebAssembly threads (SharedArrayBuffer), so `server.ts` sends `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` on every response. Safari does not support `credentialless`, so PS2 needs Chrome/Edge/Firefox.
- No BIOS needed. Supported: `.iso`, `.cso`, `.chd`, `.isz`, `.elf`. Disc images are streamed on demand (`File.slice` for local ROMs, HTTP Range requests for server uploads), so multi-GB ISOs are never loaded fully into memory. Upload limit is 10GB.
- On upload, `.iso`/`.chd` files larger than 800MB are auto-detected as PS2, smaller ones as PS1.
- Not supported by the core: save states, speed control, volume. Reset remounts the frame and reboots the disc.
- Keyboard: Arrows = D-Pad, Z = Cross, X = Circle, A = Square, S = Triangle, Enter = Start, Backspace = Select, 1/2/3 = L1/L2/L3, 8/9/0 = R1/R2/R3, F/H/T/G = left stick, J/L/I/K = right stick. The virtual gamepad maps A/B/X/Y to Circle/Cross/Triangle/Square.
- Performance is far below desktop PCSX2: many games are slow or do not boot (see the [Play! compatibility list](https://github.com/jpd002/Play-Compatibility/issues)).

### Bundled test cartridges (`testRoms.ts`)
`server.ts` rebuilds two real homebrew ROMs on every start into `public/test-roms/`:
- `retro_pilot.nes`: NROM (mapper 0), text rendered with a built-in font, D-Pad moves a sprite, A changes the background color and plays a pulse-channel beep.
- `pocket_monk.gb`: 32KB ROM-only DMG cart with valid header/global checksums, same D-Pad/A behaviour (A inverts the palette + beep).

They are tiny programs assembled by a helper in `testRoms.ts`, so they exercise the whole pipeline (download -> core -> video -> input -> audio -> save states).

---

## 9. Next Steps / Continuation Roadmap for Incoming Agents

If continuing feature development, prioritize the following tasks in order:

1. **Gamepad API for the demo engine**:
   - Physical gamepads already work in EJS Core; the Vibe Core demo still reads keyboard only.
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

# Re-download the vendored emulator files (already committed, so only needed to update them)
npm run fetch:cores   # EmulatorJS runtime + libretro cores -> public/emulatorjs/
npm run fetch:ps2     # Play! PS2 core -> public/ps2/
npm run fetch:all     # both
```
