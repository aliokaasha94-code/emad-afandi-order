// Web Audio API based Pentatonic Pager Chime (E5 -> B5) - Zero external files needed
let audioCtx: AudioContext | null = null;
let loopId: ReturnType<typeof setInterval> | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function unlockAudio(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return true;
}

function playTone(freq: number, startAt: number, duration: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.0001, startAt);
  masterGain.gain.exponentialRampToValueAtTime(0.6, startAt + 0.03);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  // Twin oscillators for warm chime harmonics
  [0, 2].forEach((cents, i) => {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    osc.detune.value = cents;

    const subGain = ctx.createGain();
    subGain.gain.value = i === 0 ? 1 : 0.28;

    osc.connect(subGain);
    subGain.connect(masterGain);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.1);
  });
}

export function playPagerChime(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    const now = ctx.currentTime + 0.02;
    // Tone 1: E5 (659.25 Hz)
    playTone(659.25, now, 1.4);
    // Tone 2: B5 (987.77 Hz) - 5th harmonic bell
    playTone(987.77, now + 0.32, 2.0);
    return true;
  } catch {
    return false;
  }
}

export function vibrate(pattern: number[] = [400, 200, 400, 200, 800]) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

export function startChimeLoop(everyMs = 3500) {
  stopChimeLoop();
  playPagerChime();
  vibrate();
  loopId = setInterval(() => {
    playPagerChime();
    vibrate([300, 150, 300]);
  }, everyMs);
}

export function stopChimeLoop() {
  if (loopId) {
    clearInterval(loopId);
    loopId = null;
  }
}
