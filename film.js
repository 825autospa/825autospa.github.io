// =========================================================
// 825AutoSpa — Película por escenas (solo index.html)
// Cada escena es un clip de video. Al hacer scroll se pasa de
// una escena a otra con un corte de luz; la cámara se acerca
// poco a poco dentro de cada escena.
//
// Videos en img/video/ (Pexels, licencia libre). Para cambiar
// una escena, reemplaza el archivo con el mismo nombre.
// =========================================================
(() => {
  const section = document.getElementById('film');
  if (!section) return;

  const $ = s => section.querySelector(s);
  const scenes = [...section.querySelectorAll('.film__scene')];
  const videos = scenes.map(s => s.querySelector('video'));
  const texts = [...section.querySelectorAll('.film__text')];
  const steps = [...section.querySelectorAll('.film__steps li')];
  const bar = $('.film__bar span');
  const counter = $('.film__count b');
  const flash = $('.film__flash');
  const header = document.getElementById('header');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = scenes.length;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Cada línea del título va dentro de una máscara para entrar desde abajo
  section.querySelectorAll('.film__title').forEach(title => {
    title.innerHTML = title.innerHTML
      .split(/<br\s*\/?>/i)
      .map((html, n) => `<span class="line"><span class="line__in" style="--i:${n}">${html.trim()}</span></span>`)
      .join('');
  });

  // ---------- Teléfono o ahorro de datos: versión ligera (960×540) ----------
  const light = matchMedia('(max-width: 820px)').matches || !!(navigator.connection && navigator.connection.saveData);
  const pickSrc = src => light ? src.replace('img/video/', 'img/video/movil/') : src;
  window.__pickVideo = pickSrc;   // intro.js usa la misma regla

  // ---------- Carga: el primer clip ya, los demás cuando se acerquen ----------
  const load = i => {
    const v = videos[i];
    if (!v || v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.src = pickSrc(v.dataset.src);
    v.load();
  };
  load(0); load(1);
  videos[0].addEventListener('loadeddata', () => section.classList.add('is-ready'), { once: true });
  setTimeout(() => section.classList.add('is-ready'), 2500); // por si el video tarda

  // Pantallas táctiles: el scroll nativo del teléfono es más fluido que cualquier suavizado
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const lite = touch || light;   // modo ligero: teléfono, pantalla angosta o ahorro de datos

  // ---------- Scroll suave (Lenis) — solo con mouse ----------
  if (window.Lenis && !reduceMotion && !touch) {
    const lenis = new window.Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9 });
    if (document.documentElement.classList.contains('is-intro')) {
      lenis.stop();
      addEventListener('intro:end', () => lenis.start(), { once: true });
    }
    const loop = t => { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const el = document.querySelector(a.getAttribute('href'));
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -60 }); }
    }));
  }

  // ---------- Cambio de escena ----------
  let current = -1;
  const setScene = i => {
    if (i === current) return;
    const first = current === -1;
    current = i;
    load(i); load(i + 1);

    scenes.forEach((s, n) => s.classList.toggle('is-active', n === i));
    texts.forEach((t, n) => {
      t.classList.toggle('is-active', n === i);
      t.classList.toggle('is-past', n < i);   // las pasadas salen hacia arriba
    });
    steps.forEach((li, n) => {
      li.classList.toggle('is-done', n + 1 < i);
      li.classList.toggle('is-current', n + 1 === i || (i === N - 1 && n === steps.length - 1));
    });
    if (counter) counter.textContent = String(i + 1).padStart(2, '0');

    // Solo se reproduce el clip visible (ahorra batería)
    videos.forEach((v, n) => {
      if (n === i) {
        if (!reduceMotion) {
          try { v.currentTime = 0; } catch (e) {}
          v.play().catch(err => { if (err && err.name === 'NotAllowedError') section.classList.add('is-static'); });   // se queda el póster
        }
      } else {
        setTimeout(() => { if (current !== n) v.pause(); }, 900);
      }
    });

    // Corte con destello de luz
    if (!first && flash && !reduceMotion) {
      flash.classList.remove('is-on');
      void flash.offsetWidth;
      flash.classList.add('is-on');
    }
  };

  // ---------- Bucle de scroll ----------
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    const p = clamp(-r.top / total);
    const f = p * N;
    const i = Math.min(N - 1, Math.floor(f));
    const local = f - i; // 0 → 1 dentro de la escena

    setScene(i);

    // Cámara: acercamiento lento dentro de la escena
    // (en teléfono no: recalcular el video en cada movimiento del dedo es lo que más lo traba)
    if (!reduceMotion && !lite) scenes[i].style.setProperty('--zoom', (1.04 + local * .1).toFixed(4));

    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    section.style.setProperty('--intro', (1 - clamp(f / .6)).toFixed(3));
    if (header) header.classList.toggle('header--dark', r.bottom > 60);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  // Al terminar la intro: la primera escena arranca desde cero y el título entra de nuevo
  addEventListener('intro:end', () => {
    const v = videos[current];
    if (v) { try { v.currentTime = 0; } catch (e) {} v.play().catch(() => {}); }
    const t = texts[current];
    if (t) { t.classList.remove('is-active'); void t.offsetWidth; requestAnimationFrame(() => t.classList.add('is-active')); }
  });

  // Pausa todo si la sección sale de pantalla
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const v = videos[current];
      if (!v || reduceMotion) return;
      e.isIntersecting ? v.play().catch(() => {}) : v.pause();
    }).observe(section);
  }
})();
