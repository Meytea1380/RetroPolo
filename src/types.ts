export type ConsoleId = 'nes' | 'snes' | 'gb' | 'gbc' | 'gba' | 'genesis' | 'n64' | 'ps1';

export interface ConsoleMeta {
  id: ConsoleId;
  name: string;
  shortName: string;
  generation: string;
  year: number;
  color: string;
  badgeBg: string;
  borderColor: string;
  glowColor: string;
  icon: string;
  extensions: string[];
  coreName: string;
  nativeAspect: string;
}

export interface GameItem {
  id: string;
  title: string;
  consoleId: ConsoleId;
  year: number;
  genre: string;
  coverUrl: string;
  description?: string;
  favorite: boolean;
  lastPlayed?: string; // ISO date string
  playTimeMinutes: number;
  saveStatesCount: number;
  romBlob?: Blob;
  romUrl?: string;
  isDemo?: boolean;
}

export type CrtScanlineMode = 'none' | 'subtle' | 'medium' | 'heavy';
export type CrtColorPreset = 'standard' | 'trinitron' | 'gameboy' | 'amber' | 'cyberpunk';

export interface CrtSettings {
  enabled: boolean;
  scanlineMode: CrtScanlineMode;
  curvature: boolean;
  flicker: boolean;
  chromaticAberration: boolean;
  phosphorGrid: boolean;
  colorPreset: CrtColorPreset;
  bloom: boolean;
  vignette: boolean;
}

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
}

export interface KeyMapping {
  up: string;
  down: string;
  left: string;
  right: string;
  a: string;
  b: string;
  x: string;
  y: string;
  start: string;
  select: string;
}

export type ControllerSkin = 'snes' | 'nes' | 'gb' | 'genesis';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  points: number;
}

export type ActivePage = 'home' | 'library' | 'upload' | 'crt-studio' | 'player' | 'settings';
