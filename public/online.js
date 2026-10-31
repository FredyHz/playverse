// Módulo ONLINE de PLAYVERSE: cuenta, salas por código, lobby y trivia sincronizada.
(() => {
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch (e) {} } };
  const O = { tok: ls.get('pvt'), user: null, sock: null, room: null, q: null, rev: null, picked: null, end: null, msg: '', lb: 'global', lbd: null, form: 'login', pend: new URLSearchParams(location.search).get('sala') };
  const AV = ['🦊', '🐼', '🐯', '🦄', '🐸', '🐙', '🦖', '🤖'];

  async function api(p, m = 'GET', b) {
    const r = await fetch('/api/' + p, { method: m, headers: { 'Content-Type': 'application/json', ...(O.tok ? { Authorization: 'Bearer ' + O.tok } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Error de conexión');
    return d;
  }
  const emit = (ev, d) => new Promise(res => O.sock.emit(ev, d, res));

  function connect() {
    if (O.sock) return;
    O.sock = io({ auth: { token: O.tok } });
    O.sock.on('room:state', s => { O.room = s; if (s.phase === 'lobby') O.q = O.rev = O.end = null; oR(); });
    O.sock.on('trivia:question', q => { O.q = { ...q, ends: Date.now() + q.left }; O.rev = null; O.picked = null; snd.tick(); oR(); });
    O.sock.on('trivia:reveal', r => { O.rev = r; const me = r.results.find(x => x.id === O.user.id); me && me.pts ? snd.ok() : snd.bad(); oR(); });
    O.sock.on('trivia:end', e => { O.end = e; O.q = null; O.rev = null; if (e.winner === O.user.name) { confetti(); snd.win(); } refresh(); });
    O.sock.on('room:started', () => snd.click());
    O.sock.on('connect_error', () => { O.msg = 'No se pudo conectar con el servidor.'; oR(); });
  }
  async function refresh() { try { O.user = (await api('me')).user; } catch (e) {} oR(); }
  async function loadLb() { try { O.lbd = await api('leaderboard?period=' + O.lb); } catch (e) { O.lbd = []; } oR(); }

  window.vOnline = () => '<h2>🌐 Jugar online</h2><div id="ov"></div>';
  window.onlineInit = async () => {
    if (O.tok && !O.user) { try { O.user = (await api('me')).user; connect(); } catch (e) { O.tok = null; ls.set('pvt'); } }
    if (O.user) { connect(); if (O.pend && !O.room) { const c = O.pend; O.pend = null; const r = await emit('room:join', { code: c }); if (r.error) O.msg = r.error; history.replaceState(null, '', '/'); } if (!O.lbd) loadLb(); }
    oR();
  };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const msg = () => O.msg ? `<p style="color:var(--pk)"><b>${esc(O.msg)}</b></p>` : '';
  function oR() {
    const el = $('#ov'); if (!el) return;
    el.innerHTML = !O.user ? fAuth() : !O.room ? fHome() : O.room.phase === 'lobby' ? fLobby() : O.room.phase === 'playing' ? fPlay() : fEnd();
  }

  const fAuth = () => `<div class="card" style="max-width:420px"><h3>${O.form === 'login' ? 'Entrar' : 'Crear cuenta'}</h3>
    <p class="mu">Necesitas una cuenta para guardar tus puntos y jugar en salas con otras personas.${O.pend ? ' Te uniremos a la sala ' + esc(O.pend) + ' al entrar.' : ''}</p>
    <p><input id="an" placeholder="Nombre de jugador" maxlength="14" autocomplete="username"></p>
    <p><input id="ap" type="password" placeholder="Contraseña (mínimo 6)" autocomplete="${O.form === 'login' ? 'current-password' : 'new-password'}" onkeydown="if(event.key==='Enter')OL.auth()"></p>${msg()}
    <button class="btn" onclick="OL.auth()">${O.form === 'login' ? 'Entrar' : 'Registrarme'}</button>
    <button class="btn alt" onclick="OL.form()">${O.form === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}</button></div>
    <div class="card" style="max-width:420px"><h3>¿Sin cuenta? Juega como invitado</h3><p class="mu">Solo escribe un nombre. Si luego quieres conservar tus puntos, creas tu contraseña cuando quieras.</p>
    <div class="row2"><input id="gn" placeholder="Tu nombre" maxlength="14" onkeydown="if(event.key==='Enter')OL.guest()"><button class="btn" onclick="OL.guest()">Entrar como invitado</button></div></div>`;

  const fHome = () => `<div class="row"><div class="card" style="flex:1;min-width:260px"><div class="av">${O.user.avatar}</div><h3>${esc(O.user.name)}</h3>
    <p>Nivel ${O.user.level} · ${O.user.points} puntos · ${O.user.wins} victorias · ${O.user.played} partidas</p>
    <div class="chips">${AV.map(a => `<button class="chip ${a === O.user.avatar ? 'on' : ''}" style="cursor:pointer;font-size:1.4rem" onclick="OL.av('${a}')">${a}</button>`).join('')}</div>
    ${O.user.guest ? `<p class="mu">Eres invitado: si cierras sesión o cambias de dispositivo perderás tus puntos. Crea una contraseña para guardarlos.</p><div class="row2"><input id="up" type="password" placeholder="Contraseña (mínimo 6)" onkeydown="if(event.key==='Enter')OL.upgrade()"><button class="btn" onclick="OL.upgrade()">Guardar mi cuenta</button></div>` : ''}
    <button class="btn alt" onclick="OL.logout()">Cerrar sesión</button></div>
    <div class="card" style="flex:1;min-width:260px"><h3>Sala privada</h3>${msg()}<p><button class="btn" onclick="OL.create()">Crear sala</button></p>
    <p class="mu">o únete con el código que te compartieron:</p><div class="row2"><input id="jc" maxlength="5" placeholder="ABCDE" style="text-transform:uppercase;width:8em" onkeydown="if(event.key==='Enter')OL.join()"><button class="btn alt" onclick="OL.join()">Unirme</button></div></div></div>
    <div class="card"><h3>Ranking</h3><div class="chips"><button class="chip ${O.lb === 'global' ? 'on' : ''}" style="cursor:pointer;font:inherit;color:inherit" onclick="OL.lb('global')">Global</button><button class="chip ${O.lb === 'week' ? 'on' : ''}" style="cursor:pointer;font:inherit;color:inherit" onclick="OL.lb('week')">Esta semana</button></div>
    ${O.lbd && O.lbd.length ? `<table>${O.lbd.map((r, i) => `<tr><td>${i + 1}.</td><td>${r.avatar} ${esc(r.name)}</td><td><b>${r.points}</b></td></tr>`).join('')}</table>` : '<p class="mu">Aún no hay partidas online en este ranking.</p>'}</div>`;

  function players() {
    return `<div class="chips">${O.room.players.map(p => `<span class="chip ${p.id === O.user.id ? 'on' : ''}" style="${p.connected ? '' : 'opacity:.5'}">${p.avatar} ${esc(p.name)}${p.id === O.room.host ? ' 👑' : ''}${O.room.phase === 'lobby' ? (p.ready ? ' ✔' : ' …') : ' <b>' + p.score + '</b>'}${p.connected ? '' : ' (sin conexión)'}</span>`).join('')}</div>`;
  }
  function fLobby() {
    const r = O.room, host = r.host === O.user.id, me = r.players.find(p => p.id === O.user.id), s = r.settings;
    const subs = ['Mixto', 'Matemáticas', 'Inglés', 'Español', 'Cultura general', 'Historia', 'Geografía', 'Ciencias', 'Lógica', 'Entretenimiento'];
    return `<div class="card"><p class="mu">Código de la sala</p><h1 style="letter-spacing:.2em;font-size:3rem">${r.code}</h1>
      <button class="btn alt" onclick="OL.copy()">Copiar enlace de invitación</button>
      <h3 style="margin-top:14px">Jugadores (${r.players.length}/10)</h3>${players()}
      <h3>Juego: Trivia familiar 🧠</h3>
      ${host ? `<div class="row2"><label>Tema<br><select id="ss" onchange="OL.set()">${subs.map(x => `<option ${x === s.subject ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Nivel<br><select id="sd" onchange="OL.set()">${['Fácil (20 s)', 'Medio (14 s)', 'Difícil (9 s)'].map((x, i) => `<option value="${i}" ${i === s.diff ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>`
      : `<p class="mu">Tema: ${s.subject} · Nivel: ${['Fácil', 'Medio', 'Difícil'][s.diff]}. Lo elige el anfitrión.</p>`}
      ${msg()}${host ? '<button class="btn" onclick="OL.start()">Iniciar partida</button>' : `<button class="btn" onclick="OL.ready(${!me.ready})">${me.ready ? 'Ya no estoy listo' : '¡Estoy listo!'}</button>`}
      <button class="btn alt" onclick="OL.leave()">Salir de la sala</button></div>`;
  }
  function fPlay() {
    const q = O.q, rv = O.rev;
    if (!q) return `<div class="card">${players()}<p class="big">¡Prepárense! La primera pregunta ya viene…</p></div>`;
    return `<div class="card">${players()}<small>${q.cat} · Pregunta ${q.i + 1} de ${q.total}</small><h3>${esc(q.q)}</h3>
      <div class="tb"><i id="tbi" style="width:100%;transition:none"></i></div><p><span id="ot"></span></p>
      <div class="opts">${q.opts.map((o, i) => `<button class="opt ${rv ? (i === rv.correct ? 'good' : i === O.picked ? 'bad' : '') : (i === O.picked ? 'good' : '')}" ${rv || O.picked !== null ? 'disabled' : ''} onclick="OL.pick(${i})">${esc(o)}</button>`).join('')}</div>
      ${rv ? `<p><b>${O.room.players.map(p => { const x = rv.results.find(r => r.id === p.id); return esc(p.name) + (x && x.pts ? ' +' + x.pts : ' 0'); }).join(' · ')}</b></p><p>${esc(rv.expl)}</p><p class="mu">La siguiente pregunta llega en unos segundos.</p>` : O.picked !== null ? '<p class="mu">Respuesta enviada. Esperando a los demás…</p>' : ''}</div>`;
  }
  function fEnd() {
    const e = O.end, host = O.room.host === O.user.id;
    return `<div class="card"><h3>${e && e.winner ? '🏆 Ganó ' + esc(e.winner) : '🤝 Empate'}</h3>
      <table>${(e ? e.ranking : []).map((r, i) => `<tr><td>${i + 1}.</td><td>${esc(r.name)}</td><td><b>${r.pts} pts</b></td></tr>`).join('')}</table>
      <p class="mu">Los puntos ya quedaron guardados en tu cuenta (+20 para el ganador).</p>
      ${host ? '<button class="btn" onclick="OL.again()">Jugar otra vez</button>' : '<p class="mu">El anfitrión puede iniciar otra ronda.</p>'}
      <button class="btn alt" onclick="OL.leave()">Salir de la sala</button></div>`;
  }

  setInterval(() => {
    const t = $('#ot'); if (!t || !O.q || O.rev) return;
    const l = Math.max(0, Math.ceil((O.q.ends - Date.now()) / 1000));
    t.textContent = l + ' s'; const b = $('#tbi'); if (b) b.style.width = Math.max(0, (O.q.ends - Date.now()) / (O.q.secs * 10)) + '%';
  }, 200);

  window.OL = {
    form() { O.form = O.form === 'login' ? 'reg' : 'login'; O.msg = ''; oR(); },
    async auth() {
      try {
        const d = await api(O.form === 'login' ? 'login' : 'register', 'POST', { name: $('#an').value, pass: $('#ap').value });
        O.tok = d.token; O.user = d.user; ls.set('pvt', d.token); O.msg = ''; snd.ok(); onlineInit();
      } catch (e) { O.msg = e.message; snd.bad(); oR(); }
    },
    async guest() {
      try {
        const d = await api('guest', 'POST', { name: $('#gn').value });
        O.tok = d.token; O.user = d.user; ls.set('pvt', d.token); O.msg = ''; snd.ok(); onlineInit();
      } catch (e) { O.msg = e.message; snd.bad(); oR(); }
    },
    async upgrade() {
      try { O.user = (await api('upgrade', 'POST', { pass: $('#up').value })).user; O.msg = ''; snd.win(); } catch (e) { O.msg = e.message; snd.bad(); }
      oR();
    },
    async logout() { try { await api('logout', 'POST'); } catch (e) {} ls.set('pvt'); O.sock && O.sock.disconnect(); O.sock = O.user = O.room = O.tok = null; oR(); },
    async av(a) { try { O.user = (await api('me', 'PATCH', { avatar: a })).user; snd.click(); oR(); } catch (e) {} },
    async create() { const r = await emit('room:create'); O.msg = r.error || ''; snd.click(); },
    async join() { const r = await emit('room:join', { code: $('#jc').value }); O.msg = r.error || ''; r.error ? snd.bad() : snd.ok(); oR(); },
    leave() { O.sock.emit('room:leave'); O.room = O.q = O.rev = O.end = null; O.msg = ''; snd.click(); loadLb(); },
    ready(v) { O.sock.emit('room:ready', v); snd.click(); },
    set() { O.sock.emit('room:settings', { subject: $('#ss').value, diff: +$('#sd').value }); },
    async start() { const r = await emit('room:start'); O.msg = r && r.error || ''; oR(); },
    pick(i) { O.picked = i; O.sock.emit('trivia:answer', i); snd.click(); oR(); },
    again() { O.sock.emit('room:again'); },
    async copy() {
      const url = location.origin + '/?sala=' + O.room.code;
      try { await navigator.clipboard.writeText(url); O.msg = 'Enlace copiado: ' + url; } catch (e) { O.msg = 'Comparte este enlace: ' + url; }
      snd.ok(); oR();
    },
    lb(p) { O.lb = p; loadLb(); },
  };
  if (O.pend) go('online');
})();
