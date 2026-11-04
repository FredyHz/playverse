// Salas multijugador en tiempo real (Socket.IO). El servidor decide todo: preguntas, tiempos y puntos.
const QB = require('./questions.json');
const BASTA = require('../public/js/basta-core.js'); // mismas reglas de puntuación que el modo local
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const SECS = [20, 14, 9];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function mathQ(d) {
  const m = [12, 40, 120][d];
  let a = 1 + rnd(m), b = 1 + rnd(m), r, t;
  const o = rnd(3);
  if (o === 0) { r = a + b; t = `${a} + ${b}`; }
  else if (o === 1) { if (b > a) [a, b] = [b, a]; r = a - b; t = `${a} − ${b}`; }
  else { a = 2 + rnd(d ? 12 : 9); b = 2 + rnd(d ? 12 : 9); r = a * b; t = `${a} × ${b}`; }
  const w = new Set();
  while (w.size < 3) { const v = r + rnd(11) - 5; if (v !== r && v >= 0) w.add(v); }
  return ['Matemáticas', `¿Cuánto es ${t}?`, String(r), ...[...w].map(String), `${t} = ${r}.`];
}
function buildQuestions(subject, d, rounds) {
  const L = shuffle(QB);
  if (subject === 'Matemáticas') return Array.from({ length: rounds }, () => mathQ(d));
  if (subject === 'Mixto') return shuffle([...L.slice(0, rounds - 3), mathQ(d), mathQ(d), mathQ(d)]);
  return [...L.filter(x => x[0] === subject), ...L.filter(x => x[0] !== subject)].slice(0, rounds);
}

