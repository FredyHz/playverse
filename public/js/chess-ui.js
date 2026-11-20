// Tablero de ajedrez compartido por la partida contra la computadora y la partida online.
const CUI = {
  sel: null, targets: [], promo: null, ctl: null, o: null,
  G: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
  NAME: { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' },
  click(n) { if (CUI.ctl) CUI.ctl(n); },
  // Selecciona una pieza o ejecuta la jugada (pide la pieza de coronación si hace falta)
  handle(sq, o) {
    CUI.o = o; const g = o.g, p = g.get(sq);
    if (CUI.sel) {
      const mv = CUI.targets.filter(m => m.to === sq);
      if (mv.length) { if (mv[0].promo) { CUI.promo = mv; return o.redraw(); } CUI.sel = null; CUI.targets = []; return o.send(mv[0]); }
    }
    if (p && p.color === g.turn() && o.mine(p.color)) { CUI.sel = sq; CUI.targets = g.moves().filter(m => m.from === sq); snd.click(); }
    else { CUI.sel = null; CUI.targets = []; }
    o.redraw();
  },
  pick(t) { const m = CUI.promo.find(x => x.promo === t); CUI.promo = null; CUI.sel = null; CUI.targets = []; CUI.o.send(m); },
  reset() { CUI.sel = null; CUI.targets = []; CUI.promo = null; },
  board(o) {
    const g = o.g, chk = g.inCheck() ? g.kingSquare(g.turn()) : null, last = o.last, h = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const f = o.flip ? 7 - c : c, rk = o.flip ? r : 7 - r, n = 'abcdefgh'[f] + (rk + 1), p = g.get(n), dark = (f + rk) % 2 === 0, tg = CUI.targets.some(m => m.to === n);
      const cls = ['sq', dark ? 'd' : 'l', CUI.sel === n ? 'sel' : '', last && (last.from === n || last.to === n) ? 'last' : '', chk === n ? 'chk' : '', tg ? (p ? 'tgt cap' : 'tgt') : ''].join(' ');
      h.push(`<button class="${cls}" onclick="CUI.click('${n}')" aria-label="${n}${p ? ', ' + CUI.NAME[p.type] + (p.color === 'w' ? ' blanco' : ' negro') : ''}">${p ? `<span class="cp ${p.color}">${CUI.G[p.type]}\uFE0E</span>` : ''}${c === 0 ? `<i class="c-rk">${rk + 1}</i>` : ''}${r === 7 ? `<i class="c-fl">${'abcdefgh'[f]}</i>` : ''}</button>`);
    }
    const pr = CUI.promo ? `<div class="promo"><b>Corona a…</b>${['q', 'r', 'b', 'n'].map(t => `<button onclick="CUI.pick('${t}')" aria-label="${CUI.NAME[t]}"><span class="cp ${g.turn()}">${CUI.G[t]}\uFE0E</span></button>`).join('')}</div>` : '';
    return `<div class="cbd"><div class="cb">${h.join('')}</div>${pr}</div>`;
  },
  // Piezas capturadas y ventaja de material
  cap(g) {
    const init = { p: 8, n: 2, b: 2, r: 2, q: 1 }, V = { p: 1, n: 3, b: 3, r: 5, q: 9 }, cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } }, mat = { w: 0, b: 0 };
    for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) { const p = g.get(f + r); if (p && p.type !== 'k') { cnt[p.color][p.type]++; mat[p.color] += V[p.type]; } }
    const lost = c => ['q', 'r', 'b', 'n', 'p'].map(t => CUI.G[t].repeat(Math.max(0, init[t] - cnt[c][t]))).join('');
    return { w: lost('b'), b: lost('w'), d: mat.w - mat.b };
  },
  fmt(ms) { if (ms == null) return '∞'; const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  bar(x, c) {
    const mine = x.color === 'w' ? c.w : c.b, adv = x.color === 'w' ? c.d : -c.d;
    return `<div class="cbar ${x.active ? 'on' : ''}"><span class="av2">${x.avatar}</span><b>${esc(x.name)}</b><span class="cap"><span class="cp sm ${x.color === 'w' ? 'b' : 'w'}">${mine}</span>${adv > 0 ? '+' + adv : ''}</span>${x.clock !== undefined ? `<span class="ck" id="${x.clockId}">${CUI.fmt(x.clock)}</span>` : ''}</div>`;
  },
  moves(h) { let o = ''; for (let i = 0; i < h.length; i += 2) o += `<span class="mvn">${i / 2 + 1}.</span><span>${esc(h[i])}</span><span>${h[i + 1] ? esc(h[i + 1]) : ''}</span>`; return o || '<span class="mu" style="grid-column:1/-1">Aún no hay jugadas.</span>'; },
  layout(o) {
    const c = CUI.cap(o.g);
    return `<div class="chx"><div class="cbwrap">${CUI.bar(o.top, c)}${CUI.board(o)}${CUI.bar(o.bottom, c)}</div><aside class="cpanel card2"><div class="cst ${o.over ? 'over' : ''}" aria-live="polite">${o.banner}</div><h4>Jugadas</h4><div class="mv" id="mvl">${CUI.moves(o.history)}</div><div class="cbtn">${o.buttons}</div></aside></div>`;
  },
  after() { const m = $('#mvl'); if (m) m.scrollTop = m.scrollHeight; },
};
