/**
 * Builds small but *real* homebrew test cartridges (NES + Game Boy) at server start.
 * Each ROM boots on a real emulator core, prints text using a built-in font,
 * shows a sprite you can move with the D-Pad and reacts to the A button,
 * so the whole EmulatorJS pipeline (download -> core -> video -> input -> audio) can be verified.
 */

// ---------------------------------------------------------------------------
// Minimal two-pass assembler helper (label resolution for absolute + relative)
// ---------------------------------------------------------------------------
type Item =
  | { kind: 'bytes'; data: number[] }
  | { kind: 'label'; name: string }
  | { kind: 'abs16'; label: string; bigEndian?: boolean }
  | { kind: 'rel8'; label: string };

class Asm {
  items: Item[] = [];
  constructor(private origin: number) {}
  b(...data: number[]) {
    this.items.push({ kind: 'bytes', data });
    return this;
  }
  label(name: string) {
    this.items.push({ kind: 'label', name });
    return this;
  }
  /** opcode followed by a 16-bit little-endian address of a label */
  abs(opcode: number[], label: string) {
    this.items.push({ kind: 'bytes', data: opcode });
    this.items.push({ kind: 'abs16', label });
    return this;
  }
  /** opcode followed by an 8-bit relative branch offset to a label */
  rel(opcode: number, label: string) {
    this.items.push({ kind: 'bytes', data: [opcode] });
    this.items.push({ kind: 'rel8', label });
    return this;
  }
  build(): { code: number[]; labels: Record<string, number> } {
    const labels: Record<string, number> = {};
    let pc = this.origin;
    for (const it of this.items) {
      if (it.kind === 'label') labels[it.name] = pc;
      else if (it.kind === 'bytes') pc += it.data.length;
      else if (it.kind === 'abs16') pc += 2;
      else pc += 1;
    }
    const code: number[] = [];
    pc = this.origin;
    for (const it of this.items) {
      if (it.kind === 'bytes') {
        code.push(...it.data);
        pc += it.data.length;
      } else if (it.kind === 'abs16') {
        const addr = labels[it.label];
        if (addr === undefined) throw new Error(`Unknown label ${it.label}`);
        code.push(addr & 0xff, (addr >> 8) & 0xff);
        pc += 2;
      } else if (it.kind === 'rel8') {
        const addr = labels[it.label];
        if (addr === undefined) throw new Error(`Unknown label ${it.label}`);
        const off = addr - (pc + 1);
        if (off < -128 || off > 127) throw new Error(`Branch to ${it.label} out of range`);
        code.push(off & 0xff);
        pc += 1;
      }
    }
    return { code, labels };
  }
}

// ---------------------------------------------------------------------------
// 5x7 font for ASCII 32..95 (space .. underscore). Each glyph = 7 rows, 5 bits.
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '+': [0, 4, 4, 31, 4, 4, 0],
  ',': [0, 0, 0, 0, 12, 4, 8],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 12, 12],
  '/': [1, 1, 2, 4, 8, 16, 16],
  ':': [0, 12, 12, 0, 12, 12, 0],
  '>': [8, 4, 2, 1, 2, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2],
  '?': [14, 17, 1, 2, 4, 0, 4],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [28, 18, 17, 17, 17, 18, 28],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 17, 25, 21, 19, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
};

/** 8 row bitmaps (1 bit per pixel, MSB = left) for tile index = ascii - 32 */
function glyphRows(ascii: number): number[] {
  const g = FONT[String.fromCharCode(ascii)] || FONT[' '];
  return [0, ...g.map((r) => (r << 2) & 0xff)]; // shift into 8px cell with a top blank row
}

/** A little spaceship sprite (8x8) */
const SHIP_ROWS = [0x18, 0x18, 0x3c, 0x7e, 0xff, 0xff, 0x66, 0x42];
const FONT_TILE_COUNT = 64; // ascii 32..95
const SHIP_TILE = FONT_TILE_COUNT; // tile #64

