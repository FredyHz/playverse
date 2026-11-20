// Motor interno de la computadora, en un Worker para no congelar la pantalla mientras piensa.
importScripts('/js/chess-core.js');
onmessage = e => {
  const { id, fen, opts } = e.data;
  try { postMessage({ id, move: CH.create(fen).best(opts) }); } catch (err) { postMessage({ id, move: null, error: String(err) }); }
};
