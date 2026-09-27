// Downloads the Play! PlayStation 2 WebAssembly core (Play!.js web build) into public/ps2/.
// Play! is BSD-2-Clause licensed: https://github.com/jpd002/Play-
// The files are vendored because purei.org serves them without CORS headers,
// which a cross-origin-isolated page (required for SharedArrayBuffer/pthreads) cannot load.
//
// Usage: npm run fetch:ps2
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SOURCE = 'https://playjs.purei.org';
const FILES = ['Play.js', 'Play.wasm'];
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ps2');

fs.mkdirSync(outDir, { recursive: true });
for (const file of FILES) {
  const res = await fetch(`${SOURCE}/${file}`);
  if (!res.ok) throw new Error(`Failed to download ${file}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(outDir, file), buf);
  console.log(`ps2 core: ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
}