// ---------------------------------------------------------------------------
// NES (iNES, mapper 0 / NROM-128)
// ---------------------------------------------------------------------------
export function buildNesRom(): Buffer {
  const a = new Asm(0xc000);
  const PPUCTRL = 0x2000, PPUMASK = 0x2001, PPUSTATUS = 0x2002, OAMADDR = 0x2003;
  const PPUSCROLL = 0x2005, PPUADDR = 0x2006, PPUDATA = 0x2007, OAMDMA = 0x4014, JOY1 = 0x4016;
  const lo = (v: number) => v & 0xff;
  const hi = (v: number) => (v >> 8) & 0xff;
  // zero page vars
  const BUTTONS = 0x10, PREV = 0x11, PRESSED = 0x12, BGCOLOR = 0x13, PTR = 0x14; // PTR/PTR+1

  const texts: { row: number; col: number; s: string }[] = [
    { row: 4, col: 11, s: 'RETROPOLO' },
    { row: 6, col: 6, s: 'NES TEST CARTRIDGE' },
    { row: 10, col: 5, s: 'EMULATOR CORE: OK!' },
    { row: 20, col: 5, s: 'D-PAD : MOVE SHIP' },
    { row: 22, col: 5, s: 'A     : COLOR + BEEP' },
  ];

  a.label('reset')
    .b(0x78) // SEI
    .b(0xd8) // CLD
    .b(0xa2, 0x40).b(0x8e, lo(0x4017), hi(0x4017)) // disable APU frame IRQ
    .b(0xa2, 0xff).b(0x9a) // stack
    .b(0xe8) // X = 0
    .b(0x8e, lo(PPUCTRL), hi(PPUCTRL))
    .b(0x8e, lo(PPUMASK), hi(PPUMASK))
    .b(0x8e, lo(0x4010), hi(0x4010));
  a.label('vwait1').b(0x2c, lo(PPUSTATUS), hi(PPUSTATUS)).rel(0x10, 'vwait1');
  // clear RAM, fill OAM shadow ($0200) with $FF (hide sprites)
  a.label('clrmem')
    .b(0xa9, 0x00)
    .b(0x95, 0x00) // STA $00,X
    .b(0x9d, 0x00, 0x01)
    .b(0x9d, 0x00, 0x03)
    .b(0x9d, 0x00, 0x04)
    .b(0x9d, 0x00, 0x05)
    .b(0x9d, 0x00, 0x06)
    .b(0x9d, 0x00, 0x07)
    .b(0xa9, 0xff)
    .b(0x9d, 0x00, 0x02)
    .b(0xe8)
    .rel(0xd0, 'clrmem');
  a.label('vwait2').b(0x2c, lo(PPUSTATUS), hi(PPUSTATUS)).rel(0x10, 'vwait2');

  // palette
  a.b(0xad, lo(PPUSTATUS), hi(PPUSTATUS))
    .b(0xa9, 0x3f).b(0x8d, lo(PPUADDR), hi(PPUADDR))
    .b(0xa9, 0x00).b(0x8d, lo(PPUADDR), hi(PPUADDR))
    .b(0xa2, 0x00);
  a.label('palloop').abs([0xbd], 'palette').b(0x8d, lo(PPUDATA), hi(PPUDATA)).b(0xe8).b(0xe0, 32).rel(0xd0, 'palloop');

  // clear nametable 0 + attributes (1024 bytes)
  a.b(0xa9, 0x20).b(0x8d, lo(PPUADDR), hi(PPUADDR))
    .b(0xa9, 0x00).b(0x8d, lo(PPUADDR), hi(PPUADDR))
    .b(0xa0, 0x04).b(0xa2, 0x00).b(0xa9, 0x00);
  a.label('clrnt').b(0x8d, lo(PPUDATA), hi(PPUDATA)).b(0xe8).rel(0xd0, 'clrnt').b(0x88).rel(0xd0, 'clrnt');

  // write strings: data table = [addrHi, addrLo, chars..., 0xFF] ..., 0x00 terminator
  // LDA #<strings ; STA PTR ; LDA #>strings ; STA PTR+1 (immediates patched after build)
  a.label('ldptr_lo').b(0xa9, 0x00).b(0x85, PTR)
    .label('ldptr_hi').b(0xa9, 0x00).b(0x85, PTR + 1)
    .b(0xa0, 0x00);
  a.label('strnext')
    .b(0xb1, PTR).rel(0xf0, 'strdone') // LDA (PTR),Y ; BEQ done
    .b(0x8d, lo(PPUADDR), hi(PPUADDR)).b(0xc8)
    .b(0xb1, PTR).b(0x8d, lo(PPUADDR), hi(PPUADDR)).b(0xc8);
  a.label('strchar')
    .b(0xb1, PTR).b(0xc9, 0xff).rel(0xf0, 'strend')
    .b(0x38).b(0xe9, 0x20) // SEC ; SBC #32  -> tile index
    .b(0x8d, lo(PPUDATA), hi(PPUDATA)).b(0xc8).rel(0xd0, 'strchar');
  a.label('strend').b(0xc8).rel(0xd0, 'strnext');
  a.label('strdone');

  // sprite 0: Y, tile, attr, X
  a.b(0xa9, 112).b(0x8d, 0x00, 0x02)
    .b(0xa9, SHIP_TILE).b(0x8d, 0x01, 0x02)
    .b(0xa9, 0x00).b(0x8d, 0x02, 0x02)
    .b(0xa9, 124).b(0x8d, 0x03, 0x02);
  a.b(0xa9, 0x0f).b(0x85, BGCOLOR);
  // enable pulse 1
  a.b(0xa9, 0x01).b(0x8d, 0x15, 0x40);
  // scroll 0, NMI on, rendering on
  a.b(0xa9, 0x00).b(0x8d, lo(PPUSCROLL), hi(PPUSCROLL)).b(0x8d, lo(PPUSCROLL), hi(PPUSCROLL))
    .b(0xa9, 0x80).b(0x8d, lo(PPUCTRL), hi(PPUCTRL))
    .b(0xa9, 0x1e).b(0x8d, lo(PPUMASK), hi(PPUMASK));
  a.label('forever').abs([0x4c], 'forever');

  // ---- NMI ----
  a.label('nmi').b(0x48).b(0x8a).b(0x48).b(0x98).b(0x48)
    .b(0xa9, 0x00).b(0x8d, lo(OAMADDR), hi(OAMADDR))
    .b(0xa9, 0x02).b(0x8d, lo(OAMDMA), hi(OAMDMA));
  // background color write $3F00
  a.b(0xad, lo(PPUSTATUS), hi(PPUSTATUS))
    .b(0xa9, 0x3f).b(0x8d, lo(PPUADDR), hi(PPUADDR))
    .b(0xa9, 0x00).b(0x8d, lo(PPUADDR), hi(PPUADDR))
    .b(0xa5, BGCOLOR).b(0x8d, lo(PPUDATA), hi(PPUDATA));
  // read controller
  a.b(0xa5, BUTTONS).b(0x85, PREV)
    .b(0xa9, 0x01).b(0x8d, lo(JOY1), hi(JOY1))
    .b(0xa9, 0x00).b(0x8d, lo(JOY1), hi(JOY1))
    .b(0xa2, 0x08);
  a.label('rdpad').b(0xad, lo(JOY1), hi(JOY1)).b(0x4a).b(0x26, BUTTONS).b(0xca).rel(0xd0, 'rdpad');
  // pressed = buttons & ~prev
  a.b(0xa5, PREV).b(0x49, 0xff).b(0x25, BUTTONS).b(0x85, PRESSED);
  // D-pad (bit3 up, bit2 down, bit1 left, bit0 right)
  a.b(0xa5, BUTTONS).b(0x29, 0x08).rel(0xf0, 'noup').b(0xce, 0x00, 0x02).b(0xce, 0x00, 0x02);
  a.label('noup').b(0xa5, BUTTONS).b(0x29, 0x04).rel(0xf0, 'nodown').b(0xee, 0x00, 0x02).b(0xee, 0x00, 0x02);
  a.label('nodown').b(0xa5, BUTTONS).b(0x29, 0x02).rel(0xf0, 'noleft').b(0xce, 0x03, 0x02).b(0xce, 0x03, 0x02);
  a.label('noleft').b(0xa5, BUTTONS).b(0x29, 0x01).rel(0xf0, 'noright').b(0xee, 0x03, 0x02).b(0xee, 0x03, 0x02);
  // A pressed (bit7): next background color + beep
  a.label('noright').b(0xa5, PRESSED).b(0x29, 0x80).rel(0xf0, 'noa')
    .b(0xe6, BGCOLOR).b(0xa5, BGCOLOR).b(0x29, 0x3f).b(0x85, BGCOLOR)
    .b(0xa9, 0xbf).b(0x8d, 0x00, 0x40) // duty 50%, constant vol 15
    .b(0xa9, 0x08).b(0x8d, 0x01, 0x40) // no sweep
    .b(0xa9, 0xa9).b(0x8d, 0x02, 0x40) // ~660Hz
    .b(0xa9, 0x18).b(0x8d, 0x03, 0x40); // length counter + timer hi
  a.label('noa')
    .b(0xa9, 0x00).b(0x8d, lo(PPUSCROLL), hi(PPUSCROLL)).b(0x8d, lo(PPUSCROLL), hi(PPUSCROLL))
    .b(0xa9, 0x80).b(0x8d, lo(PPUCTRL), hi(PPUCTRL))
    .b(0x68).b(0xa8).b(0x68).b(0xaa).b(0x68)
    .b(0x40); // RTI
  a.label('irq').b(0x40);

  // ---- data ----
  a.label('palette').b(
    0x0f, 0x30, 0x21, 0x2a, 0x0f, 0x30, 0x21, 0x2a, 0x0f, 0x30, 0x21, 0x2a, 0x0f, 0x30, 0x21, 0x2a,
    0x0f, 0x2a, 0x21, 0x30, 0x0f, 0x2a, 0x21, 0x30, 0x0f, 0x2a, 0x21, 0x30, 0x0f, 0x2a, 0x21, 0x30,
  );
  a.label('strings');
  for (const t of texts) {
    const addr = 0x2000 + t.row * 32 + t.col;
    a.b(hi(addr), lo(addr), ...Array.from(t.s).map((c) => c.charCodeAt(0)), 0xff);
  }
  a.b(0x00);

  const { code, labels } = a.build();
  // fix up LDA #<strings / LDA #>strings immediates
  code[labels.ldptr_lo - 0xc000 + 1] = labels.strings & 0xff;
  code[labels.ldptr_hi - 0xc000 + 1] = (labels.strings >> 8) & 0xff;

  const prg = Buffer.alloc(16384, 0xff);
  Buffer.from(code).copy(prg, 0);
  prg.writeUInt16LE(labels.nmi, 0x3ffa);
  prg.writeUInt16LE(labels.reset, 0x3ffc);
  prg.writeUInt16LE(labels.irq, 0x3ffe);

  // CHR: font in color 1 (plane 0 only), ship in color 3 (both planes)
  const chr = Buffer.alloc(8192, 0x00);
  for (let t = 0; t < FONT_TILE_COUNT; t++) {
    glyphRows(32 + t).forEach((row, y) => {
      chr[t * 16 + y] = row;
    });
  }
  SHIP_ROWS.forEach((row, y) => {
    chr[SHIP_TILE * 16 + y] = row;
    chr[SHIP_TILE * 16 + 8 + y] = row;
  });

  const header = Buffer.from([0x4e, 0x45, 0x53, 0x1a, 0x01, 0x01, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
  return Buffer.concat([header, prg, chr]);
}

// ---------------------------------------------------------------------------
// Game Boy (DMG, ROM ONLY, 32KB)
// ---------------------------------------------------------------------------
const NINTENDO_LOGO = [
  0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0c, 0x00, 0x0d,
  0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e, 0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99,
  0xbb, 0xbb, 0x67, 0x63, 0x6e, 0x0e, 0xec, 0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
];

export function buildGbRom(): Buffer {
  const a = new Asm(0x0150);
  const LY = 0x44, LCDC = 0x40, BGP = 0x47, OBP0 = 0x48, P1 = 0x00, NR52 = 0x26;
  const PREV = [0x00, 0xc0]; // $C000 little-endian
  const imm16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];

  const texts: { row: number; col: number; s: string }[] = [
    { row: 2, col: 5, s: 'RETROPOLO' },
    { row: 4, col: 1, s: 'GAME BOY TEST CART' },
    { row: 7, col: 1, s: 'EMULATOR CORE: OK!' },
    { row: 14, col: 1, s: 'D-PAD: MOVE SHIP' },
    { row: 16, col: 1, s: 'A: INVERT + BEEP' },
  ];

  a.label('start')
    .b(0xf3) // DI
    .b(0x31, ...imm16(0xfffe)); // LD SP,$FFFE
  a.label('wvb').b(0xf0, LY).b(0xfe, 144).rel(0x38, 'wvb'); // wait LY >= 144
  a.b(0xaf).b(0xe0, LCDC); // LCD off

  // copy tiles to $8000
  a.b(0x21, ...imm16(0x8000)).abs([0x11], 'tiles').b(0x01, ...imm16((FONT_TILE_COUNT + 1) * 16));
  a.label('cpy').b(0x1a).b(0x22).b(0x13).b(0x0b).b(0x78).b(0xb1).rel(0x20, 'cpy');

  // clear BG map $9800 (1024 bytes) with tile 0 (space)
  a.b(0x21, ...imm16(0x9800)).b(0x01, ...imm16(1024));
  a.label('clr').b(0xaf).b(0x22).b(0x0b).b(0x78).b(0xb1).rel(0x20, 'clr');

  // strings: table = [addrLo, addrHi, chars(tile idx)..., 0xFF], terminator 0x00 0x00
  a.abs([0x11], 'strings');
  a.label('snext')
    .b(0x1a).b(0x6f).b(0x13) // LD A,(DE) ; LD L,A ; INC DE
    .b(0x1a).b(0x67).b(0x13) // LD A,(DE) ; LD H,A ; INC DE
    .b(0x7c).b(0xb7).rel(0x28, 'sdone'); // LD A,H ; OR A ; JR Z done
  a.label('schar').b(0x1a).b(0x13).b(0xfe, 0xff).rel(0x28, 'snext').b(0x22).rel(0x18, 'schar');
  a.label('sdone');

  // clear OAM $FE00..$FE9F
  a.b(0x21, ...imm16(0xfe00)).b(0x06, 160);
  a.label('clroam').b(0xaf).b(0x22).b(0x05).rel(0x20, 'clroam');
  // sprite 0
  a.b(0x21, ...imm16(0xfe00))
    .b(0x3e, 96).b(0x22) // Y
    .b(0x3e, 84).b(0x22) // X
    .b(0x3e, SHIP_TILE).b(0x22)
    .b(0x3e, 0x00).b(0x22);

  // palettes, sound on, LCD on (BG+OBJ, tiles $8000, map $9800)
  a.b(0x3e, 0xe4).b(0xe0, BGP).b(0xe0, OBP0)
    .b(0x3e, 0x80).b(0xe0, NR52)
    .b(0x3e, 0x77).b(0xe0, 0x24) // NR50 volume
    .b(0x3e, 0x11).b(0xe0, 0x25) // NR51 ch1 both sides
    .b(0xaf).b(0xea, ...PREV)
    .b(0x3e, 0x93).b(0xe0, LCDC);

  // main loop: once per frame at LY == 144
  a.label('main').b(0xf0, LY).b(0xfe, 144).rel(0x20, 'main');
  // D-pad
  a.b(0x3e, 0x20).b(0xe0, P1).b(0xf0, P1).b(0xf0, P1).b(0x2f).b(0xe6, 0x0f).b(0x47); // B = dpad
  a.b(0x3e, 0x10).b(0xe0, P1).b(0xf0, P1).b(0xf0, P1).b(0xf0, P1).b(0xf0, P1).b(0x2f).b(0xe6, 0x0f).b(0x4f); // C = buttons
  a.b(0x3e, 0x30).b(0xe0, P1);
  // move sprite
  a.b(0x21, ...imm16(0xfe01)).b(0xcb, 0x40).rel(0x28, 'nr').b(0x34);
  a.label('nr').b(0xcb, 0x48).rel(0x28, 'nl').b(0x35);
  a.label('nl').b(0x21, ...imm16(0xfe00)).b(0xcb, 0x50).rel(0x28, 'nu').b(0x35);
  a.label('nu').b(0xcb, 0x58).rel(0x28, 'nd').b(0x34);
  // A newly pressed? (C bit0, prev in $C000)
  a.label('nd').b(0xfa, ...PREV).b(0x2f).b(0xa1).b(0xe6, 0x01).b(0x57) // D = pressed A
    .b(0x79).b(0xea, ...PREV)
    .b(0x7a).b(0xb7).rel(0x28, 'na')
    .b(0xf0, BGP).b(0x2f).b(0xe0, BGP) // invert palette
    .b(0x3e, 0x00).b(0xe0, 0x10) // NR10 no sweep
    .b(0x3e, 0x80).b(0xe0, 0x11) // NR11 duty 50%
    .b(0x3e, 0xf3).b(0xe0, 0x12) // NR12 vol 15, decay
    .b(0x3e, 0x83).b(0xe0, 0x13) // NR13 freq lo
    .b(0x3e, 0x87).b(0xe0, 0x14); // NR14 trigger + freq hi
  // wait until LY leaves 144
  a.label('na').b(0xf0, LY).b(0xfe, 144).rel(0x28, 'na');
  a.label('jmain').abs([0xc3], 'main');

  // tiles (2bpp; font color 3, ship color 3)
  a.label('tiles');
  for (let t = 0; t < FONT_TILE_COUNT; t++) {
    const rows = glyphRows(32 + t);
    rows.forEach((r) => a.b(r, r));
  }
  SHIP_ROWS.forEach((r) => a.b(r, r));

  a.label('strings');
  for (const t of texts) {
    const addr = 0x9800 + t.row * 32 + t.col;
    a.b(addr & 0xff, (addr >> 8) & 0xff, ...Array.from(t.s).map((c) => c.charCodeAt(0) - 32), 0xff);
  }
  a.b(0x00, 0x00);

  const { code } = a.build();
  const rom = Buffer.alloc(32768, 0x00);
  rom[0x100] = 0x00; // NOP
  rom[0x101] = 0xc3; // JP $0150
  rom[0x102] = 0x50;
  rom[0x103] = 0x01;
  NINTENDO_LOGO.forEach((b, i) => (rom[0x104 + i] = b));
  Buffer.from('RETROPOLO').copy(rom, 0x134);
  rom[0x147] = 0x00; // ROM ONLY
  rom[0x148] = 0x00; // 32KB
  rom[0x149] = 0x00; // no RAM
  rom[0x14a] = 0x01; // non-Japanese
  rom[0x14b] = 0x33;
  let chk = 0;
  for (let i = 0x134; i <= 0x14c; i++) chk = (chk - rom[i] - 1) & 0xff;
  rom[0x14d] = chk;
  Buffer.from(code).copy(rom, 0x150);
  let global = 0;
  for (let i = 0; i < rom.length; i++) if (i !== 0x14e && i !== 0x14f) global = (global + rom[i]) & 0xffff;
  rom.writeUInt16BE(global, 0x14e);
  return rom;
}
