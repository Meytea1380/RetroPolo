import React, { useState, useEffect } from 'react';
import { CrtSettings, AudioSettings, GameItem, KeyMapping, CrtColorPreset } from '../types';
import { retroDb } from '../utils/db';
import { soundFx } from '../utils/audio';
import {
  Volume2,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Tv,
  Keyboard,
  Check,
  AlertTriangle,
  RotateCcw,
  Palette,
} from 'lucide-react';

interface SettingsProps {
  crtSettings: CrtSettings;
  onUpdateCrtSettings: (settings: CrtSettings) => void;
  audioSettings: AudioSettings;
  onUpdateAudioSettings: (settings: AudioSettings) => void;
  games: GameItem[];
  onImportLibrary: (games: GameItem[]) => void;
  onClearLibrary: () => void;
}

const DEFAULT_KEY_MAPPING: KeyMapping = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  a: 'KeyZ',
  b: 'KeyX',
  x: 'KeyA',
  y: 'KeyS',
  start: 'Enter',
  select: 'ShiftRight',
};

export const Settings: React.FC<SettingsProps> = ({
  crtSettings,
  onUpdateCrtSettings,
  audioSettings,
  onUpdateAudioSettings,
  games,
  onImportLibrary,
  onClearLibrary,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [keyMapping, setKeyMapping] = useState<KeyMapping>(() => {
    try {
      const saved = localStorage.getItem('retrovibe_keymapping');
      return saved ? JSON.parse(saved) : DEFAULT_KEY_MAPPING;
    } catch {
      return DEFAULT_KEY_MAPPING;
    }
  });

  const [listeningKey, setListeningKey] = useState<keyof KeyMapping | null>(null);

  // Key listening event handler
  useEffect(() => {
    if (!listeningKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      soundFx.playClick();

      const newMapping = {
        ...keyMapping,
        [listeningKey]: e.code || e.key,
      };

      setKeyMapping(newMapping);
      try {
        localStorage.setItem('retrovibe_keymapping', JSON.stringify(newMapping));
      } catch {}

      setListeningKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [listeningKey, keyMapping]);

  const handleExportLibrary = () => {
    soundFx.playClick();
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      games: games.map((g) => ({
        id: g.id,
        title: g.title,
        consoleId: g.consoleId,
        year: g.year,
        genre: g.genre,
        favorite: g.favorite,
        playTimeMinutes: g.playTimeMinutes,
        saveStatesCount: g.saveStatesCount,
        description: g.description,
      })),
      crtSettings,
      keyMapping,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retrovibe_library_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFx.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.games && Array.isArray(data.games)) {
          onImportLibrary(data.games);
          if (data.crtSettings) onUpdateCrtSettings(data.crtSettings);
          if (data.keyMapping) {
            setKeyMapping(data.keyMapping);
            localStorage.setItem('retrovibe_keymapping', JSON.stringify(data.keyMapping));
          }
          soundFx.playPowerUp();
        }
      } catch {
        alert('Invalid library backup file');
      }
    };
    reader.readAsText(file);
  };

  const themes: { id: CrtColorPreset; label: string; desc: string; color: string }[] = [
    { id: 'standard', label: 'Dark Arcade', desc: 'Default deep indigo & neon phosphor', color: '#a855f7' },
    { id: 'trinitron', label: 'Sony Trinitron', desc: 'PVM broadcast monitor vibrancy', color: '#06b6d4' },
    { id: 'gameboy', label: 'Game Boy Green', desc: 'Monochrome DMG-01 olive tint', color: '#84cc16' },
    { id: 'amber', label: 'Amber Terminal', desc: 'Warm 70s CRT phosphor monochrome', color: '#f59e0b' },
    { id: 'cyberpunk', label: 'Neon Synthwave', desc: 'High-contrast hot pink & cyan bloom', color: '#ec4899' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-retro text-white tracking-wide">
          SYSTEM PREFERENCES
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1">
          Hardware profiles, custom keybindings, CRT theme presets, and client storage.
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-[#0e0c1f] border border-purple-900/30 rounded-2xl p-6">
        <h2 className="text-sm font-retro text-white mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#ec4899]" />
          <span>Visual Display Theme</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {themes.map((t) => {
            const isSelected = crtSettings.colorPreset === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  soundFx.playClick();
                  onUpdateCrtSettings({ ...crtSettings, colorPreset: t.id });
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/40 border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">{t.label}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Audio Engine Configuration */}
      <div className="bg-[#0e0c1f] border border-purple-900/30 rounded-2xl p-6">
        <h2 className="text-sm font-retro text-white mb-4 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#a855f7]" />
          <span>Web Audio Synthesizer</span>
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-zinc-200">8-Bit Sound FX Engine</span>
              <p className="text-xs text-zinc-400 font-sans">
                Authentic low-latency synthesized square & triangle chiptune sound effects.
              </p>
            </div>
            <button
              onClick={() => {
                const next = !audioSettings.enabled;
                soundFx.enabled = next;
                if (next) soundFx.playCoin();
                onUpdateAudioSettings({ ...audioSettings, enabled: next });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
                audioSettings.enabled
                  ? 'bg-[#a3e635]/20 border-[#a3e635] text-[#a3e635]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              {audioSettings.enabled ? 'ACTIVE' : 'MUTED'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>Master Volume</span>
              <span>{Math.round(audioSettings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioSettings.volume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                soundFx.volume = vol;
                onUpdateAudioSettings({ ...audioSettings, volume: vol });
              }}
              className="w-full accent-[#a855f7] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Custom Keyboard Keymapping */}
      <div className="bg-[#0e0c1f] border border-purple-900/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-retro text-white flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#06b6d4]" />
            <span>Custom Keyboard Mapping</span>
          </h2>
          <button
            onClick={() => {
              soundFx.playClick();
              setKeyMapping(DEFAULT_KEY_MAPPING);
              localStorage.setItem('retrovibe_keymapping', JSON.stringify(DEFAULT_KEY_MAPPING));
            }}
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 font-sans mb-4">
          Click any action below and press the desired keyboard key to remap.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          {(Object.keys(keyMapping) as (keyof KeyMapping)[]).map((action) => {
            const isListening = listeningKey === action;
            const currentKey = keyMapping[action];
            return (
              <button
                key={action}
                onClick={() => {
                  soundFx.playClick();
                  setListeningKey(action);
                }}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-cyan-950/60 border-[#06b6d4] shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse'
                    : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {action}
                </span>
                <span className="text-xs font-bold text-white">
                  {isListening ? 'PRESS ANY KEY...' : currentKey.replace('Key', '').replace('Arrow', 'Arrow ')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage and Data Vault */}
      <div className="bg-[#0e0c1f] border border-purple-900/30 rounded-2xl p-6">
        <h2 className="text-sm font-retro text-white mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#a3e635]" />
          <span>Local Storage & Backup</span>
        </h2>
        <div className="text-xs text-zinc-400 font-sans mb-4 flex flex-wrap items-center gap-4">
          <span>Engine: <strong className="text-white font-mono">IndexedDB + LocalStorage</strong></span>
          <span>·</span>
          <span>Indexed Vault Games: <strong className="text-[#a3e635] font-mono">{games.length}</strong></span>
          <span>·</span>
          <span>Privacy: <strong className="text-cyan-400">Zero Server Telemetry</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportLibrary}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#a855f7]" />
            <span>Export Library JSON</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-[#06b6d4]" />
            <span>Import Backup</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 rounded-xl transition-colors cursor-pointer ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Data</span>
          </button>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs">
            <div className="flex items-center gap-2 text-red-300 font-bold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Data Reset</span>
            </div>
            <p className="text-red-200/80 mb-3">
              This will remove all custom uploaded ROMs and save states from your browser.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await retroDb.clearAll();
                  onClearLibrary();
                  setShowClearConfirm(false);
                  soundFx.playClick();
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-mono cursor-pointer"
              >
                Yes, Clear Everything
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-mono cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
