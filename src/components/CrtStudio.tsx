import React, { useState, useEffect, useRef } from 'react';
import { CrtSettings, CrtScanlineMode, CrtColorPreset } from '../types';
import { CrtOverlay } from './CrtOverlay';
import { soundFx } from '../utils/audio';
import { Sliders, RotateCcw, Check, Sparkles, Monitor, Eye } from 'lucide-react';

interface CrtStudioProps {
  settings: CrtSettings;
  onUpdateSettings: (newSettings: CrtSettings) => void;
  onPlayTestGame: () => void;
}

export const CrtStudio: React.FC<CrtStudioProps> = ({
  settings,
  onUpdateSettings,
  onPlayTestGame,
}) => {
  const [testPattern, setTestPattern] = useState<'arcade' | 'colorbars' | 'grid'>('arcade');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animated arcade retro game canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let shipX = 160;
    let shipDir = 1;
    let bullets: { x: number; y: number }[] = [];
    let invaders: { x: number; y: number; alive: boolean; color: string }[] = [];
    const stars: { x: number; y: number; speed: number; size: number }[] = [];

    // Initialize stars
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * 320,
        y: Math.random() * 240,
        speed: Math.random() * 1.5 + 0.5,
        size: Math.random() > 0.8 ? 2 : 1,
      });
    }

    // Initialize invaders
    const colors = ['#ec4899', '#06b6d4', '#a855f7', '#a3e635'];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        invaders.push({
          x: 40 + c * 30,
          y: 35 + r * 22,
          alive: true,
          color: colors[(r + c) % colors.length],
        });
      }
    }

    let frame = 0;

    const render = () => {
      frame++;
      ctx.fillStyle = '#060611';
      ctx.fillRect(0, 0, 320, 240);

      if (testPattern === 'colorbars') {
        // SMPTE Color Bars
        const barColors = [
          '#c0c0c0', '#c0c000', '#00c0c0', '#00c000',
          '#c000c0', '#c00000', '#0000c0', '#000000',
        ];
        const barW = 320 / barColors.length;
        barColors.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(i * barW, 0, barW, 170);
        });

        // Bottom calibration row
        const bottomColors = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
        const bW = 320 / bottomColors.length;
        bottomColors.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(i * bW, 170, bW, 70);
        });

        // Test frequency text
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText('NTSC / PAL VIDEO SIGNAL 15.734 kHz', 40, 225);
      } else if (testPattern === 'grid') {
        // Convergence Grid Pattern
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1;
        for (let x = 0; x < 320; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 240);
          ctx.stroke();
        }
        for (let y = 0; y < 240; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(320, y);
          ctx.stroke();
        }
        // Center crosshair
        ctx.strokeStyle = '#ff0055';
        ctx.strokeRect(140, 100, 40, 40);
        ctx.beginPath();
        ctx.arc(160, 120, 30, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Arcade Space Vanguard Demo
        // Stars
        stars.forEach((s) => {
          s.y += s.speed;
          if (s.y > 240) s.y = 0;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
        });

        // Move ship
        shipX += shipDir * 1.5;
        if (shipX > 280) shipDir = -1;
        if (shipX < 40) shipDir = 1;

        // Auto fire
        if (frame % 16 === 0) {
          bullets.push({ x: shipX, y: 195 });
        }

        // Update bullets
        bullets.forEach((b) => {
          b.y -= 4;
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(b.x - 1, b.y, 3, 7);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x, b.y + 1, 1, 5);

          // Check collisions with invaders
          invaders.forEach((inv) => {
            if (
              inv.alive &&
              Math.abs(b.x - (inv.x + 10)) < 12 &&
              Math.abs(b.y - (inv.y + 8)) < 10
            ) {
              inv.alive = false;
              b.y = -999;
            }
          });
        });
        bullets = bullets.filter((b) => b.y > 0);

        // Draw Invaders
        let anyAlive = false;
        invaders.forEach((inv) => {
          if (!inv.alive) return;
          anyAlive = true;
          const wobble = Math.sin(frame * 0.08 + inv.x) * 2;
          ctx.fillStyle = inv.color;
          // 8-bit invader sprite shape
          ctx.fillRect(inv.x, inv.y + wobble, 16, 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(inv.x + 3, inv.y + 2 + wobble, 3, 3);
          ctx.fillRect(inv.x + 10, inv.y + 2 + wobble, 3, 3);
        });

        // Respawn invaders if all cleared
        if (!anyAlive) {
          invaders.forEach((inv) => (inv.alive = true));
        }

        // Draw Player Ship (Retro Vector Fighter)
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(shipX, 195);
        ctx.lineTo(shipX - 14, 215);
        ctx.lineTo(shipX + 14, 215);
        ctx.closePath();
        ctx.fill();

        // Ship Cockpit
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(shipX - 2, 203, 4, 6);

        // Thruster flame
        if (frame % 4 < 2) {
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(shipX - 4, 216, 8, 5);
        }

        // HUD Text
        ctx.fillStyle = '#fbbf24';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('SCORE 024850', 16, 20);
        ctx.fillStyle = '#a3e635';
        ctx.fillText('HIGH 099990', 210, 20);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [testPattern]);

  const updateSetting = <K extends keyof CrtSettings>(key: K, value: CrtSettings[K]) => {
    soundFx.playClick();
    onUpdateSettings({ ...settings, [key]: value });
  };

  const presets: { id: CrtColorPreset; name: string; desc: string; color: string }[] = [
    { id: 'standard', name: 'Standard CRT', desc: 'Warm 80s arcade phosphor glow', color: '#a855f7' },
    { id: 'trinitron', name: 'Sony Trinitron PVM', desc: 'Aperture grille sharpness & deep black levels', color: '#06b6d4' },
    { id: 'gameboy', name: 'Game Boy DMG-01', desc: 'Authentic 4-shade greenish LCD phosphor', color: '#84cc16' },
    { id: 'amber', name: 'Amber Phosphor', desc: 'Warm 70s/80s monochrome phosphor terminal', color: '#f59e0b' },
    { id: 'cyberpunk', name: 'Neon Synthwave', desc: 'Hyper-vibrant hot pink & cyan saturation', color: '#ec4899' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#06b6d4] tracking-wider uppercase mb-2">
            <Sliders className="w-4 h-4" />
            <span>Cathode Ray Tube Simulation Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-retro text-white tracking-wide">
            CRT POST-PROCESSING STUDIO
          </h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl font-sans">
            Customize vintage cathode ray tube shaders including scanline density, barrel glass curvature,
            phosphor aperture grilles, and RGB chromatic aberration.
          </p>
        </div>

        {/* Top Action CTAs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFx.playClick();
              onUpdateSettings({
                enabled: true,
                scanlineMode: 'medium',
                curvature: true,
                flicker: true,
                chromaticAberration: true,
                phosphorGrid: true,
                colorPreset: 'standard',
                bloom: true,
                vignette: true,
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={() => {
              soundFx.playCoin();
              onPlayTestGame();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-retro text-white bg-gradient-to-r from-[#a855f7] to-[#ec4899] rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:brightness-110 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch with Shader</span>
          </button>
        </div>
      </div>

      {/* Main Grid: CRT Monitor on Left, Control Rack on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Simulated Monitor */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Physical TV Chassis */}
          <div className="w-full max-w-xl bg-gradient-to-b from-[#1c192e] to-[#0f0e1c] p-4 sm:p-6 rounded-3xl border-2 border-purple-900/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.15)] relative">
            {/* Monitor Brand Emblem */}
            <div className="flex items-center justify-between px-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ec4899] animate-pulse" />
                <span className="text-[10px] font-retro text-zinc-400 tracking-wider">RETRO-TRON PVM-1440</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-zinc-500">60Hz NTSC</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-mono text-[#a3e635]">RGB IN</span>
              </div>
            </div>

            {/* CRT Screen Display Area wrapped in CRT Overlay */}
            <div className="aspect-[4/3] w-full bg-black rounded-xl overflow-hidden shadow-inner border border-zinc-800">
              <CrtOverlay settings={settings} className="w-full h-full" isMonitorFrame={true}>
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className="w-full h-full object-contain image-rendering-pixelated bg-black"
                />
              </CrtOverlay>
            </div>

            {/* Monitor Lower Control Panel with Knobs */}
            <div className="mt-4 pt-3 border-t border-purple-950/60 flex items-center justify-between text-xs text-zinc-400">
              {/* Pattern Selector Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-zinc-500 mr-1">SIGNAL:</span>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setTestPattern('arcade');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    testPattern === 'arcade'
                      ? 'bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/40'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  Game Action
                </button>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setTestPattern('colorbars');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    testPattern === 'colorbars'
                      ? 'bg-[#06b6d4]/20 text-[#06b6d4] border border-[#06b6d4]/40'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  SMPTE Bars
                </button>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setTestPattern('grid');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    testPattern === 'grid'
                      ? 'bg-[#a3e635]/20 text-[#a3e635] border border-[#a3e635]/40'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  Convergence
                </button>
              </div>

              {/* Master Power LED switch */}
              <button
                onClick={() => {
                  soundFx.playCrtSwitch(!settings.enabled);
                  updateSetting('enabled', !settings.enabled);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono uppercase transition-all ${
                  settings.enabled
                    ? 'bg-[#a3e635]/20 text-[#a3e635] border border-[#a3e635]/40'
                    : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    settings.enabled ? 'bg-[#a3e635] shadow-[0_0_6px_#a3e635]' : 'bg-zinc-600'
                  }`}
                />
                <span>{settings.enabled ? 'CRT ON' : 'CRT BYPASS'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Shader Control Knobs & Preset Rack */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preset Selector */}
          <div className="bg-[#0e0c1f]/80 border border-purple-900/30 rounded-2xl p-5">
            <h3 className="text-xs font-retro text-zinc-200 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Phosphor Presets</span>
              <Sparkles className="w-3.5 h-3.5 text-[#a855f7]" />
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {presets.map((p) => {
                const isActive = settings.colorPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => updateSetting('colorPreset', p.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-purple-950/40 border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-xs font-semibold text-white">{p.name}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 font-sans">{p.desc}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#a855f7] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shader Parameters Toggles */}
          <div className="bg-[#0e0c1f]/80 border border-purple-900/30 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-retro text-zinc-200 uppercase tracking-wider mb-3">
              Geometry & Optics
            </h3>

            {/* Scanline Density Mode */}
            <div>
              <label className="text-xs text-zinc-300 font-mono block mb-2">
                Scanline Density
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
                {(['none', 'subtle', 'medium', 'heavy'] as CrtScanlineMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSetting('scanlineMode', mode)}
                    className={`py-1.5 text-xs font-mono capitalize rounded-lg transition-colors ${
                      settings.scanlineMode === mode
                        ? 'bg-[#a855f7] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Switches */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Curvature switch */}
              <button
                onClick={() => updateSetting('curvature', !settings.curvature)}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                  settings.curvature
                    ? 'bg-purple-950/40 border-[#a855f7] text-white'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-medium">Barrel Glass</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.curvature ? 'bg-[#a3e635]' : 'bg-zinc-700'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-sans">Curved tube corners</span>
              </button>

              {/* Chromatic aberration switch */}
              <button
                onClick={() =>
                  updateSetting('chromaticAberration', !settings.chromaticAberration)
                }
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                  settings.chromaticAberration
                    ? 'bg-purple-950/40 border-[#a855f7] text-white'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-medium">RGB Fringe</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.chromaticAberration ? 'bg-[#a3e635]' : 'bg-zinc-700'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-sans">Prismatic color split</span>
              </button>

              {/* Phosphor Grid switch */}
              <button
                onClick={() => updateSetting('phosphorGrid', !settings.phosphorGrid)}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                  settings.phosphorGrid
                    ? 'bg-purple-950/40 border-[#a855f7] text-white'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-medium">Shadow Mask</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.phosphorGrid ? 'bg-[#a3e635]' : 'bg-zinc-700'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-sans">Aperture dot matrix</span>
              </button>

              {/* Flicker switch */}
              <button
                onClick={() => updateSetting('flicker', !settings.flicker)}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                  settings.flicker
                    ? 'bg-purple-950/40 border-[#a855f7] text-white'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-medium">CRT Flicker</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.flicker ? 'bg-[#a3e635]' : 'bg-zinc-700'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-sans">60Hz micro-pulsing</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
