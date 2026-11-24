// punteros.js · intro de la portada de Clipeya, v6: un puntero («Gerard») escribe el titular y pulsa «Empezar». Dura 2,1 s.
// Qué hace: recorta la intro de 5,4 s de la v5 (plan v6, paso 4). Una sola persona, un solo gesto: el titular se escribe letra a letra
//   (entero a los 1,3 s) y el puntero va al botón y lo «pulsa» (aparece con una onda). Al acabar quita todas sus capas.
// Entra: el DOM de #inicio (h1 y .boton) y la clase «intro-on» que pone index.html (sin ella no hace nada).
//   Sin intro si: prefers-reduced-motion, ?grabar, ?sinintro, la página ya está scrolleada.
// Sale: capa temporal aria-hidden (#punteros) y, al final, html[data-intro="fin"]. El h1 conserva su texto real (aria-label mientras dura).
//   Se salta con el botón «Saltar», con Escape, al hacer scroll o al girar/redimensionar.
// Prueba: ?introreloj no arranca sola; window.__intro.ir(ms) pinta ese instante y window.__intro.fin() la termina; html[data-intro] pasa de «corre» a «fin».
(() => {
 'use strict';
 const R = document.documentElement;
 if (!R.classList.contains('intro-on')) return;

 const FIN_MS = 2100;
 const T_TIPEO = 380, T_FIN_TIPEO = 1260, T_PULSA = 1640, T_SALE = 1760;
 const manual = /[?&]introreloj/.test(location.search);
 const sec = document.getElementById('inicio');
 const h1 = sec && sec.querySelector('h1');
 const boton = sec && sec.querySelector('.acciones .boton');
 const salta = document.querySelector('.saltar');

 let acabada = false, raf = 0, inicio = 0, capa = null, M = null;
 const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
 const out3 = (p) => 1 - Math.pow(1 - p, 3);
 const cub = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

 function sinIntro() {
  acabada = true;
  R.classList.remove('intro-on');
  R.dataset.intro = 'fin';
  if (salta) salta.hidden = true;
 }
 if (!h1 || !boton || scrollY > 8) { sinIntro(); return; }

 const TEXTO = h1.textContent.replace(/\s+/g, ' ').trim();

 function montar() {
  h1.setAttribute('aria-label', TEXTO);
  h1.textContent = '';
  const letras = [...TEXTO].map((c) => { const s = document.createElement('span'); s.className = 'l'; s.setAttribute('aria-hidden', 'true'); s.textContent = c; h1.append(s); return s; });
  h1.classList.add('listo'); // con las letras ya en su sitio y ocultas, el titular deja de estar oculto (index.html: h1:not(.listo))
  capa = document.createElement('div');
  capa.id = 'punteros'; capa.className = 'punteros'; capa.setAttribute('aria-hidden', 'true');
  document.body.append(capa);
  const caret = document.createElement('i'); caret.className = 'caret'; capa.append(caret);
  const onda = document.createElement('i'); onda.className = 'onda'; capa.append(onda);
  const p = document.createElement('div'); p.className = 'puntero';
  p.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M2 1.5v16l4.2-3.8 2.8 6.3 2.6-1.2-2.7-6.2H15z"/></svg><span>Gerard</span>';
  p.style.opacity = '0'; capa.append(p);
  const fsH = parseFloat(getComputedStyle(h1).fontSize);
  const r = boton.getBoundingClientRect();
  M = { letras, caret, onda, p, alto: fsH * 0.74, vistas: 0, bx: r.left + r.width / 2, by: r.top + r.height / 2, W: innerWidth, H: innerHeight };
  boton.inert = true; // el foco no cae en un botón aún invisible
  if (salta) salta.hidden = false;
 }

 const setOp = (e, v, tr) => {
  e.style.setProperty('opacity', String(v), 'important');
  if (tr !== undefined) e.style.setProperty('transform', tr, 'important');
 };

 function pinta(t) {
  if (acabada || !M) return;
  const m = M, n = m.letras.length;
  // letras: una cada (T_FIN_TIPEO - T_TIPEO) / n ms, con curva de salida (rápido al principio, frena al final)
  const q = clamp((t - T_TIPEO) / (T_FIN_TIPEO - T_TIPEO));
  const k = t < T_TIPEO ? 0 : Math.min(n, Math.ceil(out3(q) * n - 1e-6) + (q > 0 ? 0 : 0));
  for (let i = m.vistas; i < k; i++) m.letras[i].style.opacity = '1';
  for (let i = m.vistas - 1; i >= k; i--) m.letras[i].style.opacity = '0';
  m.vistas = k;
  // caret en el borde derecho de la última letra escrita (se mide cada fotograma: aguanta el cambio de fuente)
  const ref = (k ? m.letras[k - 1] : m.letras[0]).getBoundingClientRect();
  const cx = k ? ref.right : ref.left, cy = ref.top + (ref.height - m.alto) / 2 + 2;
  m.caret.style.height = m.alto + 'px'; m.caret.style.width = Math.max(2, m.alto * 0.04) + 'px';
  m.caret.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
  m.caret.style.opacity = t >= T_TIPEO - 120 && t < T_FIN_TIPEO + 220 ? (t < T_FIN_TIPEO || Math.floor(t / 110) % 2 ? '1' : '0') : '0';
  // puntero: entra desde arriba a la izquierda hasta el caret, lo sigue al escribir, va al botón, pulsa y sale por abajo a la derecha
  let x, y;
  const sigue = [cx + 16, cy + m.alto + 4];
  if (t < T_TIPEO) { const u = out3(clamp((t - 120) / (T_TIPEO - 120))); x = -40 + (sigue[0] + 40) * u; y = -40 + (sigue[1] + 40) * u; }
  else if (t < T_FIN_TIPEO + 80) { x = sigue[0]; y = sigue[1]; }
  else if (t < T_PULSA) { const u = cub(clamp((t - T_FIN_TIPEO - 80) / (T_PULSA - T_FIN_TIPEO - 80))); x = sigue[0] + (m.bx + 10 - sigue[0]) * u; y = sigue[1] + (m.by + 10 - sigue[1]) * u; }
  else if (t < T_SALE) { x = m.bx + 10; y = m.by + 10; }
  else { const u = cub(clamp((t - T_SALE) / (FIN_MS - T_SALE))); x = m.bx + 10 + (m.W + 80 - m.bx) * u; y = m.by + 10 + (m.H + 60 - m.by) * u; }
  m.p.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  m.p.style.opacity = t >= 120 && t < FIN_MS - 80 ? '1' : '0';
  const lab = m.p.lastChild;
  lab.style.left = (x + 14 + 64 > m.W - 8 ? -72 : 14) + 'px';
  lab.style.top = (y + 44 > m.H - 6 ? -26 : 20) + 'px';
  // botón: aparece al pulsar (onda verde + escala)
  const pp = clamp((t - T_PULSA) / 260);
  setOp(boton, pp.toFixed(3), `scale(${(0.94 + 0.06 * out3(pp)).toFixed(3)})`);
  const po = clamp((t - T_PULSA) / 460);
  m.onda.style.opacity = po > 0 && po < 1 ? (0.8 * (1 - po)).toFixed(3) : '0';
  m.onda.style.transform = `translate3d(${m.bx.toFixed(1)}px,${m.by.toFixed(1)}px,0) scale(${(0.35 + 1.25 * po).toFixed(3)})`;
  if (t >= FIN_MS) acabar();
 }

 function acabar() {
  if (acabada) return;
  acabada = true;
  cancelAnimationFrame(raf);
  removeEventListener('scroll', alScroll);
  removeEventListener('resize', acabar);
  removeEventListener('keydown', alTecla);
  R.classList.add('intro-fin');
  if (M) { h1.textContent = TEXTO; h1.removeAttribute('aria-label'); }
  h1.classList.add('listo');
  boton.style.removeProperty('opacity'); boton.style.removeProperty('transform');
  boton.inert = false;
  R.classList.remove('intro-on');
  if (capa) capa.remove();
  if (salta) salta.hidden = true;
  R.dataset.intro = 'fin';
  void R.offsetWidth;
  requestAnimationFrame(() => R.classList.remove('intro-fin'));
 }
 const alScroll = () => { if (scrollY > 8) acabar(); };
 const alTecla = (ev) => { if (ev.key === 'Escape') acabar(); };

 function bucle() {
  if (acabada) return;
  pinta(performance.now() - inicio);
  raf = requestAnimationFrame(bucle);
 }

 window.__intro = {
  ir: (ms) => { if (!M) return false; pinta(ms); return true; },
  fin: acabar,
  lista: () => !!M && !acabada,
  ms: FIN_MS,
 };

 // sin esperar a las fuentes: el caret se mide en cada fotograma, así que un cambio de fuente a medias no descoloca nada
 try {
  montar();
  if (salta) salta.addEventListener('click', acabar);
  addEventListener('scroll', alScroll, { passive: true });
  addEventListener('resize', acabar);
  addEventListener('keydown', alTecla);
  R.dataset.intro = 'corre';
  if (manual) pinta(0);
  else { inicio = performance.now(); bucle(); }
 } catch (e) { acabar(); }
})();
