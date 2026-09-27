import React, { useState, useEffect } from 'react';
import { ActivePage, CrtSettings, AudioSettings, GameItem, ConsoleId } from './types';
import { DEFAULT_CRT_SETTINGS, INITIAL_DEMO_GAMES } from './utils/constants';
import { retroDb } from './utils/db';
import { soundFx } from './utils/audio';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Library } from './components/Library';
import { UploadGame } from './components/UploadGame';
import { CrtStudio } from './components/CrtStudio';
import { Player } from './components/Player';
import { Settings } from './components/Settings';
import { StartupAnimation } from './components/StartupAnimation';
import { CrtOverlay } from './components/CrtOverlay';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [showStartupIntro, setShowStartupIntro] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [consoleFilter, setConsoleFilter] = useState<ConsoleId | 'all'>('all');

  // Load CRT Settings from localStorage or defaults
  const [crtSettings, setCrtSettings] = useState<CrtSettings>(() => {
    try {
      const saved = localStorage.getItem('retrovibe_crt_settings');
      return saved ? JSON.parse(saved) : DEFAULT_CRT_SETTINGS;
    } catch {
      return DEFAULT_CRT_SETTINGS;
    }
  });

  // Load Audio settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    enabled: true,
    volume: 0.6,
    sfxVolume: 0.8,
  });

  // Game Vault state
  const [games, setGames] = useState<GameItem[]>(INITIAL_DEMO_GAMES);

  // Load custom ROMs from IndexedDB on mount and fetch backend catalog
  useEffect(() => {
    const loadStoredGames = async () => {
      try {
        const custom = await retroDb.getAllCustomGames();
        let baseGames = [...INITIAL_DEMO_GAMES];
        
        // Fetch test ROMs from backend API
        try {
          const res = await fetch('/api/test-roms');
          if (res.ok) {
            const data = await res.json();
            if (data.games && Array.isArray(data.games)) {
              // Merge server test ROMs
              const serverGames = data.games.map((sg: any) => ({
                ...sg,
                coverUrl: baseGames.find((b) => b.id.includes(sg.consoleId))?.coverUrl || baseGames[0].coverUrl,
              }));
              baseGames = [...serverGames, ...baseGames.filter((b) => !serverGames.some((sg: any) => sg.id === b.id))];
            }
          }
        } catch {}

        if (custom && custom.length > 0) {
          setGames([...custom, ...baseGames]);
        } else {
          setGames(baseGames);
        }
      } catch (e) {
        console.error('Error loading games:', e);
      }
    };
    loadStoredGames();
  }, []);

  // Save CRT settings changes
  const handleUpdateCrtSettings = (newSettings: CrtSettings) => {
    setCrtSettings(newSettings);
    try {
      localStorage.setItem('retrovibe_crt_settings', JSON.stringify(newSettings));
    } catch {}
  };

  const handleToggleCrt = () => {
    handleUpdateCrtSettings({ ...crtSettings, enabled: !crtSettings.enabled });
  };

  const handleToggleSound = () => {
    const next = !audioSettings.enabled;
    soundFx.enabled = next;
    setAudioSettings({ ...audioSettings, enabled: next });
  };

  const handleLaunchGame = (game: GameItem) => {
    // Update last played time & playtime
    const updatedGames = games.map((g) => {
      if (g.id === game.id) {
        return {
          ...g,
          lastPlayed: new Date().toISOString(),
          playTimeMinutes: g.playTimeMinutes + 1,
        };
      }
      return g;
    });
    setGames(updatedGames);
    setSelectedGame(game);
    setActivePage('player');
  };

  const handleToggleFavorite = (gameId: string) => {
    const updated = games.map((g) => {
      if (g.id === gameId) {
        return { ...g, favorite: !g.favorite };
      }
      return g;
    });
    setGames(updated);
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      await retroDb.deleteGame(gameId);
      setGames(games.filter((g) => g.id !== gameId));
    } catch (e) {
      console.error('Error deleting game:', e);
    }
  };

  const handleGameAdded = (newGame: GameItem) => {
    setGames([newGame, ...games]);
    setActivePage('library');
  };

  const handleSelectConsoleFromHero = (cId: ConsoleId) => {
    setConsoleFilter(cId);
    setActivePage('library');
  };

  const handleUpdateGame = async (updatedGame: GameItem) => {
    const updated = games.map((g) => (g.id === updatedGame.id ? updatedGame : g));
    setGames(updated);
    try {
      await retroDb.saveGameMetadata(updatedGame);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#070714] text-[#f0f0f5] flex flex-col font-sans selection:bg-[#a855f7] selection:text-white">
      {/* 90s Startup Chime & Logo Animation Overlay */}
      {showStartupIntro && (
        <StartupAnimation
          soundEnabled={audioSettings.enabled}
          onComplete={() => setShowStartupIntro(false)}
        />
      )}

      {/* Global Navbar */}
      <Navbar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          if (page === 'library') setConsoleFilter('all');
        }}
        crtSettings={crtSettings}
        onToggleCrt={handleToggleCrt}
        soundEnabled={audioSettings.enabled}
        onToggleSound={handleToggleSound}
        onQuickPlay={() => handleLaunchGame(games[0])}
        onReplayStartup={() => setShowStartupIntro(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {activePage === 'home' && (
          <>
            <Hero
              onStartPlaying={() => setActivePage('library')}
              onSelectConsole={handleSelectConsoleFromHero}
              featuredGames={games}
              onPlayGame={handleLaunchGame}
            />
            {/* Embedded CRT Studio Preview on Home Page */}
            <div className="border-t border-purple-950/60 bg-[#09081a]/50">
              <CrtStudio
                settings={crtSettings}
                onUpdateSettings={handleUpdateCrtSettings}
                onPlayTestGame={() => handleLaunchGame(games[0])}
              />
            </div>
          </>
        )}

        {activePage === 'library' && (
          <Library
            games={games}
            onPlayGame={handleLaunchGame}
            onToggleFavorite={handleToggleFavorite}
            onUpdateGame={handleUpdateGame}
            onDeleteGame={handleDeleteGame}
            onNavigateUpload={() => setActivePage('upload')}
            initialConsoleFilter={consoleFilter}
          />
        )}

        {activePage === 'upload' && (
          <UploadGame
            onGameAdded={handleGameAdded}
            onCancel={() => setActivePage('library')}
          />
        )}

        {activePage === 'crt-studio' && (
          <CrtStudio
            settings={crtSettings}
            onUpdateSettings={handleUpdateCrtSettings}
            onPlayTestGame={() => handleLaunchGame(games[0])}
          />
        )}

        {activePage === 'settings' && (
          <Settings
            crtSettings={crtSettings}
            onUpdateCrtSettings={handleUpdateCrtSettings}
            audioSettings={audioSettings}
            onUpdateAudioSettings={setAudioSettings}
            games={games}
            onImportLibrary={(imported) => setGames([...games, ...imported])}
            onClearLibrary={() => setGames(INITIAL_DEMO_GAMES)}
          />
        )}

        {/* Fullscreen Game Player */}
        {activePage === 'player' && selectedGame && (
          <Player
            game={selectedGame}
            crtSettings={crtSettings}
            onExit={() => setActivePage('library')}
            onSaveStateSaved={() => {
              setGames(
                games.map((g) =>
                  g.id === selectedGame.id
                    ? { ...g, saveStatesCount: g.saveStatesCount + 1 }
                    : g
                )
              );
            }}
          />
        )}
      </main>

      {/* Footer conforming to design constitution: quiet copyright & site links */}
      <footer className="border-t border-purple-950/40 bg-[#070612] py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-retro text-[10px] text-zinc-400 tracking-wider">RETROVIBE</span>
            <span>·</span>
            <span>Hardware Emulation Core</span>
            <span>·</span>
            <span>Client-side Storage</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <button
              onClick={() => setActivePage('crt-studio')}
              className="hover:text-zinc-300 transition-colors"
            >
              CRT Shaders
            </button>
            <button
              onClick={() => setActivePage('library')}
              className="hover:text-zinc-300 transition-colors"
            >
              Game Vault
            </button>
            <button
              onClick={() => setActivePage('settings')}
              className="hover:text-zinc-300 transition-colors"
            >
              Preferences
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