module.exports = (io, db) => {
  const rooms = new Map();
  const byUser = new Map(); // userId -> código de sala

  io.use((socket, next) => {
    db.userByToken(socket.handshake.auth?.token)
      .then(u => { if (!u) return next(new Error('auth')); socket.data.user = u; next(); })
      .catch(() => next(new Error('db')));
  });

  const view = r => ({
    code: r.code, host: r.host, phase: r.phase, settings: r.settings,
    players: [...r.players.values()].map(p => ({ id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, connected: p.connected, score: p.score })),
  });
  const push = r => io.to(r.code).emit('room:state', view(r));
  const newCode = () => { let c; do { c = Array.from({ length: 5 }, () => ALPHABET[rnd(ALPHABET.length)]).join(''); } while (rooms.has(c)); return c; };

  function dropRoom(r) { clearTimeout(r.timer); clearTimeout(r.idle); rooms.delete(r.code); for (const id of r.players.keys()) if (byUser.get(id) === r.code) byUser.delete(id); }
  function pickHost(r) {
    if (r.players.get(r.host)?.connected) return;
    const n = [...r.players.values()].find(p => p.connected);
    if (n) r.host = n.id;
  }
  function removePlayer(r, id) {
    r.players.delete(id); byUser.delete(id);
    if (!r.players.size) return dropRoom(r);
    pickHost(r); push(r);
  }

  function nextQuestion(r) {
    if (r.qi >= r.Q.length) return finish(r);
    const q = r.Q[r.qi], opts = shuffle(q.slice(2, 6)), secs = SECS[r.settings.diff];
    r.cur = { opts, correct: opts.indexOf(q[2]), expl: q[6], secs, endsAt: Date.now() + secs * 1000, answers: new Map() };
    r.pub = { i: r.qi, total: r.Q.length, cat: q[0], q: q[1], opts, secs, endsAt: r.cur.endsAt };
    io.to(r.code).emit('trivia:question', { ...r.pub, left: secs * 1000 });
    r.timer = setTimeout(() => reveal(r), secs * 1000 + 400);
  }
  function reveal(r) {
    if (!r.cur || r.cur.done) return;
    clearTimeout(r.timer); r.cur.done = true;
    const res = [];
    for (const p of r.players.values()) {
      const a = r.cur.answers.get(p.id), ok = !!a && a.idx === r.cur.correct;
      const pts = ok ? 10 + Math.round(10 * Math.max(0, r.cur.endsAt - a.t) / (r.cur.secs * 1000)) : 0;
      p.score += pts; res.push({ id: p.id, idx: a ? a.idx : null, pts });
    }
    io.to(r.code).emit('trivia:reveal', { correct: r.cur.correct, expl: r.cur.expl, results: res });
    push(r);
    r.qi++;
    r.timer = setTimeout(() => nextQuestion(r), 4500);
  }
  function finish(r) {
    r.phase = 'end'; r.cur = null; r.pub = null;
    const ranking = [...r.players.values()].sort((a, b) => b.score - a.score);
    const unique = ranking.length > 1 && ranking[0].score > ranking[1].score;
    const winner = unique ? ranking[0] : null;
    const results = ranking.map(p => ({ id: p.id, name: p.name, pts: p.score + (winner && p.id === winner.id ? 20 : 0) }));
    // Primero se guarda en la base de datos; después se avisa a los jugadores (así su perfil ya sale actualizado)
    db.finishMatch(r.code, 'trivia', winner ? winner.id : null, results)
      .catch(e => console.error('No se guardó la partida:', e.message))
      .finally(() => { io.to(r.code).emit('trivia:end', { winner: winner && winner.name, ranking: results }); push(r); });
  }

  // ---------- BASTA (el servidor decide la letra, el tiempo y los puntos) ----------
  const members = r => [...r.players.values()];
  function startBasta(r) { r.bs = { round: 0, rej: new Set() }; io.to(r.code).emit('room:started'); startRound(r); }
  function startRound(r) {
    const b = r.bs, st = r.settings, ps = members(r);
    b.letter = BASTA.LETTERS[rnd(BASTA.LETTERS.length)]; b.cats = st.bcats.slice(); b.rej = new Set();
    b.answers = new Map(); b.phase = 'write'; b.stoppedBy = null; b.secs = st.btime; b.endsAt = Date.now() + b.secs * 1000;
    b.order = ps.map(p => p.id); b.base = new Map(ps.map(p => [p.id, p.score])); b.info = new Map(ps.map(p => [p.id, { name: p.name, avatar: p.avatar }]));
    const data = { round: b.round + 1, rounds: st.brounds, letter: b.letter, cats: b.cats, secs: b.secs, left: b.secs * 1000 };
    b.last = { ev: 'basta:round', data };
    push(r); io.to(r.code).emit('basta:round', data);
    clearTimeout(r.timer); r.timer = setTimeout(() => closing(r, null), b.secs * 1000 + 600);
  }
  function closing(r, by) {
    const b = r.bs; if (!b || b.phase !== 'write') return;
    b.phase = 'closing'; clearTimeout(r.timer);
    io.to(r.code).emit('basta:stopping', { by });
    r.timer = setTimeout(() => sendResults(r, true), 1500); // margen para recibir las últimas respuestas
  }
  function sendResults(r, first) {
    const b = r.bs; if (!b) return;
    b.phase = 'results';
    const answers = b.order.map(id => b.answers.get(id) || b.cats.map(() => ''));
    const R = BASTA.scoreRound({ answers, letter: b.letter, rejected: b.rej });
    const players = b.order.map((id, i) => {
      const inf = b.info.get(id), p = r.players.get(id), sum = b.base.get(id) + R.players[i].total;
      if (p) p.score = sum;
      return { id, name: inf.name, avatar: inf.avatar, answers: answers[i], cells: R.players[i].cells, total: R.players[i].total, sum };
    });
    const mx = Math.max(...players.map(p => p.total)), top = players.filter(p => p.total === mx);
    const data = { round: b.round + 1, rounds: r.settings.brounds, letter: b.letter, cats: b.cats, stoppedBy: b.stoppedBy, winner: top.length === 1 && mx > 0 ? top[0].name : null, players };
    b.last = { ev: 'basta:results', data };
    io.to(r.code).emit('basta:results', data); push(r);
  }
  function finishBasta(r) {
    const b = r.bs; r.phase = 'end';
    const ranking = members(r).sort((a, c) => c.score - a.score), winner = ranking.length > 1 && ranking[0].score > ranking[1].score ? ranking[0] : null;
    const results = ranking.map(p => ({ id: p.id, name: p.name, pts: Math.round(p.score / 10) + (winner && p.id === winner.id ? 20 : 0) }));
    db.finishMatch(r.code, 'basta', winner ? winner.id : null, results)
      .catch(e => console.error('No se guardó la partida:', e.message))
      .finally(() => {
        const data = { winner: winner && winner.name, ranking: ranking.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })) };
        b.last = { ev: 'basta:end', data };
        io.to(r.code).emit('basta:end', data); push(r);
      });
  }

  io.on('connection', socket => {
    const u = socket.data.user;
    const mine = () => rooms.get(byUser.get(u.id));
    const attach = (r, p) => {
      p.sid = socket.id; p.connected = true; p.name = u.name; p.avatar = u.avatar;
      clearTimeout(r.idle); socket.join(r.code); byUser.set(u.id, r.code);
      pickHost(r); push(r);
      if (r.phase === 'playing' && r.pub && r.cur && !r.cur.done) socket.emit('trivia:question', { ...r.pub, left: Math.max(0, r.cur.endsAt - Date.now()) });
      if (r.bs && r.bs.last && (r.phase === 'playing' || r.phase === 'end')) {
        const l = r.bs.last;
        socket.emit(l.ev, l.ev === 'basta:round' ? { ...l.data, left: Math.max(0, r.bs.endsAt - Date.now()) } : l.data);
      }
    };
    const leaveCurrent = () => { const r = mine(); if (r) { socket.leave(r.code); removePlayer(r, u.id); } };

    // Si ya estaba en una sala (por ejemplo, recargó la página), vuelve a conectarse a ella.
    const prev = mine();
    if (prev) attach(prev, prev.players.get(u.id));

    socket.on('room:create', (_, ack) => {
      leaveCurrent();
      const code = newCode();
      const r = { code, host: u.id, phase: 'lobby', settings: { game: 'trivia', subject: 'Mixto', diff: 1, rounds: 8, brounds: 3, btime: 60, bcats: BASTA.CATS.slice(0, 6) }, players: new Map(), Q: [], qi: 0 };
      r.players.set(u.id, { id: u.id, ready: true, score: 0 });
      rooms.set(code, r); attach(r, r.players.get(u.id));
      ack?.({ ok: true, code });
    });
    socket.on('room:join', (d, ack) => {
      const code = String(d?.code || '').trim().toUpperCase(), r = rooms.get(code);
      if (!r) return ack?.({ error: 'No existe una sala con ese código.' });
      let p = r.players.get(u.id);
      if (!p) {
        if (r.phase !== 'lobby') return ack?.({ error: 'La partida ya empezó. Espera a que termine.' });
        if (r.players.size >= 10) return ack?.({ error: 'La sala está llena (máximo 10).' });
        leaveCurrent();
        p = { id: u.id, ready: false, score: 0 }; r.players.set(u.id, p);
      }
      attach(r, p); ack?.({ ok: true, code });
    });
    socket.on('room:leave', () => leaveCurrent());
    socket.on('room:ready', v => { const r = mine(); if (r && r.phase === 'lobby' && r.host !== u.id) { r.players.get(u.id).ready = !!v; push(r); } });
    socket.on('room:settings', s => {
      const r = mine(); if (!r || r.host !== u.id || r.phase !== 'lobby') return;
      const subs = ['Mixto', 'Matemáticas', 'Inglés', 'Español', 'Cultura general', 'Historia', 'Geografía', 'Ciencias', 'Lógica', 'Entretenimiento'];
      if (subs.includes(s?.subject)) r.settings.subject = s.subject;
      if ([0, 1, 2].includes(s?.diff)) r.settings.diff = s.diff;
      if (['trivia', 'basta'].includes(s?.game)) r.settings.game = s.game;
      if ([1, 3, 5].includes(s?.brounds)) r.settings.brounds = s.brounds;
      if ([45, 60, 90].includes(s?.btime)) r.settings.btime = s.btime;
      if (Array.isArray(s?.bcats)) r.settings.bcats = BASTA.sanitizeCats(s.bcats);
      push(r);
    });
    socket.on('room:start', (_, ack) => {
      const r = mine(); if (!r || r.host !== u.id || r.phase !== 'lobby') return;
      const ps = [...r.players.values()].filter(p => p.connected);
      if (ps.length < 2) return ack?.({ error: 'Se necesitan al menos 2 jugadores conectados.' });
      if (ps.some(p => p.id !== r.host && !p.ready)) return ack?.({ error: 'Todos los jugadores deben estar listos.' });
      for (const [id, p] of r.players) if (!p.connected) r.players.delete(id);
      r.players.forEach(p => { p.score = 0; });
      r.phase = 'playing';
      if (r.settings.game === 'basta') startBasta(r);
      else {
        r.Q = buildQuestions(r.settings.subject, r.settings.diff, r.settings.rounds); r.qi = 0;
        push(r); io.to(r.code).emit('room:started');
        r.timer = setTimeout(() => nextQuestion(r), 2500);
      }
      ack?.({ ok: true });
    });
    socket.on('trivia:answer', idx => {
      const r = mine(); if (!r || r.phase !== 'playing' || !r.cur || r.cur.done || !Number.isInteger(idx) || idx < 0 || idx > 3) return;
      if (r.cur.answers.has(u.id) || Date.now() > r.cur.endsAt + 300) return;
      r.cur.answers.set(u.id, { idx, t: Date.now() });
      socket.emit('trivia:answered');
      if ([...r.players.values()].filter(p => p.connected).every(p => r.cur.answers.has(p.id))) reveal(r);
    });

    // ---- Basta ----
    const bsStore = (r, arr) => { // guarda las respuestas del jugador (siempre limpias y con el largo correcto)
      const b = r.bs; if (!b || !['write', 'closing'].includes(b.phase) || !b.order.includes(u.id)) return null;
      const a = b.cats.map((_, k) => BASTA.clean(Array.isArray(arr) ? arr[k] : ''));
      b.answers.set(u.id, a); return a;
    };
    socket.on('basta:answers', arr => { const r = mine(); if (r && r.phase === 'playing') bsStore(r, arr); });
    socket.on('basta:stop', (arr, ack) => {
      const r = mine(), reply = typeof ack === 'function' ? ack : () => {};
      if (!r || r.phase !== 'playing' || !r.bs || r.bs.phase !== 'write') return reply({ error: 'La ronda ya terminó.' });
      const a = bsStore(r, arr);
      if (!a) return reply({ error: 'No estás en esta ronda.' });
      if (a.some(x => BASTA.status(x, r.bs.letter) === 'vacia')) return reply({ error: 'Completa todas las categorías para decir ¡BASTA!' });
      r.bs.stoppedBy = u.name; closing(r, u.name); reply({ ok: true });
    });
    socket.on('basta:reject', d => {
      const r = mine(), b = r && r.bs;
      if (!b || r.host !== u.id || b.phase !== 'results') return;
      const i = b.order.indexOf(d?.id);
      if (i < 0 || !Number.isInteger(d?.k) || d.k < 0 || d.k >= b.cats.length) return;
      const key = i + '|' + d.k; b.rej.has(key) ? b.rej.delete(key) : b.rej.add(key);
      sendResults(r);
    });
    socket.on('basta:next', () => {
      const r = mine(), b = r && r.bs;
      if (!b || r.host !== u.id || b.phase !== 'results' || r.phase !== 'playing') return;
      if (b.round + 1 < r.settings.brounds) { b.round++; startRound(r); } else finishBasta(r);
    });
    socket.on('room:again', () => {
      const r = mine(); if (!r || r.host !== u.id || r.phase !== 'end') return;
      clearTimeout(r.timer); r.bs = null;
      r.phase = 'lobby'; r.players.forEach((p, id) => { p.score = 0; p.ready = id === r.host; if (!p.connected) r.players.delete(id); });
      push(r);
    });
    socket.on('disconnect', () => {
      const r = mine(); if (!r) return;
      const p = r.players.get(u.id);
      if (!p || p.sid !== socket.id) return; // ya se reconectó desde otra pestaña
      p.connected = false; pickHost(r); push(r);
      if (![...r.players.values()].some(x => x.connected)) r.idle = setTimeout(() => dropRoom(r), 5 * 60 * 1000);
      else if (r.phase === 'playing' && r.cur && !r.cur.done && [...r.players.values()].filter(x => x.connected).every(x => r.cur.answers.has(x.id))) reveal(r);
    });
  });
};
