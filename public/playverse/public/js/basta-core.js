// Reglas de Basta (Stop). Este archivo lo usan el navegador (modo local) y el servidor (modo online).
(function (root) {
  const CATS = ['Nombre', 'Apellido', 'Animal', 'País o ciudad', 'Fruta o comida', 'Color', 'Objeto', 'Profesión'];
  const LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 30);
  // 'vacia' | 'invalida' | 'ok'
  function status(ans, letter) {
    const n = norm(ans);
    if (!n) return 'vacia';
    if (n.length < 2 || n[0] !== String(letter).toLowerCase() || !/^[a-z0-9 '\-]+$/.test(n)) return 'invalida';
    return 'ok';
  }
  // answers[jugador][categoría] -> puntos: 100 única, 50 repetida, 0 vacía, inválida o anulada.
  function scoreRound({ answers, letter, rejected }) {
    const rej = rejected || new Set();
    const nC = Math.max(0, ...answers.map(a => a.length));
    const players = answers.map(() => ({ total: 0, cells: [] }));
    for (let c = 0; c < nC; c++) {
      const st = answers.map((a, i) => { const s = status(a[c], letter); return s === 'ok' && rej.has(i + '|' + c) ? 'anulada' : s; });
      const count = {};
      st.forEach((s, i) => { if (s === 'ok') { const k = norm(answers[i][c]); count[k] = (count[k] || 0) + 1; } });
      st.forEach((s, i) => {
        let pts = 0, status2 = s;
        if (s === 'ok') { const rep = count[norm(answers[i][c])] > 1; pts = rep ? 50 : 100; status2 = rep ? 'repetida' : 'unica'; }
        players[i].cells.push({ pts, status: status2 });
        players[i].total += pts;
      });
    }
    return { players };
  }
  const api = { CATS, LETTERS, norm, clean, status, scoreRound };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BASTA = api;
})(typeof window !== 'undefined' ? window : globalThis);
