import React, { useState, useEffect, useRef } from 'react';
import { GameItem, CrtSettings, ControllerSkin } from '../types';
import { CONSOLES } from '../utils/constants';
import { CrtOverlay } from './CrtOverlay';
import { retroDb } from '../utils/db';
import { soundFx } from '../utils/audio';
import {
  Save,
  Download,
  RotateCcw,
  FastForward,
  Rewind,
  Maximize,
  Camera,
  Volume2,
  VolumeX,
  X,
  Gamepad,
  Cpu,
  Layers,
} from 'lucide-react';

interface PlayerProps {
  game: GameItem;
  crtSettings: CrtSettings;
  onExit: () => void;
  onSaveStateSaved?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  game,
  crtSettings,
  onExit,
  onSaveStateSaved,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ejsContainerRef = useRef<HTMLDivElement | null>(null);

  const [fps, setFps] = useState(60);
  const [speed, setSpeed] = useState<number>(1);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [controllerSkin, setControllerSkin] = useState<ControllerSkin>('snes');
  const [saveSlot, setSaveSlot] = useState<number>(1);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [isRewinding, setIsRewinding] = useState(false);
  const [useEmulatorJs, setUseEmulatorJs] = useState(false);
  const [emulatorJsLoading, setEmulatorJsLoading] = useState(false);

  const hudTimeoutRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Rewind circular history buffer
  const rewindHistoryRef = useRef<any[]>([]);

