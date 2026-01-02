// Web Audio API based sound effects for instant, low-latency game sounds

class GameAudio {
  private audioContext: AudioContext | null = null;
  private masterVolume = 0.5;
  private isMuted = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private createOscillator(
    frequency: number,
    type: OscillatorType,
    duration: number,
    volume: number = 0.3
  ): void {
    if (this.isMuted) return;

    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume * this.masterVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  private createNoise(duration: number, volume: number = 0.2): void {
    if (this.isMuted) return;

    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(volume * this.masterVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
  }

  // Coin collision sound - wooden thud
  playCollision(intensity: number = 0.5): void {
    if (this.isMuted) return;

    const ctx = this.getContext();
    const baseFreq = 150 + intensity * 100;

    // Low thud
    this.createOscillator(baseFreq, 'sine', 0.08, 0.3 * intensity);
    
    // Click transient
    setTimeout(() => {
      this.createNoise(0.03, 0.15 * intensity);
    }, 5);
  }

  // Striker hit sound - sharper impact
  playStrike(power: number = 0.5): void {
    if (this.isMuted) return;

    const normalizedPower = Math.min(power / 25, 1);
    
    // Sharp attack
    this.createOscillator(300 + normalizedPower * 200, 'triangle', 0.05, 0.4);
    
    // Wooden body
    setTimeout(() => {
      this.createOscillator(180, 'sine', 0.1, 0.25 * normalizedPower);
    }, 10);

    // Click
    this.createNoise(0.04, 0.2 * normalizedPower);
  }

  // Pocket sound - satisfying drop
  playPocket(): void {
    if (this.isMuted) return;

    const ctx = this.getContext();

    // Falling tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3 * this.masterVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);

    // Thump at bottom
    setTimeout(() => {
      this.createOscillator(80, 'sine', 0.1, 0.4);
      this.createNoise(0.05, 0.15);
    }, 100);
  }

  // Foul sound - negative feedback
  playFoul(): void {
    if (this.isMuted) return;

    // Descending tones
    this.createOscillator(400, 'square', 0.1, 0.15);
    setTimeout(() => {
      this.createOscillator(300, 'square', 0.1, 0.15);
    }, 100);
    setTimeout(() => {
      this.createOscillator(200, 'square', 0.15, 0.15);
    }, 200);
  }

  // Win sound - triumphant fanfare
  playWin(): void {
    if (this.isMuted) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createOscillator(freq, 'triangle', 0.3, 0.25);
        this.createOscillator(freq * 0.5, 'sine', 0.3, 0.15);
      }, i * 150);
    });
  }

  // Lose sound - sad trombone style
  playLose(): void {
    if (this.isMuted) return;

    const notes = [392, 370, 349, 330]; // G4 descending
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createOscillator(freq, 'triangle', 0.25, 0.2);
      }, i * 200);
    });
  }

  // Turn change notification
  playTurnChange(): void {
    if (this.isMuted) return;

    this.createOscillator(880, 'sine', 0.08, 0.15);
    setTimeout(() => {
      this.createOscillator(1100, 'sine', 0.1, 0.12);
    }, 80);
  }

  // Queen pocketed - special sound
  playQueenPocket(): void {
    if (this.isMuted) return;

    // Sparkle effect
    const sparkleFreqs = [800, 1000, 1200, 1400, 1600];
    sparkleFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.createOscillator(freq, 'sine', 0.15, 0.2);
      }, i * 50);
    });

    // Base pocket sound
    this.playPocket();
  }

  // Button click
  playClick(): void {
    if (this.isMuted) return;
    this.createOscillator(600, 'sine', 0.05, 0.1);
  }

  // Setters
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  // Initialize audio context on user interaction
  init(): void {
    this.getContext();
  }
}

export const gameAudio = new GameAudio();
