// Downloads the EmulatorJS runtime and the libretro cores RetroPolo actually uses into public/emulatorjs/.
// EmulatorJS is GPL-3.0: https://github.com/EmulatorJS/EmulatorJS
//
// The files are vendored so that playing a game never depends on cdn.emulatorjs.org being reachable:
// the browser fetches them once from our own origin and then serves them from its HTTP cache
// (see the immutable Cache-Control header in server.ts) plus EmulatorJS' own IndexedDB core cache.
//
// Core archives are 7z containers holding <core>.js / <core>.wasm / core.json / license.txt,
// which is why data/compression/* must be vendored alongside them.
//
// Usage: npm run fetch:cores          (skips files already on disk)
//        npm run fetch:cores -- --force   (re-downloads everything)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const VERSION = '4.2.3';
const BASE = `https://cdn.emulatorjs.org/${VERSION}/data`;
// Files live under a version directory so the server can cache them immutably: a new version is a
// new URL, which means browsers never serve a stale core and never re-download an unchanged one.
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'emulatorjs', VERSION);
const CONCURRENCY = 6;

// System ids used by CONSOLES (src/utils/constants.ts) mapped through EmulatorJS' own core table:
// each system keeps its default core plus every alternative offered by the in-game "Core" menu.
const CORES = [
  'fceumm', //             nes
  'nestopia', //           nes (alternative)
  'snes9x', //             snes
  'gambatte', //           gb / gbc
  'mgba', //               gba
  'genesis_plus_gx', //    segaMD
  'picodrive', //          segaMD (alternative)
  'mupen64plus_next', //   n64
  'parallel_n64', //       n64 (default on mobile Safari, also an alternative elsewhere)
  'pcsx_rearmed', //       psx
  'mednafen_psx_hw', //    psx (alternative)
];

// All four builds of every core are reachable at runtime: "-thread" when the user enables the
// Threads option (SharedArrayBuffer is available because server.ts opts into cross-origin isolation)
// and "-legacy" when WebGL2 is unavailable or disabled for that core.
const CORE_VARIANTS = ['-wasm.data', '-thread-wasm.data', '-legacy-wasm.data', '-thread-legacy-wasm.data'];

// EmulatorJS' "check for updates" ping hardcodes the CDN and fires on localhost, so it is the only
// runtime fetch that would still leave our origin. Rewire it to our vendored copy, which always
// reports the version we ship, making the check a same-origin no-op.
const PATCHES = {
  'emulator.min.js': [
    ['https://cdn.emulatorjs.org/stable/data/version.json', `/emulatorjs/${VERSION}/version.json`],
  ],
};

const LOCALIZATION = [
  'af-FR', 'ar-AR', 'ben-BEN', 'de-GER', 'el-GR', 'en-US', 'es-ES', 'fa-AF', 'hi-HI', 'it-IT',
  'ja-JA', 'jv-JV', 'ko-KO', 'pt-BR', 'retroarch', 'ro-RO', 'ru-RU', 'tr-TR', 'vi-VN', 'zh-CN',
];

const FILES = [
  'loader.js',
  'emulator.min.js',
  'emulator.min.css',
  'version.json',
  ...['extract7z.js', 'extractzip.js', 'libunrar.js', 'libunrar.wasm'].map((f) => `compression/${f}`),
  ...LOCALIZATION.map((l) => `localization/${l}.json`),
  ...CORES.flatMap((core) => [
    ...CORE_VARIANTS.map((variant) => `cores/${core}${variant}`),
    `cores/reports/${core}.json`,
  ]),
];

const force = process.argv.includes('--force');
let downloaded = 0;
let skipped = 0;
let bytes = 0;

async function save(relPath) {
  const dest = path.join(OUT_DIR, relPath);
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    skipped++;
    bytes += fs.statSync(dest).size;
    return;
  }

  const res = await fetch(`${BASE}/${relPath}`);
  if (!res.ok) throw new Error(`Failed to download ${relPath}: HTTP ${res.status}`);
  let buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`Empty response for ${relPath}`);

  for (const [needle, replacement] of PATCHES[relPath] || []) {
    const text = buf.toString('utf8');
    if (!text.includes(needle)) {
      throw new Error(`Patch target not found in ${relPath}: "${needle}" (EmulatorJS changed, update PATCHES)`);
    }
    buf = Buffer.from(text.split(needle).join(replacement), 'utf8');
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  downloaded++;
  bytes += buf.length;
  console.log(`emulatorjs: ${relPath} (${(buf.length / 1024).toFixed(0)} KB)`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (let i = 0; i < FILES.length; i += CONCURRENCY) {
  await Promise.all(FILES.slice(i, i + CONCURRENCY).map(save));
}

console.log(
  `\nEmulatorJS ${VERSION}: ${FILES.length} files in public/emulatorjs/ ` +
    `(${downloaded} downloaded, ${skipped} cached, ${(bytes / 1048576).toFixed(1)} MB)`,
);
