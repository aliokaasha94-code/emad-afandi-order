/* ============================================================
   المنادي الذكي - عماد أفندي | sound.js
   محرك صوت نقي عالي الوضوح (High-Gain Compressed Chime)
   مع دعم كامل للاهتزاز (Vibration) وضغط الصوت الديناميكي
   ============================================================ */
(function () {
  "use strict";

  let ctx = null;
  let compressor = null;
  let masterGain = null;
  let loopTimer = null;

  // النغمات الخماسية الفاخرة للقهوة: E5 ثم B5 مع نغمة كريستالية
  const TONE_1 = 659.25; // E5
  const TONE_2 = 987.77; // B5
  const TONE_HIGH = 1318.5; // E6 (Sparkle)

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      // ضاغط ديناميكي لرفع الصوت لأقصى درجة ممكنة دون تشويش
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(8, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.002, ctx.currentTime);
      compressor.release.setValueAtTime(0.2, ctx.currentTime);

      // مضاعف الصوت العام
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.5, ctx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // توليد نغمة واحدة متعددة الطبقات وبصوت عالي ومسموع
  function tone(freq, startAt, duration, vol) {
    const c = audio();
    if (!c || !masterGain) return;

    const gain = c.createGain();
    gain.connect(masterGain);

    const peak = vol || 1.0;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    // طبقة أساسية (Sine) + طبقة جسد دافئة (Triangle)
    [
      { type: "sine", detune: 0, mult: 1.0 },
      { type: "triangle", detune: 3, mult: 0.5 },
      { type: "sine", detune: -3, mult: 0.3 }
    ].forEach((layer) => {
      const osc = c.createOscillator();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(freq, startAt);
      osc.detune.setValueAtTime(layer.detune, startAt);

      const subGain = c.createGain();
      subGain.gain.setValueAtTime(layer.mult, startAt);

      osc.connect(subGain);
      subGain.connect(gain);

      osc.start(startAt);
      osc.stop(startAt + duration + 0.1);
    });
  }

  // الرنة الفندقية العالية: دينج - دونج مع رنين واهتزاز
  function playPagerChime() {
    const c = audio();
    if (!c) return false;

    // تشغيل الاهتزاز بقوة
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([400, 150, 400, 150, 700]);
      } catch (e) {}
    }

    const t = c.currentTime + 0.01;
    // النغمة الأولى (دينج)
    tone(TONE_1, t, 1.8, 1.2);
    tone(TONE_HIGH, t + 0.01, 1.0, 0.4);

    // النغمة الثانية (دونج)
    tone(TONE_2, t + 0.36, 2.4, 1.4);
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
    // إيقاف أي اهتزاز مستمر
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  }

  // فك حظر الصوت في متصفحات الموبايل (Web Audio Unlock)
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
