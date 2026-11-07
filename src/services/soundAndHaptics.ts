// Procedural Web Audio API Synthesizer + Android 10+ Haptic Vibration Engine
import { HapticIntensity } from '../types/arcade';

const INTENSITY_MULTIPLIER: Record<HapticIntensity, number> = {
  off: 0,
  low: 0.5,
  medium: 1.0,
  high: 1.65,
};

class SoundAndHapticsService {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private hapticIntensity: HapticIntensity = 'medium';

  public configure(sound: boolean, haptics: boolean | HapticIntensity) {
    this.soundEnabled = sound;
    if (typeof haptics === 'boolean') {
      this.hapticIntensity = haptics ? 'medium' : 'off';
    } else {
      this.hapticIntensity = haptics;
    }
  }

  private getContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private scalePattern(pattern: number | number[], mult: number): number | number[] {
    if (typeof pattern === 'number') {
      return Math.max(4, Math.round(pattern * mult));
    }
    // Even indices are vibration durations, odd indices are pause intervals
    return pattern.map((val, idx) =>
      idx % 2 === 0 ? Math.max(4, Math.round(val * mult)) : val
    );
  }

  public vibrate(pattern: number | number[]) {
    const mult = INTENSITY_MULTIPLIER[this.hapticIntensity] ?? 0;
    if (mult <= 0) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(this.scalePattern(pattern, mult));
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  public previewHaptic(intensity: HapticIntensity) {
    this.hapticIntensity = intensity;
    this.playTone(520, 0.055, 'triangle', 0.09, 680);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (intensity === 'off') {
          navigator.vibrate(0);
        } else {
          const mult = INTENSITY_MULTIPLIER[intensity];
          navigator.vibrate(this.scalePattern([16, 22, 24], mult));
        }
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    endFreq?: number,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.015, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playUiTap() {
    this.vibrate(10);
    this.playTone(520, 0.055, 'triangle', 0.09, 680);
  }

  public playHubSwitch() {
    this.vibrate(14);
    this.playTone(340, 0.09, 'sine', 0.11, 510);
    this.playTone(680, 0.12, 'triangle', 0.07, 760, 0.03);
  }

  public playMove() {
    this.vibrate(8);
    this.playTone(280, 0.04, 'triangle', 0.08, 320);
  }

  public playRotate() {
    this.vibrate(12);
    this.playTone(440, 0.065, 'sine', 0.11, 660);
  }

  public playSoftDrop() {
    this.vibrate(6);
    this.playTone(210, 0.035, 'sine', 0.07, 170);
  }

  public playHardDrop() {
    this.vibrate([18, 20, 28]);
    this.playTone(190, 0.12, 'sawtooth', 0.14, 58);
    this.playTone(360, 0.07, 'triangle', 0.09, 120);
  }

  public playLineClear(lines: number) {
    this.vibrate(lines >= 4 ? [25, 30, 45, 30, 65] : [20, 25, 35]);
    const notes = lines >= 4 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.18, 'triangle', 0.13, n * 1.03, idx * 0.055);
    });
  }

  public playPlaceX() {
    this.vibrate(15);
    this.playTone(480, 0.09, 'triangle', 0.12, 720);
    this.playTone(960, 0.08, 'sine', 0.07, 1120, 0.03);
  }

  public playPlaceO() {
    this.vibrate(15);
    this.playTone(420, 0.1, 'sine', 0.12, 560);
    this.playTone(630, 0.09, 'triangle', 0.07, 840, 0.03);
  }

  public playSnakeEat(combo = 1) {
    this.vibrate([14, 18, 22]);
    const base = 440 + Math.min(combo * 35, 350);
    this.playTone(base, 0.08, 'triangle', 0.13, base * 1.25);
    this.playTone(base * 1.5, 0.12, 'sine', 0.11, base * 1.8, 0.05);
  }

  public playVictory() {
    this.vibrate([25, 35, 25, 35, 60]);
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      this.playTone(freq, 0.26, 'triangle', 0.14, freq * 1.02, i * 0.07);
    });
  }

  public playLaserShoot() {
    this.vibrate(8);
    this.playTone(880, 0.07, 'sawtooth', 0.12, 220);
  }

  public playInvaderMarch(pitchIndex = 0) {
    this.vibrate(6);
    const pitches = [130, 115, 100, 85];
    const freq = pitches[pitchIndex % pitches.length];
    this.playTone(freq, 0.065, 'square', 0.12, freq * 0.9);
  }

  public playUfoHum() {
    this.vibrate(10);
    this.playTone(600, 0.14, 'sine', 0.1, 750);
  }

  public playEmpBlast() {
    this.vibrate([30, 20, 50, 20, 70]);
    this.playTone(880, 0.22, 'sawtooth', 0.18, 55);
    this.playTone(330, 0.35, 'triangle', 0.15, 40, 0.05);
  }

  public playGameOver() {
    this.vibrate([45, 40, 75]);
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.22, 'sawtooth', 0.11, freq * 0.92, i * 0.085);
    });
  }
}

export const soundFX = new SoundAndHapticsService();
