// Reconocimientos de PLAYVERSE: hoja elegante con tinta dorada para compartir o guardar en la galería.
// Sirve para cualquier juego: CERT.register('juego', { name, sub, levels: ['Nivel 1', ...] })
// y después CERT.award('juego', numeroDeNivel, nombreDelJugador) cuando se supera un nivel.
const CERT = {
  games: {}, cur: null,
  register(key, cfg) { this.games[key] = cfg; },
  get(game, level) { return ((S.certs || {})[game] || {})[level] || null; },
  count(game) { return Object.keys((S.certs || {})[game] || {}).length; },
  // Entrega el reconocimiento la primera vez que se supera el nivel
  award(game, level, name) {
    S.certs = S.certs || {}; S.certs[game] = S.certs[game] || {};
    if (S.certs[game][level]) return { isNew: false, cert: S.certs[game][level] };
    const ts = Date.now(), cert = { name, ts, id: CERT.code(game, level, name, ts) };
    S.certs[game][level] = cert; save(); return { isNew: true, cert };
  },
  code(game, level, name, ts) {
    let h = 2166136261; for (const c of `${game}|${level}|${name}|${ts}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return 'PV-' + game.slice(0, 2).toUpperCase() + '-' + String(level).padStart(2, '0') + '-' + (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(-7);
  },
  roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][n] || String(n); },
  rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  fonts() {
    return CERT._f || (CERT._f = Promise.race([
      Promise.all(['700 40px Cinzel', '500 30px Cinzel', '80px "Great Vibes"', 'italic 500 40px "Cormorant Garamond"'].map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 2500)),
    ]).catch(() => {}));
  },
  // Dibuja la hoja (1080×1440) y devuelve el canvas
  async draw(game, level) {
    const cfg = CERT.games[game], cert = CERT.get(game, level), W = 1080, H = 1440; await CERT.fonts();
    const levelName = cfg.levels[level - 1], total = cfg.levels.length, rom = CERT.roman(level);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), R = CERT.rng(7);
    const SERIF = '"Cinzel","Trajan Pro","Times New Roman",serif', IT = '"Cormorant Garamond","Georgia",serif', SCRIPT = '"Great Vibes","Brush Script MT","Segoe Script",cursive';
    const gold = (x0, y0, x1, y1) => { const g = x.createLinearGradient(x0, y0, x1, y1); [[0, '#6a4509'], [0.25, '#c6942a'], [0.5, '#efcf63'], [0.75, '#b5841c'], [1, '#6a4509']].forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    // Papel: degradado cálido, fibras y viñeta
    const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#fcf5e0'); bg.addColorStop(0.5, '#f7ecca'); bg.addColorStop(1, '#efdcae'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 5200; i++) { x.fillStyle = `rgba(${R() > 0.5 ? '120,80,20' : '255,255,255'},${0.02 + R() * 0.05})`; x.fillRect(R() * W, R() * H, 1 + R() * 2.5, 1 + R() * 2.5); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(150,105,40,${0.03 + R() * 0.04})`; x.lineWidth = 1 + R() * 1.5; x.beginPath(); const sx = R() * W, sy = R() * H; x.moveTo(sx, sy); x.quadraticCurveTo(sx + R() * 80 - 40, sy + R() * 80 - 40, sx + R() * 160 - 80, sy + R() * 160 - 80); x.stroke(); }
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(110,70,15,.30)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
    // Marco dorado triple y adornos de esquina
    for (const [ins, lw] of [[34, 10], [58, 3], [70, 1.5]]) { x.lineWidth = lw; x.strokeStyle = gold(0, 0, W, H); x.strokeRect(ins, ins, W - 2 * ins, H - 2 * ins); }
    for (const [cx, cy, sx, sy] of [[70, 70, 1, 1], [W - 70, 70, -1, 1], [70, H - 70, 1, -1], [W - 70, H - 70, -1, -1]]) {
      x.save(); x.translate(cx, cy); x.scale(sx, sy); x.strokeStyle = gold(0, 0, 90, 90); x.lineWidth = 3;
      for (const r of [26, 44, 62]) { x.beginPath(); x.arc(0, 0, r, 0, Math.PI / 2); x.stroke(); }
      x.fillStyle = gold(0, 0, 40, 40); x.beginPath(); x.moveTo(0, -13); x.lineTo(13, 0); x.lineTo(0, 13); x.lineTo(-13, 0); x.closePath(); x.fill(); x.restore();
    }
    // Texto en tinta dorada (relleno degradado + trazo fino para dar relieve)
    const ink = (t, cx, y, size, fam, style = '', maxW = 860, sp = 0) => {
      let s = size; const meas = () => { x.font = `${style} ${s}px ${fam}`; let w = 0; for (const ch of t) w += x.measureText(ch).width + sp; return w - sp; };
      while (meas() > maxW && s > 14) s -= 2; const w = meas(); let px = cx - w / 2;
      x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = gold(cx - w / 2, y - s, cx + w / 2, y); x.shadowColor = 'rgba(80,50,0,.35)'; x.shadowBlur = 2; x.shadowOffsetX = 1; x.shadowOffsetY = 1;
      for (const ch of t) { x.fillText(ch, px, y); x.shadowColor = 'transparent'; x.strokeStyle = 'rgba(95,63,10,.6)'; x.lineWidth = 1.1; x.strokeText(ch, px, y); x.shadowColor = 'rgba(80,50,0,.35)'; px += x.measureText(ch).width + sp; }
      x.shadowColor = 'transparent'; return s;
    };
    const orn = (y, half) => { x.strokeStyle = gold(W / 2 - half, 0, W / 2 + half, 0); x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - half, y); x.lineTo(W / 2 - 22, y); x.moveTo(W / 2 + 22, y); x.lineTo(W / 2 + half, y); x.stroke(); x.fillStyle = gold(W / 2 - 14, y - 14, W / 2 + 14, y + 14); x.beginPath(); x.moveTo(W / 2, y - 12); x.lineTo(W / 2 + 12, y); x.lineTo(W / 2, y + 12); x.lineTo(W / 2 - 12, y); x.closePath(); x.fill(); };
    ink('PLAYVERSE', W / 2, 130, 38, SERIF, '700', 500, 14);
    orn(175, 200);
    ink('RECONOCIMIENTO', W / 2, 292, 80, SERIF, '700', 860, 5);
    ink('de nivel aprobado', W / 2, 352, 48, IT, 'italic 500', 700);
    orn(400, 120);
    ink('Se otorga a', W / 2, 470, 42, IT, 'italic 500', 600);
    ink(cert.name, W / 2, 595, 130, SCRIPT, '', 800);
    x.strokeStyle = gold(W / 2 - 280, 0, W / 2 + 280, 0); x.lineWidth = 2.5; x.beginPath(); x.moveTo(W / 2 - 280, 635); x.quadraticCurveTo(W / 2, 659, W / 2 + 280, 635); x.stroke();
    ink('por haber superado con éxito el nivel', W / 2, 715, 40, IT, 'italic 500', 800);
    ink(levelName.toUpperCase(), W / 2, 825, 84, SERIF, '700', 860, 3);
    ink(`Nivel ${rom} de ${CERT.roman(total)}`, W / 2, 888, 44, IT, 'italic 500', 600);
    orn(935, 160);
    ink(cfg.name.toUpperCase(), W / 2, 1000, 54, SERIF, '700', 700, 9);
    ink(cfg.sub || '', W / 2, 1045, 36, IT, 'italic 500', 700);
    // Sello dorado con cintas (todo dentro del marco)
    const sx = W / 2, sy = 1190, SR = 90;
    for (const d of [-1, 1]) { x.fillStyle = '#6a3bc0'; x.strokeStyle = '#3d1f86'; x.lineWidth = 2; x.beginPath(); x.moveTo(sx + d * 28, sy + 56); x.lineTo(sx + d * 70, sy + 118); x.lineTo(sx + d * 44, sy + 112); x.lineTo(sx + d * 24, sy + 134); x.lineTo(sx - d * 8, sy + 66); x.closePath(); x.fill(); x.stroke(); }
    const sg = x.createRadialGradient(sx - 28, sy - 28, 8, sx, sy, SR + 10); [[0, '#fff3b0'], [0.45, '#dcb13d'], [1, '#8a5f10']].forEach(([o, col]) => sg.addColorStop(o, col));
    x.fillStyle = sg; x.beginPath(); for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, r = SR + (i % 2 ? 0 : 9); x.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } x.closePath(); x.fill();
    x.strokeStyle = '#7a5410'; x.lineWidth = 3; x.beginPath(); x.arc(sx, sy, SR - 14, 0, Math.PI * 2); x.stroke();
    const ig = x.createRadialGradient(sx - 20, sy - 24, 6, sx, sy, SR - 20); [[0, '#fff8cc'], [0.6, '#e6bf4d'], [1, '#b98a22']].forEach(([o, col]) => ig.addColorStop(o, col)); x.fillStyle = ig; x.beginPath(); x.arc(sx, sy, SR - 20, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#8a5f10'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 16 : 38; x.lineTo(sx + Math.cos(a) * r, sy - 14 + Math.sin(a) * r); } x.closePath(); x.fill();
    x.font = `700 30px ${SERIF}`; x.textAlign = 'center'; x.fillStyle = '#5a3a08'; x.fillText(rom, sx, sy + 52);
    // Fecha, firma y código
    const date = new Date(cert.ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    for (const [cx, big, small, fam, st] of [[200, date, 'Fecha', IT, 'italic 500'], [W - 200, 'PLAYVERSE', 'Plataforma de juegos', SCRIPT, '']]) {
      x.strokeStyle = gold(cx - 140, 0, cx + 140, 0); x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 140, 1305); x.lineTo(cx + 140, 1305); x.stroke();
      ink(big, cx, 1292, fam === SCRIPT ? 58 : 34, fam, st, 270); ink(small, cx, 1338, 24, SERIF, '500', 270, 2);
    }
    ink('N.º ' + cert.id, W / 2, 1358, 22, SERIF, '500', 500, 3);
    return c;
  },
  /* ---- Visor: ver, guardar en la galería y compartir ---- */
  async open(game, level) {
    const cert = CERT.get(game, level), cfg = CERT.games[game]; if (!cert || !cfg) return; CERT.close();
    const ov = document.createElement('div'); ov.className = 'cert-ov'; ov.id = 'certov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    const txt = `¡Aprobé el nivel ${cfg.levels[level - 1]} de ${cfg.name} en PLAYVERSE! 🏅`, url = location.origin;
    ov.innerHTML = `<div class="cert-card"><button class="cert-x" aria-label="Cerrar" onclick="CERT.close()">✕</button><h3>Tu reconocimiento</h3><div class="cert-pv" id="certpv"><p>Preparando tu reconocimiento…</p></div>
      <div class="cert-b"><button class="btn" onclick="CERT.share()">Compartir en redes</button><button class="btn alt" onclick="CERT.save()">Guardar imagen</button></div>
      <div class="cert-soc"><a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt + ' ' + url)}">WhatsApp</a><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(url)}">X</a></div>
      <p class="cert-h" id="certh">Estos enlaces comparten el texto y la dirección. Para publicar la imagen usa «Compartir en redes» o «Guardar imagen».</p></div>`;
    document.body.appendChild(ov); ov.addEventListener('click', e => { if (e.target === ov) CERT.close(); });
    try {
      const cv = await CERT.draw(game, level), file = `PLAYVERSE-${cfg.name}-Nivel-${level}-${cfg.levels[level - 1]}.png`.replace(/\s+/g, '-');
      cv.toBlob(b => {
        if (!document.getElementById('certov')) return; CERT.cur = { blob: b, file, text: txt, url: URL.createObjectURL(b) };
        const pv = document.getElementById('certpv'); if (pv) pv.innerHTML = `<img alt="Reconocimiento: ${cfg.levels[level - 1]}" src="${CERT.cur.url}">`;
      }, 'image/png');
    } catch (e) { const pv = document.getElementById('certpv'); if (pv) pv.textContent = 'No se pudo dibujar el reconocimiento: ' + e.message; }
  },
  close() { const o = document.getElementById('certov'); if (o) o.remove(); if (CERT.cur && CERT.cur.url) URL.revokeObjectURL(CERT.cur.url); CERT.cur = null; },
  hint(t) { const h = document.getElementById('certh'); if (h) h.textContent = t; },
  save() {
    const c = CERT.cur; if (!c) return; const a = document.createElement('a'); a.href = c.url; a.download = c.file; document.body.appendChild(a); a.click(); a.remove();
    CERT.hint('Imagen guardada. En el celular, ábrela desde Descargas o usa «Compartir > Guardar imagen» para llevarla a tu galería.');
  },
  async share() {
    const c = CERT.cur; if (!c) return; const file = new File([c.blob], c.file, { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Mi reconocimiento en PLAYVERSE', text: c.text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    CERT.save(); CERT.hint('Tu navegador no permite compartir la imagen directamente. La descargamos para que la subas a tu red social.');
  },
};
