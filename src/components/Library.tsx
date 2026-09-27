import React, { useState, useMemo } from 'react';
import { GameItem, ConsoleId } from '../types';
import { CONSOLES } from '../utils/constants';
import { soundFx } from '../utils/audio';
import { GameDetailsModal } from './GameDetailsModal';
import {
  Search,
  Heart,
  Play,
  Grid,
  List,
  SlidersHorizontal,
  Plus,
  Clock,
  Trash2,
  Tv,
  Info,
} from 'lucide-react';

interface LibraryProps {
  games: GameItem[];
  onPlayGame: (game: GameItem) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateGame?: (game: GameItem) => void;
  onDeleteGame?: (id: string) => void;
  onNavigateUpload: () => void;
  initialConsoleFilter?: ConsoleId | 'all';
}

export const Library: React.FC<LibraryProps> = ({
  games,
  onPlayGame,
  onToggleFavorite,
  onUpdateGame,
  onDeleteGame,
  onNavigateUpload,
  initialConsoleFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsole, setSelectedConsole] = useState<ConsoleId | 'all'>(initialConsoleFilter);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'lastPlayed' | 'playTime' | 'year'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [detailsGame, setDetailsGame] = useState<GameItem | null>(null);

  // Extract unique genres
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => set.add(g.genre));
    return Array.from(set).sort();
  }, [games]);

  // Filtered & Sorted Games
  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        if (selectedConsole !== 'all' && g.consoleId !== selectedConsole) return false;
        if (selectedGenre !== 'all' && g.genre !== selectedGenre) return false;
        if (onlyFavorites && !g.favorite) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = g.title.toLowerCase().includes(q);
          const matchConsole = CONSOLES[g.consoleId].name.toLowerCase().includes(q) || g.consoleId.toLowerCase().includes(q);
          const matchGenre = g.genre.toLowerCase().includes(q);
          return matchTitle || matchConsole || matchGenre;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.title.localeCompare(b.title);
        if (sortBy === 'year') return b.year - a.year;
        if (sortBy === 'playTime') return b.playTimeMinutes - a.playTimeMinutes;
        if (sortBy === 'lastPlayed') {
          const aTime = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const bTime = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          return bTime - aTime;
        }
        return 0;
      });
  }, [games, selectedConsole, selectedGenre, onlyFavorites, searchQuery, sortBy]);

  const consoleOptions: { id: ConsoleId | 'all'; label: string }[] = [
    { id: 'all', label: 'All Consoles' },
    { id: 'nes', label: 'NES' },
    { id: 'snes', label: 'SNES' },
    { id: 'gb', label: 'Game Boy' },
    { id: 'gbc', label: 'GBC' },
    { id: 'gba', label: 'GBA' },
    { id: 'genesis', label: 'Genesis' },
    { id: 'n64', label: 'N64' },
    { id: 'ps1', label: 'PS1' },
    { id: 'ps2', label: 'PS2' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Game Details Modal */}
      {detailsGame && (
        <GameDetailsModal
          game={detailsGame}
          isOpen={true}
          onClose={() => setDetailsGame(null)}
          onPlay={(g) => {
            setDetailsGame(null);
            onPlayGame(g);
          }}
          onToggleFavorite={onToggleFavorite}
          onUpdateGame={(updated) => {
            if (onUpdateGame) onUpdateGame(updated);
            setDetailsGame(updated);
          }}
          onDeleteGame={onDeleteGame}
        />
      )}

      {/* Title & Upload Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-retro text-white tracking-wide">
            GAME VAULT & LIBRARY
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1">
            {filteredGames.length} {filteredGames.length === 1 ? 'title' : 'titles'} ready for instant execution
          </p>
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            onNavigateUpload();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-retro text-white bg-[#a855f7] hover:bg-[#9333ea] shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>UPLOAD ROM</span>
        </button>
      </div>

      {/* Filter and Search Bar Section */}
      <div className="bg-[#0e0c1f]/90 border border-purple-900/30 rounded-2xl p-4 mb-6 space-y-4">
        {/* Row 1: Search + View Toggles */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, console, or genre..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#a855f7] transition-colors"
            />
          </div>

          {/* Quick Filter: Favorites Only */}
          <button
            onClick={() => {
              soundFx.playClick();
              setOnlyFavorites(!onlyFavorites);
            }}
            className={`px-3 py-2.5 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all ${
              onlyFavorites
                ? 'bg-pink-950/40 border-[#ec4899] text-[#ec4899] shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => {
                soundFx.playClick();
                setSortBy(e.target.value as any);
              }}
              className="bg-transparent text-xs font-mono text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="name" className="bg-zinc-900">Sort: Name (A-Z)</option>
              <option value="lastPlayed" className="bg-zinc-900">Sort: Recently Played</option>
              <option value="playTime" className="bg-zinc-900">Sort: Most Played</option>
              <option value="year" className="bg-zinc-900">Sort: Release Year</option>
            </select>
          </div>

          {/* Grid vs List View toggle */}
          <div className="flex items-center p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
            <button
              onClick={() => {
                soundFx.playClick();
                setViewMode('grid');
              }}
              aria-label="Grid view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#a855f7] text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setViewMode('list');
              }}
              aria-label="List view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#a855f7] text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Console Segmented Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {consoleOptions.map((c) => {
            const isSelected = selectedConsole === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedConsole(c.id);
                }}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#a855f7] text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredGames.length === 0 && (
        <div className="text-center py-16 px-4 bg-[#0e0c1f]/40 border border-dashed border-purple-900/30 rounded-2xl">
          <Tv className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-retro text-zinc-300">NO TITLES FOUND</h3>
          <p className="text-xs text-zinc-500 font-sans mt-2 max-w-sm mx-auto">
            Try adjusting your search criteria, or upload your own ROM file to expand your vault.
          </p>
          <button
            onClick={onNavigateUpload}
            className="mt-6 px-4 py-2 text-xs font-retro text-white bg-[#a855f7] rounded-lg hover:bg-[#9333ea] transition-colors"
          >
            UPLOAD A ROM
          </button>
        </div>
      )}

      {/* Grid View Mode */}
      {viewMode === 'grid' && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredGames.map((game) => {
            const cMeta = CONSOLES[game.consoleId];
            return (
              <div
                key={game.id}
                onClick={() => {
                  soundFx.playClick();
                  setDetailsGame(game);
                }}
                className="group relative bg-[#0e0c1f] rounded-2xl border border-purple-900/30 hover:border-[#a855f7]/60 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(168,85,247,0.25)] flex flex-col cursor-pointer"
              >
                {/* Game Box Art Area */}
                <div className="aspect-[4/3] w-full bg-zinc-950 overflow-hidden relative">
                  <img
                    src={game.coverUrl}
                    alt={game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0c1f] via-transparent to-transparent opacity-80" />

                  {/* Console Badge Top Left */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[9px] font-retro text-white flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: cMeta.color }}
                    />
                    <span>{cMeta.shortName}</span>
                  </div>

                  {/* Favorite Toggle Top Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playClick();
                      onToggleFavorite(game.id);
                    }}
                    title={game.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all ${
                      game.favorite
                        ? 'bg-pink-600/80 text-white'
                        : 'bg-black/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${game.favorite ? 'fill-current' : ''}`} />
                  </button>

                  {/* Hover Buttons Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity backdrop-blur-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playCoin();
                        onPlayGame(game);
                      }}
                      className="px-3.5 py-2 text-xs font-retro text-white bg-[#a855f7] hover:bg-[#9333ea] rounded-lg shadow-[0_0_15px_#a855f7] flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>PLAY</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playClick();
                        setDetailsGame(game);
                      }}
                      className="p-2 text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600 rounded-lg transform translate-y-2 group-hover:translate-y-0 transition-all cursor-pointer"
                      title="View Details & Saves"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Zero-Pill Metadata Rule */}
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans mb-1.5">
                      <span>{game.genre}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.year}</span>
                      {game.saveStatesCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#a3e635]">{game.saveStatesCount} saves</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-semibold text-white text-sm group-hover:text-[#a855f7] transition-colors line-clamp-1">
                      {game.title}
                    </h3>
                  </div>

                  {/* Card Bottom: Playtime & Delete Action */}
                  <div className="mt-4 pt-3 border-t border-purple-950/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{game.playTimeMinutes}m</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onDeleteGame && !game.isDemo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundFx.playClick();
                            onDeleteGame(game.id);
                          }}
                          title="Delete game from library"
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundFx.playCoin();
                          onPlayGame(game);
                        }}
                        className="text-[#06b6d4] hover:text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Start</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View Mode */}
      {viewMode === 'list' && filteredGames.length > 0 && (
        <div className="bg-[#0e0c1f]/80 border border-purple-900/30 rounded-2xl overflow-hidden divide-y divide-purple-950/50">
          {filteredGames.map((game) => {
            const cMeta = CONSOLES[game.consoleId];
            return (
              <div
                key={game.id}
                onClick={() => {
                  soundFx.playClick();
                  setDetailsGame(game);
                }}
                className="p-4 flex items-center justify-between gap-4 hover:bg-purple-950/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-800">
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#a855f7] transition-colors truncate">
                      {game.title}
                    </h4>
                    {/* Zero-Pill metadata */}
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans mt-0.5">
                      <span className="text-zinc-300 font-mono">{cMeta.shortName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.genre}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.year}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  <div className="hidden sm:flex flex-col items-end text-xs font-mono text-zinc-400">
                    <span>{game.playTimeMinutes}m played</span>
                    {game.saveStatesCount > 0 && (
                      <span className="text-[#a3e635] text-[10px]">{game.saveStatesCount} save states</span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playClick();
                      onToggleFavorite(game.id);
                    }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      game.favorite ? 'text-[#ec4899]' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${game.favorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playCoin();
                      onPlayGame(game);
                    }}
                    className="p-2 text-white bg-[#a855f7] hover:bg-[#9333ea] rounded-lg shadow-[0_0_10px_#a855f7] transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
