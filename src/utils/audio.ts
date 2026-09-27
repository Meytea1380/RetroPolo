/**
 * Web Audio API synthesizer for retro 8-bit sound effects.
 * Zero external audio files required, ultra-low latency, authentic chip chiptune sounds.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.6;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Retro UI Button Click (Snappy 8-bit blip)
   */
  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio playback non-critical
    }
  }

  /**
   * Classic Arcade Coin Ding (Dual tone 987Hz -> 1318Hz)
   */
  playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.2 * this.volume, now);
      gain.gain.setValueAtTime(0.2 * this.volume, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  /**
   * Retro Power Up (Ascending arpeggio)
   */
  playPowerUp() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [330, 392, 659, 523, 587, 784];
      const duration = 0.06;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * duration;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      });
    } catch {}
  }

  /**
   * CRT Switch Click / Buzz (Simulating vacuum tube activation)
   */
  playCrtSwitch(turnOn: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High frequency CRT whine + thump
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      if (turnOn) {
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(15625, now + 0.15); // TV flyback frequency
      } else {
        osc.frequency.setValueAtTime(8000, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
      }

      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Start-up Chime (Majestic 90s console boot sound)
   */
  playStartupSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Chord progression simulating 90s console startup (like PlayStation / Game Boy chime)
      const chord1 = [261.63, 329.63, 392.00, 523.25]; // C major
      const chord2 = [349.23, 440.00, 523.25, 698.46]; // F major
      const chord3 = [392.00, 493.88, 587.33, 783.99, 1046.50]; // G maj / octave

      const playChord = (chord: number[], startTime: number, length: number) => {
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.linearRampToValueAtTime(freq * 1.005, startTime + length);

          gain.gain.setValueAtTime(0.08 * this.volume, startTime);
          gain.gain.linearRampToValueAtTime(0.12 * this.volume, startTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + length);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + length);
        });
      };

      playChord(chord1, now + 0.1, 0.45);
      playChord(chord2, now + 0.55, 0.45);
      playChord(chord3, now + 1.0, 1.2);
    } catch {}
  }
}

export const soundFx = new SoundSynthesizer();
