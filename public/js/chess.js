// Ajedrez local: contra la computadora (9 niveles), dos jugadores en este dispositivo y acceso a las salas online.
let CG, CHW, chTimer, chSeq = 0; const chPend = new Map();
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
// e = motor interno (profundidad, tiempo, y cuánto puede equivocarse); sf = Stockfish (fuerza limitada o máxima)
const LEVELS = [
  { n: 'Principiante', d: 'Aprende las reglas y movimientos.', pts: 5, e: { depth: 1, ms: 150, wide: true, within: 400, blunder: 0.5 } },
  { n: 'Muy fácil', d: 'Juega sin demasiada presión.', pts: 8, e: { depth: 1, ms: 150, wide: true, within: 250, blunder: 0.3 } },
  { n: 'Fácil', d: 'Comienza a desarrollar estrategias.', pts: 12, e: { depth: 2, ms: 300, wide: true, within: 150, blunder: 0.15 } },
  { n: 'Medio', d: 'Enfrenta desafíos equilibrados.', pts: 18, e: { depth: 3, ms: 600, wide: true, within: 50, blunder: 0.05 } },
  { n: 'Difícil', d: 'Requiere planificación y táctica.', pts: 25, e: { depth: 4, ms: 1000, within: 15 } },
  { n: 'Muy difícil', d: 'Enfrenta situaciones complejas.', pts: 35, e: { depth: 6, ms: 2000 } },
  { n: 'Candidato a Maestro', d: 'Nivel avanzado y exigente.', pts: 50, sf: { elo: 1800, ms: 800 }, e: { depth: 7, ms: 2500 } },
  { n: 'Maestro', d: 'Juego estratégico de alto nivel.', pts: 70, sf: { elo: 2400, ms: 1200 }, e: { depth: 8, ms: 3000 } },
  { n: 'Gran Maestro', d: 'Desafío máximo.', pts: 90, sf: { elo: 0, ms: 2500, depth: 22 }, e: { depth: 9, ms: 3500 } },
];
CERT.register('chess', { name: 'Ajedrez', sub: 'contra la computadora', levels: LEVELS.map(l => l.n) });
const chSel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
const chTimes = [[0, 'Sin límite'], [5, '5 min'], [10, '10 min'], [15, '15 min']], chColors = [['w', 'Blancas'], ['b', 'Negras'], ['r', 'Al azar']];
let CHSEL = { level: 4 };

