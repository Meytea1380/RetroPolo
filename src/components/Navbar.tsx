import React from 'react';
import { Tv, Volume2, VolumeX, Sparkles, Play } from 'lucide-react';
import { ActivePage, CrtSettings } from '../types';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  crtSettings: CrtSettings;
  onToggleCrt: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onQuickPlay: () => void;
  onReplayStartup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  crtSettings,
  onToggleCrt,
  soundEnabled,
  onToggleSound,
  onQuickPlay,
  onReplayStartup,
}) => {
  const handleNavClick = (page: ActivePage) => {
    soundFx.playClick();
    onNavigate(page);
  };

  const handleCrtClick = () => {
    soundFx.playCrtSwitch(!crtSettings.enabled);
    onToggleCrt();
  };

  const handleSoundClick = () => {
    onToggleSound();
    if (!soundEnabled) {
      soundFx.enabled = true;
      soundFx.playClick();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0a1a]/90 backdrop-blur-md border-b border-purple-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => handleNavClick('home')}
          className="text-xs sm:text-sm font-retro text-white tracking-widest hover:text-[#a855f7] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 group text-left"
        >
          <span className="w-2 h-2 rounded-none bg-[#06b6d4] group-hover:bg-[#a855f7] shadow-[0_0_8px_#06b6d4] transition-colors" />
          <span>RETROVIBE</span>
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-retro uppercase tracking-wider text-zinc-400">
          <button
            onClick={() => handleNavClick('home')}
            className={`transition-colors hover:text-white whitespace-nowrap ${
              activePage === 'home'
                ? 'text-[#a855f7] border-b-2 border-[#a855f7] pb-1'
                : 'text-zinc-400'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('library')}
            className={`transition-colors hover:text-white whitespace-nowrap ${
              activePage === 'library'
                ? 'text-[#a855f7] border-b-2 border-[#a855f7] pb-1'
                : 'text-zinc-400'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => handleNavClick('upload')}
            className={`transition-colors hover:text-white whitespace-nowrap ${
              activePage === 'upload'
                ? 'text-[#a855f7] border-b-2 border-[#a855f7] pb-1'
                : 'text-zinc-400'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => handleNavClick('crt-studio')}
            className={`transition-colors hover:text-white whitespace-nowrap ${
              activePage === 'crt-studio'
                ? 'text-[#06b6d4] border-b-2 border-[#06b6d4] pb-1'
                : 'text-zinc-400'
            }`}
          >
            CRT Studio
          </button>
          <button
            onClick={() => handleNavClick('settings')}
            className={`transition-colors hover:text-white whitespace-nowrap ${
              activePage === 'settings'
                ? 'text-[#a855f7] border-b-2 border-[#a855f7] pb-1'
                : 'text-zinc-400'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions + toggles */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Audio SFX Toggle */}
          <button
            onClick={handleSoundClick}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            title={soundEnabled ? 'Sound FX: ON' : 'Sound FX: MUTED'}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800 rounded-lg hover:border-purple-500/40 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#a3e635]" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* CRT Screen Toggle */}
          <button
            onClick={handleCrtClick}
            aria-label="Toggle CRT post-processing"
            title="Toggle CRT Screen Post-Processing"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              crtSettings.enabled
                ? 'bg-purple-950/40 border-[#a855f7] text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CRT</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                crtSettings.enabled ? 'bg-[#a3e635] shadow-[0_0_6px_#a3e635]' : 'bg-zinc-600'
              }`}
            />
          </button>

          {/* Replay Startup Fanfare Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onReplayStartup();
            }}
            title="Replay 90s Startup Intro"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span>Intro</span>
          </button>

          {/* Quick Play CTA */}
          <button
            onClick={() => {
              soundFx.playCoin();
              onQuickPlay();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-retro text-white bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#9333ea] hover:to-[#db2777] rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all whitespace-nowrap active:scale-95"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </button>
        </div>
      </div>
    </header>
  );
};
