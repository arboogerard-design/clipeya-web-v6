// app.js · galería circular 3D de Clipeya, v6 «Dentro de la sala» (three.js r160).
// Qué hace: cuelga en un anillo las capturas y la grabación real de nuestras webs y mueve la cámara con el scroll:
//   desde arriba (portada) → dentro, delante de cada obra → delante de la pared de 7 negocios → plano final con el hueco «Tu tienda».
//   v6 añade a la v5: pared de 7 paneles que se encienden al elegir negocio (chips de index.html o clic en el 3D),
//   abanico de 7 pantallas del presupuesto, plano final con el hueco que late, un solo vídeo (crm) que solo carga y suena en foco.
// Sin WebGL, con fallo de carga o con «reducir movimiento», la página se lee igual (texto en el HTML + imagen de respaldo).
// Eventos con index.html: escucha «negocio» {id|null} y «hueco-lleno» {lleno}; emite «negocio-pedir» {id} (clic en un panel).
// Prueba: ?grabar=1 deja la cámara quieta y window.__galeria.paso(dt) la mueve a mano; window.__galeria.estado() da foco, selección, etc.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const raiz = document.documentElement;
const lienzo = document.getElementById('escena');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const token = (n) => getComputedStyle(raiz).getPropertyValue(n).trim();
const C = { tinta: token('--tinta'), panel: token('--panel'), papel: token('--papel'), gris: token('--gris'), acento: token('--acento') };

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  renderer = null;
}
if (renderer) arrancar(renderer).catch(() => lienzo.remove());
else lienzo.remove();

