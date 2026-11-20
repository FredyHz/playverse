// Motor de ajedrez de PLAYVERSE: reglas completas + computadora. Lo usan el navegador y el servidor.
(function (root) {
  const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  const KN = [-33, -31, -18, -14, 14, 18, 31, 33], DIAG = [-17, -15, 15, 17], ORTH = [-16, -1, 1, 16], ALL = DIAG.concat(ORTH);
  const LET = [' ', 'p', 'n', 'b', 'r', 'q', 'k'], SANL = [' ', '', 'N', 'B', 'R', 'Q', 'K'];
  const nm = s => 'abcdefgh'[s & 7] + (8 - (s >> 4));
  const sqOf = n => (8 - (+n[1])) * 16 + (n.charCodeAt(0) - 97);
  const CR = new Array(128).fill(15); CR[0] = 7; CR[4] = 3; CR[7] = 11; CR[112] = 13; CR[116] = 12; CR[119] = 14;
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const VAL = [0, 100, 320, 330, 500, 900, 0];
  const PST = [null,
    [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]];
  const KEG = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];

  function create(fen) {
    const bd = new Array(128).fill(0), king = [116, 4], stack = [], keys = [], hist = [];
    let turn = 0, castle = 0, ep = -1, half = 0, full = 1;

    function load(f) {
      bd.fill(0); const p = f.trim().split(/\s+/); let r = 0, c = 0;
      for (const ch of p[0]) {
        if (ch === '/') { r++; c = 0; } else if (/\d/.test(ch)) c += +ch;
        else { const t = LET.indexOf(ch.toLowerCase()), b = ch === ch.toLowerCase() ? 8 : 0, s = r * 16 + c; bd[s] = t | b; if (t === KING) king[b ? 1 : 0] = s; c++; }
      }
      turn = p[1] === 'b' ? 1 : 0; castle = 0; for (const ch of (p[2] || '-')) castle |= { K: 1, Q: 2, k: 4, q: 8 }[ch] || 0;
      ep = p[3] && p[3] !== '-' ? sqOf(p[3]) : -1; half = +p[4] || 0; full = +p[5] || 1;
      stack.length = 0; hist.length = 0; keys.length = 0; keys.push(key());
    }
    function key() { let k = ''; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } k += String.fromCharCode(65 + bd[s]); } return k + turn + castle + (ep >= 0 ? ep : ''); }
    function fenOut() {
      let o = '';
      for (let r = 0; r < 8; r++) { let e = 0; for (let c = 0; c < 8; c++) { const p = bd[r * 16 + c]; if (!p) e++; else { if (e) { o += e; e = 0; } const l = LET[p & 7]; o += p & 8 ? l : l.toUpperCase(); } } if (e) o += e; if (r < 7) o += '/'; }
      return `${o} ${turn ? 'b' : 'w'} ${castle ? ((castle & 1 ? 'K' : '') + (castle & 2 ? 'Q' : '') + (castle & 4 ? 'k' : '') + (castle & 8 ? 'q' : '')) : '-'} ${ep >= 0 ? nm(ep) : '-'} ${half} ${full}`;
    }
    function attacked(sq, by) {
      const c = by << 3;
      for (const d of by ? [-15, -17] : [15, 17]) { const s = sq + d; if (!(s & 0x88) && bd[s] === (PAWN | c)) return true; }
      for (const d of KN) { const s = sq + d; if (!(s & 0x88) && bd[s] === (KNIGHT | c)) return true; }
      for (const d of ALL) { const s = sq + d; if (!(s & 0x88) && bd[s] === (KING | c)) return true; }
      for (const d of DIAG) { let s = sq + d; while (!(s & 0x88)) { const p = bd[s]; if (p) { if (p === (BISHOP | c) || p === (QUEEN | c)) return true; break; } s += d; } }
      for (const d of ORTH) { let s = sq + d; while (!(s & 0x88)) { const p = bd[s]; if (p) { if (p === (ROOK | c) || p === (QUEEN | c)) return true; break; } s += d; } }
      return false;
    }
    function gen(caps) {
      const out = [], us = turn;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = bd[s]; if (!p || (p >> 3) !== us) continue; const t = p & 7;
        if (t === PAWN) {
          const dir = us ? 16 : -16, startRow = us ? 1 : 6, lastRow = us ? 6 : 1, t1 = s + dir, promo = (s >> 4) === lastRow;
          if (!bd[t1]) {
            if (promo) { for (const pr of [5, 4, 3, 2]) out.push(s | t1 << 8 | pr << 16); }
            else if (!caps) { out.push(s | t1 << 8); if ((s >> 4) === startRow && !bd[t1 + dir]) out.push(s | (t1 + dir) << 8 | 16 << 20); }
          }
          for (const d of [dir - 1, dir + 1]) {
            const t2 = s + d; if (t2 & 0x88) continue; const q = bd[t2];
            if (q && (q >> 3) !== us) { if (promo) { for (const pr of [5, 4, 3, 2]) out.push(s | t2 << 8 | pr << 16 | 1 << 20); } else out.push(s | t2 << 8 | 1 << 20); }
            else if (t2 === ep) out.push(s | t2 << 8 | 3 << 20);
          }
        } else if (t === KNIGHT || t === KING) {
          for (const d of t === KNIGHT ? KN : ALL) { const t2 = s + d; if (t2 & 0x88) continue; const q = bd[t2]; if (!q) { if (!caps) out.push(s | t2 << 8); } else if ((q >> 3) !== us) out.push(s | t2 << 8 | 1 << 20); }
        } else {
          for (const d of t === BISHOP ? DIAG : t === ROOK ? ORTH : ALL) { let t2 = s + d; while (!(t2 & 0x88)) { const q = bd[t2]; if (!q) { if (!caps) out.push(s | t2 << 8); } else { if ((q >> 3) !== us) out.push(s | t2 << 8 | 1 << 20); break; } t2 += d; } }
        }
      }
      if (!caps) {
        if (us === 0) {
          if ((castle & 1) && bd[116] === 6 && bd[119] === 4 && !bd[117] && !bd[118] && !attacked(116, 1) && !attacked(117, 1) && !attacked(118, 1)) out.push(116 | 118 << 8 | 4 << 20);
          if ((castle & 2) && bd[116] === 6 && bd[112] === 4 && !bd[115] && !bd[114] && !bd[113] && !attacked(116, 1) && !attacked(115, 1) && !attacked(114, 1)) out.push(116 | 114 << 8 | 8 << 20);
        } else {
          if ((castle & 4) && bd[4] === 14 && bd[7] === 12 && !bd[5] && !bd[6] && !attacked(4, 0) && !attacked(5, 0) && !attacked(6, 0)) out.push(4 | 6 << 8 | 4 << 20);
          if ((castle & 8) && bd[4] === 14 && bd[0] === 12 && !bd[3] && !bd[2] && !bd[1] && !attacked(4, 0) && !attacked(3, 0) && !attacked(2, 0)) out.push(4 | 2 << 8 | 8 << 20);
        }
      }
      return out;
    }
    function make(m) {
      const from = m & 255, to = (m >> 8) & 255, pr = (m >> 16) & 15, fl = m >> 20, p = bd[from];
      const u = { m, cap: bd[to], castle, ep, half }; stack.push(u);
      if (fl & 2) { const cs = to + (turn ? -16 : 16); u.cap = bd[cs]; bd[cs] = 0; }
      bd[to] = pr ? (pr | turn << 3) : p; bd[from] = 0;
      if (fl & 4) { if (turn) { bd[5] = bd[7]; bd[7] = 0; } else { bd[117] = bd[119]; bd[119] = 0; } }
      else if (fl & 8) { if (turn) { bd[3] = bd[0]; bd[0] = 0; } else { bd[115] = bd[112]; bd[112] = 0; } }
      if ((p & 7) === KING) king[turn] = to;
      castle &= CR[from] & CR[to]; ep = fl & 16 ? (from + to) >> 1 : -1;
      half = (p & 7) === PAWN || u.cap ? 0 : half + 1; if (turn) full++; turn ^= 1;
    }
    function unmake() {
      const u = stack.pop(), m = u.m; turn ^= 1; if (turn) full--;
      const from = m & 255, to = (m >> 8) & 255, pr = (m >> 16) & 15, fl = m >> 20, p = pr ? (PAWN | turn << 3) : bd[to];
      bd[from] = p;
      if (fl & 2) { bd[to] = 0; bd[to + (turn ? -16 : 16)] = u.cap; } else bd[to] = u.cap;
      if (fl & 4) { if (turn) { bd[7] = bd[5]; bd[5] = 0; } else { bd[119] = bd[117]; bd[117] = 0; } }
      else if (fl & 8) { if (turn) { bd[0] = bd[3]; bd[3] = 0; } else { bd[112] = bd[115]; bd[115] = 0; } }
      if ((p & 7) === KING) king[turn] = from;
      castle = u.castle; ep = u.ep; half = u.half;
    }
    const inCheck = () => attacked(king[turn], turn ^ 1);
    function legal() { const out = []; for (const m of gen(false)) { make(m); if (!attacked(king[turn ^ 1], turn)) out.push(m); unmake(); } return out; }
    function perft(d) { if (!d) return 1; let n = 0; for (const m of gen(false)) { make(m); if (!attacked(king[turn ^ 1], turn)) n += d === 1 ? 1 : perft(d - 1); unmake(); } return n; }
    function insufficient() {
      const minors = []; let other = false;
      for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const t = bd[s] & 7; if (!t || t === KING) continue; if (t === KNIGHT || t === BISHOP) minors.push([t, ((s >> 4) + (s & 7)) & 1]); else other = true; }
      if (other) return false; if (minors.length <= 1) return true;
      return minors.every(x => x[0] === BISHOP && x[1] === minors[0][1]);
    }
    function status() {
      if (!legal().length) return inCheck() ? { over: true, result: turn ? '1-0' : '0-1', winner: turn ? 'w' : 'b', reason: 'jaque mate' } : { over: true, result: '1/2-1/2', winner: null, reason: 'rey ahogado' };
      if (insufficient()) return { over: true, result: '1/2-1/2', winner: null, reason: 'material insuficiente' };
      if (half >= 100) return { over: true, result: '1/2-1/2', winner: null, reason: 'regla de los 50 movimientos' };
      const k = keys[keys.length - 1]; if (keys.filter(x => x === k).length >= 3) return { over: true, result: '1/2-1/2', winner: null, reason: 'triple repetición' };
      return { over: false };
    }
    function san(m, ms) {
      const from = m & 255, to = (m >> 8) & 255, pr = (m >> 16) & 15, fl = m >> 20, p = bd[from], t = p & 7; let s;
      if (fl & 4) s = 'O-O'; else if (fl & 8) s = 'O-O-O';
      else if (t === PAWN) { s = (fl & 1 ? nm(from)[0] + 'x' : '') + nm(to) + (pr ? '=' + SANL[pr] : ''); }
      else {
        s = SANL[t]; const o = ms.filter(x => x !== m && bd[x & 255] === p && ((x >> 8) & 255) === to);
        if (o.length) { if (!o.some(x => (x & 7) === (from & 7))) s += nm(from)[0]; else if (!o.some(x => ((x & 255) >> 4) === (from >> 4))) s += nm(from)[1]; else s += nm(from); }
        s += (fl & 1 ? 'x' : '') + nm(to);
      }
      make(m); const chk = inCheck(), any = legal().length > 0; unmake();
      return s + (chk ? (any ? '+' : '#') : '');
    }
    function move(o) {
      const pr = o.promo ? LET.indexOf(o.promo) : 0, f = sqOf(o.from), t = sqOf(o.to), ms = legal();
      const m = ms.find(x => (x & 255) === f && ((x >> 8) & 255) === t && (((x >> 16) & 15) ? ((x >> 16) & 15) === (pr || 5) : true));
      if (m === undefined) return null;
      const s = san(m, ms), fl = m >> 20, pp = (m >> 16) & 15; make(m); keys.push(key());
      const r = { from: o.from, to: o.to, promo: pp ? LET[pp] : undefined, san: s, capture: !!(fl & 1), castle: !!(fl & 12) }; hist.push(r); return r;
    }
    function undo() { if (!hist.length) return null; unmake(); keys.pop(); return hist.pop(); }
    /* ---- Computadora ---- */
    function evaluate() {
      let sc = 0, mat = 0;
      for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = bd[s]; if (p && (p & 7) !== PAWN && (p & 7) !== KING) mat += VAL[p & 7]; }
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; } const p = bd[s]; if (!p) continue; const t = p & 7, c = p >> 3, i = c ? (7 - (s >> 4)) * 8 + (s & 7) : (s >> 4) * 8 + (s & 7);
        const v = VAL[t] + (t === KING && mat < 2600 ? KEG[i] : PST[t][i]); sc += c ? -v : v;
      }
      return turn ? -sc : sc;
    }
    const order = (m) => { const cap = m >> 20 & 1, v = bd[(m >> 8) & 255] & 7, a = bd[m & 255] & 7, pr = (m >> 16) & 15; return (cap ? 10 * VAL[v || 1] - a : 0) + (pr ? VAL[pr] : 0); };
    function best(opts) {
      opts = opts || {}; const t0 = Date.now(), limit = opts.ms || 800, maxD = opts.depth || 4, wide = !!opts.wide; let nodes = 0, stop = false; const INF = 1e6, MATE = 30000;
      function tick() { if ((++nodes & 1023) === 0 && Date.now() - t0 > limit) stop = true; return stop; }
      function qs(a, b, ply) {
        if (tick()) return 0; const st = evaluate(); if (st >= b) return st; if (ply > 14) return st; if (st > a) a = st;
        const ms = gen(true).sort((x, y) => order(y) - order(x));
        for (const m of ms) { make(m); if (attacked(king[turn ^ 1], turn)) { unmake(); continue; } const s = -qs(-b, -a, ply + 1); unmake(); if (stop) return 0; if (s >= b) return s; if (s > a) a = s; }
        return a;
      }
      function nega(d, a, b, ply) {
        if (tick()) return 0; if (half >= 100) return 0; const chk = inCheck(); if (chk) d++; if (d <= 0) return qs(a, b, ply);
        const ms = gen(false).sort((x, y) => order(y) - order(x)); let any = false;
        for (const m of ms) { make(m); if (attacked(king[turn ^ 1], turn)) { unmake(); continue; } any = true; const s = -nega(d - 1, -b, -a, ply + 1); unmake(); if (stop) return 0; if (s >= b) return s; if (s > a) a = s; }
        if (!any) return chk ? -MATE + ply : 0; return a;
      }
      let root = legal().sort((x, y) => order(y) - order(x)); if (!root.length) return null;
      let results = root.map(m => [m, 0]); const depthDone = [];
      for (let d = 1; d <= maxD; d++) {
        let a = -INF; const cur = [];
        for (const [m] of results) { make(m); const s = -nega(d - 1, wide ? -INF : -INF, wide ? INF : -a, 1); unmake(); if (stop) break; cur.push([m, s]); if (!wide && s > a) a = s; }
        if (stop && d > 1) break; if (cur.length === results.length || d === 1) { results = cur.length ? cur.sort((x, y) => y[1] - x[1]) : results; depthDone.push(d); if (results[0][1] > MATE - 100) break; } if (stop) break;
      }
      let pick = results[0];
      if (opts.blunder && Math.random() < opts.blunder) pick = results[rnd(results.length)];
      else if (opts.within) { const ok = results.filter(r => r[1] >= results[0][1] - opts.within); pick = ok[rnd(ok.length)]; }
      const m = pick[0], pr = (m >> 16) & 15;
      return { from: nm(m & 255), to: nm((m >> 8) & 255), promo: pr ? LET[pr] : undefined, score: pick[1], depth: depthDone.length ? depthDone[depthDone.length - 1] : 0, nodes };
    }
    const rnd = n => Math.floor(Math.random() * n);
    load(fen || START);
    return {
      fen: fenOut, load, perft, best, move, undo, status, inCheck, insufficient,
      turn: () => (turn ? 'b' : 'w'),
      get: n => { const p = bd[sqOf(n)]; return p ? { type: LET[p & 7], color: p & 8 ? 'b' : 'w' } : null; },
      moves: () => legal().map(m => { const pr = (m >> 16) & 15; return { from: nm(m & 255), to: nm((m >> 8) & 255), promo: pr ? LET[pr] : undefined }; }),
      history: () => hist.map(h => h.san), last: () => hist.length ? { from: hist[hist.length - 1].from, to: hist[hist.length - 1].to } : null,
      kingSquare: c => nm(king[c === 'b' ? 1 : 0]),
    };
  }
  const api = { create, START };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CH = api;
})(typeof window !== 'undefined' ? window : globalThis);
