// Basta (Stop): modo local. Cada jugador llena su hoja por turnos y las respuestas quedan ocultas hasta la revisión.
let BS;
GI.basta = () => {
  if (S.P.length < 2) { $('#g').innerHTML = '<div class="card2"><p>Basta se juega con 2 a 10 jugadores. Abre <b>Jugadores locales</b> aquí arriba y elige al menos 2.</p></div>'; return; }
  $('#g').innerHTML = `<div class="card2"><h3>Configura la partida</h3><div class="row2"><label>Rondas<br><select id="br"><option>1</option><option selected>3</option><option>5</option></select></label><label>Tiempo por turno<br><select id="bst"><option value="45">45 s</option><option value="60" selected>60 s</option><option value="90">90 s</option></select></label></div><p>Categorías (mínimo 3)</p><div class="chips">${BASTA.CATS.map((c, i) => `<label class="chip"><input type="checkbox" class="bc" value="${i}" ${i < 6 ? 'checked' : ''}> ${c}</label>`).join('')}</div><button class="btn" onclick="bsStart()">Empezar</button> <span id="bm" class="mu"></span></div>`;
};
function bsStart() {
  const cats = [...document.querySelectorAll('.bc')].filter(i => i.checked).map(i => +i.value);
  if (cats.length < 3) { $('#bm').textContent = 'Elige al menos 3 categorías.'; return; }
  BS = { cats, time: +$('#bst').value, rounds: +$('#br').value, r: 0 }; SC = {}; snd.click(); bsRound();
}
function bsRound() { BS.letter = BASTA.LETTERS[rnd(BASTA.LETTERS.length)]; BS.sheets = []; BS.rej = new Set(); BS.turn = 0; bsPass(); }
function bsPass() {
  const p = S.P[BS.turn];
  $('#g').innerHTML = bar(BS.turn) + `<div class="card2"><p class="mu">Ronda ${BS.r + 1} de ${BS.rounds}</p><div class="big" style="font-size:4.5rem">${BS.letter}</div><h3>Turno de ${esc(p)}</h3><p>Pasa el dispositivo a <b>${esc(p)}</b>. Las respuestas de los demás quedan ocultas.</p><button class="btn big" onclick="bsSheet()">Estoy listo</button></div>`;
}
function bsSheet() {
  const p = S.P[BS.turn]; BS.left = BS.time;
  $('#g').innerHTML = `<div class="card2"><div class="row2"><div class="big" style="font-size:3rem">${BS.letter}</div><div><h3>${esc(p)}</h3><span class="mu">Ronda ${BS.r + 1} de ${BS.rounds}</span></div><div class="big" style="margin-left:auto" id="bl">${BS.left}</div></div><div class="tb"><i id="bti"></i></div>${BS.cats.map((c, k) => `<p><label>${BASTA.CATS[c]}<br><input class="bi" data-k="${k}" maxlength="30" placeholder="Empieza con ${BS.letter}" autocomplete="off" style="width:100%"></label></p>`).join('')}<button class="btn big" onclick="bsDone()">¡BASTA!</button></div>`;
  const f = document.querySelector('.bi'); if (f) f.focus();
  clearInterval(TM);
  TM = setInterval(() => { BS.left--; $('#bl').textContent = BS.left; $('#bti').style.width = BS.left / BS.time * 100 + '%'; if (BS.left <= 0) bsDone(); }, 1000);
}
function bsDone() {
  clearInterval(TM); const a = [];
  document.querySelectorAll('.bi').forEach(i => { a[+i.dataset.k] = BASTA.clean(i.value); });
  BS.sheets[BS.turn] = BS.cats.map((_, k) => a[k] || ''); snd.ok(); BS.turn++;
  BS.turn < S.P.length ? bsPass() : bsReview();
}
function bsRej(key) { BS.rej.has(key) ? BS.rej.delete(key) : BS.rej.add(key); bsReview(); }
function bsReview() {
  const rows = BS.cats.map((c, k) => `<tr><th>${BASTA.CATS[c]}</th>${S.P.map((p, i) => {
    const a = BS.sheets[i][k], st = BASTA.status(a, BS.letter), key = i + '|' + k, rj = BS.rej.has(key);
    return `<td class="${st !== 'ok' || rj ? 'mu' : ''}">${a ? esc(a) : '—'}${st === 'invalida' ? ' <small>(no cumple)</small>' : ''}${a && st === 'ok' ? `<br><label><small><input type="checkbox" ${rj ? 'checked' : ''} onchange="bsRej('${key}')"> anular</small></label>` : ''}</td>`;
  }).join('')}</tr>`).join('');
  $('#g').innerHTML = `<div class="card2"><h3>Revisión · letra ${BS.letter}</h3><p class="mu">Revisen juntos las respuestas. Marca <b>anular</b> en las que no valen (por ejemplo, palabras inventadas).</p><div style="overflow-x:auto"><table><tr><th></th>${S.P.map(p => `<th>${esc(p)}</th>`).join('')}</tr>${rows}</table></div><button class="btn" onclick="bsScore()">Calcular puntos</button></div>`;
}
function bsScore() {
  const R = BASTA.scoreRound({ answers: S.P.map((_, i) => BS.sheets[i]), letter: BS.letter, rejected: BS.rej });
  S.P.forEach((p, i) => { SC[p] = (SC[p] || 0) + R.players[i].total; });
  const lab = { unica: 'única', repetida: 'repetida', vacia: 'vacía', invalida: 'inválida', anulada: 'anulada' };
  const rows = BS.cats.map((c, k) => `<tr><th>${BASTA.CATS[c]}</th>${R.players.map(pl => `<td>${pl.cells[k].pts} <small>${lab[pl.cells[k].status]}</small></td>`).join('')}</tr>`).join('');
  const last = BS.r + 1 >= BS.rounds;
  $('#g').innerHTML = bar(0) + `<div class="card2"><h3>Resultados de la ronda</h3><div style="overflow-x:auto"><table><tr><th></th>${S.P.map(p => `<th>${esc(p)}</th>`).join('')}</tr>${rows}<tr><th>Total</th>${R.players.map(pl => `<td><b>${pl.total}</b></td>`).join('')}</tr></table></div><p class="mu">100 puntos si es única, 50 si se repite, 0 si está vacía o no vale.</p><button class="btn" onclick="${last ? 'bsEnd()' : 'BS.r++;bsRound()'}">${last ? 'Ver resultados finales' : 'Siguiente ronda'}</button></div>`;
}
function bsEnd() {
  const r = S.P.map(p => [p, SC[p] || 0]).sort((a, b) => b[1] - a[1]), uni = r[0][1] > r[1][1];
  r.forEach(([p, t]) => award(Math.round(t / 10), p));
  if (uni) award(20, r[0][0]);
  done(uni ? r[0][0] : ''); log('Basta: ' + (uni ? 'ganó ' + r[0][0] : 'empate')); if (uni) { confetti(); snd.win(); }
  $('#g').innerHTML = `<div class="card2"><h3>${uni ? '🏆 Ganó ' + esc(r[0][0]) : '🤝 Empate'}</h3><table>${r.map(([p, t], i) => `<tr><td>${i + 1}.</td><td>${esc(p)}</td><td><b>${t} pts</b></td></tr>`).join('')}</table><p class="mu">A tu perfil se suma 1 punto por cada 10 de Basta, más 20 para el ganador.</p><button class="btn" onclick="GI.basta()">Jugar otra vez</button> <button class="btn alt" onclick="go('home')">Inicio</button></div>`;
}