GI.chess = () => {
  CG = null; CUI.reset(); clearInterval(chTimer); CHV.modalClosed = false;
  const c = Object.assign({ level: 4, color: 'w', ctime: 0, otime: 10, ocolor: 'r' }, S.chc || {}); CHSEL = { level: Math.min(9, Math.max(1, c.level || 4)) };
  $('#g').innerHTML = `<div class="chmenu chroom"><div><button class="back" onclick="go('cat','m')">← Juegos de mesa</button><h2>Ajedrez</h2><p class="mu">Reglas oficiales completas, nueve niveles contra la computadora y partidas online.</p></div>
    <section class="card2"><h3>Contra la computadora</h3><p class="mu">Elige tu rival. Cada nivel cambia la profundidad de análisis y la precisión de la computadora, no solo el tiempo que tarda.</p>
      <div class="lvs">${LEVELS.map((l, i) => `<button class="lv ${i + 1 === CHSEL.level ? 'on' : ''}" onclick="chPickLv(${i + 1})" aria-pressed="${i + 1 === CHSEL.level}"><span class="crest">${ROMAN[i + 1]}</span><b>${l.n}</b>${CERT.get('chess', i + 1) ? '<em class="okb">✓ Aprobado</em>' : ''}<small>${l.d}</small><span class="pips" aria-label="Dificultad ${i + 1} de 9">${Array.from({ length: 9 }, (_, k) => `<i class="${k <= i ? 'f' : ''}"></i>`).join('')}</span></button>`).join('')}</div>
      <div class="row2"><label>Tus piezas<br>${chSel('cco', chColors, c.color)}</label><label>Tiempo por jugador<br>${chSel('cti', chTimes, c.ctime)}</label><button class="btn big" onclick="chStart('ai')">Jugar contra la computadora</button></div>
      <p class="mu"><small>La fuerza de cada nivel es aproximada. Los niveles Candidato a Maestro, Maestro y Gran Maestro usan Stockfish si tu navegador lo carga; si no, juega el motor interno de PLAYVERSE.</small></p></section>
    ${chGallery()}
    <section class="card2"><h3>Dos jugadores</h3><p class="mu">En este mismo dispositivo: se pasan el turno y pueden girar el tablero.</p><div class="row2"><label>Tiempo por jugador<br>${chSel('ct2', chTimes, c.ctime)}</label><button class="btn" onclick="chStart('two')">Jugar</button></div></section>
    <section class="card2"><h3>Con amigos online</h3><p class="mu">Crea una sala, comparte el código y jueguen desde cualquier dispositivo. El servidor valida cada jugada.</p>
      <div class="row2"><label>Tiempo por jugador<br>${chSel('cto', chTimes.map(([v, t]) => [v, t]), c.otime)}</label><label>Mis piezas<br>${chSel('cco2', chColors, c.ocolor)}</label><button class="btn" onclick="chOnline()">Crear sala</button></div>
      <div class="row2"><input id="chj" maxlength="5" placeholder="CÓDIGO" aria-label="Código de sala" style="text-transform:uppercase;width:8em" onkeydown="if(event.key==='Enter')chJoin()"><button class="btn alt" onclick="chJoin()">Unirse a sala</button></div></section></div>`;
};
// Galería de reconocimientos: uno por cada nivel superado
function chGallery() {
  const n = CERT.count('chess');
  return `<section class="card2"><h3>Mis reconocimientos <small class="mu">(${n} de ${LEVELS.length})</small></h3><p class="mu">Al ganarle a la computadora en un nivel recibes su reconocimiento: una hoja elegante que puedes compartir en tus redes o guardar en tu galería.</p><div class="cgal">${LEVELS.map((l, i) => { const c = CERT.get('chess', i + 1); return c ? `<button class="cg on" onclick="CERT.open('chess',${i + 1})" aria-label="Ver reconocimiento ${l.n}"><span class="crest">${ROMAN[i + 1]}</span><b>${l.n}</b><small>${new Date(c.ts).toLocaleDateString('es-MX')}</small></button>` : `<div class="cg"><span class="crest lock">${ROMAN[i + 1]}</span><b>${l.n}</b><small>Gana para obtenerlo</small></div>`; }).join('')}</div></section>`;
}
function chPickLv(i) { CHSEL.level = i; snd.click(); document.querySelectorAll('.lv').forEach((b, k) => { b.classList.toggle('on', k + 1 === i); b.setAttribute('aria-pressed', k + 1 === i); }); }
function chOnline() {
  S.chc = { ...(S.chc || {}), otime: +$('#cto').value, ocolor: $('#cco2').value }; save();
  PVO.createGame({ game: 'chess', ctime: +$('#cto').value, ccolor: $('#cco2').value });
}
function chJoin() { const v = $('#chj').value.trim(); if (v) PVO.join(v); }
function chStart(mode) {
  const ai = mode === 'ai', col = ai ? $('#cco').value : 'w', ctime = +$(ai ? '#cti' : '#ct2').value;
  chBegin({ mode, level: ai ? CHSEL.level : 4, colorSel: col, my: col === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : col, ctime });
}
async function chBegin(cfg) {
  S.chc = { ...(S.chc || {}), level: cfg.level, color: cfg.colorSel, ctime: cfg.ctime }; save();
  CHV.modalClosed = false; CUI.reset(); clearInterval(chTimer); CG = null;
  $('#g').innerHTML = '<div class="card2"><p class="big">Preparando el tablero…</p></div>';
  await CHV.init(); if (V !== 'game' || A !== 'chess') return;
  if (cfg.mode === 'ai' && LEVELS[cfg.level - 1].sf) SF.init();
  const ms = cfg.ctime * 60000;
  CG = { g: CH.create(), ...cfg, flip: cfg.mode === 'ai' && cfg.my === 'b', thinking: 0, over: null, rs: 0, t0: Date.now(), t1: 0, clk: ms ? { w: ms, b: ms } : null, tickAt: Date.now(), eng: '' };
  CHV.ctl = chClick; CHV.canGrab = chGrab; CHV.redraw = () => chDraw(false);
  chTimer = setInterval(chTick, 250); snd.click(); chDraw(false);
  if (cfg.mode === 'ai' && cfg.my === 'b') chAI();
}
const chGrab = sq => { if (!CG || CG.over || CG.thinking) return false; const p = CG.g.get(sq); return !!p && p.color === CG.g.turn() && (CG.mode === 'two' || p.color === CG.my); };
function chTick() {
  if (V !== 'game' || A !== 'chess' || !CG) { clearInterval(chTimer); return; }
  const now = Date.now(), dt = now - CG.tickAt; CG.tickAt = now; if (CG.over || !CG.clk) return;
  const side = CG.g.turn(); if (CG.mode === 'ai' && side !== CG.my) return;
  CG.clk[side] = Math.max(0, CG.clk[side] - dt); const e = $('#ck' + side); if (e) e.textContent = CUI.fmt(CG.clk[side]);
  if (!CG.clk[side]) { chOver({ over: true, result: side === 'w' ? '0-1' : '1-0', winner: side === 'w' ? 'b' : 'w', reason: 'tiempo agotado' }); chDraw(false); }
}
function chBanner() {
  const g = CG.g, ai = CG.mode === 'ai';
  if (CG.over) { const o = CG.over; return !o.winner ? `Tablas por ${o.reason}` : ai ? (o.winner === CG.my ? `¡Ganaste por ${o.reason}!` : `Perdiste por ${o.reason}`) : `Ganan las ${o.winner === 'w' ? 'blancas' : 'negras'} por ${o.reason}`; }
  if (CG.thinking) return 'La computadora está pensando…';
  return (g.inCheck() ? '¡Jaque! ' : '') + (ai ? (g.turn() === CG.my ? 'Tu turno' : 'Turno de la computadora') : `Turno de las ${g.turn() === 'w' ? 'blancas' : 'negras'}`);
}
function chModal() {
  const o = CG.over; if (!o) return ''; const ai = CG.mode === 'ai', won = ai ? o.winner === CG.my : !!o.winner, lv = LEVELS[CG.level - 1];
  const pts = ai ? (!o.winner ? Math.round(lv.pts / 2) : won ? lv.pts : 0) : 0, lvl = CG.level, cert = ai && won ? CERT.get('chess', lvl) : null, fresh = !!(CG.cert && CG.cert.isNew);
  return CHV.modal({
    title: !o.winner ? 'Empate' : ai ? (won ? '¡Victoria!' : 'Derrota') : `Ganan las ${o.winner === 'w' ? 'blancas' : 'negras'}`,
    sub: `${o.result} · por ${o.reason}${pts ? ` · +${pts} puntos` : ''}`, tone: !o.winner ? 'draw' : won ? 'win' : 'lose',
    stats: CHV.summary(CG.g.history(), (CG.t1 || Date.now()) - CG.t0),
    extra: cert ? `<div class="cert-note"><b>${fresh ? '¡Nivel aprobado!' : 'Nivel aprobado'}</b> ${fresh ? 'Recibiste el reconocimiento de' : 'Tu reconocimiento de'} ${lv.n}.</div>` : '',
    buttons: (cert ? `<button class="btn" onclick="CERT.open('chess',${lvl})">Ver reconocimiento</button>` : '') + `<button class="btn" onclick="chRematch()">Revancha</button><button class="btn alt" onclick="chNew()">Nueva partida</button><button class="btn alt" onclick="go('cat','m')">Regresar al menú</button>`,
  });
}
function chDraw(animate) {
  if (!CG) return; const g = CG.g, ai = CG.mode === 'ai', lv = LEVELS[CG.level - 1];
  const who = ai ? { [CG.my]: { name: S.name, avatar: S.av, sub: 'Tú' }, [CG.my === 'w' ? 'b' : 'w']: { name: 'Computadora', avatar: '🤖', sub: lv.n } } : { w: { name: 'Blancas', avatar: '⚪' }, b: { name: 'Negras', avatar: '⚫' } };
  const side = c => ({ ...who[c], color: c, active: !CG.over && g.turn() === c, clock: CG.clk && !(ai && c !== CG.my) ? CG.clk[c] : undefined, clockId: 'ck' + c });
  const bottom = CG.flip ? 'b' : 'w', mt = CG.g.history().length;
  const info = ai ? `<div class="lvl-info"><span class="crest">${ROMAN[CG.level]}</span><div><b>${lv.n}</b><small>${CG.eng ? 'Motor: ' + CG.eng : lv.sf ? 'Motor: Stockfish si está disponible' : 'Motor interno de PLAYVERSE'}</small></div></div>` : '';
  $('#g').innerHTML = CHV.layout({
    g, flip: CG.flip, last: g.last(), animate, over: !!CG.over, top: side(bottom === 'w' ? 'b' : 'w'), bottom: side(bottom), banner: chBanner(), info, history: g.history(), eng: ai ? lv.n : 'Dos jugadores', back: "GI.chess()",
    buttons: `<button class="btn" onclick="chNew()">Nueva partida</button><button class="btn alt" onclick="chRestart()">Reiniciar</button>${ai ? `<button class="btn alt" onclick="chUndo()" ${mt ? '' : 'disabled'}>Deshacer</button>` : ''}<button class="btn alt" onclick="chFlip()">Girar tablero</button>${CG.over ? '' : '<button class="btn alt" id="rsg" onclick="chResign()">Rendirme</button>'}`,
    modal: chModal(),
  });
  CHV.post();
}
function chClick(sq) { if (!CG || CG.over || CG.thinking) return; CUI.handle(sq, { g: CG.g, mine: c => CG.mode === 'two' || c === CG.my, send: chMove, redraw: () => chDraw(false) }); }
function chMove(mv) {
  const r = CG.g.move(mv); if (!r) return; CUI.reset(); CHV.moveSound(r, CG.g);
  const st = CG.g.status(); if (st.over) chOver(st); chDraw(true); if (!st.over && CG.mode === 'ai') chAI();
}
// La computadora piensa en un Worker (no congela la pantalla). Niveles altos: Stockfish; si no carga, el motor interno.
function chInternal(fen, opts) {
  return new Promise(res => {
    try {
      CHW = CHW || new Worker('/js/chess-worker.js'); const id = ++chSeq; chPend.set(id, res);
      CHW.onmessage = e => { const f = chPend.get(e.data.id); if (f) { chPend.delete(e.data.id); f(e.data.move); } };
      CHW.onerror = () => { chPend.forEach(f => f(null)); chPend.clear(); CHW = null; };
      CHW.postMessage({ id, fen, opts });
    } catch (e) { res(null); }
  });
}
async function chAI() {
  const cg = CG; cg.thinking = 1; chDraw(false);
  const lv = LEVELS[cg.level - 1], fen = cg.g.fen(), t0 = Date.now(); let mv = null, used = 'interno de PLAYVERSE';
  if (lv.sf) { await SF.init(); if (SF.state === 'ready') { mv = await SF.best(fen, lv.sf); if (mv) used = 'Stockfish (WebAssembly)'; } }
  if (!mv) mv = await chInternal(fen, lv.e);
  if (!mv) mv = cg.g.best(lv.e);
  const wait = 500 - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (cg !== CG || cg.over) return;
  cg.thinking = 0; cg.eng = used;
  let r = mv && cg.g.move(mv); if (!r) { const ms = cg.g.moves(); r = cg.g.move(ms[Math.floor(Math.random() * ms.length)]); }
  CHV.moveSound(r, cg.g); const st = cg.g.status(); if (st.over) chOver(st); chDraw(true);
}
function chOver(st) {
  if (CG.over) return; CG.over = st; CG.t1 = Date.now(); CHV.modalClosed = false;
  if (CG.mode !== 'ai') { log('Ajedrez: ' + (st.winner ? 'ganaron las ' + (st.winner === 'w' ? 'blancas' : 'negras') : 'tablas')); snd.ok(); return; }
  const lv = LEVELS[CG.level - 1];
  if (st.winner === CG.my) {
    const lvl = CG.level; CG.cert = CERT.award('chess', lvl, me().name);
    if (CG.cert.isNew) setTimeout(() => { try { if (V === 'game' && A === 'chess') CERT.open('chess', lvl); } catch (e) { /* sin visor */ } }, 1500);
    award(lv.pts, S.name); done(S.name); log(`Ajedrez: ganaste contra la computadora (${lv.n})`); confetti(); snd.win(); }
  else if (!st.winner) { award(Math.round(lv.pts / 2), S.name); done(''); log(`Ajedrez: tablas contra la computadora (${lv.n})`); snd.ok(); }
  else { done(''); log(`Ajedrez: perdiste contra la computadora (${lv.n})`); snd.bad(); }
}
function chResign() {
  const b = $('#rsg'); if (b && !CG.rs) { CG.rs = 1; b.textContent = '¿Seguro? Toca otra vez'; return; }
  const other = CG.mode === 'ai' ? (CG.my === 'w' ? 'b' : 'w') : (CG.g.turn() === 'w' ? 'b' : 'w'); chOver({ over: true, result: other === 'w' ? '1-0' : '0-1', winner: other, reason: 'rendición' }); chDraw(false);
}
function chUndo() {
  if (!CG || CG.thinking || !CG.g.history().length) return; CG.over = null; CG.rs = 0; CG.t1 = 0; CHV.modalClosed = false; CUI.reset();
  if (CG.g.turn() === CG.my) { CG.g.undo(); CG.g.undo(); } else CG.g.undo();
  if (CG.mode === 'ai' && CG.g.turn() !== CG.my) chAI(); else chDraw(false);
}
function chFlip() { CG.flip = !CG.flip; chDraw(false); }
function chNew() { snd.click(); GI.chess(); }
function chRestart() { const c = CG; chBegin({ mode: c.mode, level: c.level, colorSel: c.colorSel, my: c.my, ctime: c.ctime }); }
function chRematch() { const c = CG, my = c.my === 'w' ? 'b' : 'w'; chBegin({ mode: c.mode, level: c.level, colorSel: c.mode === 'ai' ? my : 'w', my: c.mode === 'ai' ? my : 'w', ctime: c.ctime }); }
