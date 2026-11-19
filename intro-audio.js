// =========================================================
// 825AutoSpa — Sonido de la intro (Web Audio API)
// Toda la música se genera aquí mismo: no hay archivos de audio
// que descargar ni derechos que pagar. Cada golpe cae justo en
// el corte del video porque intro.js avisa en cada toma.
//
// ¿Quieres usar una canción propia (MP3)? Ponla en audio/ y escribe
// su ruta en MUSIC_FILE. Se reproduce junto con los golpes y el
// ritmo generado se apaga para no encimarse.
// =========================================================
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  // Canción de la intro. Copia aquí el MP3 con licencia y suena sola.
  // Mientras el archivo no exista, suena la música generada por este código.
  // Ahora: 'Drift Phonk' de Kulakovka (Alex Shulgin), licencia de contenido de Pixabay.
  // Para usar 'Legacy' cuando tengas la licencia: cópiala como audio/legacy.mp3 y cambia la ruta aquí.
  const MUSIC_FILE = 'audio/phonk.mp3';
  const MUSIC_START = 15;         // segundo de la canción donde empieza la intro: así el drop (seg. ~27) cae en el logo
  const BPM = 96;                 // ritmo del pulso
  const BEAT = 60 / BPM;

  let ctx, master, verbIn, noise, drone, droneFilter, music, musicEl;
  let level = 0;                  // energía: sube con cada corte
  let beatOn = false, nextBeat = 0, step = 0, timer = 0;
  let muted = false, started = false;

  // ---------- Utilidades ----------
  const makeNoise = () => {
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  const makeImpulse = (sec = 3, decay = 2.6) => {
    const len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  };
  const env = (g, t, peak, attack, release) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  };
  const noiseSrc = (t, dur) => {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    s.start(t, Math.random()); s.stop(t + dur + .05);
    return s;
  };
  const out = (node, wet = 0) => {
    node.connect(master);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w).connect(verbIn); }
  };

  // ---------- Instrumentos ----------
  const kick = t => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .13);
    env(g, t, .9, .004, .38);
    o.connect(g); out(g); o.start(t); o.stop(t + .45);
  };
  const hat = (t, vol = .07) => {
    const s = noiseSrc(t, .06), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 7500;
    env(g, t, vol, .002, .05);
    s.connect(f).connect(g); out(g);
  };
  const clap = t => {
    const s = noiseSrc(t, .25), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = .9;
    env(g, t, .32, .003, .2);
    s.connect(f).connect(g); out(g, .5);
  };
  // Golpe de corte: sub que cae + ráfaga de ruido, con eco de sala
  const hit = (t, big = false) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(big ? 90 : 75, t); o.frequency.exponentialRampToValueAtTime(28, t + (big ? 1.4 : .8));
    env(g, t, big ? 1 : .75, .005, big ? 2.2 : 1.1);
    o.connect(g); out(g, .25); o.start(t); o.stop(t + 2.5);
    const s = noiseSrc(t, .6), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(big ? 2400 : 1400, t); f.frequency.exponentialRampToValueAtTime(200, t + .5);
    env(ng, t, big ? .55 : .35, .003, .45);
    s.connect(f).connect(ng); out(ng, .6);
  };
  // Barrido de aire que desemboca en el siguiente corte
  const whoosh = (t, dur) => {
    const s = noiseSrc(t, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 1.6;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(5000, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.32, t + dur * .9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + .08);
    s.connect(f).connect(g); out(g, .3);
  };
  // Ascenso antes del logo
  const riser = (t, dur) => {
    const s = noiseSrc(t, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.28, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + .05);
    s.connect(f).connect(g); out(g, .4);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(.06, t + dur);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur + .05);
    o.connect(og); out(og, .3); o.start(t); o.stop(t + dur + .1);
  };
  // Acorde "dorado" para el logo (La mayor con novena), entra suave y se queda sonando
  const pad = t => {
    [110, 164.81, 220, 277.18, 329.63, 493.88].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i < 2 ? 'sawtooth' : 'sine'; o.frequency.value = f;
      o.detune.value = (i % 2 ? 6 : -6);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i < 2 ? .05 : .07, t + .5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
      o.connect(lp).connect(g); out(g, .7); o.start(t); o.stop(t + 4.6);
    });
  };

  // Base grave que va abriéndose (tensión)
  const startDrone = t => {
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.Q.value = 5;
    droneFilter.frequency.setValueAtTime(160, t);
    droneFilter.frequency.exponentialRampToValueAtTime(1100, t + 12);
    drone = ctx.createGain();
    drone.gain.setValueAtTime(0.0001, t); drone.gain.exponentialRampToValueAtTime(.14, t + 2.5);
    [55, 55.3, 82.41].forEach(f => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(droneFilter); o.start(t); o.stop(t + 20);
    });
    droneFilter.connect(drone); out(drone, .3);
  };

  // Secuenciador: programa los golpes con un poco de anticipación (no depende de setTimeout exacto)
  const schedule = () => {
    if (!beatOn) return;
    while (nextBeat < ctx.currentTime + .12) {
      const t = nextBeat, inBar = step % 4;
      if (!music) {                       // con canción propia, el ritmo lo pone la canción
        if (step % 2 === 0) kick(t);
        if (level >= 2) hat(t + BEAT / 2);
        if (level >= 3) hat(t, .04);
        if (level >= 3 && (inBar === 1 || inBar === 3)) clap(t);
        if (level >= 4) kick(t);
      }
      nextBeat += BEAT; step++;
    }
  };

  // ---------- API para intro.js ----------
  const api = {
    // Se llama desde un clic (el navegador exige un gesto para permitir sonido)
    start() {
      if (started) return;
      started = true;
      // iPhone: que suene aunque el interruptor de silencio esté activado (como un video)
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .25;
      master = ctx.createGain(); master.gain.value = 0;
      master.connect(comp).connect(ctx.destination);
      const verb = ctx.createConvolver(); verb.buffer = makeImpulse();
      verbIn = ctx.createGain(); verbIn.gain.value = .5;
      verbIn.connect(verb).connect(master);
      noise = makeNoise();
      master.gain.setTargetAtTime(muted ? 0 : .85, ctx.currentTime, .25);
      startDrone(ctx.currentTime);
      if (MUSIC_FILE) {
        // Si el archivo todavía no existe (404) o falla, se queda la música generada
        const el = new Audio(MUSIC_FILE);
        el.preload = 'auto';
        el.addEventListener('error', () => { if (music === el) music = null; });
        el.addEventListener('playing', () => {
          music = el;                                   // a partir de aquí el ritmo lo pone la canción
          if (drone) drone.gain.setTargetAtTime(0.0001, ctx.currentTime, .4);
        }, { once: true });
        try { el.currentTime = MUSIC_START; } catch (e) {}
        const m = ctx.createMediaElementSource(el), mg = ctx.createGain(); mg.gain.value = .9;
        m.connect(mg).connect(master);
        el.play().catch(() => {});
        musicEl = el;
      }
      timer = setInterval(schedule, 25);
    },
    // Cada toma: i = número, dur = cuánto dura, flashNext = la siguiente entra con destello
    cut(i, dur, flashNext, isLast) {
      if (!ctx) return;
      const t = ctx.currentTime;
      level = i;
      if (i > 0) hit(t, false);
      if (i === 1) { beatOn = true; nextBeat = t + .02; step = 0; }
      if (isLast) riser(t + .1, Math.max(.6, dur - .1));
      else if (flashNext) whoosh(t + Math.max(0, dur - .55), .55);
    },
    logo() {
      if (!ctx) return;
      const t = ctx.currentTime;
      beatOn = false;
      hit(t, true); pad(t);
      if (drone) drone.gain.setTargetAtTime(0.0001, t, .6);
    },
    // Al terminar: el eco del logo sigue sonando mientras aparece la página
    stop(fast = false) {
      if (!ctx) return;
      const t = ctx.currentTime, fade = fast ? .25 : 2.4;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + fade);
      if (musicEl) { const m = musicEl; setTimeout(() => m.pause(), fade * 1000); }
      clearInterval(timer);
      setTimeout(() => ctx && ctx.close(), fade * 1000 + 200);
    },
    setMuted(m) {
      muted = m;
      if (ctx) master.gain.setTargetAtTime(m ? 0 : .85, ctx.currentTime, .08);
    },
    get started() { return started; },
  };

  // Si cambias de pestaña, se pausa el sonido
  document.addEventListener('visibilitychange', () => {
    if (!ctx || ctx.state === 'closed') return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });

  window.IntroAudio = api;
})();
