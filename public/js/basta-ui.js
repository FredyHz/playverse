// Interfaz "libreta escolar" de BASTA. La comparten el modo local y el online.
const BUI = {
  AV: ['🦊', '🐼', '🐯', '🦄', '🐸', '🐙', '🦖', '🤖'],
  deco: '<span class="dc d1" aria-hidden="true">✏️</span><span class="dc d2" aria-hidden="true">⭐</span><span class="dc d3" aria-hidden="true">📎</span><span class="dc d4" aria-hidden="true">📏</span>',
  onInput: null,
  wrap(inner, cls = '') { return `<div class="bsw ${cls}">${inner}</div>`; },
  nb(inner, cls = '') { return `<div class="nb"><div class="spiral"></div><div class="pg ${cls}">${inner}</div></div>`; },
  cfg() {
    const c = Object.assign({ rounds: 3, time: 60, cats: BASTA.CATS.slice(0, 6), custom: [] }, S.bs || {});
    c.cats = BASTA.sanitizeCats(c.cats); c.custom = BASTA.sanitizeCats([...c.custom, 'a', 'b', 'c']).filter(x => !['a', 'b', 'c'].includes(x));
    return c;
  },
  /* ---- Portada ---- */
  cover() {
    return BUI.wrap(BUI.nb(`<h2 class="logo-b">BASTA</h2><p class="slogan">Piensa · Escribe · Gana</p>
      <div class="cbtns"><button class="bb main" onclick="BUI.play()">JUGAR</button><small class="mu">En este dispositivo, por turnos</small>
      <button class="bb" onclick="BUI.create()">Crear partida online</button>
      <div class="join"><input id="bj" maxlength="5" placeholder="CÓDIGO" aria-label="Código de sala" onkeydown="if(event.key==='Enter')BUI.join()"><button class="bb" onclick="BUI.join()">Unirse a partida</button></div>
      <div class="two"><button class="bb ghost" onclick="BUI.panel('how')">Cómo jugar</button><button class="bb ghost" onclick="BUI.panel('cfg')">Configuración</button></div></div>
      <div id="bpanel" aria-live="polite"></div>`) + BUI.deco, 'one');
  },
  msg(t) { const el = $('#bpanel'); if (el) el.innerHTML = `<p class="warn">${esc(t)}</p>`; snd.bad(); },
  panel(k) {
    const el = $('#bpanel'); if (!el) return; snd.click();
    el.innerHTML = k === 'how'
      ? `<div class="sheetp"><h3>Cómo jugar</h3><ol><li>Sale una <b>letra</b> al azar.</li><li>Escribe una palabra por categoría que <b>empiece con esa letra</b>.</li><li>Cuando completes todas, pulsa <b>¡BASTA!</b> y la ronda se cierra.</li><li>Puntos: <b>100</b> si tu respuesta es única, <b>50</b> si otro la repitió y <b>0</b> si está vacía o no vale.</li><li>Gana quien sume más puntos al final de las rondas.</li></ol></div>`
      : BUI.cfgHtml();
  },
  cfgHtml() {
    const c = BUI.cfg(), all = [...BASTA.CATS, ...c.custom];
    return `<div class="sheetp"><h3>Configuración</h3><div class="row2"><label>Rondas<br><select id="cr">${[1, 3, 5].map(n => `<option ${n === c.rounds ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Tiempo (seg)<br><select id="ct">${[45, 60, 90].map(n => `<option ${n === c.time ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <p>Categorías (de 3 a 10)</p><div>${all.map(x => `<label class="bchip"><input type="checkbox" class="cc" value="${esc(x)}" ${c.cats.includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div>
      <div class="row2"><input id="cn" maxlength="20" placeholder="Nueva categoría…" aria-label="Nueva categoría"><button class="bb" onclick="BUI.addCat()">Añadir</button></div>
      <button class="bb main" onclick="BUI.saveCfg()">Guardar</button> <span id="cm" class="mu"></span></div>`;
  },
  readCats() { return [...document.querySelectorAll('.cc')].filter(i => i.checked).map(i => i.value); },
  saveCfg(extra) {
    const c = BUI.cfg(), cats = BUI.readCats();
    if (cats.length < 3 || cats.length > 10) { $('#cm').textContent = 'Elige de 3 a 10 categorías.'; snd.bad(); return; }
    S.bs = { rounds: +$('#cr').value, time: +$('#ct').value, cats, custom: c.custom, ...(extra || {}) }; save();
    $('#cm').textContent = '¡Guardado!'; snd.ok();
  },
  addCat() {
    const t = BASTA.clean($('#cn').value).slice(0, 20), c = BUI.cfg();
    if (!t || !/^[\p{L}\p{N} \-]+$/u.test(t)) { $('#cm').textContent = 'Usa solo letras, números y espacios.'; snd.bad(); return; }
    if (![...BASTA.CATS, ...c.custom].some(x => BASTA.norm(x) === BASTA.norm(t))) c.custom.push(t);
    const cats = BUI.readCats(); if (!cats.some(x => BASTA.norm(x) === BASTA.norm(t))) cats.push(t);
    S.bs = { rounds: +$('#cr').value, time: +$('#ct').value, cats, custom: c.custom }; save(); BUI.panel('cfg');
  },
  play() { if (S.P.length < 2) return BUI.msg('Basta necesita de 2 a 10 jugadores. Abre «Jugadores locales» aquí arriba y elige al menos 2.'); bsLocalStart(); },
  create() { PVO.createGame('basta', BUI.cfg()); },
  join() { const v = $('#bj').value.trim(); if (!v) return BUI.msg('Escribe el código de 5 letras.'); PVO.join(v); },
  /* ---- Partida ---- */
  sheet(o) {
    const pct = Math.max(0, o.left / o.secs * 100);
    return BUI.wrap(`<div class="nb" id="bsheet"><div class="spiral"></div><div class="pg"><div class="top"><div class="lt" role="img" aria-label="Letra ${o.letter}">${o.letter}</div><div><span class="sticker">Ronda ${o.round} de ${o.rounds}</span><h3>${o.title}</h3></div><div class="clock ${o.left <= 10 ? 'low' : ''}" id="bclk"><b id="bl">${o.left}</b><small>seg</small></div></div>
      <div class="tbar"><i id="bti" style="width:${pct}%"></i></div>
      <div class="cats">${o.cats.map((c, k) => { const v = o.values[k] || '', s = v ? BASTA.status(v, o.letter) : ''; return `<label class="fld ${s === 'ok' ? 'ok' : s === 'invalida' ? 'bad' : ''}"><span>${k + 1}. ${esc(c)}</span><input class="bi" data-k="${k}" value="${esc(v)}" maxlength="30" autocomplete="off" autocapitalize="words" placeholder="Empieza con ${o.letter}" oninput="BUI.inp(this,'${o.letter}')" ${o.locked ? 'disabled' : ''}></label>`; }).join('')}</div>
      <button class="stamp-btn" onclick="${o.stopJs}" ${o.locked ? 'disabled' : ''}>¡BASTA!</button><p id="bmsg" class="warn">${o.lockMsg || ''}</p></div></div>
      <aside class="note" id="bsplayers">${o.side}</aside>${BUI.deco}`);
  },
  inp(el, letter) {
    el.classList.add('typing'); setTimeout(() => el.classList.remove('typing'), 250);
    const s = BASTA.status(el.value, letter); el.parentNode.className = 'fld ' + (s === 'ok' ? 'ok' : s === 'invalida' ? 'bad' : '');
    if (BUI.onInput) BUI.onInput();
  },
  tick(left, secs) {
    const l = $('#bl'), b = $('#bti'), c = $('#bclk'); if (!l) return;
    l.textContent = left; if (b) b.style.width = Math.max(0, left / secs * 100) + '%'; if (c) c.classList.toggle('low', left <= 10);
  },
  stamp() {
    const w = document.querySelector('.bsw'); if (!w) return;
    w.insertAdjacentHTML('beforeend', '<div class="stampfx"><span>¡BASTA!</span></div>');
    setTimeout(() => { const s = w.querySelector('.stampfx'); if (s) s.remove(); }, 950);
  },
  /* ---- Resultados ---- */
  results(o) {
    const lab = { unica: 'única', repetida: 'repetida', vacia: 'vacía', invalida: 'no vale', anulada: 'anulada' };
    const head = o.players.map(p => `<th><span class="pa">${p.avatar}</span> ${esc(p.name)}</th>`).join('');
    const rows = o.cats.map((c, k) => `<tr><th>${esc(c)}</th>${o.players.map(p => {
      const ce = p.cells[k], a = p.answers[k], can = o.rejectJs && ['unica', 'repetida', 'anulada'].includes(ce.status);
      return `<td class="c-${ce.status}"><span>${a ? esc(a) : '—'}</span><em>+${ce.pts}</em><small class="stk">${lab[ce.status]}</small>${can ? `<label class="rj"><input type="checkbox" ${ce.status === 'anulada' ? 'checked' : ''} onchange="${o.rejectJs}('${p.rid}',${k})"> anular</label>` : ''}</td>`;
    }).join('')}</tr>`).join('');
    const rank = [...o.players].sort((a, b) => b.sum - a.sum);
    return BUI.wrap(`<div class="nb"><div class="spiral"></div><div class="pg"><span class="sticker">Ronda ${o.round} de ${o.rounds} · letra ${o.letter}</span><h3>Hoja de resultados</h3>
      <div class="win">${o.winner ? '⭐ Ganó la ronda: ' + esc(o.winner) : '🤝 Ronda empatada'}</div>${o.stoppedBy ? `<p class="mu">¡BASTA! dicho por ${esc(o.stoppedBy)}</p>` : ''}
      <div class="sheetp"><table class="rt"><tr><th></th>${head}</tr>${rows}<tr class="tot"><th>Total</th>${o.players.map(p => `<td><b class="cnt" data-to="${p.total}">0</b></td>`).join('')}</tr></table></div>
      <p class="mu">100 única · 50 repetida · 0 vacía o no vale.</p>${o.note || ''}${o.actions || ''}</div></div>
      <aside class="note"><h4>Clasificación</h4>${rank.map((p, i) => `<div class="pr"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span><span class="pa">${p.avatar}</span><span class="pn">${esc(p.name)}</span><b class="cnt" data-to="${p.sum}">0</b></div>`).join('')}</aside>${BUI.deco}`);
  },
  after() {
    const els = [...document.querySelectorAll('.cnt')]; if (!els.length) return;
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches, t0 = performance.now();
    const f = now => { const p = reduce ? 1 : Math.min(1, (now - t0) / 700); els.forEach(e => { e.textContent = Math.round(+e.dataset.to * p); }); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  },
  end(o) {
    return BUI.wrap(BUI.nb(`<span class="sticker">Fin de la partida</span><h3>${o.winner ? '🏆 Ganó ' + esc(o.winner) : '🤝 Empate'}</h3>
      ${o.ranking.map((r, i) => `<div class="pr big"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span><span class="pa">${r.avatar}</span><span class="pn">${esc(r.name)}</span><b>${r.score} pts</b></div>`).join('')}
      <p class="mu">${o.note}</p>${o.actions}`) + BUI.deco, 'one');
  },
  side(list, active) {
    return '<h4>Jugadores</h4>' + list.map((p, i) => `<div class="pr ${i === active ? 'on' : ''}"><span class="pa">${p.avatar}</span><span class="pn">${esc(p.name)}</span>${p.connected === undefined ? '' : `<span class="dot ${p.connected ? '' : 'off'}"></span>`}<b>${p.score}</b></div>`).join('');
  },
  cards(ps, hostId, meId) {
    return `<div class="pcs">${ps.map((p, i) => `<div class="pcd" style="--r:${(i % 3 - 1) * 1.5}deg"><div class="pa big">${p.avatar}</div><b>${esc(p.name)}${p.id === hostId ? ' 👑' : ''}${p.id === meId ? ' (tú)' : ''}</b><br><small>${p.connected ? (p.ready ? '✔ listo' : 'esperando…') : 'sin conexión'}</small></div>`).join('')}</div>`;
  },
};
