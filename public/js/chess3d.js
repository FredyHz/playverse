// Tablero de ajedrez 3D de PLAYVERSE (Three.js): nogal y arce, piezas Staunton torneadas.
// Se carga solo al abrir el ajedrez. Si algo falla, chess-view.js usa el tablero 2D.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const FILES = 'abcdefgh';
const sqPos = sq => ({ x: FILES.indexOf(sq[0]) - 3.5, z: 3.5 - (+sq[1] - 1) });
const sqAt = (x, z) => { const f = Math.floor(x + 4), r = Math.floor(4 - z); return f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null; };
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Textura de madera generada por código (vetas, nudos suaves y grano)
function wood(base, grain, seed) {
  const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const y0 = R() * size, amp = 1 + R() * 5, fr = 0.01 + R() * 0.03, ph = R() * 6;
    x.strokeStyle = grain; x.globalAlpha = 0.05 + R() * 0.2; x.lineWidth = 0.5 + R() * 2.4; x.beginPath();
    for (let px = 0; px <= size; px += 8) { const py = y0 + Math.sin(px * fr + ph) * amp; if (px) x.lineTo(px, py); else x.moveTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 0.07;
  for (let i = 0; i < 260; i++) { x.fillStyle = R() > 0.5 ? '#000' : '#fff'; x.fillRect(R() * size, R() * size, 1 + R() * 2, 1 + R() * 2); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

// Perfiles torneados (radio, altura) de las piezas Staunton
const BASE = [[0, 0], [0.37, 0], [0.39, 0.03], [0.39, 0.07], [0.35, 0.11], [0.31, 0.14]];
const PROFILE = {
  p: [...BASE, [0.2, 0.2], [0.14, 0.32], [0.11, 0.45], [0.16, 0.5], [0.19, 0.53], [0.14, 0.57], [0, 0.57]],
  r: [...BASE, [0.24, 0.2], [0.2, 0.4], [0.2, 0.7], [0.26, 0.76], [0.28, 0.86], [0.27, 0.89], [0, 0.89]],
  b: [...BASE, [0.26, 0.2], [0.16, 0.38], [0.12, 0.7], [0.2, 0.78], [0.22, 0.86], [0.14, 0.92], [0.19, 0.98], [0.2, 1.1], [0.16, 1.25], [0.08, 1.34], [0, 1.37]],
  q: [...BASE, [0.28, 0.2], [0.17, 0.42], [0.13, 0.85], [0.22, 0.93], [0.24, 1.0], [0.16, 1.06], [0.2, 1.12], [0.26, 1.3], [0.27, 1.38], [0.22, 1.4], [0, 1.4]],
  k: [...BASE, [0.28, 0.2], [0.17, 0.42], [0.14, 0.9], [0.23, 0.98], [0.25, 1.05], [0.17, 1.1], [0.21, 1.16], [0.25, 1.35], [0.22, 1.42], [0, 1.42]],
  n: [...BASE, [0.3, 0.19], [0.24, 0.27], [0.22, 0.3], [0, 0.3]],
};
const lathe = pts => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28);

function horseHead() {
  const s = new THREE.Shape();
  s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0.2, 0.12);
  s.quadraticCurveTo(0.14, 0.2, 0.18, 0.32);
  s.quadraticCurveTo(0.3, 0.32, 0.36, 0.45);
  s.quadraticCurveTo(0.4, 0.55, 0.3, 0.62);
  s.quadraticCurveTo(0.2, 0.66, 0.16, 0.8);
  s.lineTo(0.08, 0.92); s.lineTo(0.02, 0.8);
  s.quadraticCurveTo(-0.1, 0.84, -0.2, 0.62);
  s.quadraticCurveTo(-0.3, 0.4, -0.22, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 12 });
  g.translate(0, 0, -0.15); return g;
}

// Piezas = lista de partes {g: geometría, p: [x,y,z], ry: giro}
function buildParts() {
  const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h), B = (a, b, c) => new THREE.BoxGeometry(a, b, c);
  const ring = (n, rad, y, geo, spin) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return { g: geo, p: [Math.cos(a) * rad, y, Math.sin(a) * rad], ry: spin ? -a : 0 }; });
  const P = {};
  P.p = [{ g: lathe(PROFILE.p), p: [0, 0, 0] }, { g: S(0.17, 24, 16), p: [0, 0.68, 0] }];
  P.r = [{ g: lathe(PROFILE.r), p: [0, 0, 0] }, ...ring(6, 0.2, 0.97, B(0.13, 0.16, 0.11), true)];
  P.b = [{ g: lathe(PROFILE.b), p: [0, 0, 0] }, { g: S(0.055), p: [0, 1.41, 0] }];
  P.q = [{ g: lathe(PROFILE.q), p: [0, 0, 0] }, ...ring(8, 0.24, 1.42, S(0.05, 12, 10), false), { g: S(0.075), p: [0, 1.5, 0] }];
  P.k = [{ g: lathe(PROFILE.k), p: [0, 0, 0] }, { g: B(0.08, 0.34, 0.08), p: [0, 1.6, 0] }, { g: B(0.24, 0.08, 0.08), p: [0, 1.66, 0] }];
  P.n = [{ g: lathe(PROFILE.n), p: [0, 0, 0] }, { g: horseHead(), p: [0, 0.3, 0] }];
  return P;
}

