import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundFx } from '../utils/audio';

interface StartupAnimationProps {
  onComplete: () => void;
  soundEnabled: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const StartupAnimation: React.FC<StartupAnimationProps> = ({
  onComplete,
  soundEnabled,
}) => {
  // Stages: 1. black (0-300ms), 2. dot (300-800ms), 3. explode (800-1400ms), 4. logo (1400-2400ms), 5. finish
  const [stage, setStage] = useState<'black' | 'dot' | 'explode' | 'logo' | 'complete'>('black');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKey);

    // Stage 1: black screen
    const t1 = setTimeout(() => {
      setStage('dot');
    }, 250);

    // Stage 2: dot explosion
    const t2 = setTimeout(() => {
      setStage('explode');
      createExplosion();
      if (soundEnabled) {
        soundFx.playStartupSound();
      }
    }, 850);

    // Stage 3: Logo glitch reveal
    const t3 = setTimeout(() => {
      setStage('logo');
    }, 1450);

    // Stage 4: Finish & fade into app
    const t4 = setTimeout(() => {
      setStage('complete');
      onComplete();
    }, 2700);

    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [soundEnabled, onComplete]);

  const createExplosion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const colors = ['#a855f7', '#06b6d4', '#ec4899', '#a3e635', '#ffffff'];
    const particles: Particle[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      particles.push({
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.floor(Math.random() * 6) + 3, // Retro pixel sizes
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }

    particlesRef.current = particles;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.94;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        // Draw crisp pixel squares
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      });

      ctx.globalAlpha = 1;

      if (particlesRef.current.some((p) => p.alpha > 0.02)) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();
  };

  const handleSkip = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setStage('complete');
    onComplete();
  };

  return (
    <AnimatePresence>
      {stage !== 'complete' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050f] overflow-hidden"
        >
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 z-50 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900/80 border border-zinc-700/60 rounded-md transition-colors backdrop-blur-sm"
          >
            Skip [ESC]
          </button>

          {/* Canvas for pixel explosion */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

          {/* CRT Screen Scanlines in intro */}
          <div className="crt-scanlines opacity-50 pointer-events-none" />

          {/* Center Glowing Dot */}
          {stage === 'dot' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.4, 2],
                opacity: [0, 1, 0.9],
                boxShadow: [
                  '0 0 10px #06b6d4',
                  '0 0 30px #a855f7, 0 0 60px #06b6d4',
                  '0 0 80px #ffffff, 0 0 120px #a855f7',
                ],
              }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
              className="w-4 h-4 rounded-full bg-white relative z-20"
            />
          )}

          {/* Logo Reveal with Glitch Effect */}
          {stage === 'logo' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(8px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative z-20 text-center flex flex-col items-center"
            >
              {/* Retro System Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[10px] font-retro tracking-widest text-[#06b6d4] uppercase mb-4"
              >
                16/32/64-BIT HARDWARE EMULATION
              </motion.div>

              {/* Main Glitch Logo */}
              <div className="relative">
                <h1
                  className="font-retro text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white glitch-anim"
                  style={{
                    textShadow:
                      '3px 3px 0 #a855f7, -3px -3px 0 #06b6d4, 0 0 25px rgba(168, 85, 247, 0.8)',
                  }}
                >
                  RETROVIBE
                </h1>
                <div
                  className="absolute inset-0 font-retro text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#ec4899] opacity-70 pointer-events-none translate-x-[2px] -translate-y-[1px]"
                  aria-hidden="true"
                >
                  RETROVIBE
                </div>
              </div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-5 text-xs sm:text-sm font-sans text-zinc-400 max-w-sm tracking-wide"
              >
                INITIALIZING CRT CATHODE RAY PHOSPHORS...
              </motion.p>

              {/* Pixel Loading Bar */}
              <div className="w-48 h-1.5 bg-zinc-800/80 rounded-full mt-4 overflow-hidden border border-zinc-700/40">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-[#06b6d4] via-[#a855f7] to-[#ec4899]"
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
