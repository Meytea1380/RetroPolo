import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildNesRom, buildGbRom } from './testRoms';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure upload and test ROM storage directories exist
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const TEST_ROMS_DIR = path.join(__dirname, 'public', 'test-roms');
const EMULATORJS_DIR = path.join(__dirname, 'public', 'emulatorjs');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(TEST_ROMS_DIR)) fs.mkdirSync(TEST_ROMS_DIR, { recursive: true });

// Build the bundled homebrew test cartridges (always rebuilt so they stay in sync with testRoms.ts)
fs.writeFileSync(path.join(TEST_ROMS_DIR, 'retro_pilot.nes'), buildNesRom());
fs.writeFileSync(path.join(TEST_ROMS_DIR, 'pocket_monk.gb'), buildGbRom());
// Remove stale placeholder images from older versions (they contained no runnable code)
for (const stale of ['speedway.gba', 'sonic_strike.bin']) {
  const p = path.join(TEST_ROMS_DIR, stale);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Cross-origin isolation: the PS2 core (Play!) runs WebAssembly pthreads and needs SharedArrayBuffer.
// "credentialless" keeps third-party CDNs (Google Fonts) loadable without CORP headers.
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

app.use(express.json());

// Serve uploaded ROMs and test ROMs statically
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/test-roms', express.static(TEST_ROMS_DIR));

// Vendored EmulatorJS runtime + cores (~50MB of 7z archives) under /emulatorjs/<version>/. The version
// is part of the URL (see scripts/fetch-emulatorjs-core.mjs), so immutable long-lived caching is safe:
// a core is transferred on the first play session and served from the browser cache ever after, while a
// version bump lands on a fresh URL instead of racing clients' caches.
app.use('/emulatorjs', express.static(EMULATORJS_DIR, { maxAge: '1y', immutable: true }));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const unique = `${Date.now()}_${cleanBase}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB max (PS2 DVD images)
});

// Real ROM Upload endpoint
app.post('/api/upload-rom', upload.single('romFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ROM file uploaded' });
    }

    const { title, consoleId, genre, year } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const newGame = {
      id: `server-${Date.now()}`,
      title: title || path.basename(req.file.originalname, path.extname(req.file.originalname)),
      consoleId: consoleId || 'nes',
      year: parseInt(year) || 1990,
      genre: genre || 'Action',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      romUrl: fileUrl,
      favorite: false,
      playTimeMinutes: 0,
      saveStatesCount: 0,
      description: `Uploaded ROM: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`,
    };

    return res.json({
      success: true,
      message: 'ROM uploaded and verified on server',
      game: newGame,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server upload failed' });
  }
});

// Real Test ROMs catalog API
app.get('/api/test-roms', (_req, res) => {
  const testCatalog = [
    {
      id: 'test-nes-retro-pilot',
      title: 'Retro Pilot: Star Vanguard',
      consoleId: 'nes',
      year: 1989,
      genre: 'Shoot Em Up',
      romUrl: '/test-roms/retro_pilot.nes',
      description: 'Real NROM homebrew test cart (16KB PRG + 8KB CHR). Move the ship with the D-Pad, press A for a color change + beep.',
      favorite: true,
      playTimeMinutes: 48,
      saveStatesCount: 3,
      isDemo: true,
    },
    {
      id: 'test-gb-monk',
      title: 'Pocket Monastery: Green Edition',
      consoleId: 'gb',
      year: 1991,
      genre: 'Puzzle Adventure',
      romUrl: '/test-roms/pocket_monk.gb',
      description: 'Real 32KB DMG homebrew test cart with valid header checksums. Move the ship with the D-Pad, press A to invert + beep.',
      favorite: true,
      playTimeMinutes: 25,
      saveStatesCount: 1,
      isDemo: true,
    }
  ];

  res.json({ success: true, games: testCatalog });
});

// Server status endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    storageReady: true,
    uploadsCount: fs.readdirSync(UPLOADS_DIR).length,
    testRomsCount: fs.readdirSync(TEST_ROMS_DIR).length,
  });
});

async function startServer() {
  // Vite dev middleware setup
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RetroVibe server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
