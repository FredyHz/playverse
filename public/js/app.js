// PLAYVERSE: núcleo (estado, audio, router, navegación y páginas)
const D={name:'Jugador',av:'🦊',pts:0,xp:0,wins:0,played:0,hist:[],board:{},champs:[],snd:1,fichas:100,az:[],P:[]};
let S;try{S={...D,...JSON.parse(localStorage.getItem('pv')||'{}')}}catch(e){S={...D}}
if(!S.P.length)S.P=[S.name];
const save=()=>{try{localStorage.setItem('pv',JSON.stringify(S))}catch(e){}};
const $=s=>document.querySelector(s),rnd=n=>Math.floor(Math.random()*n),sh=a=>[...a].sort(()=>Math.random()-.5);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lv=()=>1+Math.floor(S.xp/100),names=id=>$(id).value.split('\n').map(s=>s.trim()).filter(Boolean);
let AC;function beep(f,d=.12,t='sine',at=0){if(!S.snd)return;try{AC=AC||new AudioContext();const o=AC.createOscillator(),g=AC.createGain(),T=AC.currentTime+at;o.type=t;o.frequency.value=f;g.gain.setValueAtTime(.12,T);g.gain.exponentialRampToValueAtTime(.001,T+d);o.connect(g);g.connect(AC.destination);o.start(T);o.stop(T+d)}catch(e){}}
const snd={click:()=>beep(520,.06),ok:()=>{beep(660,.1);beep(880,.15,'sine',.1)},bad:()=>beep(160,.3,'sawtooth'),win:()=>[523,659,784,1047].forEach((f,i)=>beep(f,.18,'triangle',i*.12)),tick:()=>beep(900,.03,'square')};
function confetti(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;const c=$('#cf'),x=c.getContext('2d'),cols=['#ff4d8d','#ffd23f','#3fe0d0','#ff9a55','#9d86ff'];c.width=innerWidth;c.height=innerHeight;const p=Array.from({length:150},()=>({x:innerWidth/2,y:innerHeight/3,vx:(Math.random()-.5)*16,vy:-Math.random()*14-4,s:5+Math.random()*7,c:cols[rnd(5)],r:Math.random()*6}));let f=0;(function a(){x.clearRect(0,0,c.width,c.height);p.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.35;q.r+=.2;x.fillStyle=q.c;x.save();x.translate(q.x,q.y);x.rotate(q.r);x.fillRect(-q.s/2,-q.s/2,q.s,q.s*.6);x.restore()});if(++f<150)requestAnimationFrame(a);else x.clearRect(0,0,c.width,c.height)})()}
function award(n,p){S.board[p]=(S.board[p]||0)+n;if(p===S.name){S.pts+=n;S.xp+=n}save()}
function log(t){S.hist.unshift(new Date().toLocaleDateString('es-MX')+' - '+t);S.hist=S.hist.slice(0,15);save()}
function done(w){S.played++;if(w===S.name)S.wins++;save()}
const GM={trivia:['Trivia familiar','🧠','Cada jugador responde en su turno. Más rápido, más puntos: 10 por acierto, hasta +6 por velocidad y +20 al ganador.'],num:['Adivina el número','🔢','Hay un número del 1 al 100 y 8 intentos entre todos. Quien acierta gana puntos; menos intentos, más puntos.'],who:['¿Quién soy?','🕵️','Pide pistas hasta adivinar. Con menos pistas ganas más puntos. Tienes 3 intentos.'],wheel:['Ruleta de nombres','🎡','Escribe un nombre por línea y gira la ruleta.'],teams:['Equipos al azar','👥','Escribe los nombres, elige cuántos equipos y reparte.'],bracket:['Torneo','🏆','Escribe de 3 a 16 participantes. Toca al ganador de cada duelo hasta la final. El campeón gana 50 puntos.'],hl:['Mayor o menor','🃏','¿La siguiente carta será mayor o menor? Acierta y ganas la apuesta; empate la devuelve.'],coin:['Cara o cruz','🪙','Elige un lado y lanza. Acierta y ganas la apuesta.'],dice:['Dados','🎲','Apuesta si la suma de dos dados será menor, igual o mayor que 7. El 7 paga 4 a 1.']};
/* ===== PLAYVERSE 2.0: navegación, catálogo y páginas ===== */
Object.assign(GM,{basta:['Basta (Stop)','✍️','Todos escriben una palabra por categoría que empiece con la letra elegida. El primero en terminar grita ¡BASTA!'],chess:['Ajedrez','♟️','El clásico juego de estrategia para dos jugadores.']});
const CATS={k:{t:'Conocimiento',e:'🧠',d:'Preguntas con tiempo, niveles y explicación.'},a:{t:'Adivinanzas',e:'🔮',d:'Pistas, intentos y puntos por precisión.'},s:{t:'Sorteos',e:'🎡',d:'Ruleta y equipos al azar.'},t:{t:'Torneos',e:'🏆',d:'Eliminación directa hasta el campeón.'},z:{t:'Azar virtual',e:'🎰',d:'Fichas virtuales: sin dinero real.'},m:{t:'Juegos de mesa',e:'🧩',d:'Clásicos para jugar en grupo.'}};
const GAMES={
trivia:{cat:'k',a:'#7a5cff',b:'#22d3c5',pl:'1 a 10 jugadores',on:1},
num:{cat:'a',a:'#ff8a3d',b:'#ffd23f',pl:'1 a 10 jugadores'},
who:{cat:'a',a:'#00a99a',b:'#2ee6ff',pl:'1 a 10 jugadores'},
wheel:{cat:'s',a:'#ff3d9a',b:'#ffd23f',pl:'2 a 10 nombres'},
teams:{cat:'s',a:'#2f7bff',b:'#7a5cff',pl:'2 a 10 jugadores'},
bracket:{cat:'t',a:'#8a4dff',b:'#ff3d9a',pl:'3 a 16 participantes'},
hl:{cat:'z',a:'#e0245e',b:'#ff8a3d',pl:'1 jugador'},
coin:{cat:'z',a:'#e6a100',b:'#ffd23f',pl:'1 jugador'},
dice:{cat:'z',a:'#7a5cff',b:'#ff3d9a',pl:'1 jugador'},
basta:{cat:'m',a:'#17a86b',b:'#2ee6ff',pl:'2 a 10 jugadores',st:'soon',nuevo:1},
chess:{cat:'m',a:'#4b5bd6',b:'#9aa6ff',pl:'2 jugadores',st:'soon'}};
const bar=t=>`<div class="chips">${S.P.map((p,i)=>`<span class="chip ${i===t%S.P.length?'on':''}">${esc(p)} <b>${SC[p]||0}</b></span>`).join('')}</div>`;
function tgS(){S.snd=S.snd?0:1;save();chrome();snd.click()}
function tgT(){const d=document.documentElement,cur=d.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');d.dataset.theme=cur==='dark'?'light':'dark'}

/* ---- Router por URL (#/...) ---- */
let V='home',A=null,SC={},TM,LASTH='',SQ='',F='all',RP='week',RS=0;const GI={};
const R2H={home:()=>'#/',catalog:()=>'#/juegos',cat:a=>'#/cat/'+a,game:a=>'#/juego/'+a,rank:()=>'#/ranking',prof:()=>'#/perfil',online:()=>'#/online'};
function go(v,a){snd.click();clearInterval(TM);const h=R2H[v](a);if(location.hash!==h)location.hash=h;render()}
function parse(){const p=location.hash.replace(/^#\/?/,'').split('/'),k=p[0];return k==='juegos'?['catalog']:k==='cat'&&CATS[p[1]]?['cat',p[1]]:k==='juego'&&GAMES[p[1]]?['game',p[1]]:k==='ranking'?['rank']:k==='perfil'?['prof']:k==='online'?['online']:['home']}
function render(){LASTH=location.hash;[V,A]=parse();PV.menu(0);if(V!=='online'&&window.PVO)PVO.clear();
  const views={home:vHome,catalog:vCatalog,cat:vCat,game:vGame,rank:vRank,prof:vProf,online:()=>window.vOnline()};
  $('#app').innerHTML=`<div class="view">${views[V]()}</div>`;chrome();
  if(V==='game'&&GAMES[A].st!=='soon')GI[A]();if(V==='online')window.onlineInit();if(V==='home')homeLoad();if(V==='rank')rankLoad();scrollTo(0,0)}

/* ---- Barra lateral y superior ---- */
const NAV=[['home','🏠','Inicio'],['catalog','🎮','Todos los juegos'],['cat:k','🧠','Conocimiento'],['cat:m','🧩','Juegos de mesa'],['cat:z','🎰','Azar virtual'],['cat:t','🏆','Torneos'],['online','🌐','Jugar con amigos'],['rank','📊','Ranking'],['prof','👤','Perfil']];
function me(){const o=window.PVO&&PVO.user();return o?{name:o.name,av:o.avatar,lv:o.level,xp:o.xp,pts:o.points,w:o.wins,pl:o.played,src:'online'}:{name:S.name,av:S.av,lv:lv(),xp:S.xp,pts:S.pts,w:S.wins,pl:S.played,src:'local'}}
function chrome(){const m=me(),act=V==='cat'?'cat:'+A:V==='game'?'cat:'+GAMES[A].cat:V;
  $('#side').innerHTML=`<button class="logo" onclick="go('home')">🎮 PLAYVERSE</button><nav>${NAV.map(([k,e,t])=>{const[v,a]=k.split(':');return `<button class="ni ${act===k?'on':''}" onclick="go('${v}'${a?`,'${a}'`:''})"><i>${e}</i>${t}</button>`}).join('')}</nav><div class="sb"><button onclick="tgS()">${S.snd?'🔊 Sonido':'🔇 Sin sonido'}</button><button onclick="tgT()">🌓 Modo claro/oscuro</button></div>`;
  $('#top').innerHTML=`<button class="hb" onclick="PV.menu(1)" aria-label="Abrir menú">☰</button><div class="search"><span aria-hidden="true">🔍</span><input id="q" placeholder="Buscar juegos…" aria-label="Buscar juegos" value="${esc(SQ)}" oninput="PV.search(this.value)"></div><button class="user" onclick="go('prof')" aria-label="Mi perfil"><span class="av2">${m.av}</span><span class="un"><b>${esc(m.name)}</b><small>Nivel ${m.lv} · ${m.src==='online'?'cuenta online':'este dispositivo'}</small><span class="xp"><i style="width:${m.xp%100}%"></i></span></span></button>`}
window.refreshChrome=chrome;

/* ---- Tarjetas de juego ---- */
function gcard(id,sz){const g=GAMES[id],m=GM[id],soon=g.st==='soon';
  return `<article class="gc ${sz} ${soon?'soon':''}" style="--a:${g.a};--b:${g.b}"><div class="art"><span aria-hidden="true">${m[1]}</span>${g.nuevo?'<em class="tag">NUEVO</em>':''}</div><div class="gi"><h3>${m[0]}</h3><small>${g.pl}</small><div class="md">${soon?'<b class="mt">Próximamente</b>':`<b class="mt">Local</b>${g.on?'<b class="mt on">Online</b>':''}`}</div></div><button class="btn play" ${soon?'disabled':''} onclick="go('game','${id}')">${soon?'Próximamente':'Jugar'}</button></article>`}
const pick=()=>{const k=Object.keys(GAMES).filter(k=>GAMES[k].st!=='soon');return k[rnd(k.length)]};
const HERO=`<svg class="hs" viewBox="0 0 220 190" aria-hidden="true"><defs><linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ff9a1f"/></linearGradient><linearGradient id="gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#2ee6ff"/></linearGradient></defs><g><path d="M72 20h76v44a38 38 0 0 1-76 0z" fill="url(#gt)"/><path d="M72 32H48a24 24 0 0 0 26 34M148 32h24a24 24 0 0 1-26 34" fill="none" stroke="#ffc233" stroke-width="9" stroke-linecap="round"/><rect x="104" y="98" width="12" height="26" fill="#ffb02e"/><rect x="80" y="122" width="60" height="14" rx="5" fill="url(#gt)"/><path d="M110 36l6 12 13 2-10 9 3 13-12-7-12 7 3-13-10-9 13-2z" fill="#fff6c9"/></g><g transform="translate(18 138)"><rect width="184" height="50" rx="25" fill="url(#gp)"/><rect x="34" y="14" width="8" height="22" rx="3" fill="#0a0e27"/><rect x="27" y="21" width="22" height="8" rx="3" fill="#0a0e27"/><circle cx="136" cy="18" r="7" fill="#ff3d9a"/><circle cx="154" cy="30" r="7" fill="#ffd23f"/><circle cx="118" cy="30" r="7" fill="#38e08c"/></g></svg>`;

/* ---- Jugadores locales ---- */
function playersPanel(){return `<section class="card2"><h3>👥 Jugadores en este dispositivo</h3><p class="mu">Para los juegos locales. Los turnos rotan en este orden.</p><label>Cantidad <select onchange="setN(+this.value)">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option ${n===S.P.length?'selected':''}>${n}</option>`).join('')}</select></label>${S.P.map((p,i)=>`<p><input value="${esc(p)}" maxlength="14" aria-label="Jugador ${i+1}" onchange="setP(${i},this.value)"></p>`).join('')}</section>`}
function setN(n){while(S.P.length<n)S.P.push('Jugador '+(S.P.length+1));S.P.length=n;save();render()}
function setP(i,v){v=v.trim()||'Jugador '+(i+1);if(i===0)S.name=v;S.P[i]=v;save();chrome()}

/* ---- Inicio ---- */
function vHome(){const m=me();
  return `<section class="hero"><div class="hl"><div class="ht"><small class="eyebrow">TU PLATAFORMA DE JUEGOS FAVORITA</small><h1>¡Bienvenido a PLAYVERSE!</h1><p>¿ABURRIDO? ¡ES HORA DE JUGAR! Elige un juego, invita a tu familia y compite. Todo con puntos virtuales, sin dinero real.</p><button class="btn big" onclick="go('game',pick())">¡Jugar Ahora!</button> <button class="btn alt big" onclick="go('catalog')">Ver todos los juegos</button></div>${HERO}</div>
  <aside class="card2 prog"><div class="row2"><span class="av2 lg">${m.av}</span><div><b>${esc(m.name)}</b><br><small>${m.src==='online'?'Cuenta online':'Perfil de este dispositivo'}</small></div></div><p>Nivel <b>${m.lv}</b></p><div class="xp"><i style="width:${m.xp%100}%"></i></div><small>${100-m.xp%100} XP para el nivel ${m.lv+1}</small><div class="st"><span><b>${m.pts}</b>Puntos</span><span><b>${m.w}</b>Victorias</span><span><b>${m.pl}</b>Partidas</span></div><button class="btn alt" onclick="go('prof')">Ver mi perfil</button></aside></section>
  <h2 class="sec">Juegos destacados</h2><div class="gm">${['trivia','wheel','dice','basta','chess'].map(k=>gcard(k,'big')).join('')}</div>
  <div class="duo"><section class="card2 net"><h3>🌐 Juega en línea</h3><p class="mu">Crea una sala privada y comparte el código con tu familia y amigos.</p><button class="btn" onclick="PVO.create()">Crear sala</button><div class="row2"><input id="hc" maxlength="5" placeholder="CÓDIGO" aria-label="Código de sala" style="text-transform:uppercase;width:8em" onkeydown="if(event.key==='Enter')PVO.join(this.value)"><button class="btn alt" onclick="PVO.join($('#hc').value)">Unirse a sala</button></div></section>
  <section class="card2"><h3>🏅 Ranking semanal</h3><div id="hr" class="mu">Cargando…</div><button class="btn alt" onclick="go('rank')">Ver ranking completo</button></section></div>
  <h2 class="sec">Juegos rápidos</h2><div class="gm tall">${['hl','coin','num','who','teams','bracket'].map(k=>gcard(k,'tall')).join('')}</div>${playersPanel()}`}
const rkCards=d=>`<div class="rks">${d.slice(0,3).map((r,i)=>`<div class="rk r${i}"><span class="md">${['🥇','🥈','🥉'][i]}</span><span class="av2">${esc(r.avatar)}</span><b>${esc(r.name)}</b><small>${r.points} pts</small></div>`).join('')}</div>`;
async function homeLoad(){try{const d=await (await fetch('/api/leaderboard?period=week')).json(),el=$('#hr');if(el)el.innerHTML=d.length?rkCards(d):'Aún no hay partidas online esta semana. ¡Crea una sala y sé el primero!'}catch(e){const el=$('#hr');if(el)el.textContent='No se pudo cargar el ranking.'}}

/* ---- Catálogo y categorías ---- */
const nz2=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const FIL=[['all','Todos'],['k','Conocimiento'],['a','Adivinanzas'],['s','Sorteos'],['t','Torneos'],['z','Azar virtual'],['m','Juegos de mesa'],['on','Online']];
function ids(){const q=nz2(SQ.trim());return Object.keys(GAMES).filter(k=>(F==='all'||(F==='on'?GAMES[k].on:GAMES[k].cat===F))&&(!q||nz2(GM[k][0]).includes(q)))}
const gridHtml=()=>ids().map(k=>gcard(k,'mid')).join('')||'<p class="mu">No hay juegos que coincidan con tu búsqueda.</p>';
function fillCat(){const el=$('#cg');if(el)el.innerHTML=gridHtml()}
function setF(f){F=f;render()}
function vCatalog(){const rec=(S.recent||[]).filter(k=>GAMES[k]);
  return `<h2>🎮 Todos los juegos</h2><div class="chips">${FIL.map(([k,t])=>`<button class="chip ${F===k?'on':''}" onclick="setF('${k}')">${t}</button>`).join('')}</div>${rec.length?`<h3 class="sec">Jugados recientemente</h3><div class="chips">${rec.map(k=>`<button class="chip" onclick="go('game','${k}')">${GM[k][1]} ${GM[k][0]}</button>`).join('')}</div>`:''}<div class="gm" id="cg">${gridHtml()}</div>`}
function search(v){SQ=v;if(V!=='catalog'){location.hash='#/juegos';render();const i=$('#q');if(i){i.focus();i.setSelectionRange(v.length,v.length)}}else fillCat()}
function vCat(){const c=CATS[A];return `<h2>${c.e} ${c.t}</h2><p class="mu">${c.d}</p><div class="gm">${Object.keys(GAMES).filter(k=>GAMES[k].cat===A).map(k=>gcard(k,'mid')).join('')}</div>`}

/* ---- Página de juego ---- */
function vGame(){const g=GAMES[A],m=GM[A],head=`<button class="back" onclick="go('cat','${g.cat}')">← ${CATS[g.cat].t}</button><h2>${m[1]} ${m[0]}</h2><p class="mu">${m[2]}</p>`;
  if(g.st==='soon')return head+`<div class="card2"><h3>Próximamente</h3><p>Este juego todavía no está disponible.</p><button class="btn" onclick="go('catalog')">Ver juegos disponibles</button></div>`;
  S.recent=[A,...(S.recent||[]).filter(x=>x!==A)].slice(0,6);save();
  return head+(g.on?`<div class="card2">También puedes jugarlo <b>online</b> con amigos en una sala privada. <button class="btn alt" onclick="go('online')">Jugar con amigos</button></div>`:'')+`<details class="card2"><summary>Jugadores locales (${S.P.length})</summary>${playersPanel()}</details><div id="g"></div>`}

/* ---- Ranking ---- */
function vRank(){const loc=Object.entries(S.board).sort((a,b)=>b[1]-a[1]).slice(0,10);
  return `<h2>📊 Ranking</h2><div class="chips"><button class="chip ${RP==='week'?'on':''}" onclick="RP='week';render()">Esta semana</button><button class="chip ${RP==='global'?'on':''}" onclick="RP='global';render()">Global</button></div><div id="rk" class="card2">Cargando…</div><h3 class="sec">Este dispositivo (juegos locales)</h3><div class="card2">${loc.length?`<table>${loc.map(([n,p],i)=>`<tr><td>${i+1}.</td><td>${esc(n)}</td><td><b>${p}</b></td></tr>`).join('')}</table>`:'<p class="mu">Aún no hay puntos en este dispositivo.</p>'}</div>`}
async function rankLoad(){try{const d=await (await fetch('/api/leaderboard?period='+RP)).json(),el=$('#rk');if(el)el.innerHTML=d.length?rkCards(d)+(d.length>3?`<table>${d.slice(3).map((r,i)=>`<tr><td>${i+4}.</td><td>${esc(r.avatar)} ${esc(r.name)}</td><td><b>${r.points}</b></td></tr>`).join('')}</table>`:''):'Todavía no hay puntos online en este ranking.'}catch(e){const el=$('#rk');if(el)el.textContent='No se pudo cargar el ranking.'}}

/* ---- Perfil ---- */
function pickAv(a){S.av=a;save();if(window.PVO&&PVO.user())OL.av(a);snd.click();render()}
function vProf(){const m=me(),ach=[['🥇','Primera victoria',m.w>=1],['⭐','100 puntos',m.pts>=100],['🚀','Nivel 3',m.lv>=3],['🏆','Campeón de torneo',S.champs.length>0],['🎲','10 partidas',m.pl>=10]];
  return `<h2>👤 Mi perfil</h2>${m.src==='online'?'':'<p class="mu">Este es el perfil de este dispositivo. En <b>Jugar con amigos</b> puedes crear una cuenta (o entrar como invitado) para guardar tus puntos online.</p>'}<div class="row"><div class="card2" style="flex:1;min-width:260px"><div class="av">${m.av}</div>${m.src==='online'?`<h3>${esc(m.name)}</h3>`:`<label>Nombre<br><input value="${esc(S.name)}" maxlength="14" onchange="setP(0,this.value);render()"></label>`}<p>Avatar</p><div class="chips">${['🦊','🐼','🐯','🦄','🐸','🐙','🦖','🤖'].map(a=>`<button class="chip ${a===m.av?'on':''}" style="font-size:1.5rem" onclick="pickAv('${a}')">${a}</button>`).join('')}</div><p>Nivel ${m.lv} · ${m.pts} puntos · ${m.xp} XP</p><div class="xp"><i style="width:${m.xp%100}%"></i></div><p>Victorias: ${m.w} · Partidas: ${m.pl}</p></div>
  <div class="card2" style="flex:1;min-width:260px"><h3>Logros</h3>${ach.map(a=>`<p style="opacity:${a[2]?1:.4}">${a[0]} ${a[1]} ${a[2]?'✔':''}</p>`).join('')}<h3>Campeones de torneo</h3>${S.champs.map(c=>`<p>🏆 ${esc(c.n)} <small>${c.d}</small></p>`).join('')||'<p class="mu">Aún no hay campeones.</p>'}</div></div>
  <div class="card2"><h3>Historial de partidas locales</h3>${S.hist.map(h=>`<p>${esc(h)}</p>`).join('')||'<p class="mu">Todavía no has jugado.</p>'}<button class="btn alt" onclick="if(RS){localStorage.removeItem('pv');location.reload()}else{RS=1;this.textContent='¿Seguro? Toca otra vez para borrar los datos de este dispositivo'}">Borrar datos de este dispositivo</button></div>`}

window.PV={menu:f=>document.body.classList.toggle('menu',!!f),search,start(){addEventListener('hashchange',()=>{if(location.hash!==LASTH){clearInterval(TM);render()}});render()}};
