// Script compartido por todas las páginas. Cada bloque revisa si su
// elemento existe, así que es seguro incluirlo en cualquier HTML.

// ===== Marcar la página actual en el menú =====
const page = document.body.dataset.page;
document.querySelectorAll(`.nav [data-nav="${page}"]`).forEach(a => {
  a.classList.add('is-current');
  a.setAttribute('aria-current', 'page');
});

// ===== Header al hacer scroll =====
const header = document.getElementById('header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ===== Menú móvil =====
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open);
  });
}

// ===== Precios por tamaño de vehículo (precios.html) =====
const tabs = document.querySelectorAll('.tab');
const amounts = document.querySelectorAll('.price__amount');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => {
    t.classList.toggle('is-active', t === tab);
    t.setAttribute('aria-selected', t === tab);
  });
  const size = tab.dataset.size;
  amounts.forEach(el => {
    el.textContent = `$${el.dataset[size]}`;
    el.classList.remove('is-updating');
    void el.offsetWidth; // reinicia la animación
    el.classList.add('is-updating');
  });
}));

// ===== Horario: día actual y abierto/cerrado (ubicacion.html) =====
// Formato: [apertura, cierre] en horas (24h). Domingo = 0.
// Si cambias el horario, cámbialo también en la tabla de ubicacion.html.
const HORARIO = {
  0: [9, 18],
  1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18],
  6: [9, 18],
};
const now = new Date();
const status = document.getElementById('openStatus');
if (status) {
  const today = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  document.querySelector(`#hoursTable tr[data-day="${today}"]`)?.classList.add('is-today');

  const [open, close] = HORARIO[today];
  if (hour >= open && hour < close) {
    status.textContent = `Abierto ahora · cierra a las ${close}:00`;
    status.classList.add('is-open');
  } else {
    status.textContent = hour < open ? `Cerrado · abrimos hoy a las ${open}:00` : 'Cerrado por hoy';
    status.classList.add('is-closed');
  }
}

// ===== Animación al aparecer =====
const revealEls = document.querySelectorAll('.section__head, .card, .extras, .hours, .svc');
if ('IntersectionObserver' in window) {
  revealEls.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
}

// ===== Año del footer =====
const year = document.getElementById('year');
if (year) year.textContent = now.getFullYear();

// =========================================================
// Detalles de movimiento (principios de Apple: respuesta
// inmediata, resortes sin rebote, seguir al usuario 1:1)
// =========================================================
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Resorte críticamente amortiguado: 0 → 1 sin pasarse (response en segundos)
const springAt = (t, response = .6) => {
  const w = 2 * Math.PI / response;
  return 1 - (1 + w * t) * Math.exp(-w * t);
};

// ===== Banda de servicios: avanza sola y acelera con tu scroll, en tu dirección =====
const marquee = document.querySelector('.marquee__track');
if (marquee && !reduceMotion) {
  let x = 0, dir = 1, boost = 0, lastY = scrollY, visible = false, raf = 0;
  const half = () => marquee.scrollWidth / 2;
  const tick = () => {
    const dy = scrollY - lastY; lastY = scrollY;
    if (dy) { dir = Math.sign(dy); boost = Math.min(40, boost + Math.abs(dy) * .35); }
    boost *= .92;                                   // la velocidad extra se disipa suave
    x -= dir * (.6 + boost);
    const w = half();
    if (x <= -w) x += w; else if (x > 0) x -= w;    // bucle sin costura
    marquee.style.transform = `translate3d(${x}px,0,0)`;
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { lastY = scrollY; raf = requestAnimationFrame(tick); }
  }).observe(marquee);
}

// ===== Cifras que cuentan al aparecer =====
const counts = document.querySelectorAll('[data-count]');
if (counts.length && 'IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now();
    const step = now => {
      const k = springAt((now - t0) / 1000, 1.1);
      el.textContent = Math.round(to * k);
      if (k < .999) requestAnimationFrame(step); else el.textContent = to;
    };
    el.textContent = 0;
    requestAnimationFrame(step);
  }), { threshold: .6 });
  counts.forEach(el => io.observe(el));
}

