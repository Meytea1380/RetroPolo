import React from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, Tv, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { CONSOLES } from '../utils/constants';
import { ConsoleId, GameItem } from '../types';
import { soundFx } from '../utils/audio';

interface HeroProps {
  onStartPlaying: () => void;
  onSelectConsole: (id: ConsoleId) => void;
  featuredGames: GameItem[];
  onPlayGame: (game: GameItem) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onStartPlaying,
  onSelectConsole,
  featuredGames,
  onPlayGame,
}) => {
  const consoleKeys: ConsoleId[] = ['nes', 'snes', 'gb', 'gba', 'genesis', 'n64', 'ps1', 'ps2'];

  return (
    <div className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24">
      {/* Background Animated Retro Grid and Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Retro Grid Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-96 retro-grid-floor opacity-60" />
        {/* Neon Ambient Fog */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[250px] bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Central Hero Block */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Subtle System Status Kicker */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-purple-950/60 border border-purple-800/40 text-xs font-mono text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] shadow-[0_0_8px_#a3e635] animate-pulse" />
            <span>Browser-Native WebAssembly Emulation</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">Zero Server Upload</span>
          </div>

          {/* Glitch & Neon Glow Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-retro font-bold text-white tracking-tight leading-tight">
            PLAY RETRO <br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] via-[#a855f7] to-[#ec4899] glow-text-purple"
              style={{
                textShadow: '0 0 20px rgba(168, 85, 247, 0.6), 0 0 40px rgba(6, 182, 212, 0.4)',
              }}
            >
              LEGENDS
            </span>
          </h1>

          {/* Human-centered natural description */}
          <p className="mt-6 text-base sm:text-lg text-zinc-300 font-sans max-w-2xl mx-auto leading-relaxed">
            Experience NES, SNES, Game Boy, GBA, Sega Genesis, N64, and PS1 classics directly in your browser.
            Featuring authentic CRT scanline post-processing, instant save states, and privacy-first local storage.
          </p>

          {/* Action Button Row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                soundFx.playCoin();
                onStartPlaying();
              }}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-retro text-white bg-gradient-to-r from-[#a855f7] via-[#9333ea] to-[#ec4899] shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(236,72,153,0.6)] hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
              <span>START PLAYING</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                onStartPlaying();
              }}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-retro text-zinc-300 hover:text-white bg-zinc-900/80 border border-purple-900/40 hover:border-purple-500/60 backdrop-blur-sm transition-all"
            >
              <span>EXPLORE LIBRARY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Trust Points / Micro Specs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#a3e635]" />
              <span>IndexedDB Offline Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#06b6d4]" />
              <span>60 FPS Hardware Acceleration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tv className="w-4 h-4 text-[#a855f7]" />
              <span>Full CRT Shader Engine</span>
            </div>
          </div>
        </div>

        {/* Floating Console System Badges */}
        <div className="mt-14 pt-8 border-t border-purple-900/20">
          <div className="text-center mb-6">
            <span className="text-[11px] font-retro text-zinc-400 uppercase tracking-widest">
              Supported Hardware Systems
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {consoleKeys.map((cKey, i) => {
              const meta = CONSOLES[cKey];
              return (
                <motion.button
                  key={cKey}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => {
                    soundFx.playClick();
                    onSelectConsole(cKey);
                  }}
                  className="flex flex-col items-center p-3 rounded-xl bg-[#0f0e21]/80 border border-purple-900/30 hover:border-[#a855f7] hover:bg-[#181535] hover:scale-105 transition-all text-center group cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mb-2 group-hover:scale-120 transition-transform"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="font-retro text-[10px] text-white tracking-wider">
                    {meta.shortName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-sans mt-0.5">
                    {meta.year}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Featured Popular Games Showcase */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-mono text-[#a855f7] uppercase tracking-wider block mb-1">
                Spotlight Vault
              </span>
              <h2 className="text-lg sm:text-xl font-retro text-white">
                POPULAR CLASSICS READY TO PLAY
              </h2>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onStartPlaying();
              }}
              className="text-xs font-mono text-[#06b6d4] hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View All Games</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredGames.slice(0, 3).map((game) => {
              const cMeta = CONSOLES[game.consoleId];
              return (
                <div
                  key={game.id}
                  className="group relative bg-[#0e0c1f] rounded-2xl border border-purple-900/30 hover:border-[#a855f7]/60 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(168,85,247,0.25)] flex flex-col"
                >
                  {/* Game Cover Area */}
                  <div className="aspect-[4/3] w-full bg-zinc-950 overflow-hidden relative">
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0c1f] via-transparent to-transparent opacity-80" />

                    {/* Console Tag on Top */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-retro text-white">
                      {cMeta.shortName}
                    </div>

                    {/* Hover Play Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                      <button
                        onClick={() => {
                          soundFx.playCoin();
                          onPlayGame(game);
                        }}
                        className="px-4 py-2 text-xs font-retro text-white bg-[#a855f7] hover:bg-[#9333ea] rounded-lg shadow-[0_0_15px_#a855f7] flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>PLAY NOW</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Zero-Pill Metadata Rule: unboxed text with typographic separators */}
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans mb-1.5">
                        <span>{game.genre}</span>
                        <span aria-hidden="true">·</span>
                        <span>{game.year}</span>
                        <span aria-hidden="true">·</span>
                        <span>{cMeta.name}</span>
                      </div>

                      <h3 className="font-semibold text-white text-base group-hover:text-[#a855f7] transition-colors line-clamp-1">
                        {game.title}
                      </h3>
                      {game.description && (
                        <p className="text-xs text-zinc-400 font-sans mt-2 line-clamp-2 leading-relaxed">
                          {game.description}
                        </p>
                      )}
                    </div>

                    {/* Card Footer Info */}
                    <div className="mt-4 pt-3 border-t border-purple-950/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>{game.playTimeMinutes}m played</span>
                      <button
                        onClick={() => {
                          soundFx.playCoin();
                          onPlayGame(game);
                        }}
                        className="text-[#06b6d4] hover:text-white font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>Launch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
