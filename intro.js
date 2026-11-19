// =========================================================
// 825AutoSpa — Intro tipo tráiler (solo index.html)
// Montaje de ~11 s en blanco y negro con cortes rápidos.
// Sale cada vez que se carga el inicio; "Saltar intro" la cierra.
// Empieza con una pantalla "Entrar con sonido / Sin sonido": el navegador
// solo deja sonar audio después de que la persona toca algo.
// Al terminar avisa a film.js con el evento "intro:end".
// =========================================================
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const root = document.documentElement;

  const sound = () => window.IntroAudio;
  // fast = true al saltar (el sonido se corta rápido); false al terminar con el logo (el eco sigue)
  const end = (fast = true) => {
    if (intro.classList.contains('is-out')) return;
    if (sound()) sound().stop(fast === true);
    intro.classList.add('is-out');
    root.classList.remove('is-intro');
    intro.querySelectorAll('video').forEach(v => v.pause());
    window.dispatchEvent(new Event('intro:end'));
    setTimeout(() => intro.remove(), 1200);
  };

  // Sale cada vez que se carga el inicio, salvo si el usuario prefiere menos movimiento
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.remove();
    return;
  }
  root.classList.add('is-intro');
  // Al recargar, empezar siempre desde arriba (la primera escena)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  // Tomas: [video, segundo donde empieza, duración en segundos, destello al entrar]
  // La intro tiene sus propios clips (img/video/intro/) para no repetir las escenas de abajo.
  // Son de 960×540: en blanco y negro con grano no se nota la diferencia y cargan rápido.
  const SHOTS = [
    ['img/video/intro/01-llegada.mp4', 1.0, 2.6, false],   // alguien camina hacia el auto
    ['img/video/intro/02-jabon.mp4',   4.0, 1.8, true],    // rociando jabón
    ['img/video/intro/03-gotas.mp4',   2.0, 1.7, false],   // gotas sobre la pintura
    ['img/video/intro/04-rines.mp4',   2.0, 1.8, true],    // detallado de rines
    ['img/video/intro/05-pano.mp4',    1.0, 1.7, false],   // secado con paño
    ['img/video/intro/06-auto.mp4',    3.0, 2.2, true],    // el auto listo
  ];
  const TOTAL = SHOTS.reduce((s, x) => s + x[2], 0);

  const stage = intro.querySelector('.intro__stage');
  const bar = intro.querySelector('.intro__bar span');
  const flash = intro.querySelector('.intro__flash');
  intro.querySelector('.intro__skip').addEventListener('click', () => end(true));
  addEventListener('keydown', e => { if (e.key === 'Escape') end(true); });

  // Un <video> por toma, ya posicionado en su segundo de inicio
  // Punto de enfoque en pantallas verticales (dónde está el auto en cada toma)
  const POS = { '01-llegada': '42%', '02-jabon': '58%', '03-gotas': '75%', '04-rines': '45%', '05-pano': '62%', '06-auto': '70%' };

  // Teléfono: se cargan solo 2 tomas a la vez y se liberan al terminar
  // (los iPhone tienen límite de videos abiertos y se traban si hay 6 cargando).
  const LIGHT = matchMedia('(hover: none), (pointer: coarse), (max-width: 820px)').matches;

  const els = SHOTS.map(([src, start], n) => {
    const v = document.createElement('video');
    // iOS solo reproduce solo si el video está en silencio y "en línea"
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.preload = (!LIGHT || n < 2) ? 'auto' : 'metadata';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    const name = src.split('/').pop().replace('.mp4', '');
    v.style.setProperty('--pos', POS[name] || '50%');
    v.src = src + '#t=' + start;
    stage.appendChild(v);
    return v;
  });

  const ready = v => new Promise(res => {
    if (v.readyState >= 3) return res();
    const t = setTimeout(res, 1500);
    v.addEventListener('canplay', () => { clearTimeout(t); res(); }, { once: true });
  });

  // Cierre: pantalla negra y el logo de la marca, como al final de un comercial
  const outro = () => {
    if (intro.classList.contains('is-out')) return;
    els.forEach(v => v.pause());
    intro.classList.add('is-logo');
    if (sound()) sound().logo();
    setTimeout(() => end(false), 2400);
  };

  let elapsed = 0;
  const play = async i => {
    if (intro.classList.contains('is-out')) return;
    if (i >= SHOTS.length) return outro();
    const [, start, dur, doFlash] = SHOTS[i];
    const v = els[i];
    await ready(v);
    try { v.currentTime = start; } catch (e) {}
    // Si el teléfono no deja reproducir (ahorro de batería), no hay intro: directo a la página
    v.play().catch(err => { if (err && err.name === 'NotAllowedError') end(); });
    els.forEach((el, n) => el.classList.toggle('is-on', n === i));
    if (i > 0) {
      const prev = els[i - 1];
      prev.pause();
      if (LIGHT) { prev.removeAttribute('src'); prev.load(); }   // libera memoria en el teléfono
    }
    // La siguiente toma empieza a cargar mientras se ve esta
    const next = els[i + 1];
    if (next && next.preload !== 'auto') { next.preload = 'auto'; next.load(); }
    if (doFlash) { flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); }
    if (sound()) sound().cut(i, dur, !!(SHOTS[i + 1] && SHOTS[i + 1][3]), i === SHOTS.length - 1);

    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${elapsed / TOTAL})`;
    void bar.offsetWidth;
    bar.style.transition = `transform ${dur}s linear`;
    bar.style.transform = `scaleX(${(elapsed + dur) / TOTAL})`;
    elapsed += dur;

    setTimeout(() => play(i + 1), dur * 1000);
  };

  // ---------- Pantalla de entrada ----------
  const muteBtn = intro.querySelector('.intro__mute');
  const setMuteUi = on => {
    muteBtn.setAttribute('aria-pressed', String(!on));
    muteBtn.setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
    muteBtn.classList.toggle('is-muted', !on);
  };
  const begin = withSound => {
    if (intro.classList.contains('is-playing')) return;
    intro.classList.add('is-on', 'is-playing');
    if (withSound && sound()) sound().start();
    setMuteUi(withSound);
    intro.querySelector('.intro__skip').focus({ preventScroll: true });
    play(0);
    setTimeout(() => end(true), (TOTAL + 10) * 1000); // por si algo se atora
  };
  intro.querySelectorAll('[data-intro]').forEach(b =>
    b.addEventListener('click', () => begin(b.dataset.intro === 'sound')));
  // Silenciar / activar a medio camino (si entró sin sonido, este toque lo enciende)
  muteBtn.addEventListener('click', () => {
    const a = sound(); if (!a) return;
    const turnOn = muteBtn.classList.contains('is-muted');
    if (turnOn && !a.started) a.start(); else a.setMuted(!turnOn);
    setMuteUi(turnOn);
  });
  intro.querySelector('[data-intro="sound"]').focus({ preventScroll: true });
})();