async function arrancar(renderer) {
  performance.mark('galeria:modulo');
  const V3 = THREE.Vector3;
  const movilEstrecho = () => innerWidth / innerHeight < 0.8;
  const paraVideo = new URLSearchParams(location.search).has('grabar');
  renderer.setPixelRatio(paraVideo ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, movilEstrecho() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(C.tinta);
  escena.fog = new THREE.Fog(new THREE.Color(C.tinta), 10, 30);
  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

  // ---------- las obras ----------
  const R = 6.2;
  const ALTO = 3.0;
  const ALTO_N = 2.6, ANCHO_N = 1.8, HUECO_N = 0.25; // paneles de negocio de la pared (fila de arriba)
  const FILAS = [1.6, 4.85];
  const OBRAS = {
    nolessia_pc: { src: 'obras/nolessia_pc.jpg', a: 1.6 },
    nolessia_movil: { src: 'obras/nolessia_movil.jpg', a: 420 / 909 },
    nolessia_ficha_pc: { src: 'obras/nolessia_ficha_pc.jpg', a: 1.6 },
    nolessia_ficha_movil: { src: 'obras/nolessia_ficha_movil.jpg', a: 420 / 909 },
    clipeya_pc: { src: 'obras/clipeya_pc.jpg', a: 1.6 },
    clipeya_movil: { src: 'obras/clipeya_movil.jpg', a: 420 / 909 },
    crm: { src: 'media/crm_poster.jpg', video: 'media/crm.mp4', a: 0.8 },
    abanico: { a: 1.65 }, // fondo oscuro; las 7 pantallas del presupuesto se abren delante
    hueco: { a: 0.8 },
  };
  const FILA_A = ['nolessia_pc', 'nolessia_movil', 'crm', 'clipeya_pc', 'abanico', 'nolessia_ficha_movil', 'nolessia_ficha_pc', 'clipeya_movil', 'hueco'];
  const FILA_B_OBRAS = ['clipeya_movil', 'nolessia_ficha_pc', 'nolessia_pc', 'clipeya_pc', 'nolessia_movil'];
  const PRESUPUESTO = Array.from({ length: 7 }, (_, k) => `obras/presupuesto_${k + 1}.jpg`);
  // los 7 negocios salen del HTML (chips de la pantalla 5): una sola fuente de nombres
  let NEGOCIOS = [...document.querySelectorAll('.negocios a[data-id]')].map((a) => ({ id: a.dataset.id, nombre: a.textContent.trim() }));
  if (!NEGOCIOS.length) NEGOCIOS = ['Tienda', 'Curso', 'Marca', 'Agencia', 'Tareas', 'Chat', 'CRM'].map((n) => ({ id: n.toLowerCase(), nombre: n }));

  const gestor = new THREE.LoadingManager();
  const cargador = new THREE.TextureLoader(gestor);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const texturas = new Map();

  const voltear = (t) => {
    // vista desde dentro (BackSide): la imagen sale en espejo; se le da la vuelta en horizontal
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
    t.anisotropy = maxAniso;
    return t;
  };

  await Promise.race([document.fonts.load('92px "Instrument Serif"'), new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
  performance.mark('galeria:fuentes');

  function texturaHueco(lleno) {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 750;
    const g = c.getContext('2d');
    g.fillStyle = lleno ? C.acento : C.panel; g.fillRect(0, 0, 600, 750);
    g.setLineDash([22, 16]); g.lineWidth = 6; g.strokeStyle = lleno ? C.tinta : C.acento;
    g.beginPath(); g.roundRect(34, 34, 532, 682, 26); g.stroke();
    g.fillStyle = lleno ? C.tinta : C.papel; g.textAlign = 'center';
    g.font = '400 104px "Instrument Serif", Georgia, serif';
    g.fillText('Tu tienda', 300, 380);
    g.fillStyle = lleno ? C.tinta : C.gris; g.font = '400 34px "Instrument Sans", system-ui, sans-serif';
    g.fillText(lleno ? 'lista para entrar' : 'aquí, en la pared', 300, 446);
    return voltear(new THREE.CanvasTexture(c));
  }

  function texturaFondo() {
    const c = document.createElement('canvas');
    c.width = 660; c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = C.panel; g.fillRect(0, 0, 660, 400);
    g.strokeStyle = 'rgba(236,231,222,.2)'; g.lineWidth = 3; g.beginPath(); g.roundRect(14, 14, 632, 372, 18); g.stroke();
    return voltear(new THREE.CanvasTexture(c));
  }

  // panel de negocio: apagado (oscuro, nombre en gris) o encendido (acento, nombre en tinta)
  function texturaNegocio(nombre, n, on) {
    const c = document.createElement('canvas');
    c.width = 540; c.height = 780;
    const g = c.getContext('2d');
    g.fillStyle = on ? C.acento : C.panel; g.fillRect(0, 0, 540, 780);
    g.strokeStyle = on ? C.tinta : 'rgba(236,231,222,.3)'; g.lineWidth = 4; g.beginPath(); g.roundRect(24, 24, 492, 732, 22); g.stroke();
    g.textAlign = 'left'; g.fillStyle = on ? C.tinta : C.gris; g.font = '400 36px "Instrument Sans", system-ui, sans-serif';
    g.fillText(String(n).padStart(2, '0'), 58, 96);
    g.textAlign = 'center'; g.fillStyle = on ? C.tinta : 'rgba(236,231,222,.72)';
    let tam = 132; g.font = `400 ${tam}px "Instrument Serif", Georgia, serif`;
    while (g.measureText(nombre).width > 440 && tam > 60) { tam -= 6; g.font = `400 ${tam}px "Instrument Serif", Georgia, serif`; }
    g.fillText(nombre, 270, 420);
    g.beginPath(); g.arc(270, 650, 11, 0, Math.PI * 2); g.fillStyle = on ? C.tinta : 'rgba(236,231,222,.35)'; g.fill();
    return voltear(new THREE.CanvasTexture(c));
  }

  function textura(id) {
    if (texturas.has(id)) return texturas.get(id);
    const o = OBRAS[id];
    let t;
    if (id === 'hueco') t = texturaHueco(false);
    else if (id === 'abanico') t = texturaFondo();
    else t = voltear(cargador.load(o.src));
    texturas.set(id, t);
    return t;
  }

  const anillo = new THREE.Group();
  escena.add(anillo);
  const matDorso = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.panel), side: THREE.FrontSide });
  const paneles = [];

  // reparte los paneles de `lista` dentro de un arco (rad) que empieza en `desde`; el hueco sobrante se divide por igual
  function colocar(lista, y, fila, desde, arco) {
    const total = lista.reduce((s, it) => s + it.ancho, 0);
    const huecoAng = (arco * R - total) / lista.length / R;
    let ang = desde;
    lista.forEach((it) => {
      const len = it.ancho / R;
      const inicio = ang + huecoAng / 2;
      const segs = Math.max(6, Math.ceil(len * 28));
      const mat = new THREE.MeshBasicMaterial({ map: it.mapa, side: THREE.BackSide, color: new THREE.Color(0.8, 0.8, 0.8) });
      // desenfoque barato de lo que no es el foco: sesgo de mipmap en el muestreo de la textura (sin postproceso)
      const desenfoque = { value: 0 };
      mat.onBeforeCompile = (s) => {
        s.uniforms.uDes = desenfoque;
        s.fragmentShader = 'uniform float uDes;\n' + s.fragmentShader.replace('#include <map_fragment>',
          THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'texture2D( map, vMapUv, uDes )'));
      };
      const alto = it.alto || ALTO;
      const cara = new THREE.Mesh(new THREE.CylinderGeometry(R, R, alto, segs, 1, true, inicio, len), mat);
      const dorso = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, alto, segs, 1, true, inicio, len), matDorso);
      cara.position.y = dorso.position.y = y;
      anillo.add(cara, dorso);
      const p = { id: it.id, fila, mat, cara, desenfoque, centro: inicio + len / 2, y, ancho: it.ancho, alto, brillo: 0.8, neg: it.neg || null, on: false };
      if (it.neg) { p.texOff = it.mapa; p.texOn = it.mapaOn; }
      paneles.push(p);
      ang += len + huecoAng;
    });
  }
  colocar(FILA_A.map((id) => ({ id, ancho: ALTO * OBRAS[id].a, mapa: textura(id) })), FILAS[0], 0, 0, Math.PI * 2);

  // fila de arriba: arco de 7 negocios (la pared) centrado en ARCO_C y, en el resto, repeticiones de las obras
  const ARCO_C = THREE.MathUtils.degToRad(270);
  const arcoN = (NEGOCIOS.length * (ANCHO_N + HUECO_N)) / R;
  // visto desde dentro el ángulo crece hacia la izquierda: se colocan al revés para que se lean de izquierda a derecha como los chips
  colocar(NEGOCIOS.map((n, i) => ({ id: 'neg_' + n.id, neg: n.id, ancho: ANCHO_N, alto: ALTO_N, mapa: texturaNegocio(n.nombre, i + 1, false), mapaOn: texturaNegocio(n.nombre, i + 1, true) })).reverse(),
    FILAS[1], 1, ARCO_C - arcoN / 2, arcoN);
  colocar(FILA_B_OBRAS.map((id) => ({ id, ancho: ALTO * OBRAS[id].a, mapa: textura(id) })), FILAS[1], 1, ARCO_C + arcoN / 2, Math.PI * 2 - arcoN);

  // ---------- abanico del presupuesto: 7 pantallas reales que se abren con el scroll ----------
  const pAbanico = paneles.find((p) => p.id === 'abanico');
  const abanico = new THREE.Group();
  const CARTA_H = 2.5, CARTA_W = CARTA_H * (420 / 883);
  const cartas = PRESUPUESTO.map((src, k) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.8, 0.8) });
    const malla = new THREE.Mesh(new THREE.PlaneGeometry(CARTA_W, CARTA_H), m);
    malla.position.y = CARTA_H / 2;
    const g = new THREE.Group(); g.add(malla); g.visible = false; // hasta que llega la imagen, no hay cartulina gris
    abanico.add(g);
    return { g, m, k };
  });
  {
    const r = R - 0.07;
    abanico.position.set(Math.sin(pAbanico.centro) * r, pAbanico.y, Math.cos(pAbanico.centro) * r);
    abanico.lookAt(0, pAbanico.y, 0);
    escena.add(abanico);
  }
  let abanicoCargado = 0, abanicoPedido = false;
  function cargarAbanico() {
    if (abanicoPedido) return; abanicoPedido = true;
    const l = new THREE.TextureLoader();
    cartas.forEach((c) => l.load(PRESUPUESTO[c.k], (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; c.m.map = t; c.m.needsUpdate = true; c.g.visible = true; abanicoCargado++;
    }));
  }
  let abierto = 0;
  function abrirAbanico(p) {
    cartas.forEach((c) => {
      const m = c.k - 3;
      c.g.position.set(m * 0.6 * p, -1.15, c.k * 0.012);
      c.g.rotation.z = -m * 0.12 * p;
    });
  }
  abrirAbanico(0);

  // ---------- vídeo real del panel (solo este): carga al llegar y suena solo en foco ----------
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none', crossOrigin: 'anonymous' });
  video.setAttribute('playsinline', '');
  let videoPuesto = false, videoPedido = false, empezado = false;
  function pedirVideo() {
    if (videoPedido) return; videoPedido = true;
    if (navigator.connection && navigator.connection.saveData) return; // con ahorro de datos se queda el cartel
    const poner = () => {
      if (videoPuesto) return; videoPuesto = true;
      const tv = voltear(new THREE.VideoTexture(video));
      paneles.filter((p) => p.id === 'crm').forEach((p) => { p.mat.map = tv; p.mat.needsUpdate = true; });
    };
    // el cartel se queda hasta que el vídeo tiene un fotograma de verdad (si no, el panel sale negro)
    if (paraVideo) video.addEventListener('seeked', poner, { once: true });
    else if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(poner);
    else video.addEventListener('playing', poner, { once: true });
    video.preload = 'auto';
    video.src = OBRAS.crm.video;
    video.load();
  }
  if (paraVideo) pedirVideo();

  // ---------- suelo, chispa y polvo ----------
  function canvasRadial(tam, paradas) {
    const c = document.createElement('canvas'); c.width = c.height = tam;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
    paradas.forEach(([p, col]) => gr.addColorStop(p, col));
    g.fillStyle = gr; g.fillRect(0, 0, tam, tam);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const acentoRGB = new THREE.Color(C.acento);
  const rgba = (a) => `rgba(${Math.round(acentoRGB.r * 255)},${Math.round(acentoRGB.g * 255)},${Math.round(acentoRGB.b * 255)},${a})`;
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.9, 72),
    new THREE.MeshBasicMaterial({ map: canvasRadial(512, [[0, rgba(0.5)], [0.22, rgba(0.2)], [0.55, rgba(0.05)], [1, rgba(0)]]), transparent: true, depthWrite: false })
  );
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = 0.01;
  escena.add(suelo);
  const raya = new THREE.Mesh(new THREE.RingGeometry(R - 0.03, R + 0.03, 128), new THREE.MeshBasicMaterial({ color: acentoRGB, transparent: true, opacity: 0.45 }));
  raya.rotation.x = -Math.PI / 2; raya.position.y = 0.02;
  escena.add(raya);

  // halo de acento detrás de la obra enfocada: asoma por los bordes (1 malla, mezcla aditiva)
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: canvasRadial(256, [[0, rgba(0.55)], [0.5, rgba(0.16)], [1, rgba(0)]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })
  );
  escena.add(halo);
  let haloDe = null;

  function texturaChispa() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.translate(256, 256); g.scale(0.5, 0.5);
    g.shadowColor = C.acento; g.shadowBlur = 90;
    g.fillStyle = C.acento; g.fill(new Path2D('M62 -181Q75 -13 246 0Q75 13 62 181Q49 13 -122 0Q49 -13 62 -181Z'));
    g.shadowBlur = 30; g.shadowColor = C.papel;
    g.fillStyle = C.papel; g.fill(new Path2D('M314.0 -174.0A359 359 0 1 0 314.0 174.0L200.3 111.0A229 229 0 1 1 200.3 -111.0Z'));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const chispa = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaChispa(), transparent: true, depthWrite: false }));
  chispa.scale.setScalar(1.35); chispa.position.set(0, 3.4, 0);
  escena.add(chispa);

  const N = 240, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt((i * 0.6180339 * 7) % 1) * (R - 0.4), a = i * 2.39996;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = ((i * 0.377) % 1) * 7; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const polvoGeo = new THREE.BufferGeometry(); polvoGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({ color: new THREE.Color(C.papel), size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  escena.add(polvo);

  // ---------- cámara guiada por el scroll ----------
  const secciones = [...document.querySelectorAll('[data-vista]')];
  const iPared = secciones.findIndex((s) => s.dataset.vista === 'pared');
  let vistas = [];
  let seleccion = null;   // id del negocio elegido en la pared (o null)
  let lleno = false;      // el visitante ha escrito su enlace: el hueco se enciende

  function vista(clave) {
    const asp = camara.aspect, movil = asp < 0.8;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    if (clave === 'arriba') {
      // móvil: el anillo más cerca y en la mitad de arriba, para que el titular quede debajo
      if (movil) return { pos: new V3(0, 15.5, 12.5), tgt: new V3(0, -2.6, 0), orbita: 1, ext: 1, foco: null };
      return { pos: new V3(0, 12.5, 10.5), tgt: new V3(0, 1.2, 0), orbita: 1, ext: 1, foco: null };
    }
    const partes = clave.split(':');
    if (partes[0] === 'sala') {
      // dentro del anillo, casi en el centro, mirando a un tramo de pared: ninguna obra en foco, el texto manda
      const a = THREE.MathUtils.degToRad(+partes[1] || 0);
      const y = FILAS[+partes[2] || 0];
      const dir = new V3(Math.sin(a), 0, Math.cos(a));
      return { pos: new V3(-dir.x * 1.6, y + 0.2, -dir.z * 1.6), tgt: new V3(dir.x * R, y - (movil ? 1.2 : 0.1), dir.z * R), orbita: 0, ext: 0, foco: null };
    }
    if (partes[0] === 'final') {
      // plano final, desde arriba: el anillo entero con el hueco «Tu tienda» en la pared del fondo
      const p = paneles.find((x) => x.id === partes[1]);
      const dir = new V3(Math.sin(p.centro), 0, Math.cos(p.centro));
      const pos = dir.clone().multiplyScalar(movil ? -3 : -2.4); pos.y = movil ? 8.6 : 9.5;
      const tgt = dir.clone().multiplyScalar(movil ? 3.6 : 3.5); tgt.y = movil ? -0.2 : 1.5;
      return { pos, tgt, orbita: 0, ext: 1, foco: partes[1], fila: p.fila };
    }
    if (clave === 'pared') {
      // la pared de los 7 negocios (fila de arriba). Sin elección: casi toda la pared apagada. Con elección: la cámara salta a ese panel.
      const sel = seleccion && paneles.find((x) => x.neg === seleccion);
      const centroPared = paneles.find((x) => x.neg === NEGOCIOS[Math.floor(NEGOCIOS.length / 2)].id);
      const p = sel || centroPared;
      const dir = new V3(Math.sin(p.centro), 0, Math.cos(p.centro));
      const centro = new V3(dir.x * R, p.y, dir.z * R);
      const necesitoAlto = (p.alto * (sel ? (movil ? 2.5 : 1.9) : (movil ? 3.2 : 3.0))) / (2 * tanV);
      const arcoTotal = NEGOCIOS.length * (ANCHO_N + HUECO_N);
      const necesitoAncho = sel ? (p.ancho * (movil ? 1.3 : 2.4)) / (2 * tanV * asp) : (arcoTotal * (movil ? 0.5 : 1.0)) / (2 * tanV * asp);
      const d = Math.min(Math.max(necesitoAlto, necesitoAncho), R + 5.4);
      const posi = centro.clone().addScaledVector(dir, -d);
      posi.y = p.y + (movil ? 0.3 : 0.15);
      const adelante = centro.clone().sub(posi);
      let tgt;
      if (movil) { tgt = centro.clone(); tgt.y = p.y - 0.36 * adelante.length() * tanV; }
      else {
        const alfa = Math.atan((sel ? 0.30 : 0.2) * tanV * asp);
        tgt = posi.clone().add(adelante.applyAxisAngle(new V3(0, 1, 0), alfa));
        tgt.y = p.y - 0.04;
      }
      return { pos: posi, tgt, orbita: 0, ext: 0, foco: sel ? 'neg_' + seleccion : null, fila: p.fila, pared: 1 };
    }
    const id = partes[1];
    const filaQuiero = +partes[2] || 0;
    const p = paneles.find((x) => x.id === id && x.fila === filaQuiero) || paneles.find((x) => x.id === id);
    // móvil: la obra arriba (mitad superior) y el texto debajo; ordenador: la obra a la derecha, casi a pantalla completa, y el texto a la izquierda
    const necesitoAlto = (p.alto * (movil ? 2.3 : 1.3)) / (2 * tanV);
    const necesitoAncho = (p.ancho * (movil ? 1.15 : 1.5)) / (2 * tanV * asp);
    const d = Math.min(Math.max(necesitoAlto, necesitoAncho), R * 1.75);
    const dir = new V3(Math.sin(p.centro), 0, Math.cos(p.centro));
    const centro = new V3(dir.x * R, p.y, dir.z * R);
    const posi = centro.clone().addScaledVector(dir, -d);
    posi.y = p.y + (movil ? 0.2 : 0.12);
    const adelante = centro.clone().sub(posi);
    let tgt;
    if (movil) {
      tgt = centro.clone();
      tgt.y = p.y - 0.36 * adelante.length() * tanV; // centro de la obra al 32 % desde arriba
    } else {
      const alfa = Math.atan(0.3 * tanV * asp); // centro de la obra al 65 % del ancho; el texto, en el 30 % de la izquierda
      tgt = posi.clone().add(adelante.applyAxisAngle(new V3(0, 1, 0), alfa));
      tgt.y = p.y - 0.04;
    }
    return { pos: posi, tgt, orbita: 0, ext: 0, foco: id, fila: p.fila };
  }

  function medir() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.fov = camara.aspect < 0.8 ? 64 : 50;
    camara.updateProjectionMatrix();
    escena.fog.near = camara.aspect < 0.8 ? 15 : 10;
    escena.fog.far = camara.aspect < 0.8 ? 42 : 30;
    vistas = secciones.map((s) => vista(s.dataset.vista));
  }
  medir();
  addEventListener('resize', medir);

  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pinza = (x) => Math.min(1, Math.max(0, x));
  const objetivo = { pos: new V3(), tgt: new V3(), orbita: 1, ext: 1, foco: null, fila: 0, pared: 0, e: 0, seccion: 0 };

  function calcularObjetivo() {
    const y = scrollY;
    let i = 0;
    for (let k = 0; k < secciones.length; k++) if (secciones[k].offsetTop <= y + 1) i = k;
    const j = Math.min(i + 1, secciones.length - 1);
    const a = secciones[i].offsetTop, b = secciones[j].offsetTop;
    // en una sección más alta que la pantalla, la cámara se queda quieta en su obra y solo viaja en la última pantalla
    const tramo = Math.min(b - a, innerHeight);
    const t = j === i ? 0 : pinza((y - (b - tramo)) / tramo);
    const e = suave(pinza((t - 0.12) / 0.76));
    const A = vistas[i], B = vistas[j];
    objetivo.pos.lerpVectors(A.pos, B.pos, e);
    objetivo.tgt.lerpVectors(A.tgt, B.tgt, e);
    objetivo.orbita = A.orbita + (B.orbita - A.orbita) * e;
    objetivo.ext = A.ext + (B.ext - A.ext) * e;
    objetivo.pared = (A.pared || 0) + ((B.pared || 0) - (A.pared || 0)) * e;
    const deB = e >= 0.5;
    objetivo.foco = deB ? B.foco : A.foco;
    objetivo.fila = (deB ? B.fila : A.fila) || 0;
    objetivo.e = e;
    objetivo.seccion = deB ? j : i;
  }

  const puntero = { x: 0, y: 0 };
  if (matchMedia('(pointer: fine)').matches && !quieto) {
    addEventListener('pointermove', (ev) => { puntero.x = ev.clientX / innerWidth * 2 - 1; puntero.y = ev.clientY / innerHeight * 2 - 1; });
  }

  // dedo (pantallas táctiles): arrastrar en horizontal gira la cámara unos grados y vuelve sola al soltar.
  // El scroll vertical sigue siendo del navegador (touch-action: pan-y en index.html): aquí solo se mira el gesto horizontal.
  const dedo = { activo: false, id: -1, x0: 0, y0: 0, dx: 0, yaw: 0, objetivo: 0, horizontal: false };
  const MAX_YAW = THREE.MathUtils.degToRad(14);
  if (!quieto) {
    addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' || dedo.activo || ev.target.closest('input,textarea,select')) return;
      Object.assign(dedo, { activo: true, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, horizontal: false });
    }, { passive: true });
    addEventListener('pointermove', (ev) => {
      if (!dedo.activo || ev.pointerId !== dedo.id) return;
      const dx = ev.clientX - dedo.x0, dy = ev.clientY - dedo.y0;
      if (!dedo.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) dedo.horizontal = true;
      if (dedo.horizontal) dedo.objetivo = THREE.MathUtils.clamp(-dx / innerWidth * 0.8, -MAX_YAW, MAX_YAW);
    }, { passive: true });
    const suelta = (ev) => { if (ev.pointerId === dedo.id) { dedo.activo = false; dedo.horizontal = false; dedo.objetivo = 0; } };
    addEventListener('pointerup', suelta, { passive: true });
    addEventListener('pointercancel', suelta, { passive: true });
  }

  calcularObjetivo();
  const actual = { pos: objetivo.pos.clone(), tgt: objetivo.tgt.clone() };
  const reloj = new THREE.Clock();
  let giro = 0, primero = true, cuenta = 0, entrada = -1, tSalto = -9;
  const eje = new V3(0, 1, 0), derecha = new V3(), arriba = new V3(), mira = new V3(), tmp = new V3();

  // ---------- pared de negocios: elegir (chips o clic en el 3D) ----------
  function elegirNegocio(id) {
    seleccion = id || null;
    if (iPared >= 0) vistas[iPared] = vista('pared');
    tSalto = reloj.elapsedTime;
  }
  addEventListener('negocio', (ev) => elegirNegocio(ev.detail && ev.detail.id));
  addEventListener('hueco-lleno', (ev) => {
    lleno = !!(ev.detail && ev.detail.lleno);
    const p = paneles.find((x) => x.id === 'hueco');
    if (p) { p.mat.map = lleno ? (p.texLleno || (p.texLleno = texturaHueco(true))) : textura('hueco'); p.mat.needsUpdate = true; }
  });
  const rayo = new THREE.Raycaster(), ndc = new THREE.Vector2();
  addEventListener('click', (ev) => {
    if (objetivo.pared < 0.5 || ev.target.closest('a,button,input,.caja,.tarjeta,header,footer')) return;
    ndc.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    rayo.setFromCamera(ndc, camara);
    const ps = paneles.filter((p) => p.neg);
    const golpe = rayo.intersectObjects(ps.map((p) => p.cara), false)[0];
    if (golpe) dispatchEvent(new CustomEvent('negocio-pedir', { detail: { id: ps.find((p) => p.cara === golpe.object).neg } }));
  });

  function cuadro(pasoFijo) {
    const dt = pasoFijo || Math.min(reloj.getDelta(), 0.05);
    const tt = reloj.elapsedTime;
    calcularObjetivo();
    if (!quieto) giro += dt * 0.045 * objetivo.orbita;
    const pos = tmp.copy(objetivo.pos).applyAxisAngle(eje, giro * objetivo.orbita);
    // la entrada (cámara que baja al cargar) va más despacio que los viajes entre obras; el salto a un negocio, más vivo
    const lento = entrada >= 0 && tt - entrada < 2.6;
    const vivo = tt - tSalto < 1.4;
    const k = quieto || primero ? 1 : 1 - Math.exp(-dt * (lento ? 1.5 : vivo ? 6 : 3.2));
    actual.pos.lerp(pos, k);
    actual.tgt.lerp(objetivo.tgt, k);
    primero = false;
    camara.position.copy(actual.pos);
    camara.lookAt(actual.tgt);
    if (!quieto) {
      derecha.setFromMatrixColumn(camara.matrixWorld, 0); arriba.setFromMatrixColumn(camara.matrixWorld, 1);
      mira.copy(actual.tgt).addScaledVector(derecha, puntero.x * 0.35).addScaledVector(arriba, -puntero.y * 0.22);
      camara.lookAt(mira);
    }
    // el giro del dedo: la mirada se vuelve a un lado alrededor del eje vertical de la cámara (amortiguado; al soltar vuelve más despacio)
    dedo.yaw += (dedo.objetivo - dedo.yaw) * (1 - Math.exp(-dt * (dedo.activo ? 9 : 3.5)));
    if (Math.abs(dedo.yaw) > 1e-4) {
      mira.copy(actual.tgt).sub(camara.position).applyAxisAngle(eje, dedo.yaw).add(camara.position);
      camara.lookAt(mira);
    }
    const dentro = 1 - objetivo.ext;
    const suaviza = quieto ? 1 : 1 - Math.exp(-dt * 4);
    const latido = quieto ? 0 : Math.sin(tt * 1.6);
    let enFoco = null;
    for (const p of paneles) {
      const esFoco = p.id === objetivo.foco && p.fila === objetivo.fila;
      if (esFoco) enFoco = p;
      let quiero;
      if (esFoco) quiero = p.id === 'hueco' ? (lleno ? 1.1 : 0.92 + 0.08 * latido) : 1;
      else if (p.neg && objetivo.pared > 0.5) quiero = 0.78; // pared apagada: se ve, sin llamar la atención
      else quiero = 0.85 - 0.62 * dentro; // dentro, lo que no es foco baja al 23 %: el texto se lee y la obra destaca
      p.brillo += (quiero - p.brillo) * suaviza;
      p.mat.color.setScalar(p.brillo);
      const des = esFoco || (p.neg && objetivo.pared > 0.5) ? 0 : 2.2 * dentro; // la pared de negocios se lee nítida
      p.desenfoque.value += (des - p.desenfoque.value) * suaviza;
      if (p.neg) {
        const on = esFoco && objetivo.pared > 0.5;
        if (on !== p.on) { p.on = on; p.mat.map = on ? p.texOn : p.texOff; }
      }
    }
    // halo detrás de la obra enfocada
    if (enFoco && enFoco !== haloDe) {
      haloDe = enFoco;
      const r = R + 0.14;
      halo.position.set(Math.sin(enFoco.centro) * r, enFoco.y, Math.cos(enFoco.centro) * r);
      halo.scale.set(enFoco.ancho * 1.75, enFoco.alto * 1.9, 1);
      halo.lookAt(0, enFoco.y, 0);
    }
    const haloQuiero = enFoco ? (enFoco.id === 'hueco' ? 0.75 + 0.25 * latido : 0.9) : 0;
    halo.material.opacity += (haloQuiero - halo.material.opacity) * suaviza;
    // abanico del presupuesto: se abre cuando la cámara llega a él
    const ab = objetivo.foco === 'abanico' ? 1 : 0;
    abierto += (ab - abierto) * (quieto ? 1 : 1 - Math.exp(-dt * 2.4));
    abrirAbanico(suave(pinza(abierto)));
    cartas.forEach((c) => c.m.color.setScalar(pAbanico.brillo));
    // vídeo: carga al llegar a su obra, se decodifica solo mientras se ve (pausado en el resto)
    if (!paraVideo && !document.hidden && tt - cuenta > 0.25) {
      cuenta = tt;
      if (objetivo.foco === 'crm') pedirVideo();
      if (videoPedido) {
        const quiero = objetivo.foco === 'crm';
        if (quiero && video.paused && empezado) video.play().catch(() => {});
        else if (!quiero && !video.paused) video.pause();
      }
    }
    chispa.material.rotation += quieto ? 0 : dt * 0.25;
    chispa.material.opacity = Math.pow(pinza((objetivo.ext - 0.55) / 0.45), 2); // solo desde fuera: dentro se cruzaría delante de la cámara
    chispa.visible = chispa.material.opacity > 0.01;
    polvo.rotation.y += quieto ? 0 : dt * 0.01;
    renderer.render(escena, camara);
  }

  gestor.onLoad = () => {
    performance.mark('galeria:texturas');
    if (!quieto && !paraVideo && scrollY < 10) {
      // entrada: la cámara empieza más arriba y baja hasta la portada mientras aparece el lienzo
      actual.pos.copy(objetivo.pos).add(new V3(0, 16, 14));
      actual.tgt.copy(objetivo.tgt).add(new V3(0, -5, 0));
      entrada = reloj.elapsedTime;
    }
    lienzo.classList.add('lista');
    window.__galeria && (window.__galeria.tLista = Math.round(performance.now()));
    document.getElementById('respaldo').style.visibility = 'hidden';
    empezado = true;
    // lo que no se ve en la primera pantalla llega después: las 7 pantallas del presupuesto
    if (paraVideo) cargarAbanico(); else setTimeout(cargarAbanico, 900);
  };
  addEventListener('scroll', () => { empezado = true; }, { once: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !video.paused) video.pause(); });
  // ?grabar=1: sin bucle; quien graba avanza la escena fotograma a fotograma (vídeo fluido aunque el PC vaya lento)
  const grabando = new URLSearchParams(location.search).has('grabar');
  if (!grabando) renderer.setAnimationLoop(() => { if (!document.hidden) cuadro(); });
  window.__galeria = {
    listo: () => lienzo.classList.contains('lista'),
    paneles: paneles.length,
    paso: (dt) => cuadro(dt),
    yaw: () => THREE.MathUtils.radToDeg(dedo.yaw),
    camaraDir: () => camara.getWorldDirection(new V3()).toArray(),
    abanicoListo: () => abanicoCargado,
    negocio: (id) => dispatchEvent(new CustomEvent('negocio', { detail: { id } })),
    estado: () => ({ foco: objetivo.foco, fila: objetivo.fila, seleccion, ext: +objetivo.ext.toFixed(2), orbita: +objetivo.orbita.toFixed(2), pared: +objetivo.pared.toFixed(2), seccion: objetivo.seccion, abierto: +abierto.toFixed(2), videoPedido, lleno }),
    encendidos: () => paneles.filter((p) => p.on).map((p) => p.neg),
    tLista: null,
    marcas: () => performance.getEntriesByType('mark').map((m) => [m.name, Math.round(m.startTime)]),
  };
  if (grabando) {
    // solo para grabar: el vídeo se mueve a mano (a la vez que los fotogramas) y la foto sale del lienzo
    Object.assign(window.__galeria, {
      video,
      async videosA(t) {
        if (video.duration) await new Promise((ok) => { video.addEventListener('seeked', ok, { once: true }); video.currentTime = t % video.duration; setTimeout(ok, 1500); });
        paneles.forEach((p) => { if (p.mat.map && p.mat.map.isVideoTexture) p.mat.map.needsUpdate = true; });
      },
      foto: () => { cuadro(0.016); return lienzo.toDataURL('image/jpeg', 0.86); },
    });
  }
}