// ===== Pestañas de precios: una sola pieza naranja que viaja entre opciones =====
const tabsBox = document.querySelector('.tabs');
if (tabsBox) {
  const thumb = document.createElement('span');
  thumb.className = 'tabs__thumb is-instant';
  thumb.setAttribute('aria-hidden', 'true');
  tabsBox.prepend(thumb);
  tabsBox.classList.add('has-thumb');
  const place = () => {
    const a = tabsBox.querySelector('.tab.is-active');
    if (!a) return;
    // La transición parte de donde está ahora, así que se puede cambiar a medio camino
    thumb.style.width = a.offsetWidth + 'px';
    thumb.style.height = a.offsetHeight + 'px';
    thumb.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
  };
  place();
  requestAnimationFrame(() => thumb.classList.remove('is-instant'));
  tabsBox.addEventListener('click', e => { if (e.target.closest('.tab')) requestAnimationFrame(place); });
  addEventListener('resize', () => {
    thumb.classList.add('is-instant'); place();
    requestAnimationFrame(() => thumb.classList.remove('is-instant'));
  });
  if (document.fonts) document.fonts.ready.then(place);
}

// ===== Luz que sigue al cursor en las tarjetas =====
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.card').forEach(card => {
    const glow = document.createElement('span');
    glow.className = 'card__glow';
    glow.setAttribute('aria-hidden', 'true');
    card.prepend(glow);
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--mx', '-999px');
      card.style.setProperty('--my', '-999px');
    });
  });
}

// ===== Videos dentro de tarjetas (servicios): cargan y se reproducen solo si se ven =====
const cardVideos = document.querySelectorAll('.svc video[data-src]');
if (cardVideos.length && 'IntersectionObserver' in window) {
  const light = matchMedia('(max-width: 820px)').matches || !!(navigator.connection && navigator.connection.saveData);
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src) v.src = light ? v.dataset.src.replace('img/video/', 'img/video/movil/') : v.dataset.src;
      if (!reduceMotion) v.play().catch(() => {});   // si no deja, queda el póster
    } else {
      v.pause();
    }
  }), { rootMargin: '200px 0px' });
  cardVideos.forEach(v => io.observe(v));
}

// =========================================================
// Compartir y código QR
// Cuando el sitio esté publicado, pon aquí su dirección final
// (por ejemplo 'https://825autospa.com/'). Vacío = usa la dirección actual.
// =========================================================
const SITE_URL = 'https://825autospa.github.io/';
const shareUrl = SITE_URL || (location.protocol.startsWith('http') ? location.origin + '/' : '');
const shareData = {
  title: '825 AutoSpa',
  text: 'Lavado de auto desde $80 en Sanctorum, Cuautlancingo. Agenda por WhatsApp:',
  url: shareUrl,
};

document.querySelectorAll('[data-share]').forEach(btn => {
  const label = btn.querySelector('span');
  const original = label ? label.textContent : '';
  const flash = msg => {
    if (!label) return;
    label.textContent = msg;
    setTimeout(() => { label.textContent = original; }, 2000);
  };
  btn.addEventListener('click', async () => {
    // 1) Menú nativo del teléfono (WhatsApp, Facebook, mensajes…)
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { /* el usuario canceló */ }
      return;
    }
    // 2) Computadora: copiar el enlace
    try {
      await navigator.clipboard.writeText(shareUrl);
      flash('¡Enlace copiado!');
    } catch (e) {
      // 3) Último recurso: compartir por WhatsApp
      open('https://wa.me/?text=' + encodeURIComponent(shareData.text + ' ' + shareUrl), '_blank', 'noopener');
    }
  });
});

// QR (librería qrcode-generator). Módulos oscuros sobre fondo claro: así lo leen todas las cámaras.
if (window.qrcode && shareUrl) {
  const qr = qrcode(0, 'H');   // corrección alta: aguanta el logo encima
  qr.addData(shareUrl);
  qr.make();
  const png = (() => {          // PNG grande para imprimir
    const n = qr.getModuleCount(), cell = 16, margin = 4 * cell, size = n * cell + margin * 2;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#09090a';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect(margin + k * cell, margin + r * cell, cell, cell);
    return c.toDataURL('image/png');
  })();
  document.querySelectorAll('[data-qr] .qr__code').forEach(el => {
    el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  });
  document.querySelectorAll('.qr__dl').forEach(a => { a.href = png; });
} else {
  document.querySelectorAll('[data-qr] .qr__code, .qr__dl, .qr__logo').forEach(el => { el.hidden = true; });
}
