/* Conexión de HandShake con el servidor (amigos, solicitudes, chat e invitaciones).
   Si no hay servidor, la app sigue funcionando en local con el modo prueba.
   El servidor se encuentra solo si la app se abre desde él; si no, se pone en config.js (serverUrl)
   o en Ajustes. Sin contraseña: cada dispositivo guarda una clave aleatoria que lo identifica. */
(function () {
  'use strict';
  const KEY = 'jerkon.srv';
  const S = { status: 'none', ws: null, base: '', ident: null, tries: 0, timer: null, ping: null, lastN: 0, started: false };

  const store = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const put = o => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(store(), o))); } catch { /* sin almacenamiento */ } };
  function token() {
    let t = store().token;
    if (!t) {
      const a = new Uint8Array(24);
      crypto.getRandomValues(a);
      t = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
      put({ token: t });
    }
    return t;
  }
  // 'https://mi.dominio' -> 'wss://mi.dominio'
  function toWs(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    if (!u) return '';
    if (/^wss?:\/\//i.test(u)) return u;
    if (/^https?:\/\//i.test(u)) return u.replace(/^http/i, 'ws');
    return (location.protocol === 'http:' ? 'ws://' : 'wss://') + u;
  }
  async function discover() {
    const cfg = window.JERKON_CONFIG || {};
    const url = store().url || cfg.serverUrl;
    if (url) return toWs(url);
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try {
        const r = await fetch('/health', { cache: 'no-store' });
        const j = await r.json();
        if (j && j.app === 'jerkon') return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
      } catch { /* esta página no la sirve el servidor */ }
    }
    return '';
  }

  function setStatus(s, why) {
    if (S.status === s && !why) return;
    S.status = s;
    S.why = why || '';
    if (api.onstatus) api.onstatus(s, why);
  }

  function open() {
    if (S.ws || !S.ident || !S.base) return;
    setStatus('connecting');
    let ws;
    try { ws = new WebSocket(S.base + '/ws'); } catch { return later(); }
    S.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', code: S.ident.code, name: S.ident.name, token: token() }));
    ws.onmessage = ev => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'ready') {
        S.tries = 0;
        if (m.now) S.skew = m.now - Date.now();
        if (m.seq !== undefined && m.seq < S.lastN) { S.lastN = 0; put({ lastN: 0 }); }
        setStatus('online');
        clearInterval(S.ping);
        S.ping = setInterval(() => api.send({ t: 'ping' }), 25000);
      }
      if (m.t === 'err' && m.re === 'hello') { S.fatal = m.why; setStatus('error', m.why); return; }
      if (m.n) {
        ws.send(JSON.stringify({ t: 'ack', n: m.n }));
        if (m.n <= S.lastN) return;
        S.lastN = m.n;
        put({ lastN: m.n });
      }
      if (api.onmsg) api.onmsg(m);
    };
    ws.onclose = () => {
      clearInterval(S.ping);
      S.ws = null;
      if (S.fatal) return;
      setStatus('offline');
      later();
    };
    ws.onerror = () => { /* onclose se encarga de reintentar */ };
  }
  function later() {
    clearTimeout(S.timer);
    const d = Math.min(30000, 1000 * Math.pow(2, S.tries++));
    S.timer = setTimeout(open, d);
  }

  const api = {
    onmsg: null,
    onstatus: null,
    get status() { return S.status; },
    get why() { return S.why || ''; },
    get online() { return S.status === 'online'; },
    // 'none' = sin servidor: la app trabaja en local. Con servidor, las acciones sociales van por él.
    get enabled() { return S.status !== 'none'; },
    get base() { return S.base; },
    // Diferencia entre el reloj del servidor y el de este móvil (ms)
    get skew() { return S.skew || 0; },
    async start(ident) {
      S.ident = { code: ident.code, name: ident.name };
      S.lastN = Number(store().lastN) || 0;
      if (S.started) return;
      S.started = true;
      S.base = await discover();
      if (!S.base) { setStatus('none'); return; }
      window.DUEL_SIGNAL = S.base + '/peerjs?key=peerjs';
      open();
      const wake = () => { if (S.base && !S.fatal && (!S.ws || S.ws.readyState > 1)) { S.ws = null; S.tries = 0; clearTimeout(S.timer); open(); } };
      window.addEventListener('online', wake);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    },
    // Cambia nombre o código y vuelve a entrar
    identify(ident, reset) {
      S.ident = { code: ident.code, name: ident.name };
      if (reset) { S.fatal = ''; if (S.ws) { try { S.ws.close(); } catch { /* ya cerrada */ } } S.ws = null; S.tries = 0; clearTimeout(S.timer); if (S.base) open(); }
      else if (S.ws && S.ws.readyState === 1) api.send({ t: 'name', name: ident.name });
    },
    async setUrl(u) {
      put({ url: String(u || '').trim() });
      S.started = false; S.fatal = '';
      if (S.ws) { try { S.ws.close(); } catch { /* ya cerrada */ } }
      S.ws = null; S.base = '';
      clearTimeout(S.timer);
      if (S.ident) await api.start(S.ident);
    },
    get url() { return store().url || (window.JERKON_CONFIG || {}).serverUrl || ''; },
    send(o) {
      if (!S.ws || S.ws.readyState !== 1) return false;
      S.ws.send(JSON.stringify(o));
      return true;
    }
  };
  window.Srv = api;
})();
