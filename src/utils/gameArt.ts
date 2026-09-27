import { ConsoleId } from '../types';

/**
 * Creates high-fidelity retro game cover illustrations as inline SVG data URIs.
 * 100% self-contained, guaranteed zero broken images, crisp on any screen.
 */
export function getRetroGameCover(consoleId: ConsoleId, title: string, genre: string): string {
  const colors: Record<ConsoleId, { bg1: string; bg2: string; accent: string; grid: string }> = {
    nes: { bg1: '#3b0764', bg2: '#180828', accent: '#ef4444', grid: '#7f1d1d' },
    snes: { bg1: '#1e1b4b', bg2: '#0f0e26', accent: '#a855f7', grid: '#581c87' },
    gb: { bg1: '#14280a', bg2: '#081404', accent: '#84cc16', grid: '#365314' },
    gbc: { bg1: '#082f49', bg2: '#031726', accent: '#06b6d4', grid: '#164e63' },
    gba: { bg1: '#172554', bg2: '#0b132b', accent: '#3b82f6', grid: '#1e3a8a' },
    genesis: { bg1: '#042f2e', bg2: '#021817', accent: '#14b8a6', grid: '#134e4a' },
    n64: { bg1: '#422006', bg2: '#1f0d02', accent: '#eab308', grid: '#713f12' },
    ps1: { bg1: '#4c0519', bg2: '#24020c', accent: '#ec4899', grid: '#831843' },
  };

  const scheme = colors[consoleId] || colors.snes;
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeGenre = genre.toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${scheme.bg1}" />
        <stop offset="100%" stop-color="${scheme.bg2}" />
      </linearGradient>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${scheme.grid}" stroke-width="0.8" opacity="0.45" />
      </pattern>
      <linearGradient id="goldBanner" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${scheme.accent}" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3" />
      </linearGradient>
    </defs>

    <!-- Outer Box Background -->
    <rect width="400" height="500" fill="url(#bgGrad)" />
    <rect width="400" height="500" fill="url(#grid)" />

    <!-- Console Header Stripe -->
    <rect x="0" y="0" width="400" height="50" fill="rgba(0,0,0,0.6)" />
    <line x1="0" y1="50" x2="400" y2="50" stroke="${scheme.accent}" stroke-width="2" />
    <text x="24" y="32" font-family="'Press Start 2P', monospace" font-size="12" fill="${scheme.accent}" letter-spacing="1">
      ${consoleId.toUpperCase()} SPECIAL EDITION
    </text>

    <!-- Center Geometric Art (Space/Polygon/Retro) -->
    <g transform="translate(200, 240)">
      <!-- Outer diamond glow -->
      <polygon points="0,-110 110,0 0,110 -110,0" fill="none" stroke="${scheme.accent}" stroke-width="2.5" opacity="0.6" />
      <polygon points="0,-85 85,0 0,85 -85,0" fill="${scheme.accent}" fill-opacity="0.12" stroke="#ffffff" stroke-width="1.5" />
      
      <!-- Central Pixel Starburst or Emblem -->
      <circle cx="0" cy="0" r="45" fill="rgba(0,0,0,0.7)" stroke="${scheme.accent}" stroke-width="2" />
      
      <!-- Crosshairs -->
      <line x1="-60" y1="0" x2="60" y2="0" stroke="${scheme.accent}" stroke-dasharray="4,4" stroke-width="1.5" />
      <line x1="0" y1="-60" x2="0" y2="60" stroke="${scheme.accent}" stroke-dasharray="4,4" stroke-width="1.5" />
      
      <!-- Center Emblem Symbol -->
      <rect x="-14" y="-14" width="28" height="28" fill="${scheme.accent}" transform="rotate(45)" />
      <rect x="-8" y="-8" width="16" height="16" fill="#ffffff" transform="rotate(45)" />
    </g>

    <!-- Genre Kicker Tag -->
    <text x="200" y="390" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="600" font-size="13" fill="#a1a1aa" letter-spacing="2">
      ${safeGenre}
    </text>

    <!-- Title Banner -->
    <rect x="20" y="408" width="360" height="66" rx="6" fill="rgba(10, 10, 25, 0.85)" stroke="${scheme.accent}" stroke-width="1" />
    <text x="200" y="446" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="16" fill="#f4f4f5">
      ${safeTitle}
    </text>

    <!-- Seal of Quality Stamp -->
    <circle cx="345" cy="100" r="28" fill="rgba(0,0,0,0.8)" stroke="#fbbf24" stroke-width="1.5" />
    <text x="345" y="98" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="8" fill="#fbbf24">RETRO</text>
    <text x="345" y="108" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="7" fill="#fbbf24">ORIGINAL</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
