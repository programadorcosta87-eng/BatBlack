// 8-bit Web Audio API Synthesizer for BatBlack

let audioCtx: AudioContext | null = null;
let isMuted = false;

// Check localStorage for saved sound preference
try {
  const savedMute = localStorage.getItem('batblack_muted');
  if (savedMute !== null) {
    isMuted = savedMute === 'true';
  }
} catch {
  // Ignore storage errors
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function toggleAudioMute(): boolean {
  isMuted = !isMuted;
  try {
    localStorage.setItem('batblack_muted', String(isMuted));
  } catch {
    // Ignore
  }
  return isMuted;
}

/**
 * Sound when Bat changes height (1 -> 2 -> 3)
 */
export function playLaneChangeSound(lane: number): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Pitch escalates with lane: Lane 1 = 320Hz, Lane 2 = 440Hz, Lane 3 = 587Hz
  const freqs = [320, 440, 587];
  const targetFreq = freqs[lane - 1] || 440;

  osc.type = 'square';
  osc.frequency.setValueAtTime(targetFreq * 0.85, now);
  osc.frequency.exponentialRampToValueAtTime(targetFreq * 1.15, now + 0.06);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Sound for score milestone (every 100 points, Chrome Dino style)
 */
export function playScoreMilestoneSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // First beep
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(800, now);
  gain1.gain.setValueAtTime(0.07, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.09);

  // Second higher beep
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(1050, now + 0.09);
  gain2.gain.setValueAtTime(0.07, now + 0.09);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.09);
  osc2.stop(now + 0.23);
}

/**
 * 8-bit Crash/Hit sound when Bat hits an obstacle
 */
export function playCrashSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Noise explosion buffer
  const bufferSize = ctx.sampleRate * 0.25;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(900, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 0.24);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.18, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // Low tone rumble
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

  oscGain.gain.setValueAtTime(0.15, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.25);
  osc.start(now);
  osc.stop(now + 0.25);
}