export async function createBoard(opts) {
  const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
  let quality = opts.quality && opts.quality !== 'auto' ? opts.quality : (mobile ? 'med' : 'high');
  const wrap = document.createElement('div'); wrap.className = 'b3canvas'; wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden'; // tamaño propio: no depende de ninguna hoja de estilos
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL no disponible');
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;outline:none';
  // Tamaño fijo por estilos propios: el lienzo siempre ocupa su contenedor, sin depender de CSS externo
  wrap.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden';
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 0, 0.3);
  camera.position.set(0, 10.5, 11.5); camera.lookAt(target);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target); controls.enablePan = false; controls.enableDamping = false;
  controls.minDistance = 9; controls.maxDistance = 24; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.38; controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.7;
  controls.update();

  // ---- Luces y entorno ----
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1a3a, 0.55));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.2); key.position.set(-5, 10, 6); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); key.shadow.camera.updateProjectionMatrix(); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.PointLight(0x8b50e8, 40, 30, 2); fill.position.set(6, 5, -6); scene.add(fill);
  try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; pm.dispose(); } catch (e) { /* sin reflejos del entorno */ }

  // ---- Tablero ----
  const light = [0, 1, 2, 3].map(i => new THREE.MeshStandardMaterial({ map: wood('#e9d2a8', '#bf9a64', 11 + i), roughness: 0.55 }));
  const dark = [0, 1, 2, 3].map(i => new THREE.MeshStandardMaterial({ map: wood('#8a5a33', '#3a2010', 31 + i), roughness: 0.5 }));
  const frameMat = new THREE.MeshStandardMaterial({ map: wood('#4a2e1b', '#1d0f07', 51), roughness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a935, roughness: 0.3, metalness: 0.9 });
  const board = new THREE.Group(); scene.add(board);
  const squares = new THREE.Group(); board.add(squares);
  const sqGeo = new THREE.BoxGeometry(1, 0.12, 1);
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const sq = FILES[f] + (r + 1), m = new THREE.Mesh(sqGeo, (f + r) % 2 === 0 ? dark[(f * 3 + r) % 4] : light[(f + r * 3) % 4]);
    const p = sqPos(sq); m.position.set(p.x, -0.06, p.z); m.receiveShadow = true; m.userData.sq = sq; squares.add(m);
  }
  // Marco biselado con hueco para las casillas
  const fs = new THREE.Shape(); fs.moveTo(-4.9, -4.9); fs.lineTo(4.9, -4.9); fs.lineTo(4.9, 4.9); fs.lineTo(-4.9, 4.9); fs.closePath();
  const hole = new THREE.Path(); hole.moveTo(-4.12, -4.12); hole.lineTo(-4.12, 4.12); hole.lineTo(4.12, 4.12); hole.lineTo(4.12, -4.12); hole.closePath(); fs.holes.push(hole);
  const frameGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 });
  frameGeo.rotateX(-Math.PI / 2);
  const frame = new THREE.Mesh(frameGeo, frameMat); frame.position.y = -0.35; frame.castShadow = frame.receiveShadow = true; board.add(frame);
  const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.3, 10.3), new THREE.MeshStandardMaterial({ color: 0x2b170b, roughness: 0.6 }));
  baseSlab.position.y = -0.6; baseSlab.castShadow = baseSlab.receiveShadow = true; board.add(baseSlab);
  // Filete dorado alrededor del campo de juego
  for (const [w, d, x, z] of [[8.2, 0.07, 0, -4.04], [8.2, 0.07, 0, 4.04], [0.07, 8.2, -4.04, 0], [0.07, 8.2, 4.04, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), goldMat); m.position.set(x, 0.01, z); board.add(m);
  }
  // Coordenadas
  const label = (txt, x, z) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.font = 'bold 44px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c15a'; g.shadowColor = '#000'; g.shadowBlur = 4; g.fillText(txt, 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); s.scale.set(0.5, 0.5, 1); s.position.set(x, 0.32, z); board.add(s);
  };
  for (let i = 0; i < 8; i++) { label(FILES[i], i - 3.5, 4.5); label(FILES[i], i - 3.5, -4.5); label(String(i + 1), -4.5, 3.5 - i); label(String(i + 1), 4.5, 3.5 - i); }
  // Mesa y sombra de contacto
  const tableTex = wood('#8f5d33', '#4a2a12', 91); tableTex.repeat.set(9, 9);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.55 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -0.76; table.receiveShadow = true; scene.add(table);
  scene.background = new THREE.Color(0x24130a); scene.fog = new THREE.Fog(0x24130a, 20, 46);

  // ---- Piezas ----
  const hi = quality === 'high';
  const mk = tex => new (hi ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ map: tex, roughness: 0.4, metalness: 0.02, ...(hi ? { clearcoat: 0.6, clearcoatRoughness: 0.25 } : {}) });
  const pieceMat = { w: mk(wood('#f1dcb2', '#c19a62', 71)), b: mk(wood('#2a180d', '#120a05', 72)) };
  const PARTS = buildParts();
  const piecesGroup = new THREE.Group(); scene.add(piecesGroup);
  const pieces = new Map(), busy = new Set();
  function makePiece(type, color, sq) {
    const g = new THREE.Group();
    for (const part of PARTS[type]) {
      const m = new THREE.Mesh(part.g, pieceMat[color]); m.position.set(...part.p); if (part.ry) m.rotation.y = part.ry; m.castShadow = m.receiveShadow = true; g.add(m);
    }
    if (type === 'n') { const left = FILES.indexOf(sq[0]) < 4; g.rotation.y = color === 'w' ? (left ? Math.PI / 4 : 3 * Math.PI / 4) : (left ? -Math.PI / 4 : -3 * Math.PI / 4); }
    g.userData = { type, color, sq: null }; return g;
  }
  const removePiece = g => { piecesGroup.remove(g); };
  const addPiece = (sq, type, color) => { const g = makePiece(type, color, sq); g.userData.sq = sq; const p = sqPos(sq); g.position.set(p.x, 0, p.z); piecesGroup.add(g); pieces.set(sq, g); return g; };

  // ---- Marcas: selección, destinos, última jugada, jaque ----
  const flat = (geo, color, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; scene.add(m); return m; };
  const selRing = flat(new THREE.RingGeometry(0.38, 0.49, 32), 0x2ee6ff, 0.95), checkDisc = flat(new THREE.CircleGeometry(0.5, 32), 0xff2d55, 0.6);
  const lastA = flat(new THREE.PlaneGeometry(0.98, 0.98), 0xffd23f, 0.38), lastB = flat(new THREE.PlaneGeometry(0.98, 0.98), 0xffd23f, 0.38);
  const dots = [], rings = [];
  const place = (m, sq, y) => { const p = sqPos(sq); m.position.set(p.x, y, p.z); m.visible = true; };
  let marks = {}, desired = new Map();
  function applyMarks() {
    const { sel, targets = [], last, check } = marks;
    if (sel) place(selRing, sel, 0.02); else selRing.visible = false;
    if (check) place(checkDisc, check, 0.016); else checkDisc.visible = false;
    if (last) { place(lastA, last.from, 0.012); place(lastB, last.to, 0.012); } else lastA.visible = lastB.visible = false;
    let di = 0, ri = 0;
    for (const sq of new Set(targets.map(t => t.to))) {
      if (pieces.has(sq)) { if (!rings[ri]) rings[ri] = flat(new THREE.RingGeometry(0.34, 0.46, 32), 0xe8456b, 0.95); place(rings[ri++], sq, 0.022); }
      else { if (!dots[di]) dots[di] = flat(new THREE.CircleGeometry(0.15, 24), 0xf3c640, 0.95); place(dots[di++], sq, 0.022); }
    }
    for (; di < dots.length; di++) dots[di].visible = false; for (; ri < rings.length; ri++) rings[ri].visible = false;
    for (const [sq, g] of pieces) if (!busy.has(g) && !g.userData.drag) g.position.y = sq === sel ? 0.18 : 0;
  }

  // ---- Animaciones ----
  const anims = []; let need = true;
  const invalidate = () => { need = true; };
  const anim = (dur, update, done, delay = 0) => anims.push({ t0: performance.now() + delay, dur, update, done });
  function stepAnims(now) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i]; if (now < a.t0) continue; const t = Math.min(1, (now - a.t0) / a.dur); a.update(t);
      if (t >= 1) { anims.splice(i, 1); if (a.done) a.done(); }
    }
    if (!anims.length) { reconcile(); applyMarks(); }
    need = true;
  }
  function finishAnims() { const list = anims.splice(0); for (const a of list) { a.update(1); if (a.done) a.done(); } }
  function moveAnim(g, to, dur = 430) {
    const a = g.position.clone(), p = sqPos(to), b = new THREE.Vector3(p.x, 0, p.z), lift = g.userData.type === 'n' ? 1.1 : 0.55; busy.add(g);
    anim(dur, t => { const e = ease(t); g.position.lerpVectors(a, b, e); g.position.y = Math.sin(Math.PI * e) * lift; }, () => { g.position.copy(b); busy.delete(g); });
  }
  function shrinkAnim(g, delay) { busy.add(g); anim(260, t => { const e = ease(t); g.scale.setScalar(Math.max(0.001, 1 - e)); g.position.y = -e * 0.3; }, () => { removePiece(g); busy.delete(g); }, delay); }

  function reconcile() {
    for (const [sq, g] of [...pieces]) {
      if (busy.has(g)) continue; const w = desired.get(sq);
      if (!w || w.type !== g.userData.type || w.color !== g.userData.color) { removePiece(g); pieces.delete(sq); }
    }
    for (const [sq, w] of desired) if (!pieces.has(sq)) addPiece(sq, w.type, w.color);
    for (const [sq, g] of pieces) if (!busy.has(g) && !g.userData.drag) { const p = sqPos(sq); g.position.set(p.x, 0, p.z); g.userData.sq = sq; g.scale.setScalar(1); }
  }
  let pendingDrop = null;
  // Sincroniza el tablero 3D con la partida. opts: {animate, last}
  function sync(game, o = {}) {
    finishAnims();
    desired = new Map();
    for (const f of FILES) for (let r = 1; r <= 8; r++) { const p = game.get(f + r); if (p) desired.set(f + r, { type: p.type, color: p.color }); }
    const mv = o.animate && o.last;
    if (mv) {
      const g = pieces.get(mv.from);
      if (g) {
        let cap = pieces.get(mv.to);
        if (!cap && g.userData.type === 'p' && mv.from[0] !== mv.to[0]) cap = pieces.get(mv.to[0] + mv.from[1]); // al paso
        let rook = null, rookTo = null;
        if (g.userData.type === 'k' && Math.abs(FILES.indexOf(mv.from[0]) - FILES.indexOf(mv.to[0])) === 2) {
          const rk = mv.from[1]; if (mv.to[0] === 'g') { rook = pieces.get('h' + rk); rookTo = 'f' + rk; } else { rook = pieces.get('a' + rk); rookTo = 'd' + rk; }
        }
        pieces.delete(mv.from); if (cap) pieces.delete(cap.userData.sq);
        pieces.set(mv.to, g); g.userData.sq = mv.to;
        const dropped = pendingDrop && pendingDrop.g === g && pendingDrop.to === mv.to;
        if (dropped) { const p = sqPos(mv.to); g.position.set(p.x, 0, p.z); } else moveAnim(g, mv.to);
        if (cap) shrinkAnim(cap, dropped ? 0 : 230);
        if (rook) { pieces.delete(rook.userData.sq); pieces.set(rookTo, rook); rook.userData.sq = rookTo; moveAnim(rook, rookTo, 450); }
      }
    }
    pendingDrop = null; reconcile(); applyMarks(); invalidate();
  }
  function setMarks(m) { marks = m || {}; applyMarks(); invalidate(); }

  // ---- Cámara ----
  function view(name, instant) {
    const P = { w: [0, 10.5, 11.5], b: [0, 10.5, -11.5], top: [0, 16, 4] }[name]; if (!P) return;
    const to = new THREE.Spherical().setFromVector3(new THREE.Vector3(...P).sub(controls.target)), from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    let dth = to.theta - from.theta; dth = ((dth + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const set = e => { const s = new THREE.Spherical(from.radius + (to.radius - from.radius) * e, from.phi + (to.phi - from.phi) * e, from.theta + dth * e); camera.position.setFromSpherical(s).add(controls.target); camera.lookAt(controls.target); controls.update(); };
    if (instant) set(1); else anim(600, t => set(ease(t)));
    invalidate();
  }

  // ---- Tamaño y calidad ----
  function setQuality(q) {
    quality = q === 'auto' ? (mobile ? 'med' : 'high') : q;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : mobile ? 1.5 : 2));
    renderer.shadowMap.enabled = quality !== 'low'; key.castShadow = quality !== 'low';
    const sz = quality === 'high' ? 2048 : 1024; if (key.shadow.mapSize.x !== sz) { key.shadow.mapSize.set(sz, sz); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
    scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.needsUpdate = true; }); } });
    resize(); invalidate();
  }
  let lastW = 0, lastH = 0;
  function resize() {
    if (!wrap.isConnected) return;
    const rc = wrap.getBoundingClientRect(), w = Math.min(4096, Math.max(64, Math.round(rc.width))), h = Math.min(4096, Math.max(64, Math.round(rc.height)));
    if (w === lastW && h === lastH) return; lastW = w; lastH = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.zoom = Math.min(1, camera.aspect * 1.12); camera.updateProjectionMatrix();
    renderer.render(scene, camera); need = false; // se dibuja al instante para que no parpadee al cambiar de tamaño
  }

  // ---- Interacción: clic y arrastrar ----
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), tmp = new THREE.Vector3();
  const aim = ev => { const r = renderer.domElement.getBoundingClientRect(); ptr.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); };
  function pick(ev) {
    aim(ev);
    for (const h of ray.intersectObjects([piecesGroup, squares], true)) { let o = h.object; while (o && !o.userData.sq) o = o.parent; if (o) return { sq: o.userData.sq, piece: o.userData.type ? o : null }; }
    return null;
  }
  let down = null, dragging = null;
  const onDown = ev => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const h = pick(ev); down = { x: ev.clientX, y: ev.clientY, h, moved: false, grab: null };
    if (h && h.piece && opts.canGrab && opts.canGrab(h.sq)) { controls.enabled = false; down.grab = h.piece; opts.onSquare(h.sq); }
  };
  const onMove = ev => {
    if (!down) return;
    if (!down.moved && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 8) down.moved = true;
    if (down.grab && down.moved) {
      dragging = down.grab; dragging.userData.drag = true; aim(ev);
      if (ray.ray.intersectPlane(plane, tmp)) dragging.position.set(tmp.x, 0.45, tmp.z); invalidate();
    }
  };
  const onUp = ev => {
    if (!down) return; const d = down; down = null; controls.enabled = true;
    if (dragging) {
      const g = dragging; dragging = null; g.userData.drag = false; aim(ev);
      const sq = ray.ray.intersectPlane(plane, tmp) ? sqAt(tmp.x, tmp.z) : null, from = g.userData.sq;
      if (sq && sq !== from) { const p = sqPos(sq); g.position.set(p.x, 0, p.z); pendingDrop = { g, to: sq }; opts.onSquare(sq); setTimeout(() => { if (pendingDrop && pendingDrop.g === g) { pendingDrop = null; reconcile(); applyMarks(); invalidate(); } }, 1500); }
      else { reconcile(); applyMarks(); invalidate(); }
    } else if (!d.moved && d.h && !d.grab) opts.onSquare(d.h.sq);
  };
  wrap.addEventListener('pointerdown', onDown, true);
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);

  // ---- Bucle de dibujo (solo dibuja cuando algo cambia) ----
  let raf = 0, detachedAt = 0, destroyed = false;
  controls.addEventListener('change', invalidate);
  const loop = now => {
    if (destroyed) return; raf = requestAnimationFrame(loop);
    if (!wrap.isConnected) { if (!detachedAt) detachedAt = Date.now(); else if (Date.now() - detachedAt > 30000) api.destroy(); return; }
    detachedAt = 0; if (document.hidden) return;
    if (anims.length) stepAnims(now);
    if (checkDisc.visible) { checkDisc.material.opacity = 0.35 + 0.25 * Math.sin(now / 220); need = true; }
    if (need) { need = false; renderer.render(scene, camera); }
  };
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); });
  renderer.domElement.addEventListener('webglcontextrestored', invalidate);
  const ro = new ResizeObserver(resize); ro.observe(wrap);
  setQuality(quality); raf = requestAnimationFrame(loop);

  const api = {
    el: wrap, sync, setMarks, view, resize, setQuality, get quality() { return quality; },
    _dbg: () => ({ size: [lastW, lastH], buffer: [renderer.domElement.width, renderer.domElement.height], pieces: pieces.size, anims: anims.length, list: [...pieces].map(([sq, g]) => sq + g.userData.type + g.userData.color), group: sq => pieces.get(sq), square: sq => squares.children.find(m => m.userData.sq === sq), pend: !!pendingDrop }),
    destroy() {
      if (destroyed) return; destroyed = true; cancelAnimationFrame(raf); ro.disconnect();
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
      controls.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); renderer.dispose(); wrap.remove();
      if (opts.onDestroy) opts.onDestroy();
    },
  };
  return api;
}
