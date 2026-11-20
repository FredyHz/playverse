// Stockfish (WebAssembly) para los niveles más altos. Si no carga, la computadora usa el motor interno.
const SF = {
  state: 'idle', w: null, listeners: [], _p: null,
  init() {
    if (this._p) return this._p;
    this._p = (async () => {
      this.state = 'loading';
      try {
        const info = await (await fetch('/api/engine')).json();
        if (!info.url) throw new Error('no instalado');
        const w = new Worker(info.url);
        await new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error('tardó demasiado')), 20000);
          w.onmessage = e => { if (String(e.data).includes('uciok')) { clearTimeout(t); res(); } };
          w.onerror = () => { clearTimeout(t); rej(new Error('no se pudo iniciar')); };
          w.postMessage('uci');
        });
        w.onmessage = e => { const l = String(e.data); this.listeners.slice().forEach(f => f(l)); };
        this.w = w; this.state = 'ready';
      } catch (e) { this.state = 'failed'; console.warn('Stockfish no disponible, se usa el motor interno:', e.message); }
      return this.state;
    })();
    return this._p;
  },
  // Devuelve {from,to,promo} o null. opts: {elo, ms, depth}
  best(fen, opts) {
    return new Promise(resolve => {
      const done = v => { clearTimeout(t); this.listeners = this.listeners.filter(f => f !== on); resolve(v); };
      const on = l => {
        if (!l.startsWith('bestmove')) return; const m = l.split(' ')[1] || '';
        done(/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m) ? { from: m.slice(0, 2), to: m.slice(2, 4), promo: m[4] } : null);
      };
      const t = setTimeout(() => done(null), (opts.ms || 1000) + 8000);
      this.listeners.push(on);
      this.w.postMessage('ucinewgame');
      this.w.postMessage('setoption name UCI_LimitStrength value ' + (opts.elo ? 'true' : 'false'));
      if (opts.elo) this.w.postMessage('setoption name UCI_Elo value ' + opts.elo);
      this.w.postMessage('position fen ' + fen);
      this.w.postMessage('go movetime ' + (opts.ms || 1000) + (opts.depth ? ' depth ' + opts.depth : ''));
    });
  },
};
