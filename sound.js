/* ============================================================
   المنادي الذكي - عماد أفندي | sound.js
   محرك صوت مدمج: جرس فندقي فاخر (Two-tone Pentatonic Chime)
   باستخدام Web Audio API فقط - بدون أي ملفات خارجية.
   ============================================================ */
(function () {
  "use strict";

  let ctx = null;
  let loopTimer = null;

  // النغمتان: E5 ثم B5 (خماسي فاخر - Pentatonic fifth)
  const TONE_1 = 659.25; // E5
  const TONE_2 = 987.77; // B5

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // نغمة واحدة بلمعان (oscillator مزدوج + اضمحلال أسي)
  function tone(freq, startAt, duration) {
    const c = audio();
    if (!c) return;
    const gain = c.createGain();
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.5, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    [0, 2].forEach((cents, i) => {
      const osc = c.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      const g2 = c.createGain();
      g2.gain.value = i === 0 ? 1 : 0.25;
      osc.connect(g2);
      g2.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.1);
    });
  }

  // الرنة الفندقية الكاملة: دينج - دونج
  function playPagerChime() {
    const c = audio();
    if (!c) return false;
    const t = c.currentTime + 0.02;
    tone(TONE_1, t, 1.6);
    tone(TONE_2, t + 0.38, 2.2);
    return true;
  }

  function startChimeLoop(everyMs) {
    stopChimeLoop();
    playPagerChime();
    loopTimer = setInterval(playPagerChime, everyMs || 3000);
  }

  function stopChimeLoop() {
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
  }

  // فك حظر الصوت (لازم يتنادى من جوه حدث ضغطة زر)
  function unlockAudio() {
    const c = audio();
    return !!(c && c.state !== "closed");
  }

  window.EmadSound = {
    playPagerChime,
    startChimeLoop,
    stopChimeLoop,
    unlockAudio,
  };
})();
