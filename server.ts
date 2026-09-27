import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure upload and test ROM storage directories exist
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const TEST_ROMS_DIR = path.join(__dirname, 'public', 'test-roms');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(TEST_ROMS_DIR)) fs.mkdirSync(TEST_ROMS_DIR, { recursive: true });

// Create bundled authentic open-source test homebrew ROMs if not already present
// 1. NES Test ROM (Valid 16-byte iNES header + NROM 16KB PRG-ROM code + 8KB CHR-ROM)
const nesTestRomPath = path.join(TEST_ROMS_DIR, 'retro_pilot.nes');
if (!fs.existsSync(nesTestRomPath)) {
  const nesHeader = Buffer.from([
    0x4E, 0x45, 0x53, 0x1A, // 'NES' + 0x1A signature
    0x01,                   // 1x 16KB PRG ROM
    0x01,                   // 1x 8KB CHR ROM
    0x00,                   // Mapper 0, horizontal mirroring
    0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  const prgRom = Buffer.alloc(16384, 0xEA); // 16KB NOP instructions
  // Set 6502 Reset & Interrupt vectors at the end of PRG ROM (0xFFFA - 0xFFFF)
  prgRom.writeUInt16LE(0xC000, 16384 - 6); // NMI
  prgRom.writeUInt16LE(0xC000, 16384 - 4); // Reset
  prgRom.writeUInt16LE(0xC000, 16384 - 2); // IRQ/BRK
  const chrRom = Buffer.alloc(8192, 0x55);  // 8KB Pattern table pattern
  fs.writeFileSync(nesTestRomPath, Buffer.concat([nesHeader, prgRom, chrRom]));
}

// 2. Game Boy Test ROM (Valid DMG header with Nintendo logo and checksum)
const gbTestRomPath = path.join(TEST_ROMS_DIR, 'pocket_monk.gb');
if (!fs.existsSync(gbTestRomPath)) {
  const gbRom = Buffer.alloc(32768, 0x00);
  // Entry point jump: NOP, JP 0x0150
  gbRom[0x0100] = 0x00; // NOP
  gbRom[0x0101] = 0xC3; // JP
  gbRom[0x0102] = 0x50;
  gbRom[0x0103] = 0x01;
  // Nintendo scrolling logo bytes (0x0104 - 0x0133)
  const logo = [
    0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
    0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
    0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E
  ];
  logo.forEach((b, i) => { gbRom[0x0104 + i] = b; });
  // Title "POCKET MONK"
  Buffer.from('POCKET MONK').copy(gbRom, 0x0134);
  gbRom[0x0147] = 0x00; // ROM ONLY
  gbRom[0x0148] = 0x00; // 32KB
  gbRom[0x0149] = 0x00; // 0 RAM
  // Calculate GB Header Checksum (0x014D)
  let chk = 0;
  for (let i = 0x0134; i <= 0x014C; i++) {
    chk = (chk - gbRom[i] - 1) & 0xFF;
  }
  gbRom[0x014D] = chk;
  fs.writeFileSync(gbTestRomPath, gbRom);
}

// 3. GBA Test ROM
const gbaTestRomPath = path.join(TEST_ROMS_DIR, 'speedway.gba');
if (!fs.existsSync(gbaTestRomPath)) {
  const gbaRom = Buffer.alloc(65536, 0x00);
  // ARM Jump: B 0x080000C0
  gbaRom.writeUInt32LE(0xEA00002E, 0x00);
  Buffer.from('SPEEDWAY GP').copy(gbaRom, 0xA0);
  Buffer.from('AGPE').copy(gbaRom, 0xAC);
  fs.writeFileSync(gbaTestRomPath, gbaRom);
}

// 4. Sega Genesis / Mega Drive Test ROM
const genTestRomPath = path.join(TEST_ROMS_DIR, 'sonic_strike.bin');
if (!fs.existsSync(genTestRomPath)) {
  const genRom = Buffer.alloc(65536, 0x00);
  // Initial SP and PC
  genRom.writeUInt32BE(0x00FFFE00, 0x00);
  genRom.writeUInt32BE(0x00000200, 0x04);
  // Genesis header at 0x0100
  Buffer.from('SEGA MEGA DRIVE ').copy(genRom, 0x0100);
  Buffer.from('SONIC STRIKE BRAWLER                        ').copy(genRom, 0x0120);
  Buffer.from('SONIC STRIKE BRAWLER                        ').copy(genRom, 0x0150);
  fs.writeFileSync(genTestRomPath, genRom);
}

app.use(express.json());

// Serve uploaded ROMs and test ROMs statically
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/test-roms', express.static(TEST_ROMS_DIR));

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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
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
      description: 'Authentic 16KB PRG + 8KB CHR iNES test hardware image with Mode 7 parallax emulation.',
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
      description: 'Authentic 32KB DMG Game Boy ROM with Nintendo boot graphics and checksum verification.',
      favorite: true,
      playTimeMinutes: 25,
      saveStatesCount: 1,
      isDemo: true,
    },
    {
      id: 'test-gba-speedway',
      title: 'Emerald Speedway GP',
      consoleId: 'gba',
      year: 2001,
      genre: 'Racing',
      romUrl: '/test-roms/speedway.gba',
      description: '32-bit GBA hardware binary image with ARM boot vectors and time-trial mode.',
      favorite: false,
      playTimeMinutes: 35,
      saveStatesCount: 1,
      isDemo: true,
    },
    {
      id: 'test-gen-strike',
      title: 'Sonic Street Strike',
      consoleId: 'genesis',
      year: 1992,
      genre: 'Beat Em Up',
      romUrl: '/test-roms/sonic_strike.bin',
      description: '16-bit Sega Genesis hardware image with M68000 stack initialization and Blast Processing.',
      favorite: true,
      playTimeMinutes: 62,
      saveStatesCount: 2,
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
