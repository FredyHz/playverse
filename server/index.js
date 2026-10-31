// Servidor PLAYVERSE: API REST (cuentas, ranking) + Socket.IO (salas en tiempo real).
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');
const attachRooms = require('./rooms');

const app = express();
app.set('trust proxy', 1); // detrás del proxy del hosting (HTTPS)
app.get('/health', (req, res) => res.send('ok'));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const ah = fn => (req, res, next) => fn(req, res, next).catch(e => { console.error(e); res.status(500).json({ error: 'Error del servidor. Intenta de nuevo.' }); });
const token = req => (req.headers.authorization || '').replace('Bearer ', '');
const auth = ah(async (req, res, next) => {
  const u = await db.userByToken(token(req));
  if (!u) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  req.user = u; next();
});
const validName = name => (typeof name !== 'string' || !/^[\p{L}\p{N}_ ]{3,14}$/u.test(name.trim())) ? 'El nombre debe tener de 3 a 14 letras o números.' : null;
const validPass = pass => (typeof pass !== 'string' || pass.length < 6 || pass.length > 72) ? 'La contraseña debe tener de 6 a 72 caracteres.' : null;

// Límite simple de intentos por IP para registro e inicio de sesión
const hits = new Map();
const limit = (req, res, next) => {
  const k = req.ip, now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < 60000);
  a.push(now); hits.set(k, a);
  a.length > 15 ? res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' }) : next();
};

app.post('/api/register', limit, ah(async (req, res) => {
  const { name, pass } = req.body || {}, err = validName(name) || validPass(pass);
  if (err) return res.status(400).json({ error: err });
  try { res.json(await db.register(name.trim(), pass)); }
  catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Ese nombre ya está en uso.' }); throw e; }
}));
app.post('/api/guest', limit, ah(async (req, res) => {
  const err = validName(req.body?.name);
  if (err) return res.status(400).json({ error: err });
  res.json(await db.guest(req.body.name.trim()));
}));
app.post('/api/login', limit, ah(async (req, res) => {
  const { name, pass } = req.body || {};
  const r = typeof name === 'string' && typeof pass === 'string' && await db.login(name.trim(), pass);
  r ? res.json(r) : res.status(401).json({ error: 'Nombre o contraseña incorrectos.' });
}));
app.post('/api/upgrade', auth, ah(async (req, res) => {
  const err = validPass(req.body?.pass);
  if (err) return res.status(400).json({ error: err });
  const u = await db.upgrade(req.user.id, req.body.pass);
  u ? res.json({ user: u }) : res.status(400).json({ error: 'Esta cuenta ya tiene contraseña.' });
}));
app.post('/api/logout', auth, ah(async (req, res) => { await db.logout(token(req)); res.json({ ok: true }); }));
app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));
app.patch('/api/me', auth, ah(async (req, res) => {
  const ok = ['🦊', '🐼', '🐯', '🦄', '🐸', '🐙', '🦖', '🤖'];
  if (!ok.includes(req.body?.avatar)) return res.status(400).json({ error: 'Avatar no válido.' });
  await db.setAvatar(req.user.id, req.body.avatar);
  res.json({ user: await db.userById(req.user.id) });
}));
app.get('/api/leaderboard', ah(async (req, res) => res.json(await db.leaderboard(req.query.period === 'week' ? 'week' : 'global'))));

const server = http.createServer(app);
attachRooms(new Server(server), db);

const PORT = process.env.PORT || 3000;
db.init().then(() => server.listen(PORT, () => console.log(`PLAYVERSE listo en http://localhost:${PORT}`)))
  .catch(e => { console.error('No se pudo conectar a la base de datos:', e.message); process.exit(1); });