  // Interactive arcade engine state
  const gameStateRef = useRef({
    score: 1240,
    lives: 3,
    shipX: 160,
    shipY: 200,
    bullets: [] as { x: number; y: number }[],
    enemies: [] as { x: number; y: number; hp: number; vx: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    keys: {} as Record<string, boolean>,
    frame: 0,
  });

  const notify = (msg: string) => {
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(null), 2500);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = true;
      gameStateRef.current.keys[e.key] = true;

      // Hotkeys
      if (e.code === 'F5') {
        e.preventDefault();
        handleSaveState();
      } else if (e.code === 'F8') {
        e.preventDefault();
        handleLoadState();
      } else if (e.code === 'Backspace') {
        setIsRewinding(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = false;
      gameStateRef.current.keys[e.key] = false;
      if (e.code === 'Backspace') {
        setIsRewinding(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [saveSlot]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveTimerRef.current = window.setInterval(async () => {
      try {
        const stateObj = {
          gameState: gameStateRef.current,
          timestamp: new Date().toISOString(),
          autoSave: true,
        };
        const blob = new Blob([JSON.stringify(stateObj)], { type: 'application/json' });
        await retroDb.saveGameState(game.id, 99, blob); // Slot 99 = AutoSave
        notify('Auto-Saved state (30s interval)');
      } catch {}
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [game.id]);

  // Hide HUD after mouse idle
  const handleMouseMove = () => {
    setShowHud(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = window.setTimeout(() => {
      setShowHud(false);
    }, 4000);
  };

  // Virtual Gamepad button triggers
  const handleVirtualButton = (btn: string, pressed: boolean) => {
    if (pressed && !soundMuted) soundFx.playClick();
    if (btn === 'LEFT') gameStateRef.current.keys['ArrowLeft'] = pressed;
    if (btn === 'RIGHT') gameStateRef.current.keys['ArrowRight'] = pressed;
    if (btn === 'UP') gameStateRef.current.keys['ArrowUp'] = pressed;
    if (btn === 'DOWN') gameStateRef.current.keys['ArrowDown'] = pressed;
    if (btn === 'A' || btn === 'B') gameStateRef.current.keys['KeyZ'] = pressed;
    if (btn === 'X' || btn === 'Y') gameStateRef.current.keys['KeyX'] = pressed;
  };

  // Main canvas render & game loop with rewind support
  useEffect(() => {
    if (useEmulatorJs) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let framesThisSecond = 0;
    let lastFpsUpdate = performance.now();

    // Spawn initial enemies
    if (gameStateRef.current.enemies.length === 0) {
      for (let i = 0; i < 6; i++) {
        gameStateRef.current.enemies.push({
          x: 30 + i * 45,
          y: 40 + (i % 2) * 25,
          hp: 2,
          vx: (Math.random() - 0.5) * 1.5,
        });
      }
    }

    const loop = (timestamp: number) => {
      const state = gameStateRef.current;
      framesThisSecond++;

      if (timestamp - lastFpsUpdate >= 1000) {
        setFps(framesThisSecond);
        framesThisSecond = 0;
        lastFpsUpdate = timestamp;
      }

      // Handle Rewind
      if (isRewinding && rewindHistoryRef.current.length > 0) {
        const prev = rewindHistoryRef.current.pop();
        if (prev) {
          state.shipX = prev.shipX;
          state.shipY = prev.shipY;
          state.score = prev.score;
          state.enemies = prev.enemies;
          state.bullets = prev.bullets;
        }
      } else {
        // Record state in rewind buffer (max 180 frames = 3 seconds)
        if (state.frame % 2 === 0) {
          rewindHistoryRef.current.push({
            shipX: state.shipX,
            shipY: state.shipY,
            score: state.score,
            enemies: JSON.parse(JSON.stringify(state.enemies)),
            bullets: [...state.bullets],
          });
          if (rewindHistoryRef.current.length > 90) {
            rewindHistoryRef.current.shift();
          }
        }

        state.frame++;

        // Player Movement
        const moveSpeed = 3.5 * speed;
        if (state.keys['ArrowLeft'] || state.keys['KeyA']) state.shipX = Math.max(20, state.shipX - moveSpeed);
        if (state.keys['ArrowRight'] || state.keys['KeyD']) state.shipX = Math.min(300, state.shipX + moveSpeed);
        if (state.keys['ArrowUp'] || state.keys['KeyW']) state.shipY = Math.max(30, state.shipY - moveSpeed);
        if (state.keys['ArrowDown'] || state.keys['KeyS']) state.shipY = Math.min(220, state.shipY + moveSpeed);

        // Firing bullets
        if (
          (state.keys['KeyZ'] || state.keys['Space'] || state.keys['KeyJ']) &&
          state.frame % (Math.floor(10 / speed) || 1) === 0
        ) {
          state.bullets.push({ x: state.shipX, y: state.shipY - 10 });
          if (!soundMuted) soundFx.playClick();
        }

        // Move bullets
        state.bullets.forEach((b) => {
          b.y -= 5 * speed;
        });
        state.bullets = state.bullets.filter((b) => b.y > -10);

        // Move enemies
        state.enemies.forEach((enemy) => {
          enemy.x += enemy.vx * speed;
          if (enemy.x > 290 || enemy.x < 20) enemy.vx *= -1;

          // Hit testing with bullets
          state.bullets.forEach((b) => {
            if (Math.abs(b.x - enemy.x) < 14 && Math.abs(b.y - enemy.y) < 12) {
              enemy.hp--;
              b.y = -999;
              state.score += 50;

              for (let p = 0; p < 5; p++) {
                state.particles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  color: '#ec4899',
                  life: 15,
                });
              }
            }
          });
        });

        state.enemies = state.enemies.filter((e) => e.hp > 0);
        if (state.enemies.length === 0) {
          state.score += 250;
          for (let i = 0; i < 6; i++) {
            state.enemies.push({
              x: 30 + i * 45,
              y: 40 + (i % 2) * 25,
              hp: 2,
              vx: (Math.random() - 0.5) * 2,
            });
          }
        }
      }

      // Render onto canvas
      ctx.fillStyle = '#070614';
      ctx.fillRect(0, 0, 320, 240);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 35; s++) {
        const sx = (s * 37 + state.frame * 0.4 * (s % 3 + 1)) % 320;
        const sy = (s * 23 + state.frame * 0.8 * (s % 3 + 1)) % 240;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), s % 2 === 0 ? 2 : 1, s % 2 === 0 ? 2 : 1);
      }

      // Draw Bullets
      ctx.fillStyle = '#06b6d4';
      state.bullets.forEach((b) => {
        ctx.fillRect(b.x - 1, b.y, 3, 6);
      });

      // Draw Enemies
      state.enemies.forEach((enemy) => {
        ctx.fillStyle = enemy.hp > 1 ? '#a855f7' : '#ec4899';
        ctx.fillRect(enemy.x - 8, enemy.y - 6, 16, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(enemy.x - 5, enemy.y - 3, 3, 3);
        ctx.fillRect(enemy.x + 2, enemy.y - 3, 3, 3);
      });

      // Draw Particles
      state.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);
      });
      state.particles = state.particles.filter((p) => p.life > 0);

      // Draw Ship
      ctx.fillStyle = isRewinding ? '#06b6d4' : '#a3e635';
      ctx.beginPath();
      ctx.moveTo(state.shipX, state.shipY - 10);
      ctx.lineTo(state.shipX - 10, state.shipY + 8);
      ctx.lineTo(state.shipX + 10, state.shipY + 8);
      ctx.closePath();
      ctx.fill();

      // Rewind indicator banner on screen
      if (isRewinding) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.fillRect(0, 100, 320, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('<< REWINDING <<', 80, 125);
      }

      // Cockpit
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(state.shipX - 2, state.shipY - 3, 4, 5);

      // HUD overlay text
      ctx.fillStyle = '#fbbf24';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`1UP ${state.score.toString().padStart(6, '0')}`, 14, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${CONSOLES[game.consoleId].shortName}`, 250, 16);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [useEmulatorJs, game, speed, soundMuted, isRewinding]);

  // Save State Action
  const handleSaveState = async () => {
    soundFx.playPowerUp();
    try {
      const stateObj = {
        gameState: gameStateRef.current,
        timestamp: new Date().toISOString(),
      };
      const jsonStr = JSON.stringify(stateObj);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      await retroDb.saveGameState(game.id, saveSlot, blob);
      notify(`Saved state to Slot #${saveSlot}`);
      if (onSaveStateSaved) onSaveStateSaved();
    } catch {
      notify('Failed to save state');
    }
  };

  // Load State Action
  const handleLoadState = async () => {
    soundFx.playCoin();
    try {
      const data = await retroDb.getGameState(game.id, saveSlot);
      if (!data) {
        notify(`No save found in Slot #${saveSlot}`);
        return;
      }

      let parsed: any;
      if (data instanceof Blob) {
        const text = await data.text();
        parsed = JSON.parse(text);
      } else {
        parsed = JSON.parse(new TextDecoder().decode(data));
      }

      if (parsed?.gameState) {
        gameStateRef.current.score = parsed.gameState.score || 0;
        gameStateRef.current.shipX = parsed.gameState.shipX || 160;
        gameStateRef.current.shipY = parsed.gameState.shipY || 200;
        notify(`Loaded state from Slot #${saveSlot}`);
      }
    } catch {
      notify('Failed to load state');
    }
  };

  // Screenshot Action
  const takeScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundFx.playClick();
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${game.title.replace(/\s+/g, '_')}_screenshot.png`;
    a.click();
    notify('Screenshot captured');
  };

  // Fullscreen Action
  const toggleFullscreen = () => {
    soundFx.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // EmulatorJS Loader for ROMs
  const handleToggleCore = async () => {
    soundFx.playClick();
    if (!useEmulatorJs) {
      setEmulatorJsLoading(true);
      setUseEmulatorJs(true);
      // Retrieve ROM from indexedDB if available
      try {
        const romData = await retroDb.getRom(game.id);
        let romSrcUrl = game.romUrl;
        if (romData instanceof Blob) {
          romSrcUrl = URL.createObjectURL(romData);
        }

        // Configure window EJS global variables
        const w = window as any;
        w.EJS_player = '#ejs-game-container';
        w.EJS_core = CONSOLES[game.consoleId].coreName || 'fceumm';
        w.EJS_gameUrl = romSrcUrl || '';
        w.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
        w.EJS_startOnLoaded = true;

        if (!document.getElementById('emulatorjs-script')) {
          const script = document.createElement('script');
          script.id = 'emulatorjs-script';
          script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
          script.onload = () => setEmulatorJsLoading(false);
          script.onerror = () => {
            setEmulatorJsLoading(false);
            notify('EmulatorJS core CDN offline, reverting to hardware runner');
            setUseEmulatorJs(false);
          };
          document.body.appendChild(script);
        } else {
          setEmulatorJsLoading(false);
        }
      } catch {
        setEmulatorJsLoading(false);
        setUseEmulatorJs(false);
      }
    } else {
      setUseEmulatorJs(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Save Notification Toast */}
      {saveNotification && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-purple-900/90 border border-purple-500 rounded-xl text-xs font-retro text-white shadow-[0_0_20px_rgba(168,85,247,0.6)] backdrop-blur-md flex items-center gap-2 animate-bounce">
          <Save className="w-3.5 h-3.5 text-[#a3e635]" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* Floating Top HUD Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Game Title & Console */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundFx.playClick();
                onExit();
              }}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900/80 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
              title="Exit Player"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-white truncate max-w-[160px] sm:max-w-xs">
                {game.title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                <span className="text-[#a855f7]">{CONSOLES[game.consoleId].shortName}</span>
                <span>·</span>
                <span className="text-[#a3e635]">{fps} FPS</span>
                <span>·</span>
                <span className="text-[#06b6d4]">Slot #{saveSlot}</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Slot Picker */}
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono">
              <span className="text-zinc-500 text-[10px] mr-1 hidden sm:inline">SLOT:</span>
              {[1, 2, 3].map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    soundFx.playClick();
                    setSaveSlot(slot);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                    saveSlot === slot ? 'bg-[#a855f7] text-white font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            {/* Rewind */}
            <button
              onMouseDown={() => setIsRewinding(true)}
              onMouseUp={() => setIsRewinding(false)}
              onTouchStart={() => setIsRewinding(true)}
              onTouchEnd={() => setIsRewinding(false)}
              className={`p-1.5 sm:px-2 sm:py-1.5 text-xs font-mono rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                isRewinding
                  ? 'bg-cyan-950 border-[#06b6d4] text-[#06b6d4]'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
              title="Hold to Rewind (or Backspace)"
            >
              <Rewind className="w-3.5 h-3.5 text-[#06b6d4]" />
              <span className="hidden md:inline">Rewind</span>
            </button>

            {/* Speed Selector */}
            <button
              onClick={() => {
                soundFx.playClick();
                setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1));
              }}
              className="px-2 py-1.5 text-xs font-mono bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1 cursor-pointer"
              title="Toggle Emulation Speed (0.5x, 1x, 2x)"
            >
              <FastForward className="w-3.5 h-3.5 text-[#06b6d4]" />
              <span>{speed}x</span>
            </button>

            {/* Save State Button */}
            <button
              onClick={handleSaveState}
              className="px-2 py-1.5 text-xs font-mono bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1 cursor-pointer"
              title="Save State (F5)"
            >
              <Save className="w-3.5 h-3.5 text-[#a855f7]" />
              <span className="hidden sm:inline">Save</span>
            </button>

            {/* Load State Button */}
            <button
              onClick={handleLoadState}
              className="px-2 py-1.5 text-xs font-mono bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1 cursor-pointer"
              title="Load State (F8)"
            >
              <Download className="w-3.5 h-3.5 text-[#a3e635]" />
              <span className="hidden sm:inline">Load</span>
            </button>

            {/* Screenshot */}
            <button
              onClick={takeScreenshot}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900/80 rounded-lg border border-zinc-800 cursor-pointer"
              title="Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Mute Audio */}
            <button
              onClick={() => {
                const next = !soundMuted;
                setSoundMuted(next);
                soundFx.enabled = !next;
              }}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900/80 rounded-lg border border-zinc-800 cursor-pointer"
              title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#a3e635]" />
              )}
            </button>

            {/* Core Switcher (EmulatorJS vs Hardware Arcade) */}
            <button
              onClick={handleToggleCore}
              className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-mono cursor-pointer ${
                useEmulatorJs
                  ? 'bg-purple-950 border-[#a855f7] text-[#a855f7]'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Core Engine (EmulatorJS Core / Hardware Runner)"
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden lg:inline">{useEmulatorJs ? 'EJS Core' : 'Vibe Core'}</span>
            </button>

            {/* Virtual Gamepad Toggle */}
            <button
              onClick={() => {
                soundFx.playClick();
                setShowMobileControls(!showMobileControls);
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showMobileControls
                  ? 'bg-purple-950 border-[#a855f7] text-[#a855f7]'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Virtual On-Screen Gamepad"
            >
              <Gamepad className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900/80 rounded-lg border border-zinc-800 cursor-pointer"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Emulation Viewport Area with CRT Overlay */}
      <div className="relative max-w-full max-h-full flex items-center justify-center p-2 sm:p-6">
        <div className="w-[85vw] max-w-4xl aspect-[4/3] relative rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] border-4 border-[#1c192e]">
          <CrtOverlay settings={crtSettings} className="w-full h-full" isMonitorFrame={true}>
            {useEmulatorJs ? (
              <div className="w-full h-full relative bg-black flex items-center justify-center">
                {emulatorJsLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 text-white font-mono text-xs">
                    <span className="text-[#a855f7] animate-pulse mb-2">INITIALIZING HARDWARE CORE...</span>
                    <span>Loading WebAssembly Emulation Module</span>
                  </div>
                )}
                <div id="ejs-game-container" ref={ejsContainerRef} className="w-full h-full" />
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="w-full h-full object-contain image-rendering-pixelated bg-black"
              />
            )}
          </CrtOverlay>
        </div>
      </div>

      {/* Virtual On-Screen Gamepad with SKINS (SNES, NES, Game Boy) */}
      {showMobileControls && (
        <div className="absolute bottom-4 left-0 right-0 z-40 px-4 sm:px-8 flex items-end justify-between pointer-events-none">
          {/* Skin Switcher */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono">
            <span className="text-zinc-500">SKIN:</span>
            <button
              onClick={() => {
                soundFx.playClick();
                setControllerSkin('snes');
              }}
              className={`px-2 py-0.5 rounded ${
                controllerSkin === 'snes' ? 'bg-[#a855f7] text-white' : 'text-zinc-400'
              }`}
            >
              SNES
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setControllerSkin('nes');
              }}
              className={`px-2 py-0.5 rounded ${
                controllerSkin === 'nes' ? 'bg-[#ef4444] text-white' : 'text-zinc-400'
              }`}
            >
              NES
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setControllerSkin('gb');
              }}
              className={`px-2 py-0.5 rounded ${
                controllerSkin === 'gb' ? 'bg-[#84cc16] text-black font-bold' : 'text-zinc-400'
              }`}
            >
              Game Boy
            </button>
          </div>

          {/* D-Pad Wing (Themed) */}
          <div
            className={`pointer-events-auto w-36 h-36 relative backdrop-blur-md p-2 shadow-2xl transition-all ${
              controllerSkin === 'snes'
                ? 'bg-[#c5c6d0]/90 rounded-full border-2 border-[#8e90a0]'
                : controllerSkin === 'nes'
                ? 'bg-[#26262b]/95 rounded-lg border-2 border-zinc-700'
                : 'bg-[#d8d6cf]/95 rounded-2xl border-2 border-[#b5b3aa]'
            }`}
          >
            {/* Cross D-Pad */}
            <div className="w-24 h-24 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                onMouseDown={() => handleVirtualButton('UP', true)}
                onMouseUp={() => handleVirtualButton('UP', false)}
                onTouchStart={() => handleVirtualButton('UP', true)}
                onTouchEnd={() => handleVirtualButton('UP', false)}
                className="absolute top-0 left-8 w-8 h-8 bg-zinc-900 active:bg-[#a855f7] rounded-t-sm text-zinc-300 text-xs flex items-center justify-center shadow"
              >
                ▲
              </button>
              <button
                onMouseDown={() => handleVirtualButton('DOWN', true)}
                onMouseUp={() => handleVirtualButton('DOWN', false)}
                onTouchStart={() => handleVirtualButton('DOWN', true)}
                onTouchEnd={() => handleVirtualButton('DOWN', false)}
                className="absolute bottom-0 left-8 w-8 h-8 bg-zinc-900 active:bg-[#a855f7] rounded-b-sm text-zinc-300 text-xs flex items-center justify-center shadow"
              >
                ▼
              </button>
              <button
                onMouseDown={() => handleVirtualButton('LEFT', true)}
                onMouseUp={() => handleVirtualButton('LEFT', false)}
                onTouchStart={() => handleVirtualButton('LEFT', true)}
                onTouchEnd={() => handleVirtualButton('LEFT', false)}
                className="absolute top-8 left-0 w-8 h-8 bg-zinc-900 active:bg-[#a855f7] rounded-l-sm text-zinc-300 text-xs flex items-center justify-center shadow"
              >
                ◀
              </button>
              <button
                onMouseDown={() => handleVirtualButton('RIGHT', true)}
                onMouseUp={() => handleVirtualButton('RIGHT', false)}
                onTouchStart={() => handleVirtualButton('RIGHT', true)}
                onTouchEnd={() => handleVirtualButton('RIGHT', false)}
                className="absolute top-8 right-0 w-8 h-8 bg-zinc-900 active:bg-[#a855f7] rounded-r-sm text-zinc-300 text-xs flex items-center justify-center shadow"
              >
                ▶
              </button>
              <div className="absolute top-8 left-8 w-8 h-8 bg-zinc-900 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Action Buttons Wing (Themed) */}
          <div
            className={`pointer-events-auto w-36 h-36 relative backdrop-blur-md p-2 shadow-2xl transition-all ${
              controllerSkin === 'snes'
                ? 'bg-[#c5c6d0]/90 rounded-full border-2 border-[#8e90a0]'
                : controllerSkin === 'nes'
                ? 'bg-[#26262b]/95 rounded-lg border-2 border-zinc-700'
                : 'bg-[#d8d6cf]/95 rounded-2xl border-2 border-[#b5b3aa]'
            }`}
          >
            {controllerSkin === 'nes' ? (
              /* NES 2-Button Layout (B, A) */
              <div className="absolute inset-0 flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onMouseDown={() => handleVirtualButton('B', true)}
                    onMouseUp={() => handleVirtualButton('B', false)}
                    onTouchStart={() => handleVirtualButton('B', true)}
                    onTouchEnd={() => handleVirtualButton('B', false)}
                    className="w-12 h-12 rounded bg-[#b91c1c] active:brightness-125 text-white font-retro text-xs font-bold shadow-lg"
                  >
                    B
                  </button>
                  <span className="text-[10px] font-retro text-red-500 font-bold mt-1">B</span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onMouseDown={() => handleVirtualButton('A', true)}
                    onMouseUp={() => handleVirtualButton('A', false)}
                    onTouchStart={() => handleVirtualButton('A', true)}
                    onTouchEnd={() => handleVirtualButton('A', false)}
                    className="w-12 h-12 rounded bg-[#b91c1c] active:brightness-125 text-white font-retro text-xs font-bold shadow-lg"
                  >
                    A
                  </button>
                  <span className="text-[10px] font-retro text-red-500 font-bold mt-1">A</span>
                </div>
              </div>
            ) : controllerSkin === 'gb' ? (
              /* Game Boy Angled 2-Button Layout */
              <div className="absolute inset-0 flex items-center justify-center gap-4 rotate-[-25deg]">
                <button
                  onMouseDown={() => handleVirtualButton('B', true)}
                  onMouseUp={() => handleVirtualButton('B', false)}
                  onTouchStart={() => handleVirtualButton('B', true)}
                  onTouchEnd={() => handleVirtualButton('B', false)}
                  className="w-11 h-11 rounded-full bg-[#831843] active:brightness-125 text-white font-retro text-[10px] font-bold shadow-lg border-2 border-[#500724]"
                >
                  B
                </button>
                <button
                  onMouseDown={() => handleVirtualButton('A', true)}
                  onMouseUp={() => handleVirtualButton('A', false)}
                  onTouchStart={() => handleVirtualButton('A', true)}
                  onTouchEnd={() => handleVirtualButton('A', false)}
                  className="w-11 h-11 rounded-full bg-[#831843] active:brightness-125 text-white font-retro text-[10px] font-bold shadow-lg border-2 border-[#500724]"
                >
                  A
                </button>
              </div>
            ) : (
              /* SNES 4-Button Diamond Layout */
              <>
                <button
                  onMouseDown={() => handleVirtualButton('X', true)}
                  onMouseUp={() => handleVirtualButton('X', false)}
                  onTouchStart={() => handleVirtualButton('X', true)}
                  onTouchEnd={() => handleVirtualButton('X', false)}
                  className="absolute top-2 left-12 w-10 h-10 rounded-full bg-[#4f46e5] active:brightness-125 text-white font-retro text-[9px] font-bold shadow-md"
                >
                  X
                </button>
                <button
                  onMouseDown={() => handleVirtualButton('Y', true)}
                  onMouseUp={() => handleVirtualButton('Y', false)}
                  onTouchStart={() => handleVirtualButton('Y', true)}
                  onTouchEnd={() => handleVirtualButton('Y', false)}
                  className="absolute top-12 left-2 w-10 h-10 rounded-full bg-[#06b6d4] active:brightness-125 text-black font-retro text-[9px] font-bold shadow-md"
                >
                  Y
                </button>
                <button
                  onMouseDown={() => handleVirtualButton('A', true)}
                  onMouseUp={() => handleVirtualButton('A', false)}
                  onTouchStart={() => handleVirtualButton('A', true)}
                  onTouchEnd={() => handleVirtualButton('A', false)}
                  className="absolute top-12 right-2 w-10 h-10 rounded-full bg-[#ef4444] active:brightness-125 text-white font-retro text-[9px] font-bold shadow-md"
                >
                  A
                </button>
                <button
                  onMouseDown={() => handleVirtualButton('B', true)}
                  onMouseUp={() => handleVirtualButton('B', false)}
                  onTouchStart={() => handleVirtualButton('B', true)}
                  onTouchEnd={() => handleVirtualButton('B', false)}
                  className="absolute bottom-2 left-12 w-10 h-10 rounded-full bg-[#eab308] active:brightness-125 text-black font-retro text-[9px] font-bold shadow-md"
                >
                  B
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop Keyboard Controls Legend bar */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-400 flex items-center gap-4 transition-opacity duration-300 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span>
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Arrows / WASD</kbd> Move
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Z / Space</kbd> Fire
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Backspace</kbd> Rewind
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">F5</kbd> Save
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">F8</kbd> Load
        </span>
      </div>
    </div>
  );
};
