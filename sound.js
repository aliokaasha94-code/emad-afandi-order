/* ============================================================
   المنادي الذكي - عماد أفندي | sound.js
   محرك صوت نقي عالي الوضوح (Dual Engine: Web Audio + HTML5 Audio)
   مع دعم كامل للاهتزاز (Vibration) وضغط الصوت واستمرار العمل في الخلفية (Keep-Alive)
   ============================================================ */
(function () {
  "use strict";

  let ctx = null;
  let compressor = null;
  let masterGain = null;
  let loopTimer = null;
  let keepAliveNode = null;
  let unlocked = false;

  // محرك احتياطي عبر عنصر Audio مسبق التحميل
  const chimeAudio = new Audio("assets/chime.wav");
  chimeAudio.preload = "auto";

  // مسار صوتي صامت مستمر في الخلفية لإبقاء قناة الصوت في نظام أندرويد نشطة دائماً
  const silenceAudio = new Audio("assets/silence.wav");
  silenceAudio.preload = "auto";
  silenceAudio.loop = true;

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
      masterGain.gain.setValueAtTime(1.6, ctx.currentTime);

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
    // تشغيل الاهتزاز بقوة على الموبايل
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([400, 150, 400, 150, 700]);
      } catch (e) {}
    }

    // 1. تشغيل عبر Web Audio API
    const c = audio();
    if (c) {
      const scheduleTones = () => {
        try {
          const t = c.currentTime + 0.02;
          tone(TONE_1, t, 1.8, 1.4);
          tone(TONE_HIGH, t + 0.02, 1.0, 0.4);
          tone(TONE_2, t + 0.36, 2.4, 1.6);
        } catch (e) {
          console.warn("Tone schedule error:", e);
        }
      };

      if (c.state === "suspended") {
        c.resume().then(scheduleTones).catch(scheduleTones);
      } else {
        scheduleTones();
      }
    }

    // 2. تشغيل متزامن أو احتياطي عبر ملف Audio المباشر لضمان الصوت في كل الظروف
    if (chimeAudio) {
      try {
        chimeAudio.currentTime = 0;
        chimeAudio.volume = 1.0;
        const p = chimeAudio.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      } catch (e) {}
    }

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
    if (chimeAudio) {
      try {
        chimeAudio.pause();
        chimeAudio.currentTime = 0;
      } catch (e) {}
    }
    if (silenceAudio) {
      try {
        silenceAudio.pause();
      } catch (e) {}
    }
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
      } catch (e) {}
    }
    // إيقاف أي اهتزاز مستمر
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  }

  // فك حظر الصوت في متصفحات الموبايل (Web Audio Unlock + Audio Keep-Alive)
  function unlockAudio() {
    unlocked = true;
    const c = audio();
    if (c && c.state === "suspended") {
      c.resume().catch(() => {});
    }

    // 1. تشغيل مسار صامت دائم يحافظ على اتصال المتصفح بالصوت في نظام أندرويد
    if (silenceAudio) {
      silenceAudio.volume = 0.01;
      const p = silenceAudio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    }

    // 2. MediaSession لإخبار نظام الهاتف باستمرار نشاط الصوت
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "عماد أفندي - متابعة الطلب",
          artist: "جرس المنادي",
          album: "عماد أفندي",
          artwork: [{ src: "assets/logo.png", sizes: "512x512", type: "image/png" }]
        });
        navigator.mediaSession.playbackState = "playing";
      } catch (e) {}
    }

    // 3. تشغيل مذبذب صامت لطبقة Web Audio API
    if (c && !keepAliveNode) {
      try {
        const osc = c.createOscillator();
        const silentGain = c.createGain();
        silentGain.gain.setValueAtTime(0.00001, c.currentTime);
        osc.frequency.setValueAtTime(20, c.currentTime);
        osc.connect(silentGain);
        silentGain.connect(c.destination);
        osc.start();
        keepAliveNode = osc;
      } catch (e) {}
    }

    return true;
  }

  // نغمة تأكيد قصيرة لطيفة عند ضغط زر التفعيل
  function playConfirmBeep() {
    unlockAudio();
    const c = audio();
    if (c && c.state !== "suspended") {
      tone(TONE_2, c.currentTime + 0.02, 0.4, 0.7);
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    }
  }

  function isUnlocked() {
    return unlocked;
  }

  window.EmadSound = {
    playPagerChime,
    startChimeLoop,
    stopChimeLoop,
    unlockAudio,
    playConfirmBeep,
    isUnlocked,
  };
})();
