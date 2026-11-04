// Base de datos PostgreSQL (Neon gratis): usuarios, sesiones, puntos y partidas.
const { Pool } = require('pg');
const crypto = require('crypto');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Copia .env.example a .env y pega tu cadena de conexión de Neon.');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 20000 });
pool.on('error', e => console.error('Conexión inactiva cerrada por la base de datos:', e.message));
const q = (sql, params) => pool.query(sql, params);

exports.init = async () => {
  await q(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, salt TEXT, hash TEXT, avatar TEXT DEFAULT '🦊',
    points INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, played INTEGER DEFAULT 0,
    created BIGINT, guest BOOLEAN DEFAULT FALSE);
  CREATE UNIQUE INDEX IF NOT EXISTS users_name ON users(LOWER(name));
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, created BIGINT);
  CREATE TABLE IF NOT EXISTS score_events(id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, pts INTEGER, reason TEXT, ts BIGINT);
  CREATE INDEX IF NOT EXISTS ev_ts ON score_events(ts);
  CREATE TABLE IF NOT EXISTS matches(id SERIAL PRIMARY KEY, room TEXT, game TEXT, winner_id INTEGER, results JSONB, ts BIGINT);`);
  // Invitados sin puntos y con más de 30 días se borran
  await q('DELETE FROM users WHERE guest AND points=0 AND created<$1', [Date.now() - 30 * 864e5]);
};

const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 64).toString('hex');
const pub = u => u && { id: u.id, name: u.name, avatar: u.avatar, points: u.points, xp: u.xp, level: 1 + Math.floor(u.xp / 100), wins: u.wins, played: u.played, guest: !!u.guest };
const newSession = async id => {
  const token = crypto.randomBytes(32).toString('hex');
  await q('INSERT INTO sessions(token,user_id,created) VALUES($1,$2,$3)', [token, id, Date.now()]);
  return token;
};
const one = async (sql, p) => (await q(sql, p)).rows[0];

exports.userById = async id => pub(await one('SELECT * FROM users WHERE id=$1', [id]));
exports.userByToken = async t => t ? pub(await one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.created>$2', [t, Date.now() - 90 * 864e5])) : null;
exports.logout = t => q('DELETE FROM sessions WHERE token=$1', [t]);
exports.setAvatar = (id, av) => q('UPDATE users SET avatar=$1 WHERE id=$2', [av, id]);

// Lanza un error con code '23505' si el nombre ya existe
exports.register = async (name, pass) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const r = await one('INSERT INTO users(name,salt,hash,created) VALUES($1,$2,$3,$4) RETURNING id', [name, salt, hashPass(pass, salt), Date.now()]);
  return { token: await newSession(r.id), user: await exports.userById(r.id) };
};
exports.login = async (name, pass) => {
  const u = await one('SELECT * FROM users WHERE LOWER(name)=LOWER($1)', [name]);
  if (!u || !u.hash) return null;
  const a = Buffer.from(hashPass(pass, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex');
  return crypto.timingSafeEqual(a, b) ? { token: await newSession(u.id), user: pub(u) } : null;
};
// Invitado: solo un nombre. Si está tomado, se agrega un número.
exports.guest = async name => {
  for (let i = 0; i < 20; i++) {
    const n = i === 0 ? name : name.slice(0, 11) + (100 + Math.floor(Math.random() * 900));
    try {
      const r = await one('INSERT INTO users(name,created,guest) VALUES($1,$2,TRUE) RETURNING id', [n, Date.now()]);
      return { token: await newSession(r.id), user: await exports.userById(r.id) };
    } catch (e) { if (e.code !== '23505') throw e; }
  }
  throw new Error('No se pudo crear el invitado');
};
// Convierte un invitado en cuenta con contraseña, conservando puntos y victorias.
exports.upgrade = async (id, pass) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const r = await one('UPDATE users SET salt=$1,hash=$2,guest=FALSE WHERE id=$3 AND guest RETURNING id', [salt, hashPass(pass, salt), id]);
  return r ? exports.userById(id) : null;
};

exports.leaderboard = async period => {
  if (period === 'week') {
    return (await q(`SELECT u.name,u.avatar,SUM(e.pts)::int AS points FROM score_events e JOIN users u ON u.id=e.user_id
      WHERE e.ts>$1 GROUP BY u.id ORDER BY points DESC LIMIT 10`, [Date.now() - 7 * 864e5])).rows;
  }
  return (await q('SELECT name,avatar,points FROM users WHERE points>0 ORDER BY points DESC LIMIT 10')).rows;
};

// Guarda una partida terminada (puntos, victorias y resultados) en una sola transacción.
exports.finishMatch = async (room, game, winnerId, results) => {
  const c = await pool.connect(), now = Date.now();
  try {
    await c.query('BEGIN');
    for (const r of results) {
      await c.query('UPDATE users SET points=points+$1, xp=xp+$1, played=played+1, wins=wins+$2 WHERE id=$3', [r.pts, r.id === winnerId ? 1 : 0, r.id]);
      await c.query('INSERT INTO score_events(user_id,pts,reason,ts) VALUES($1,$2,$3,$4)', [r.id, r.pts, game, now]);
    }
    await c.query('INSERT INTO matches(room,game,winner_id,results,ts) VALUES($1,$2,$3,$4,$5)', [room, game, winnerId, JSON.stringify(results), now]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
};
