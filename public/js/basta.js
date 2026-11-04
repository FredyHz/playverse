// Basta (Stop): modo local por turnos, con la interfaz de libreta (BUI).
let BS;
const bsAv = i => BUI.AV[i % 8];
GI.basta = () => { $('#g').innerHTML = BUI.cover(); };
function bsLocalStart() { const c = BUI.cfg(); BS = { cats: c.cats, time: c.time, rounds: c.rounds, r: 0 }; SC = {}; snd.click(); bsRound(); }
const bsSide = a => BUI.side(S.P.map((p, i) => ({ avatar: bsAv(i), name: p, score: SC[p] || 0 })), a);
function bsRound() { BS.letter = BASTA.LETTERS[rnd(BASTA.LETTERS.length)]; BS.sheets = []; BS.rej = new Set(); BS.turn = 0; BS.base = S.P.map(p => SC[p] || 0); BS.busy = 0; BS.shown = 0; bsPass(); }
function bsPass() {
  const p = S.P[BS.turn];
  $('#g').innerHTML = BUI.wrap(BUI.nb(`<span class="sticker">Ronda ${BS.r + 1} de ${BS.rounds}</span><div class="lt big">${BS.letter}</div><h3>Turno de ${esc(p)}</h3><p>Pasa el dispositivo a <b>${esc(p)}</b>. Las respuestas de los demás quedan ocultas.</p><button class="bb main" onclick="bsSheet()">Estoy listo</button>`, 'center') + `<aside class="note">${bsSide(BS.turn)}</aside>` + BUI.deco);
}
function bsSheet() {
  const p = S.P[BS.turn]; BS.left = BS.time; BS.busy = 0;
  $('#g').innerHTML = BUI.sheet({ letter: BS.letter, round: BS.r + 1, rounds: BS.rounds, title: 'Turno de ' + esc(p), left: BS.left, secs: BS.time, cats: BS.cats, values: [], side: bsSide(BS.turn), stopJs: 'bsDone()' });
  const f = document.querySelector('.bi'); if (f) f.focus();
  clearInterval(TM);
  TM = setInterval(() => { BS.left--; BUI.tick(BS.left, BS.time); if (BS.left <= 0) bsDone(true); }, 1000);
}
function bsDone(force) {
  if (BS.busy) return;
  const a = []; document.querySelectorAll('.bi').forEach(i => { a[+i.dataset.k] = BASTA.clean(i.value); });
  const vals = BS.cats.map((_, k) => a[k] || '');
  if (!force && vals.some(v => !v)) { const m = $('#bmsg'); if (m) m.textContent = 'Completa todas las categorías para decir ¡BASTA!'; snd.bad(); return; }
  BS.busy = 1; clearInterval(TM); BS.sheets[BS.turn] = vals; snd.ok(); BUI.stamp(); BS.turn++;
  setTimeout(() => { BS.turn < S.P.length ? bsPass() : bsResults(); }, 750);
}
function bsResults() {
  const R = BASTA.scoreRound({ answers: S.P.map((_, i) => BS.sheets[i]), letter: BS.letter, rejected: BS.rej });
  S.P.forEach((p, i) => { SC[p] = BS.base[i] + R.players[i].total; });
  const tot = R.players.map(x => x.total), mx = Math.max(...tot), w = tot.filter(t => t === mx).length === 1 && mx > 0 ? S.P[tot.indexOf(mx)] : null, last = BS.r + 1 >= BS.rounds;
  $('#g').innerHTML = BUI.results({ letter: BS.letter, round: BS.r + 1, rounds: BS.rounds, cats: BS.cats, winner: w, rejectJs: 'bsRej',
    players: S.P.map((p, i) => ({ rid: i, name: p, avatar: bsAv(i), answers: BS.sheets[i], cells: R.players[i].cells, total: R.players[i].total, sum: SC[p] })),
    note: '<p class="mu">Revisen juntos: marca <b>anular</b> en lo que no valga y los puntos se recalculan.</p>',
    actions: `<button class="bb main" onclick="${last ? 'bsEnd()' : 'BS.r++;bsRound()'}">${last ? 'Ver resultados finales' : 'Siguiente ronda'}</button>` });
  BUI.after(); if (w && !BS.shown) { BS.shown = 1; confetti(); snd.win(); }
}
function bsRej(i, k) { const key = i + '|' + k; BS.rej.has(key) ? BS.rej.delete(key) : BS.rej.add(key); bsResults(); }
function bsEnd() {
  const r = S.P.map((p, i) => ({ name: p, avatar: bsAv(i), score: SC[p] || 0 })).sort((a, b) => b.score - a.score), uni = r.length > 1 && r[0].score > r[1].score;
  r.forEach(x => award(Math.round(x.score / 10), x.name)); if (uni) award(20, r[0].name);
  done(uni ? r[0].name : ''); log('Basta: ' + (uni ? 'ganó ' + r[0].name : 'empate')); if (uni) { confetti(); snd.win(); }
  $('#g').innerHTML = BUI.end({ winner: uni ? r[0].name : null, ranking: r, note: 'A tu perfil se suma 1 punto por cada 10 de Basta, más 20 para el ganador.', actions: `<button class="bb main" onclick="GI.basta()">Jugar otra vez</button> <button class="bb" onclick="go('home')">Inicio</button>` });
  BUI.after();
}
