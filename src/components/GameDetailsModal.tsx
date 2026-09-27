import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GameItem, Achievement } from '../types';
import { CONSOLES } from '../utils/constants';
import { soundFx } from '../utils/audio';
import { retroDb } from '../utils/db';
import {
  X,
  Play,
  Heart,
  Edit3,
  Trash2,
  Download,
  Trophy,
  Clock,
  Save,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface GameDetailsModalProps {
  game: GameItem;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (game: GameItem) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateGame: (updated: GameItem) => void;
  onDeleteGame?: (id: string) => void;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({
  game,
  isOpen,
  onClose,
  onPlay,
  onToggleFavorite,
  onUpdateGame,
  onDeleteGame,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(game.title);
  const [editGenre, setEditGenre] = useState(game.genre);
  const [editYear, setEditYear] = useState(game.year);
  const [editDesc, setEditDesc] = useState(game.description || '');

  if (!isOpen) return null;

  const cMeta = CONSOLES[game.consoleId];

  // System Achievements based on player stats
  const achievements: Achievement[] = [
    {
      id: 'first_blood',
      title: 'Power On Initializer',
      description: 'First boot sequence launched inside browser core',
      unlocked: game.playTimeMinutes > 0,
      points: 10,
    },
    {
      id: 'save_master',
      title: 'Time Capsule Archon',
      description: 'Create at least one persistent hardware save state',
      unlocked: game.saveStatesCount > 0,
      points: 25,
    },
    {
      id: 'veteran_pilot',
      title: 'Retro Veteran',
      description: 'Log 30+ minutes of operational playtime',
      unlocked: game.playTimeMinutes >= 30,
      points: 50,
    },
    {
      id: 'high_roller',
      title: 'Arcade Legend',
      description: 'Achieve 100+ minutes in the virtual arcade',
      unlocked: game.playTimeMinutes >= 100,
      points: 100,
    },
  ];

  const handleSaveEdit = () => {
    soundFx.playPowerUp();
    const updated: GameItem = {
      ...game,
      title: editTitle.trim() || game.title,
      genre: editGenre.trim() || game.genre,
      year: editYear || game.year,
      description: editDesc.trim(),
    };
    onUpdateGame(updated);
    setIsEditing(false);
  };

  const handleExportSave = async () => {
    soundFx.playClick();
    const state = await retroDb.getGameState(game.id, 1);
    if (!state) {
      alert('No save state found in Slot #1 yet. Play the game and press F5 or Save State first!');
      return;
    }
    const blob = state instanceof Blob ? state : new Blob([state]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.title.replace(/\s+/g, '_')}_slot1.sav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-2xl bg-[#0e0c1f] border border-purple-900/50 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.2)] max-h-[90vh] flex flex-col"
      >
        {/* Modal Top Header with Close Button */}
        <div className="relative h-44 sm:h-52 bg-zinc-950 overflow-hidden shrink-0">
          <img
            src={game.coverUrl}
            alt={game.title}
            className="w-full h-full object-cover blur-xs opacity-50 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0c1f] via-[#0e0c1f]/60 to-black/40" />

          {/* Close button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-zinc-400 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Floating Game Hero Info in Header */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border-2 border-purple-500/40 shadow-2xl shrink-0 bg-black">
                <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cMeta.color }}
                  />
                  <span className="text-xs font-retro text-zinc-300">{cMeta.name}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight line-clamp-1">
                  {game.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans mt-0.5">
                  <span>{game.genre}</span>
                  <span aria-hidden="true">·</span>
                  <span>{game.year}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                onToggleFavorite(game.id);
              }}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all ${
                game.favorite
                  ? 'bg-pink-600/30 border-[#ec4899] text-[#ec4899]'
                  : 'bg-black/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${game.favorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                soundFx.playCoin();
                onPlay(game);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-retro text-white bg-gradient-to-r from-[#a855f7] via-[#9333ea] to-[#ec4899] hover:brightness-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>LAUNCH GAME</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setIsEditing(!isEditing);
              }}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#06b6d4]" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Info'}</span>
            </button>

            <button
              onClick={handleExportSave}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              title="Export Save File (.sav)"
            >
              <Download className="w-4 h-4 text-[#a3e635]" />
              <span>Export Save</span>
            </button>

            {onDeleteGame && !game.isDemo && (
              <button
                onClick={() => {
                  soundFx.playClick();
                  if (confirm(`Remove "${game.title}" from your library?`)) {
                    onDeleteGame(game.id);
                    onClose();
                  }
                }}
                className="p-3 text-zinc-500 hover:text-red-400 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
                title="Delete ROM from Library"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-zinc-900/80 border border-purple-800/40 rounded-2xl space-y-3"
            >
              <h3 className="text-xs font-retro text-[#a855f7] uppercase">Edit Game Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Genre</label>
                  <input
                    type="text"
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Year</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(parseInt(e.target.value) || 1990)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Description</label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 text-xs font-mono text-white bg-[#a855f7] hover:bg-[#9333ea] rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          )}

          {/* Stat Badges Matrix */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col items-center text-center">
              <Clock className="w-4 h-4 text-[#06b6d4] mb-1" />
              <span className="text-lg font-bold text-white font-mono">{game.playTimeMinutes}m</span>
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Total Playtime</span>
            </div>

            <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col items-center text-center">
              <Save className="w-4 h-4 text-[#a3e635] mb-1" />
              <span className="text-lg font-bold text-white font-mono">{game.saveStatesCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Save States</span>
            </div>

            <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col items-center text-center">
              <Calendar className="w-4 h-4 text-[#ec4899] mb-1" />
              <span className="text-xs font-bold text-white font-mono mt-1">
                {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase font-mono mt-0.5">Last Run</span>
            </div>
          </div>

          {/* Description */}
          {game.description && (
            <div>
              <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Overview & History
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                {game.description}
              </p>
            </div>
          )}

          {/* In-Game Achievements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-retro text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Console Achievements</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-500">
                {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
              </span>
            </div>

            <div className="space-y-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    ach.unlocked
                      ? 'bg-purple-950/20 border-purple-800/40 text-white'
                      : 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        ach.unlocked
                          ? 'bg-[#a855f7]/20 text-[#a855f7]'
                          : 'bg-zinc-800/80 text-zinc-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{ach.title}</div>
                      <div className="text-[11px] text-zinc-400 font-sans">{ach.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-[#f59e0b]">
                      +{ach.points} pts
                    </span>
                    {ach.unlocked && <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
