// Vista del ajedrez: carga el tablero 3D (con respaldo 2D), pantalla, panel, ventana final y sonidos.
const CHV = {
  state: 'idle', err: '', B: null, ctl: null, canGrab: null, pending: null, _p: null, viewKey: null, modalClosed: false, redraw: null,
  init() {
    if (this._p) return this._p;
    this.state = 'loading';
    this._p = (async () => {
      try {
        const c = document.createElement('canvas');
        if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('WebGL no disponible');
        const stage = async (name, fn) => { try { return await fn(); } catch (e) { throw new Error(name + ' → ' + ((e && e.message) || e)); } };
        await stage('Three.js (CDN)', () => import('three'));
        await stage('OrbitControls', () => import('three/addons/controls/OrbitControls.js'));
        await stage('RoomEnvironment', () => import('three/addons/environments/RoomEnvironment.js'));
        const mod = await stage('chess3d.js', () => import('/js/chess3d.js'));
        this.B = await stage('crear el tablero', () => mod.createBoard({
          quality: S.chq || 'auto', onSquare: sq => { if (CHV.ctl) CHV.ctl(sq); }, canGrab: sq => !!(CHV.canGrab && CHV.canGrab(sq)),
          onDestroy: () => { CHV.B = null; CHV._p = null; CHV.state = 'idle'; CHV.viewKey = null; },
        }));
        this.state = '3d';
      } catch (e) { console.warn('Tablero 3D no disponible, se usa el 2D:', e); this.err = String((e && e.message) || e); this.state = '2d'; }
      return this.state;
    })();
    return this._p;
  },
  /* ---- Sonidos de madera ---- */
  sound(k) {
    if (k === 'move') { beep(210, 0.05, 'triangle'); beep(95, 0.09, 'sine', 0.012); }
    else if (k === 'cap') { beep(150, 0.07, 'square'); beep(80, 0.12, 'sine', 0.015); }
    else if (k === 'check') { beep(700, 0.09, 'sine'); beep(880, 0.12, 'sine', 0.1); }
  },
  moveSound(r, g) { this.sound(g.inCheck() ? 'check' : r && r.capture ? 'cap' : 'move'); },
  /* ---- Notación y capturas en español ---- */
  san(s) { return s.replace(/^[NBRQK]/, c => ({ N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' }[c])).replace(/=([NBRQ])/, (m, c) => '=' + { N: 'C', B: 'A', R: 'T', Q: 'D' }[c]); },
  caps(g) {
    const init = { p: 8, n: 2, b: 2, r: 2, q: 1 }, V = { p: 1, n: 3, b: 3, r: 5, q: 9 }, L = { p: 'P', n: 'C', b: 'A', r: 'T', q: 'D' };
    const cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } }, mat = { w: 0, b: 0 };
    for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) { const p = g.get(f + r); if (p && p.type !== 'k') { cnt[p.color][p.type]++; mat[p.color] += V[p.type]; } }
    const lost = c => ['q', 'r', 'b', 'n', 'p'].map(t => { const n = Math.max(0, init[t] - cnt[c][t]); return n ? L[t] + '×' + n : ''; }).filter(Boolean).join(' ');
    return { w: lost('b'), b: lost('w'), d: mat.w - mat.b };
  },
  bar(x, c) {
    const mine = x.color === 'w' ? c.w : c.b, adv = x.color === 'w' ? c.d : -c.d;
    return `<div class="cbar ${x.active ? 'on' : ''}"><span class="av2">${x.avatar}</span><div class="cb-i"><b>${esc(x.name)}</b><small>${x.sub || (x.color === 'w' ? 'Blancas' : 'Negras')}</small></div><span class="cap">${mine || '—'}${adv > 0 ? ' · +' + adv : ''}</span>${x.clock !== undefined ? `<span class="ck" id="${x.clockId}">${CUI.fmt(x.clock)}</span>` : ''}</div>`;
  },
  opts() {
    const three = this.state === '3d';
    return `${three ? `<select aria-label="Cámara" onchange="CHV.setView(this.value)"><option value="">Cámara…</option><option value="w">Vista blancas</option><option value="b">Vista negras</option><option value="top">Vista cenital</option></select><select aria-label="Calidad gráfica" onchange="CHV.setQuality(this.value)">${[['auto', 'Calidad: auto'], ['high', 'Calidad alta'], ['med', 'Calidad media'], ['low', 'Calidad baja']].map(([v, t]) => `<option value="${v}" ${(S.chq || 'auto') === v ? 'selected' : ''}>${t}</option>`).join('')}</select>` : ''}<button class="btn alt" onclick="tgS();CHV.redraw&&CHV.redraw()">${S.snd ? '🔊 Sonido' : '🔇 Sin sonido'}</button>`;
  },
  setView(v) { if (v && this.B) { this.B.view(v); if (v !== 'top') this.viewKey = v; } },
  setQuality(q) { S.chq = q; save(); if (this.B) this.B.setQuality(q); },
  /* ---- Pantalla ---- */
  layout(o) {
    CHV.pending = o; const c = CHV.caps(o.g);
    const promo = CUI.promo ? `<div class="promo3"><b>Corona tu peón</b><div>${[['q', 'Dama'], ['r', 'Torre'], ['b', 'Alfil'], ['n', 'Caballo']].map(([t, n]) => `<button class="btn" onclick="CUI.pick('${t}')">${n}</button>`).join('')}</div></div>` : '';
    return `<div class="ch3 chroom"><header class="ch3-top"><button class="ch3-back" onclick="${o.back || "go('cat','m')"}">← Menú</button><h3>AJEDREZ</h3><span class="ch3-eng">${o.eng || ''}</span></header>
      <div class="ch3-main"><div class="ch3-left">${CHV.bar(o.top, c)}${CHV.state === '3d' ? `<div class="b3box"><div class="b3slot" id="b3slot"></div>${promo}</div>` : `<div class="b2d">${CUI.board({ g: o.g, flip: o.flip, last: o.last })}${promo}</div>`}${CHV.bar(o.bottom, c)}</div>
      <aside class="ch3-panel"><div class="cst ${o.over ? 'over' : ''}" aria-live="polite">${o.banner}</div>${CHV.state === '2d' ? `<p class="mu"><small>Tablero 2D. Motivo de que no cargue el 3D: ${esc(CHV.err || 'desconocido')}</small><br><a href="/diag3d.html" target="_blank" rel="noopener">Abrir diagnóstico del 3D</a></p>` : ''}${o.info || ''}<h4>Historial</h4><div class="mv" id="mvl">${CUI.moves(o.history.map(CHV.san))}</div></aside></div>
      <footer class="ch3-bar">${o.buttons}${CHV.opts()}</footer>${o.modal || ''}</div>`;
  },
  // Se llama justo después de insertar el HTML: coloca el tablero 3D y lo sincroniza con la partida
  post() {
    const o = CHV.pending; if (!o) return; CHV.pending = null; CUI.after();
    if (CHV.state !== '3d' || !CHV.B) return;
    const slot = $('#b3slot'); if (!slot) return;
    if (CHV.B.el.parentNode !== slot) slot.appendChild(CHV.B.el);
    CHV.B.resize();
    const key = o.flip ? 'b' : 'w'; if (CHV.viewKey !== key) { CHV.B.view(key, CHV.viewKey === null); CHV.viewKey = key; }
    CHV.B.sync(o.g, { animate: !!o.animate, last: o.last });
    CHV.B.setMarks({ sel: CUI.sel, targets: CUI.targets, last: o.last, check: o.g.inCheck() ? o.g.kingSquare(o.g.turn()) : null });
  },
  /* ---- Ventana de fin de partida ---- */
  summary(h, ms) {
    const n = x => h.filter(s => x.test(s)).length;
    return [['Duración', CUI.fmt(ms)], ['Jugadas', Math.ceil(h.length / 2)], ['Capturas', n(/x/)], ['Jaques', n(/[+#]/)], ['Enroques', n(/^O-O/)]];
  },
  modal(o) {
    if (CHV.modalClosed) return '';
    return `<div class="chm" role="dialog" aria-modal="true"><div class="chm-card ${o.tone ? 'tone-' + o.tone : ''}"><div class="chm-crest" aria-hidden="true"></div><h2>${o.title}</h2><p>${o.sub}</p><dl>${o.stats.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${o.extra || ''}<div class="chm-b">${o.buttons}<button class="btn alt" onclick="CHV.closeModal()">Ver tablero</button></div></div></div>`;
  },
  closeModal() { CHV.modalClosed = true; if (CHV.redraw) CHV.redraw(); },
};
