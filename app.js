// HandShake v4: seguimiento privado + racha, logros con marcos, perfil, códigos de amigo y chats.
// Todo vive en localStorage. La parte social es local (ver README para conectar un servidor).
'use strict';

const KEY = 'jerkon.v3';
const OLD_KEYS = ['equilibrio.v2', 'equilibrio.v1'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

const EMOJIS = ['', '😞', '😕', '😐', '🙂', '😄'];
const MOOD_LABEL = ['', 'Mal', 'Regular', 'Normal', 'Bien', 'Genial'];

// Efecto del registro (opcional): si manchó algo y cuánto
const FX = ['', '✨', '💧', '💦', '🌊'];
const FX_LABEL = ['', 'Limpio', 'Gotas', 'Manchó', 'Desastre'];
const FX_DESC = ['', 'Todo limpio', 'Solo unas gotas', 'Manchó algo', 'Manchó mucho'];

/* ---------- Códigos de amigo: 4 números + 3 letras ---------- */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O para no confundir con 1 y 0
const CODE_RE = /^\d{4}[A-Z]{3}$/;
const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function rnd(n) {
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}
function genCode() {
  let d = '', l = '';
  for (let i = 0; i < 4; i++) d += rnd(10);
  for (let i = 0; i < 3; i++) l += LETTERS[rnd(LETTERS.length)];
  return d + l;
}

/* ---------- Estado ---------- */
function defaults() {
  return {
    entries: [], account: null, loginSkipped: false, tutorialDone: false,
    me: { name: 'Yo', code: '', photo: '', frame: '' },
    friends: [], groups: [], names: {},
    requests: { incoming: [], outgoing: [] },
    achievements: {},
    rolls: 0, rollsTotal: 0, shopInit: false, pass: null, daily: {}, duelWins: 0, tourn: null, ui: { fold: {} },
    shop: { owned: {}, eq: { icon: '', skin: '', color: '', bubble: '' } }, shopSeen: '',
    retain: retainDefaults(),
    settings: { browserNotif: false, theme: 'auto', lang: 'es', retain: { goal: true, shield: true, weekly: true, missions: true, remindOn: false, remindAt: '21:00' } }
  };
}

// Hábitos y retención (v5): todo opcional y con topes. Los datos antiguos sin estos campos se rellenan aquí.
function retainDefaults() {
  return { goal: { date: '', id: '', done: false, paid: false }, goalsDone: 0, shield: { tokens: 0, used: [], earnedOn: '' }, weeklySeen: '', wk: { week: '', claimed: {}, goals: 0 }, weeksDone: 0, remindSent: '', seen: { date: '', hist: false } };
}
function normRetain(r) {
  const b = retainDefaults();
  r = r && typeof r === 'object' ? r : {};
  const str = v => (typeof v === 'string' ? v : '');
  const g = r.goal || {}, sh = r.shield || {}, wk = r.wk || {}, se = r.seen || {};
  return {
    goal: { date: str(g.date), id: str(g.id), done: !!g.done, paid: !!g.paid },
    goalsDone: Math.max(0, Math.floor(Number(r.goalsDone) || 0)),
    shield: { tokens: Math.min(2, Math.max(0, Math.floor(Number(sh.tokens) || 0))), used: Array.isArray(sh.used) ? sh.used.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-60) : b.shield.used, earnedOn: str(sh.earnedOn) },
    weeklySeen: str(r.weeklySeen),
    wk: { week: str(wk.week), claimed: wk.claimed && typeof wk.claimed === 'object' ? Object.assign({}, wk.claimed) : {}, goals: Math.max(0, Math.floor(Number(wk.goals) || 0)) },
    weeksDone: Math.max(0, Math.floor(Number(r.weeksDone) || 0)),
    remindSent: str(r.remindSent),
    seen: { date: str(se.date), hist: !!se.hist }
  };
}

function load() {
  const base = defaults();
  let d = {};
  try {
    const raw = localStorage.getItem(KEY) || OLD_KEYS.map(k => localStorage.getItem(k)).find(Boolean);
    d = JSON.parse(raw || '{}') || {};
  } catch { d = {}; }
  const rq = d.requests || {};
  const s = {
    entries: Array.isArray(d.entries) ? d.entries : [],
    account: d.account && typeof d.account === 'object' && d.account.sub ? d.account : null,
    loginSkipped: !!d.loginSkipped,
    tutorialDone: d.tutorialDone !== undefined ? !!d.tutorialDone : !!((Array.isArray(d.entries) && d.entries.length) || (Array.isArray(d.friends) && d.friends.length) || (Array.isArray(d.groups) && d.groups.length)),
    me: Object.assign(base.me, d.me),
    friends: Array.isArray(d.friends) ? d.friends : [],
    groups: Array.isArray(d.groups) ? d.groups : [],
    names: d.names && typeof d.names === 'object' ? d.names : {},
    requests: { incoming: Array.isArray(rq.incoming) ? rq.incoming : [], outgoing: Array.isArray(rq.outgoing) ? rq.outgoing : [] },
    achievements: d.achievements && typeof d.achievements === 'object' ? d.achievements : {},
    rolls: Math.max(0, Math.floor(Number(d.rolls) || 0)),
    rollsTotal: Math.max(0, Math.floor(Number(d.rollsTotal) || 0)),
    shopInit: !!d.shopInit,
    shopSeen: typeof d.shopSeen === 'string' ? d.shopSeen : '',
    pass: d.pass && typeof d.pass === 'object' ? { season: d.pass.season, xp: Math.max(0, Number(d.pass.xp) || 0), premium: !!d.pass.premium, claimed: Object.assign({}, d.pass.claimed) } : null,
    duelWins: Math.max(0, Math.floor(Number(d.duelWins) || 0)),
    ui: { fold: Object.assign({}, d.ui && d.ui.fold) },
    daily: d.daily && typeof d.daily === 'object' ? d.daily : {},
    tourn: d.tourn && typeof d.tourn === 'object' && Array.isArray(d.tourn.players) ? d.tourn : null,
    shop: { owned: Object.assign({}, d.shop && d.shop.owned), eq: Object.assign(base.shop.eq, d.shop && d.shop.eq) },
    retain: normRetain(d.retain),
    settings: Object.assign(base.settings, d.settings)
  };
  s.settings.retain = Object.assign(defaults().settings.retain, d.settings && d.settings.retain);
  s.groups.forEach(g => {
    if (!Array.isArray(g.messages)) g.messages = [];
    if (!Array.isArray(g.members)) g.members = [];
    if (!Array.isArray(g.events)) g.events = [];
  });
  if (!CODE_RE.test(s.me.code)) s.me.code = genCode();
  return s;
}
let state = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast('No se pudo guardar. Revisa que el navegador permita almacenamiento local.'); }
}
save();

/* ---------- Utilidades ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => parse(ymd(new Date()));
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const startOfWeek = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['L','M','X','J','V','S','D'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const fmtClock = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtShort = ts => { const d = new Date(ts); return ymd(d) === ymd(new Date()) ? fmtClock(ts) : `${d.getDate()}/${d.getMonth() + 1}`; };
function dayLabel(ts) {
  const d = new Date(ts);
  const diff = daysBetween(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today());
  return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : `${d.getDate()} ${MESES[d.getMonth()]}`;
}

const ICON = {
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>'
};

function paintAvatar(node, name) {
  const clean = String(name || '?').trim();
  node.textContent = clean === 'Yo' ? '🙂' : (clean.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?');
  let h = 0;
  for (const c of clean) h = (h * 31 + c.charCodeAt(0)) % 360;
  node.style.background = `linear-gradient(135deg, hsl(${h} 80% 62%), hsl(${(h + 50) % 360} 80% 50%))`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Marca texto escrito por el usuario (nombres, notas, mensajes) para que no se traduzca
const ut = n => { n.setAttribute('translate', 'no'); return n; };

// Reinicia una animación CSS sobre un elemento
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

// Numera los hijos para escalonar sus animaciones de entrada
function setStagger(node) {
  [...node.children].forEach((c, i) => c.style.setProperty('--i', i));
}

/* ---------- Avisos emergentes (en cola) ---------- */
const toastQ = [];
let toasting = false;
function toast(msg) {
  if (toastQ.length > 3) toastQ.shift();
  toastQ.push(msg);
  if (!toasting) nextToast();
}
function nextToast() {
  const msg = toastQ.shift();
  if (!msg) { toasting = false; return; }
  toasting = true;
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(nextToast, 450);
  }, 2700);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignorar */ }
    ta.remove();
    return ok;
  }
}

/* ---------- Tema día/noche: 6:00 a 20:00 día, resto noche ---------- */
function applyTheme() {
  const h = new Date().getHours();
  const m = state.settings.theme;
  const t = m === 'day' || m === 'night' ? m : ((h >= 6 && h < 20) ? 'day' : 'night');
  if (root.dataset.theme !== t) root.dataset.theme = t;
  $('#metaTheme').setAttribute('content', t === 'day' ? '#e9f4ff' : '#070b1a');
}



/* ---------- Idioma (español / inglés) ---------- */
// Se traduce lo que aparece en pantalla con I18N.tr (ver i18n.js). Lo que escribe el usuario no se toca.
const T = s => (state.settings.lang === 'en' && window.I18N ? I18N.tr(s) : s);
const txtMap = new WeakMap();
const attrMap = new WeakMap();
const TR_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
let langObs = null;

const skipTr = n => { const p = n.nodeType === 1 ? n : n.parentElement; return !p || /^(SCRIPT|STYLE|CANVAS|TEXTAREA)$/.test(p.tagName) || !!p.closest('[translate="no"]'); };

function trAttr(e, a) {
  if (skipTr(e)) return;
  const v = e.getAttribute(a);
  if (!v) return;
  let rec = attrMap.get(e);
  if (rec && rec[a] && rec[a].en === v) return;
  const en = I18N.tr(v);
  if (en !== v) { if (!rec) { rec = {}; attrMap.set(e, rec); } rec[a] = { es: v, en }; e.setAttribute(a, en); }
  else if (rec) delete rec[a];
}

function trNode(n) {
  if (n.nodeType === 3) {
    if (skipTr(n)) return;
    const rec = txtMap.get(n);
    if (rec && n.data === rec.en) return;
    const es = n.data;
    const en = I18N.tr(es);
    if (en !== es) { txtMap.set(n, { es, en }); n.data = en; } else txtMap.delete(n);
  } else if (n.nodeType === 1) {
    if (skipTr(n)) return;
    TR_ATTRS.forEach(a => trAttr(n, a));
    n.childNodes.forEach(trNode);
  }
}

function revertNode(n) {
  if (n.nodeType === 3) {
    const rec = txtMap.get(n);
    if (rec && n.data === rec.en) n.data = rec.es;
    txtMap.delete(n);
  } else if (n.nodeType === 1) {
    const rec = attrMap.get(n);
    if (rec) Object.keys(rec).forEach(a => { if (n.getAttribute(a) === rec[a].en) n.setAttribute(a, rec[a].es); });
    attrMap.delete(n);
    n.childNodes.forEach(revertNode);
  }
}

function applyLang(rerender = true) {
  const en = state.settings.lang === 'en';
  document.documentElement.lang = en ? 'en' : 'es';
  if (!langObs) {
    langObs = new MutationObserver(muts => {
      if (state.settings.lang !== 'en') return;
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach(trNode);
        else if (m.type === 'characterData') trNode(m.target);
        else if (m.type === 'attributes') trAttr(m.target, m.attributeName);
      }
    });
  }
  langObs.disconnect();
  if (en) {
    langObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });
    trNode(document.body);
  } else revertNode(document.body);
  if (rerender) renderAll();
}

function renderAccount() {
  const a = state.account;
  $('#accIn').classList.toggle('hidden', !a);
  $('#accOut').classList.toggle('hidden', !!a);
  if (a) { $('#accName').textContent = a.name || a.email; $('#accMail').textContent = a.email; }
}

/* ---------- Apariencia: tema e idioma ---------- */
const THEME_OPTS = ['auto', 'day', 'night'];
function paintAppearance() {
  $('#themeSeg').dataset.idx = String(Math.max(0, THEME_OPTS.indexOf(state.settings.theme)));
  $('#langSeg').dataset.idx = state.settings.lang === 'en' ? '1' : '0';
}
function setTheme(m) {
  if (!THEME_OPTS.includes(m)) return;
  state.settings.theme = m;
  save();
  applyTheme();
  paintAppearance();
}
function setLang(l) {
  if (l !== 'es' && l !== 'en') return;
  state.settings.lang = l;
  save();
  paintAppearance();
  applyLang();
}

/* ---------- Pantalla de bienvenida ---------- */
let sp = 0;
let spRaf = 0;
let splashDone = false;
const easeOutCubic = k => 1 - Math.pow(1 - k, 3);

function setSp(v) {
  sp = Math.max(0, Math.min(1, v));
  root.style.setProperty('--sp', sp.toFixed(4));
}

function tweenSp(to, ms, cb) {
  const from = sp;
  const t0 = performance.now();
  root.classList.add('sp-live');
  cancelAnimationFrame(spRaf);
  const step = now => {
    const k = Math.min(1, (now - t0) / ms);
    setSp(from + (to - from) * easeOutCubic(k));
    if (k < 1) spRaf = requestAnimationFrame(step);
    else { root.classList.remove('sp-live'); if (cb) cb(); }
  };
  spRaf = requestAnimationFrame(step);
}

function finishSplash() {
  if (splashDone) return;
  splashDone = true;
  tweenSp(1, 800, () => {
    root.classList.add('entered');
    $('#splash').classList.add('hidden');
    afterSplash();
  });
}

function afterSplash() {
  [$('#appShell'), $('#tabbar'), $('#login'), $('#xpTop')].forEach(n => { n.inert = false; });
  if (!$('#app').classList.contains('hidden')) { moveIndicator(false); playEnter($('#view-' + currentTab), 'from-right'); }
  maybeTutorial();
}

function bindSplash() {
  const splash = $('#splash');
  [$('#appShell'), $('#tabbar'), $('#login'), $('#xpTop')].forEach(n => { n.inert = true; });
  setSp(0);

  let drag = null;
  splash.addEventListener('pointerdown', e => {
    if (splashDone) return;
    cancelAnimationFrame(spRaf);
    root.classList.add('sp-live');
    drag = { y0: e.clientY, p0: sp, last: e.clientY, lt: performance.now(), v: 0, moved: 0, hint: !!e.target.closest('#splashHint') };
    try { splash.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    splash.classList.add('grabbing');
  });
  splash.addEventListener('pointermove', e => {
    if (!drag) return;
    setSp(drag.p0 + (drag.y0 - e.clientY) / (window.innerHeight * 0.62));
    drag.moved = Math.max(drag.moved, Math.abs(drag.y0 - e.clientY));
    const now = performance.now();
    const dt = now - drag.lt;
    if (dt > 0) drag.v = 0.75 * drag.v + 0.25 * ((drag.last - e.clientY) / dt);
    drag.last = e.clientY;
    drag.lt = now;
  });
  const end = () => {
    if (!drag) return;
    const { v, moved, hint } = drag;
    drag = null;
    splash.classList.remove('grabbing');
    // un toque sobre "Desliza hacia arriba" también abre (accesibilidad)
    if (hint && moved < 8) finishSplash();
    else if (sp > 0.3 || v > 0.55) finishSplash();
    else tweenSp(0, 600, () => root.classList.remove('sp-live'));
  };
  splash.addEventListener('pointerup', end);
  splash.addEventListener('pointercancel', end);

  // Alternativas: rueda del ratón, teclado y toque en "Desliza hacia arriba"
  splash.addEventListener('wheel', e => { if (e.deltaY > 20) finishSplash(); }, { passive: true });
  splash.addEventListener('keydown', e => {
    if (['Enter', ' ', 'ArrowUp'].includes(e.key)) { e.preventDefault(); finishSplash(); }
  });
  $('#splashHint').addEventListener('click', finishSplash);
  splash.focus({ preventScroll: true });
}

/* ---------- Cuenta de Google ---------- */
// Inicio de sesión con Google Identity Services. Necesita un ID de cliente en config.js (ver README).
// Los datos siguen guardándose en este dispositivo: la cuenta solo identifica tu perfil.
const CFG = window.JERKON_CONFIG || {};
let gReady = false;

const needLogin = () => !state.account && !state.loginSkipped;

function decodeJwt(t) {
  const p = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4));
  return JSON.parse(decodeURIComponent([...bin].map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}

function onGoogleCredential(resp) {
  try {
    const p = decodeJwt(resp.credential);
    if (!p || !p.sub) throw new Error('sin sub');
    state.account = { sub: String(p.sub), name: p.name || '', email: p.email || '', picture: p.picture || '' };
    if (!state.me.name || state.me.name === 'Yo') { state.me.name = String(p.given_name || p.name || 'Yo').slice(0, 20); if (window.Srv) Srv.identify({ code: state.me.code, name: state.me.name }); }
    if (!state.me.photo && /^https:\/\//.test(p.picture || '')) state.me.photo = p.picture;
    state.loginSkipped = false;
    save();
    toast(`Sesión iniciada: ${state.account.email || state.account.name}`);
    hideLogin();
    renderAll();
  } catch { toast('No se pudo iniciar sesión con Google'); }
}

function loadGoogle(cb) {
  if (window.google && google.accounts && google.accounts.id) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = cb;
  s.onerror = () => { $('#loginMsg').textContent = 'No se pudo cargar Google. Revisa tu conexión.'; };
  document.head.appendChild(s);
}

function setupGoogleButton() {
  const box = $('#gBtn');
  if (!CFG.googleClientId) {
    $('#gFallback').classList.remove('hidden');
    $('#loginMsg').textContent = 'Falta configurar el ID de cliente de Google en config.js (mira el README).';
    return;
  }
  $('#gFallback').classList.add('hidden');
  $('#loginMsg').textContent = '';
  loadGoogle(() => {
    if (!gReady) { google.accounts.id.initialize({ client_id: CFG.googleClientId, callback: onGoogleCredential }); gReady = true; }
    box.innerHTML = '';
    google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 280 });
  });
}

function showLogin() {
  closeSheets();
  $('#chat').classList.remove('open');
  $('#settings').classList.remove('open');
  syncOverlayClass();
  openGroupId = null;
  $('#app').classList.add('hidden');
  $('#tabbar').classList.add('hidden');
  $('#xpTop').classList.add('hidden');
  $('#login').classList.remove('hidden', 'fade');
  setupGoogleButton();
}

function hideLogin() {
  const l = $('#login');
  if (!l.classList.contains('hidden')) {
    l.classList.add('fade');
    setTimeout(() => l.classList.add('hidden'), 450);
  }
  showApp();
  maybeTutorial();
}

function logout() {
  state.account = null;
  state.loginSkipped = false;
  save();
  $('#settings').classList.remove('open');
  syncOverlayClass();
  showLogin();
}

function showApp() {
  $('#app').classList.remove('hidden');
  $('#tabbar').classList.remove('hidden');
  $('#xpTop').classList.remove('hidden');
  renderAll();
  requestAnimationFrame(() => {
    moveIndicator(false);
    if (splashDone) playEnter($('#view-' + currentTab), 'from-right');
  });
}

/* ---------- Tutorial guiado (primera vez) ---------- */
const TOUR = [
  { t: '¡Bienvenido a HandShake! 👋', d: 'Un repaso rápido por todo lo que puedes hacer. Todo se guarda solo en tu móvil y puedes volver a verlo desde Ajustes.', tab: 'inicio' },
  { sel: '.streak-card', tab: 'inicio', t: 'Tu racha 🔥', d: 'Cuenta los días seguidos con registro. Cuanto más larga, más rollos extra ganas.' },
  { sel: '#passCard', tab: 'inicio', t: 'Pase de temporada 🎃', d: 'Sube de nivel con todo lo que haces y reclama premios. Hay una vía gratis y otra premium con objetos exclusivos de Noche Encantada.' },
  { sel: '#fab', tab: 'inicio', t: 'Nuevo registro ➕', d: 'Aquí anotas un registro con tu estado de ánimo y el efecto. Es lo primero que suma rollos cada día.' },
  { sel: '#view-historial .subnav', tab: 'historial', t: 'Historial 📅', d: 'Está junto a Inicio, arriba. Mira tu calendario y tus estadísticas: semanas, días y tiempo entre registros.' },
  { sel: '.tab[data-tab="duelos"]', tab: 'duelos', t: 'Juegos ⚔️', d: 'Seis minijuegos rápidos contra el robot o en línea con un amigo, cada uno desde su móvil. Ganar da rollos, con un tope de 50 al día. También hay torneos.' },
  { sel: '#view-tienda .subnav', tab: 'tienda', t: 'Tienda 🛍️', d: 'Está junto a Duelos, arriba. Canjea tus rollos 🧻 por iconos, fondos, colores de nombre, marcos animados y burbujas de mensaje. Cada día se renuevan 6 objetos de cada apartado y el icono te avisa con un punto rojo.' },
  { sel: '.tab[data-tab="amigos"]', tab: 'amigos', t: 'Amigos 👥', d: 'Añade amigos con su código, crea grupos y chatea. Tus registros aparecen en el chat y podéis lanzar eventos: dados, ruleta, predicción, semáforo y más.' },
  { sel: '.tab[data-tab="perfil"]', tab: 'perfil', t: 'Perfil 🙂', d: 'Tu foto, tu código de amigo, tus logros con marcos y tu inventario para equipar lo que compres.' },
  { sel: '#openSettings', tab: 'inicio', t: 'Ajustes ⚙️', d: 'Cambia el tema y el idioma, inicia sesión con Google o repite este tutorial cuando quieras.' },
  { t: '¡Todo listo! 🎉', d: 'Te regalamos 10 rollos 🧻 por terminar el tutorial. ¡A disfrutar!', last: true }
];
let tourI = -1;

function maybeTutorial() {
  if (state.tutorialDone || tourI >= 0) return;
  if (!splashDone || $('#app').classList.contains('hidden') || (!$('#login').classList.contains('hidden') && !$('#login').classList.contains('fade'))) return;
  setTimeout(() => { if (!state.tutorialDone && tourI < 0) startTour(); }, 700);
}

function startTour() {
  tourI = 0;
  $('#tour').classList.remove('hidden');
  requestAnimationFrame(() => $('#tour').classList.add('on'));
  tourShow(0);
}

function tourShow(i) {
  const st = TOUR[i];
  tourI = i;
  if (st.tab && st.tab !== currentTab) showTab(st.tab);
  const card = $('#tourCard');
  $('#tourN').textContent = `${i + 1} / ${TOUR.length}`;
  $('#tourT').textContent = T(st.t);
  $('#tourD').textContent = T(st.d);
  $('#tourPrev').classList.toggle('hidden', i === 0);
  $('#tourNext').textContent = T(st.last ? 'Terminar' : 'Siguiente');
  $('#tourSkip').classList.toggle('hidden', !!st.last);
  card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  const place = () => {
    if (tourI !== i) return;
    const hole = $('#tourHole');
    const target = st.sel ? $(st.sel) : null;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = target.getBoundingClientRect(), pad = 8;
      hole.classList.remove('none');
      hole.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border-radius:${Math.min(28, Math.max(16, r.height / 2 + pad))}px`;
      const below = r.top + r.height / 2 < innerHeight / 2;
      card.style.top = below ? Math.min(innerHeight - 230, r.bottom + 18) + 'px' : 'auto';
      card.style.bottom = below ? 'auto' : Math.max(12, innerHeight - r.top + 18) + 'px';
    } else {
      hole.classList.add('none');
      hole.style.cssText = `top:${innerHeight / 2}px;left:${innerWidth / 2}px;width:0;height:0`;
      card.style.top = Math.max(40, innerHeight / 2 - 120) + 'px';
      card.style.bottom = 'auto';
    }
  };
  setTimeout(place, st.tab ? 760 : 60);
}

function endTour(done) {
  const wasNew = !state.tutorialDone;
  state.tutorialDone = true;
  save();
  tourI = -1;
  $('#tour').classList.remove('on');
  setTimeout(() => $('#tour').classList.add('hidden'), 350);
  if (done && wasNew) rollsAdd(10, 'tutorial');
  showTab('inicio');
}

function bindTour() {
  $('#tourNext').addEventListener('click', () => { if (TOUR[tourI].last) endTour(true); else tourShow(tourI + 1); });
  $('#tourPrev').addEventListener('click', () => { if (tourI > 0) tourShow(tourI - 1); });
  $('#tourSkip').addEventListener('click', () => endTour(false));
  $('#btnTour').addEventListener('click', () => {
    $('#settings').classList.remove('open');
    syncOverlayClass();
    startTour();
  });
  window.addEventListener('resize', () => { if (tourI >= 0) tourShow(tourI); });
}

/* ---------- Estadísticas y racha ---------- */
function sortedEntries() {
  return [...state.entries].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

function computeStats() {
  const list = sortedEntries();
  const t = today();
  const res = { total: list.length, month: 0, weekAvg: 0, mood: null, curGap: null, maxGap: null, weeks: Array(8).fill(0), weekdays: Array(7).fill(0), lastText: '—' };
  if (!list.length) return res;

  const since = daysBetween(parse(list[list.length - 1].date), t);
  res.curGap = since;
  res.lastText = since === 0 ? 'Hoy' : since === 1 ? 'Ayer' : `Hace ${since} días`;

  res.month = list.filter(e => { const d = parse(e.date); return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth(); }).length;

  const w0 = startOfWeek(t);
  for (const e of list) {
    const diff = Math.floor(daysBetween(startOfWeek(parse(e.date)), w0) / 7);
    if (diff >= 0 && diff < 8) res.weeks[7 - diff]++;
    res.weekdays[(parse(e.date).getDay() + 6) % 7]++;
  }
  res.weekAvg = Math.round((res.weeks.reduce((a, b) => a + b, 0) / 8) * 10) / 10;

  const moods = list.map(e => Number(e.mood)).filter(Boolean);
  if (moods.length) res.mood = Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10;

  const dates = [...new Set(list.map(e => e.date))];
  let max = 0;
  for (let i = 1; i < dates.length; i++) max = Math.max(max, daysBetween(parse(dates[i - 1]), parse(dates[i])));
  res.maxGap = Math.max(max, since);
  return res;
}

// Racha: días seguidos con al menos un registro. Sigue viva si hoy aún no has registrado pero ayer sí.
function streakInfo() {
  const days = new Set(state.entries.map(e => e.date));
  const sh = state.settings.retain.shield ? new Set(state.retain.shield.used) : new Set(); // días cubiertos por el protector: no suman, pero no rompen
  const t = today();
  const loggedToday = days.has(ymd(t));
  let d = loggedToday ? t : addDays(t, -1);
  let cur = 0;
  while (days.has(ymd(d)) || sh.has(ymd(d))) { if (days.has(ymd(d))) cur++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  for (const s of [...days].sort()) {
    const dt = parse(s);
    const gap = prev ? daysBetween(prev, dt) : 0;
    run = prev && (gap === 1 || (gap === 2 && sh.has(ymd(addDays(prev, 1))))) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = dt;
  }
  return { cur, best: Math.max(best, cur), loggedToday, days };
}

let lastStreak = null;
function setStreakPill(node, n, animate) {
  node.innerHTML = '';
  const f = el('span', 'f', '🔥');
  node.append(f, el('b', '', String(n)));
  node.classList.toggle('cold', n === 0);
  node.setAttribute('aria-label', `Racha de ${n} días`);
  if (animate) replay(node, 'pop');
}

function renderStreak() {
  const s = streakInfo();
  const changed = lastStreak !== null && lastStreak !== s.cur;
  setStreakPill($('#streakPill'), s.cur, changed);
  setStreakPill($('#profStreak'), s.cur, changed);
  $('#streakNum').textContent = s.cur;
  if (changed) replay($('#streakNum'), 'pop');
  $('#fire').classList.toggle('cold', s.cur === 0);

  const t = today();
  const dots = $('#weekDots');
  dots.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    const on = s.days.has(ymd(d));
    const wd = el('div', 'wd' + (on ? ' on' : '') + (i === 0 ? ' today' : ''));
    wd.style.setProperty('--i', 6 - i);
    wd.append(el('i', '', on ? '🔥' : ''), el('span', '', DIAS[(d.getDay() + 6) % 7]));
    dots.appendChild(wd);
  }
  $('#streakHint').textContent =
    !state.entries.length ? 'Registra hoy para empezar tu racha.' :
    s.cur > 0 && !s.loggedToday ? 'Registra hoy para seguir con tu racha.' :
    s.cur === 0 ? 'Registra hoy para empezar una racha nueva.' :
    `Mejor racha: ${s.best} día${s.best === 1 ? '' : 's'}.`;
  const cta = $('#todayCta');
  cta.textContent = s.loggedToday ? '✅ Hoy ya registraste' : 'Añadir registro de hoy';
  cta.classList.toggle('primary', !s.loggedToday);
  lastStreak = s.cur;
}

/* ---------- Logros y marcos ---------- */
const FRAME_NAME = { mint: 'Menta', flame: 'Llama', fire: 'Fuego', gold: 'Oro', ocean: 'Océano', aurora: 'Aurora', rose: 'Rosa', violet: 'Violeta', crystal: 'Cristal', sunset: 'Atardecer' };

const ACH = [
  { id: 'primer-paso', icon: '🌱', title: 'Primer paso', desc: 'Haz tu primer registro', goal: 1, frame: 'mint', prog: () => state.entries.length },
  { id: 'racha-3', icon: '🔥', title: 'En llamas', desc: 'Consigue una racha de 3 días', goal: 3, frame: 'flame', prog: () => streakInfo().best },
  { id: 'racha-7', icon: '⚡', title: 'Imparable', desc: 'Consigue una racha de 7 días', goal: 7, frame: 'fire', prog: () => streakInfo().best },
  { id: 'racha-30', icon: '👑', title: 'Leyenda', desc: 'Consigue una racha de 30 días', goal: 30, frame: 'gold', prog: () => streakInfo().best },
  { id: 'regs-10', icon: '📈', title: 'Constante', desc: 'Haz 10 registros', goal: 10, frame: 'ocean', prog: () => state.entries.length },
  { id: 'regs-50', icon: '🏆', title: 'Veterano', desc: 'Haz 50 registros', goal: 50, frame: 'aurora', prog: () => state.entries.length },
  { id: 'notas-5', icon: '📝', title: 'Con palabras', desc: 'Escribe 5 notas en tus registros', goal: 5, frame: 'sunset', prog: () => state.entries.filter(e => e.note).length },
  { id: 'amigo-1', icon: '🤝', title: 'Primer amigo', desc: 'Añade un amigo con su código', goal: 1, frame: 'rose', prog: () => state.friends.length },
  { id: 'grupo-1', icon: '👥', title: 'En grupo', desc: 'Crea tu primer grupo', goal: 1, frame: 'violet', prog: () => state.groups.filter(g => !g.direct).length },
  { id: 'foto', icon: '📸', title: 'Cara visible', desc: 'Pon una foto de perfil', goal: 1, frame: 'crystal', prog: () => (state.me.photo ? 1 : 0) },
  { id: 'metas-7', icon: '🎯', title: 'Con rumbo', desc: 'Cumple 7 metas del día', goal: 7, frame: 'ocean', prog: () => state.retain.goalsDone },
  { id: 'semanas-3', icon: '📅', title: 'Semanas redondas', desc: 'Completa las 3 misiones semanales en 3 semanas', goal: 3, frame: 'sunset', prog: () => state.retain.weeksDone }
];

function checkAchievements(silent) {
  const fresh = [];
  for (const a of ACH) {
    if (!state.achievements[a.id] && a.prog() >= a.goal) {
      state.achievements[a.id] = Date.now();
      fresh.push(a);
    }
  }
  if (!fresh.length) return;
  if (!state.me.frame) state.me.frame = fresh[0].frame;
  save();
  if (!silent) toast(`🏅 Logro desbloqueado: ${fresh.map(a => a.title).join(', ')}. ¡Marco nuevo!`);
  rollsAdd(ROLL.logro * fresh.length, fresh.length === 1 ? 'logro' : 'logros', silent);
}

/* ---------- Avatar propio con marco ---------- */
function mountAva(host, size) {
  const a = el('span', 'ava');
  a.style.setProperty('--s', size + 'px');
  a.appendChild(el('span', 'ava-in'));
  host.insertBefore(a, host.firstChild);
  return a;
}

function updateAva(a, o) {
  const inn = a.firstChild;
  const key = o.icon ? 'i' + o.icon : o.photo ? 'p' + o.photo.length : 'n' + o.name;
  if (a.dataset.k !== key) {
    a.dataset.k = key;
    inn.textContent = '';
    inn.style.background = '';
    inn.style.fontSize = '';
    if (o.icon) {
      inn.textContent = o.icon;
      inn.style.fontSize = 'calc(var(--s) * .56)';
      inn.style.background = 'linear-gradient(135deg, rgba(255,255,255,.7), rgba(180,200,255,.35))';
    } else if (o.photo) {
      const img = new Image();
      img.alt = '';
      img.draggable = false;
      img.src = o.photo;
      inn.appendChild(img);
    } else paintAvatar(inn, o.name);
  }
  if (o.frame) a.dataset.frame = o.frame; else delete a.dataset.frame;
}

let hdrAva, bigAva;
function renderMe() {
  const o = { name: state.me.name, photo: state.me.photo, frame: state.me.frame, icon: state.shop.eq.icon };
  updateAva(hdrAva, o);
  updateAva(bigAva, o);
  $('#hello').textContent = state.me.name && state.me.name !== 'Yo' ? `Hola, ${state.me.name}` : 'Hola';
}

function fmtCodeNode(node, code) {
  node.textContent = '';
  node.append(code.slice(0, 4), Object.assign(el('span', 'l', code.slice(4))));
}

async function setPhotoFromFile(file) {
  if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const m = Math.min(img.naturalWidth, img.naturalHeight);
    c.getContext('2d').drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, S, S);
    URL.revokeObjectURL(url);
    state.me.photo = c.toDataURL('image/jpeg', 0.85);
    save();
    renderAll();
    toast('Foto actualizada');
  } catch { toast('No se pudo cargar esa imagen'); }
}

/* ---------- Perfil ---------- */
function renderProfile(animate) {
  const input = $('#nameInput');
  if (document.activeElement !== input) input.value = state.me.name === 'Yo' ? '' : state.me.name;
  fmtCodeNode($('#myCode'), state.me.code);
  fmtCodeNode($('#myCode2'), state.me.code);
  $('#photoDel').disabled = !state.me.photo;
  renderFrames();

  const done = ACH.filter(a => state.achievements[a.id]);
  const todo = ACH.filter(a => !state.achievements[a.id]);
  $('#achDoneLbl').textContent = `Logros completados · ${done.length}`;
  $('#achTodoLbl').textContent = `Por completar · ${todo.length}`;
  $('#achDoneTitle').classList.toggle('hidden', !done.length);
  $('#achDoneBody').classList.toggle('hidden', !done.length);
  $('#achTodoTitle').classList.toggle('hidden', !todo.length);
  $('#achTodoBody').classList.toggle('hidden', !todo.length);

  const fills = [];
  const fill = (ul, list, isDone) => {
    ul.innerHTML = '';
    list.forEach(a => ul.appendChild(achRow(a, isDone, animate, fills)));
  };
  fill($('#achDone'), done, true);
  fill($('#achTodo'), todo, false);

  if (animate) {
    requestAnimationFrame(() => requestAnimationFrame(() => fills.forEach(f => { f.style.width = f.dataset.w; })));
  }
}

function achRow(a, isDone, animate, fills) {
  const cur = Math.min(a.prog(), a.goal);
  const pct = Math.round((cur / a.goal) * 100) + '%';
  const li = el('li', 'glass row static ach' + (isDone ? ' done' : ''));
  const main = el('div', 'main');
  const track = el('div', 'track');
  const fill = el('div', 'fill');
  fill.dataset.w = pct;
  fill.style.width = animate ? '0%' : pct;
  if (animate) fills.push(fill);
  track.appendChild(fill);
  main.append(el('strong', '', a.title), el('small', '', a.desc), el('small', 'reward', `Marco: ${FRAME_NAME[a.frame]}`), track);

  const side = el('div', 'side');
  if (isDone) {
    const ck = el('span', 'check');
    ck.innerHTML = ICON.check;
    side.appendChild(ck);
  } else side.appendChild(el('span', '', `${cur}/${a.goal}`));
  li.append(el('span', 'ach-ico', a.icon), main, side);
  return li;
}

function renderFrames() { renderInventory(false); }

/* ---------- Navegación con transiciones ---------- */
const GROUP = { inicio: 'inicio', historial: 'inicio', duelos: 'duelos', tienda: 'duelos', amigos: 'amigos', perfil: 'perfil' };
const lastIn = {};
const ORDER = ['inicio', 'historial', 'duelos', 'tienda', 'amigos', 'perfil'];
const TITLES = { inicio: 'Inicio', historial: 'Historial', tienda: 'Tienda', duelos: 'Juegos', amigos: 'Amigos', perfil: 'Perfil' };
let currentTab = 'inicio';
let pendingSwitch = null;

// Coloca el indicador de cristal bajo la pestaña activa (se desliza con muelle)
function moveIndicator(animate = true) {
  const bar = $('#tabbar');
  const ind = $('#tabInd');
  const active = $('.tab.active');
  if (!active || bar.classList.contains('hidden')) return;
  const b = bar.getBoundingClientRect();
  const a = active.getBoundingClientRect();
  if (!b.width) return;
  if (!animate) ind.style.transition = 'none';
  ind.style.width = a.width + 'px';
  ind.style.height = a.height + 'px';
  ind.style.transform = `translate(${a.left - b.left - bar.clientLeft}px, ${a.top - b.top - bar.clientTop}px)`;
  if (!animate) { ind.getBoundingClientRect(); ind.style.transition = ''; }
}

function settleSwitch() {
  if (pendingSwitch) {
    clearTimeout(pendingSwitch.t);
    pendingSwitch.done();
    pendingSwitch = null;
  }
}

function playEnter(view, fromClass) {
  setStagger(view);
  view.classList.add('entering', fromClass);
  setTimeout(() => view.classList.remove('entering', fromClass), 900);
}

function showTab(name) {
  if (name === currentTab) return;
  settleSwitch();
  const from = $('#view-' + currentTab);
  const to = $('#view-' + name);
  const dir = ORDER.indexOf(name) > ORDER.indexOf(currentTab) ? 1 : -1;
  const [outCls, inCls] = dir > 0 ? ['to-left', 'from-right'] : ['to-right', 'from-left'];

  window.scrollTo(0, 0);
  if (name === 'perfil') renderProfile(true);
  if (name === 'inicio') renderStreak();
  if (name === 'tienda') { renderShop(true); markShopSeen(); }
  if (name === 'duelos') renderDuelos();
  setStagger(to);
  from.classList.add('leaving', outCls);
  to.classList.add('active', 'entering', inCls);

  const done = () => {
    from.classList.remove('active', 'leaving', outCls);
    to.classList.remove('entering', inCls);
  };
  pendingSwitch = { done, t: setTimeout(() => { done(); pendingSwitch = null; }, 700) };

  currentTab = name;
  if (name === 'historial') { RT().seen = { date: ymd(new Date()), hist: true }; save(); setTimeout(() => { goalPay(); renderGoal(); }, 600); }
  lastIn[GROUP[name]] = name;
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === GROUP[name]));
  $('#viewTitle').textContent = TITLES[name];
  replay($('#viewTitle'), 'swap');
  moveIndicator(true);
}

function syncOverlayClass() {
  document.body.classList.toggle('ov-open', !!$('.overlay.open'));
}

function openSheet(id) { $('#backdrop').classList.add('open'); $('#' + id).classList.add('open'); }
function closeSheets() {
  $$('.sheet.open').forEach(s => s.classList.remove('open'));
  $('#backdrop').classList.remove('open');
}

/* ---------- Render: inicio, calendario, estadísticas ---------- */
let viewMonth = new Date(today().getFullYear(), today().getMonth(), 1);

function renderAll() {
  checkAchievements(false);
  renderRetain();
  renderMe();
  renderStreak();
  const s = computeStats();

  $('#lastText').textContent = s.lastText;
  $('#monthCount').textContent = s.month;
  $('#weekAvg').textContent = s.weekAvg;
  renderRecent();

  $('#totalCount').textContent = s.total;
  $('#moodAvg').textContent = s.mood === null ? '—' : `${s.mood}/5`;
  $('#curGap').textContent = s.curGap === null ? '—' : `${s.curGap} d`;
  $('#maxGap').textContent = s.maxGap === null ? '—' : `${s.maxGap} d`;
  renderBars($('#chart'), s.weeks, s.weeks.map((_, i) => (i === 7 ? 'Esta' : `-${7 - i}`)));
  renderBars($('#weekdayChart'), s.weekdays, DIAS);
  renderFxStats();

  renderCalendar();
  renderSocial();
  renderProfile(false);
  renderRetainUi();
  weeklyPay();
  checkAchievements(false);
  renderRolls(false);
  applyCosmetics();
  if (currentTab === 'tienda') renderShop(false);
  renderAccount();
  renderPass();
}

function renderRecent() {
  const ul = $('#recent');
  ul.innerHTML = '';
  const list = sortedEntries().reverse().slice(0, 10);
  if (!list.length) { ul.appendChild(el('li', 'glass empty', 'Aún no hay registros. Toca el botón + para añadir el primero.')); return; }
  for (const e of list) {
    const li = el('li', 'glass row static');
    const d = parse(e.date);
    const main = el('div', 'main');
    main.appendChild(el('strong', '', `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}${e.time ? ' · ' + e.time : ''} ${EMOJIS[e.mood] || ''}${e.fx ? ' ' + FX[e.fx] : ''}`));
    if (e.note) main.appendChild(ut(el('small', '', e.note)));
    const del = el('button', 'icon-btn plain');
    del.setAttribute('aria-label', 'Borrar registro');
    del.innerHTML = ICON.x;
    del.addEventListener('click', () => {
      if (!confirm(T('¿Borrar este registro?'))) return;
      li.classList.add('removing');
      setTimeout(() => {
        state.entries = state.entries.filter(x => x.id !== e.id);
        save();
        renderAll();
      }, 280);
    });
    li.append(main, del);
    ul.appendChild(li);
  }
}

function renderFxStats() {
  const box = $('#fxStats');
  box.innerHTML = '';
  const counts = [0, 0, 0, 0, 0];
  state.entries.forEach(e => { if (e.fx >= 1 && e.fx <= 4) counts[e.fx]++; });
  for (let i = 1; i <= 4; i++) {
    const it = el('div', 'fx-stat');
    it.style.setProperty('--i', i - 1);
    it.append(el('span', 'fx-e', FX[i]), el('b', '', counts[i]), el('small', '', FX_LABEL[i]));
    box.appendChild(it);
  }
}

function renderBars(container, values, labels) {
  container.innerHTML = '';
  const max = Math.max(1, ...values);
  values.forEach((v, i) => {
    const col = el('div', 'bar-col');
    const bar = el('div', 'bar');
    bar.style.height = `${(v / max) * 85}px`;
    bar.style.setProperty('--i', i);
    col.append(el('span', 'bar-val', v), bar, el('span', '', labels[i]));
    container.appendChild(col);
  });
}

function renderCalendar() {
  $('#monthLabel').textContent = `${MESES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const grid = $('#calGrid');
  grid.innerHTML = '';
  const offset = (viewMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const marked = new Set(state.entries.map(e => e.date));
  const t = today();

  for (let i = 0; i < offset; i++) {
    const b = el('button', 'day empty');
    b.disabled = true;
    b.setAttribute('aria-hidden', 'true');
    b.tabIndex = -1;
    grid.appendChild(b);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
    const key = ymd(date);
    const b = el('button', 'day', d);
    b.setAttribute('aria-label', `${d} de ${MESES[date.getMonth()]}${marked.has(key) ? ', con registro' : ''}`);
    if (marked.has(key)) b.classList.add('marked');
    if (key === ymd(t)) b.classList.add('today');
    if (date > t) { b.classList.add('future'); b.disabled = true; }
    else b.addEventListener('click', () => openLog(key));
    grid.appendChild(b);
  }
}

function changeMonth(delta) {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
  renderCalendar();
  const g = $('#calGrid');
  g.classList.remove('slide-l', 'slide-r');
  replay(g, delta > 0 ? 'slide-r' : 'slide-l');
}

let hseg = 'cal';
function setHseg(v) {
  if (v === hseg) return;
  const toStats = v === 'stats';
  hseg = v;
  $('#segHist').dataset.idx = toStats ? 1 : 0;
  const show = $(toStats ? '#histStats' : '#histCal');
  const hide = $(toStats ? '#histCal' : '#histStats');
  hide.classList.add('hidden');
  show.classList.remove('hidden');
  show.style.setProperty('--dx', (toStats ? 36 : -36) + 'px');
  replay(show, 'pane-in');
}

/* ---------- Registro ---------- */
const notifyGroups = () => state.groups.filter(g => g.notify);

function updateNotifyRow() {
  const gs = notifyGroups();
  const show = gs.length > 0 && $('#fDate').value === ymd(new Date());
  $('#notifyBox').classList.toggle('hidden', !show);
  $('#fNotify').checked = show;
  $('#fShareNote').checked = true;
  $('#fShareFx').checked = true;
  $('#noteCollapse').classList.toggle('open', show);
  $('#notifyHint').textContent = `Tus chats verán tu ánimo (${gs.length} chat${gs.length === 1 ? '' : 's'})`;
}

let logFx = 0;
function setFx(n) {
  logFx = n;
  $$('#fxRow .fx').forEach(b => {
    const on = Number(b.dataset.fx) === n;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function openLog(dateStr) {
  const now = new Date();
  $('#fDate').value = dateStr || ymd(now);
  $('#fDate').max = ymd(now);
  $('#fTime').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  $('#fNote').value = '';
  $('input[name=mood][value="3"]').checked = true;
  setFx(0);
  updateNotifyRow();
  openSheet('sheetLog');
}

function saveLog() {
  const date = $('#fDate').value;
  if (!date || parse(date) > today()) { toast('Elige una fecha válida'); return; }
  const mood = Number($('input[name=mood]:checked').value);
  const note = $('#fNote').value.trim();
  const fx = logFx;
  const ts = Date.now();
  state.entries.push({ id: uid(), date, time: $('#fTime').value, mood, fx, note });

  let notified = 0;
  const share = !$('#notifyBox').classList.contains('hidden') && $('#fNotify').checked;
  if (share) {
    const sendNote = $('#fShareNote').checked;
    const sendFx = $('#fShareFx').checked;
    for (const g of notifyGroups()) {
      const em = { id: uid(), from: 'me', type: 'event', mood, fx: sendFx ? fx : 0, note: sendNote ? note : '', ts };
      g.messages.push(em);
      srvRelay(g, em);
      notified++;
    }
  }
  // Un registro de hoy cuenta para los eventos activos (reto relámpago, meta del grupo...)
  if (date === ymd(new Date())) {
    state.groups.forEach(g => evMarkRegistro(g, 'me', ts));
    const bonus = Math.min(3, Math.floor(streakInfo().cur / 7));
    dailyReward('reg', ROLL.registro + bonus, bonus ? 'registro del día + racha' : 'registro del día');
  }
  save();
  closeSheets();
  renderAll();
  toast(notified ? `Registro guardado · enviado a ${notified} chat${notified === 1 ? '' : 's'}` : 'Registro guardado');
}

/* ---------- Social: datos ---------- */
let seg = 'chats';
let openGroupId = null;
let reqOpen = false;

const groupById = id => state.groups.find(g => g.id === id);
const friendById = id => state.friends.find(f => f.id === id);
const senderName = from => (from === 'me' ? 'Tú' : (friendById(from) || {}).name || state.names[from] || 'Alguien');
const lastMsg = g => g.messages[g.messages.length - 1];
function chatName(g) {
  if (g.direct) { const f = friendById(g.members[0]); return f ? f.name : g.name; }
  return g.name;
}
function memberLine(g) {
  if (g.codes && !g.direct) return ['Tú', ...g.codes.filter(c => c !== state.me.code).map(c => ((state.friends.find(f => f.code === c) || {}).name || state.names[c] || 'Alguien'))].join(', ');
  const names = g.members.map(id => (friendById(id) || {}).name).filter(Boolean);
  return g.direct ? 'Chat directo' : ['Tú', ...names].join(', ');
}

function eventText(m) {
  return m.from === 'me' ? 'Tú añadiste un registro' : `${senderName(m.from)} añadió un registro`;
}
function previewText(g) {
  const m = lastMsg(g);
  if (!m) return 'Sin mensajes todavía';
  if (m.type === 'event') return `${eventText(m)}${m.mood ? ' ' + EMOJIS[m.mood] : ''}${m.fx ? ' ' + FX[m.fx] : ''}`;
  if (m.type === 'sys') return m.text;
  if (m.type === 'evento') {
    const f = (g.events || []).find(e => e.id === m.evId);
    return f ? `${senderName(m.from)} lanzó ${EV[f.kind].emoji} ${EV[f.kind].name}` : 'Evento';
  }
  return (m.from === 'me' ? 'Tú: ' : '') + m.text;
}

let lastBadge = 0;
function updateBadge() {
  const n = state.groups.reduce((a, g) => a + (g.unread || 0), 0) + state.requests.incoming.length;
  const b = $('#badge');
  b.textContent = n > 99 ? '99+' : n;
  b.classList.toggle('hidden', n === 0);
  if (n > lastBadge) replay(b, 'pop');
  lastBadge = n;
}

/* ---------- Social: render ---------- */
function renderSocial() {
  updateBadge();
  $('#srvNotice').classList.toggle('hidden', srvOn());
  $('#seg').dataset.idx = seg === 'chats' ? 0 : 1;
  $('#reqCard').classList.toggle('hidden', seg !== 'friends');
  $('#chatList').classList.toggle('hidden', seg !== 'chats');
  $('#friendList').classList.toggle('hidden', seg !== 'friends');
  $('#segAdd').textContent = seg === 'chats' ? '+ Crear grupo' : '+ Añadir con código';
  renderRequests();
  renderChatList();
  renderFriends();
}

function swapList() {
  const nodes = seg === 'chats' ? [$('#chatList')] : [$('#reqCard'), $('#friendList')];
  nodes.forEach(n => {
    n.classList.remove('swap-in', 'swap');
    const cls = n.tagName === 'UL' ? 'swap' : 'swap-in';
    if (cls === 'swap') setStagger(n);
    replay(n, cls);
    setTimeout(() => n.classList.remove(cls), 900);
  });
}

function renderChatList() {
  const ul = $('#chatList');
  ul.innerHTML = '';
  if (!state.groups.length) {
    ul.appendChild(el('li', 'glass empty', 'Aún no tienes chats. Añade amigos con su código en la pestaña Amigos y crea un grupo o escríbeles directamente.'));
    return;
  }
  const gs = [...state.groups].sort((a, b) => ((lastMsg(b) || {}).ts || b.created) - ((lastMsg(a) || {}).ts || a.created));
  for (const g of gs) {
    const li = el('li', 'glass row');
    const av = el('span', 'avatar');
    paintAvatar(av, chatName(g));
    const main = el('div', 'main');
    main.append(ut(el('strong', '', chatName(g))), el('small', '', previewText(g)));
    const side = el('div', 'side');
    const m = lastMsg(g);
    side.appendChild(el('span', '', m ? fmtShort(m.ts) : ''));
    if (activeEvent(g)) side.appendChild(el('span', 'live-ico', '⚡'));
    if (g.unread) side.appendChild(el('span', 'badge', g.unread));
    li.append(av, main, side);
    li.addEventListener('click', () => openChat(g.id));
    ul.appendChild(li);
  }
}

function renderFriends() {
  const ul = $('#friendList');
  ul.innerHTML = '';
  if (!state.friends.length) {
    ul.appendChild(el('li', 'glass empty', 'Todavía no tienes amigos. Pide su código y envíales una solicitud desde el bloque de arriba.'));
    return;
  }
  for (const f of state.friends) {
    const li = el('li', 'glass row');
    const av = el('span', 'avatar');
    paintAvatar(av, f.name);
    const main = el('div', 'main');
    const live = !!(f.srv && window.Srv && Srv.online);
    main.append(ut(el('strong', '', f.name)), el('small', '', (live ? (f.on ? '🟢 En línea · ' : '⚪ Desconectado · ') : '') + (f.code ? `Código ${f.code}` : 'Toca para chatear')));
    const del = el('button', 'icon-btn plain');
    del.setAttribute('aria-label', 'Quitar amigo');
    del.innerHTML = ICON.x;
    del.addEventListener('click', ev => {
      ev.stopPropagation();
      if (!confirm(T(`¿Quitar a ${f.name}? También saldrá de sus grupos y se borrará vuestro chat directo.`))) return;
      if (f.srv && !srvSend({ t: 'unfriend', code: f.code })) { toast('Necesitas conexión con el servidor para quitar a un amigo'); return; }
      li.classList.add('removing');
      setTimeout(() => { dropFriend(f); save(); renderSocial(); }, 280);
    });
    const acts = [];
    if (live && f.on) {
      const ch = el('button', 'icon-btn plain');
      ch.type = 'button';
      ch.setAttribute('aria-label', 'Retar a un duelo');
      ch.textContent = '🎮';
      ch.addEventListener('click', ev => { ev.stopPropagation(); openChallenge(f); });
      acts.push(ch);
    }
    li.append(av, main, ...acts, del);
    li.addEventListener('click', () => openDirect(f.id));
    ul.appendChild(li);
  }
}

/* ---------- Solicitudes de amistad ---------- */
function setCodeMsg(text, kind) {
  const m = $('#codeMsg');
  m.textContent = text || '';
  m.classList.remove('ok', 'err');
  if (kind) m.classList.add(kind);
}

function renderRequests() {
  const inc = state.requests.incoming;
  const out = state.requests.outgoing;
  $('#reqHead').setAttribute('aria-expanded', String(reqOpen));
  $('#reqBody').classList.toggle('open', reqOpen);
  $('#reqCount').textContent = inc.length;
  $('#reqCount').classList.toggle('hidden', inc.length === 0);
  // Punto en la pestaña "Amigos" del selector mientras estás viendo los chats
  $('#segBadge').textContent = inc.length;
  $('#segBadge').classList.toggle('hidden', inc.length === 0 || seg === 'friends');

  const ulIn = $('#reqIn');
  ulIn.innerHTML = '';
  if (!inc.length) ulIn.appendChild(el('li', 'empty small', 'Nadie te ha enviado solicitud todavía. Comparte tu código.'));
  for (const r of inc) {
    const li = el('li', 'glass row static req-row');
    const av = el('span', 'avatar');
    paintAvatar(av, r.name);
    const main = el('div', 'main');
    main.append(ut(el('strong', '', r.name)), el('small', '', `Código ${r.code}`));
    const acts = el('div', 'acts');
    const no = el('button', 'btn sm', 'Rechazar');
    no.type = 'button';
    no.addEventListener('click', () => rejectRequest(r.id, li));
    const yes = el('button', 'btn sm ok', 'Aceptar');
    yes.type = 'button';
    yes.addEventListener('click', () => acceptRequest(r.id, li));
    acts.append(no, yes);
    li.append(av, main, acts);
    ulIn.appendChild(li);
  }

  $('#reqOutBox').classList.toggle('hidden', !out.length);
  const ulOut = $('#reqOut');
  ulOut.innerHTML = '';
  for (const r of out) {
    const li = el('li', 'glass row static');
    const main = el('div', 'main');
    main.append(el('strong', '', r.code), el('small', '', 'Pendiente de que acepte'));
    const x = el('button', 'icon-btn plain');
    x.type = 'button';
    x.setAttribute('aria-label', 'Cancelar solicitud');
    x.innerHTML = ICON.x;
    x.addEventListener('click', () => {
      if (r.srv && !srvSend({ t: 'cancel', to: r.code })) { toast('Sin conexión con el servidor'); return; }
      li.classList.add('removing');
      setTimeout(() => {
        state.requests.outgoing = state.requests.outgoing.filter(o => o.id !== r.id);
        save();
        renderSocial();
      }, 280);
    });
    li.append(main, x);
    ulOut.appendChild(li);
  }
}

function sendRequest() {
  const code = normCode($('#codeInput').value);
  if (!CODE_RE.test(code)) return setCodeMsg('El código tiene 4 números y 3 letras, por ejemplo 4827KQM.', 'err');
  if (code === state.me.code) return setCodeMsg('Ese es tu propio código.', 'err');
  if (state.friends.some(f => f.code === code)) return setCodeMsg('Ya sois amigos.', 'err');
  if (state.requests.outgoing.some(r => r.code === code)) return setCodeMsg('Ya enviaste una solicitud a ese código.', 'err');
  if (state.requests.incoming.some(r => r.code === code)) return setCodeMsg('Esa persona ya te envió una solicitud: acéptala aquí abajo.', 'err');
  if (srvOn()) {
    if (!srvSend({ t: 'req', to: code })) return setCodeMsg('Sin conexión con el servidor. Inténtalo en unos segundos.', 'err');
    return setCodeMsg('Enviando solicitud…');
  }
  state.requests.outgoing.push({ id: uid(), code, ts: Date.now() });
  save();
  $('#codeInput').value = '';
  setCodeMsg('Solicitud enviada. Cuando la acepte, aparecerá en tus amigos.', 'ok');
  toast('Solicitud enviada');
  renderSocial();
}

function acceptRequest(id, li) {
  const r = state.requests.incoming.find(x => x.id === id);
  if (!r) return;
  // Con servidor, la amistad se crea al recibir su confirmación (evento 'accepted')
  if (r.srv) { if (!srvSend({ t: 'accept', from: r.code })) toast('Sin conexión con el servidor'); return; }
  if (li) li.classList.add('removing');
  setTimeout(() => {
    state.requests.incoming = state.requests.incoming.filter(x => x.id !== id);
    if (!state.friends.some(f => f.code === r.code)) state.friends.push({ id: uid(), name: r.name, code: r.code });
    save();
    renderAll();
    toast(`${r.name} y tú ya sois amigos 🎉`);
  }, li ? 280 : 0);
}

function rejectRequest(id, li) {
  const rq = state.requests.incoming.find(x => x.id === id);
  if (rq && rq.srv && !srvSend({ t: 'reject', from: rq.code })) { toast('Sin conexión con el servidor'); return; }
  if (li) li.classList.add('removing');
  setTimeout(() => {
    state.requests.incoming = state.requests.incoming.filter(x => x.id !== id);
    save();
    renderSocial();
  }, li ? 280 : 0);
}

// Punto de entrada de solicitudes que llegan de otras personas.
// Con un servidor real, aquí llegaría la solicitud de quien haya escrito tu código.
function receiveRequest(req) {
  if (state.friends.some(f => f.code === req.code) || state.requests.incoming.some(r => r.code === req.code)) return;
  state.requests.incoming.push(req);
  reqOpen = true;
  save();
  renderSocial();
  toast(`${req.name} quiere ser tu amigo`);
  systemNotify('Solicitud de amistad', `${req.name} quiere ser tu amigo`);
}

function goRequests() {
  seg = 'friends';
  reqOpen = true;
  renderSocial();
  swapList();
  setTimeout(() => $('#codeInput').focus({ preventScroll: true }), 450);
}

/* ---------- Social: grupos y chats directos ---------- */
function openGroupSheet() {
  if (!state.friends.length) {
    toast('Primero añade algún amigo con su código');
    goRequests();
    return;
  }
  $('#groupName').value = '';
  $('#gNotify').checked = true;
  const box = $('#groupFriends');
  box.innerHTML = '';
  for (const f of state.friends) {
    const label = el('label', 'pick');
    const av = el('span', 'avatar');
    av.style.cssText = 'width:34px;height:34px;font-size:.8rem';
    paintAvatar(av, f.name);
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = f.id;
    label.append(av, ut(el('span', '', f.name)), cb);
    box.appendChild(label);
  }
  openSheet('sheetGroup');
}

function createGroup() {
  const name = $('#groupName').value.trim();
  const members = $$('#groupFriends input:checked').map(i => i.value);
  if (!name) { toast('Ponle un nombre al grupo'); return; }
  if (!members.length) { toast('Elige al menos un amigo'); return; }
  const g = { id: uid(), name, members, notify: $('#gNotify').checked, messages: [], events: [], unread: 0, created: Date.now() };
  if (srvOn() && members.every(id => (friendById(id) || {}).srv)) {
    const codes = members.map(id => friendById(id).code);
    if (!srvSend({ t: 'gnew', gid: g.id, name, members: codes })) { toast('Sin conexión con el servidor'); return; }
    g.srv = true;
    g.codes = [state.me.code, ...codes];
  }
  state.groups.push(g);
  save();
  closeSheets();
  renderAll();
  openChat(g.id);
}

function ensureDirect(f) {
  let g = state.groups.find(x => x.direct && x.members[0] === f.id);
  if (!g) {
    g = { id: uid(), name: f.name, members: [f.id], direct: true, notify: false, messages: [], events: [], unread: 0, created: Date.now() };
    state.groups.push(g);
  }
  return g;
}

function openDirect(fid) {
  const f = friendById(fid);
  if (!f) return;
  const had = state.groups.some(x => x.direct && x.members[0] === fid);
  const g = ensureDirect(f);
  if (!had) { save(); renderSocial(); }
  openChat(g.id);
}

function openGroupInfo() {
  const g = groupById(openGroupId);
  if (!g) return;
  $('#giName').textContent = chatName(g);
  $('#giMembers').textContent = g.direct ? `Tú y ${chatName(g)}` : 'Miembros: ' + memberLine(g);
  $('#giNotify').checked = !!g.notify;
  $('#giDelete').textContent = g.direct ? 'Eliminar chat' : 'Eliminar grupo';
  openSheet('sheetGroupInfo');
}

/* ---------- Chat ---------- */
function openChat(id) {
  const g = groupById(id);
  if (!g) return;
  openGroupId = id;
  g.unread = 0;
  save();
  renderChat(false);
  $('#chat').classList.add('open');
  syncOverlayClass();
  renderSocial();
}

function closeChat() {
  openGroupId = null;
  $('#chat').classList.remove('open');
  syncOverlayClass();
  renderSocial();
}

// Tarjeta de registro: muestra el ánimo (y la nota, si la compartió) tal cual se subió
function regCard(m) {
  const mine = m.from === 'me';
  const c = el('div', 'reg glass ' + (mine ? 'me' : 'them'));
  if (!mine) c.appendChild(ut(el('span', 'who', senderName(m.from))));
  c.appendChild(el('span', 'reg-title', mine ? 'Tú añadiste un registro' : 'Añadió un registro'));
  const row = el('div', 'reg-mood');
  row.append(el('span', 'reg-emoji', EMOJIS[m.mood]), el('span', 'reg-label', `Ánimo: ${MOOD_LABEL[m.mood]}`));
  c.appendChild(row);
  if (m.fx) {
    const f = el('div', 'reg-fx');
    f.append(el('span', 'reg-fx-e', FX[m.fx]), el('span', '', FX_DESC[m.fx]));
    c.appendChild(f);
  }
  if (m.note) c.appendChild(ut(el('p', 'reg-note', m.note)));
  c.appendChild(el('time', '', fmtClock(m.ts)));
  return c;
}

function renderChat(animateLast) {
  const g = groupById(openGroupId);
  if (!g) return;
  paintAvatar($('#chatAvatar'), chatName(g));
  $('#chatName').textContent = chatName(g);
  $('#chatMembers').textContent = memberLine(g);

  const box = $('#msgs');
  box.innerHTML = '';
  let lastDay = '';
  for (const m of g.messages) {
    const day = new Date(m.ts).toDateString();
    if (day !== lastDay) { lastDay = day; box.appendChild(el('div', 'day-sep', dayLabel(m.ts))); }
    if (m.type === 'sys') { box.appendChild(el('div', 'glass event sys', m.text)); continue; }
    if (m.type === 'evento') {
      const ev = (g.events || []).find(e => e.id === m.evId);
      if (ev) box.appendChild(eventCard(g, ev));
      continue;
    }
    if (m.type === 'event') {
      box.appendChild(m.mood ? regCard(m) : el('div', 'glass event', `${eventText(m)} · ${fmtClock(m.ts)}`));
      continue;
    }
    const b = el('div', m.from === 'me' ? 'bubble me' : 'bubble them glass');
    if (m.from === 'me' && state.shop.eq.bubble) b.dataset.bub = state.shop.eq.bubble;
    if (m.from !== 'me' && !g.direct) b.appendChild(ut(el('span', 'who', senderName(m.from))));
    b.appendChild(ut(el('span', 'txt', m.text)));
    b.appendChild(el('time', '', fmtClock(m.ts) + (m.pending ? ' ⏳' : '')));
    box.appendChild(b);
  }
  syncEvBtn();
  if (animateLast && box.lastElementChild) box.lastElementChild.classList.add('new');
  box.scrollTo({ top: box.scrollHeight, behavior: animateLast ? 'smooth' : 'auto' });
}

function sendMessage(ev) {
  ev.preventDefault();
  const g = groupById(openGroupId);
  const text = $('#msgInput').value.trim();
  if (!g || !text) return;
  const sm = { id: uid(), from: 'me', type: 'text', text, ts: Date.now() };
  g.messages.push(sm);
  srvRelay(g, sm);
  $('#msgInput').value = '';
  if (g.direct) dailyReward('direct', ROLL.directo, 'hablar con un amigo');
  else dailyReward('group', ROLL.grupo, 'hablar en un grupo');
  save();
  renderChat(true);
  renderSocial();
}

// Punto de entrada para mensajes de otras personas.
// Con un servidor real, aquí llegarían los mensajes por WebSocket / Firebase / Supabase.
function receive(g, m) {
  g.messages.push(m);
  // Si alguien sube un registro mientras hay un evento activo, cuenta para el evento
  if (m.type === 'event') evMarkRegistro(g, m.from, m.ts);
  const viewing = openGroupId === g.id;
  if (viewing) renderChat(true); else g.unread = (g.unread || 0) + 1;
  save();
  renderSocial();

  const who = senderName(m.from);
  let body;
  if (m.type === 'event') body = `${who} añadió un registro ${EMOJIS[m.mood] || ''}${m.fx ? ' ' + FX[m.fx] : ''}`.trim();
  else if (m.type === 'evento') {
    const f = (g.events || []).find(e => e.id === m.evId);
    body = f ? `${who} lanzó ${EV[f.kind].emoji} ${EV[f.kind].name}` : `${who} lanzó un evento`;
  } else body = `${who}: ${m.text}`;
  if (!viewing) toast(`${chatName(g)} · ${body}`);
  systemNotify(chatName(g), body);
}

function systemNotify(title, body) {
  if (state.settings.browserNotif && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body: T(body) }); } catch { /* ignorar */ }
  }
}


/* ---------- Servidor: amigos, solicitudes, chat e invitaciones ---------- */
// Sin servidor (Srv.enabled = false) todo sigue en local con el modo prueba.
const srvOn = () => !!(window.Srv && Srv.enabled);
const srvSend = o => !!(window.Srv && Srv.send(o));
const friendByCode = c => state.friends.find(f => f.code === c);
const ERR_REQ = {
  'no-user': 'No existe nadie con ese código. Revisa que esté bien escrito y que esa persona ya haya abierto la app.',
  friends: 'Ya sois amigos.', pending: 'Ya enviaste una solicitud a ese código.',
  full: 'Has llegado al máximo de amigos.', many: 'Tienes demasiadas solicitudes pendientes.', code: 'Código no válido.'
};

function dropFriend(f) {
  state.friends = state.friends.filter(x => x.id !== f.id);
  state.groups = state.groups.filter(g => !(g.direct && g.members[0] === f.id));
  state.groups.forEach(g => { g.members = g.members.filter(id => id !== f.id); });
}

function toLocalMsg(m, from) {
  const b = m.m || {};
  const o = { id: m.id, from, ts: Math.min(Date.now(), (m.ts || Date.now()) - (window.Srv ? Srv.skew : 0)), type: b.type };
  if (b.type === 'text') o.text = b.text;
  else { o.mood = Number(b.mood) || 0; o.fx = Number(b.fx) || 0; o.note = b.note || ''; }
  return o;
}

// Envía un mensaje propio al servidor; si no hay conexión queda pendiente (⏳) y sale al reconectar
function srvRelay(g, m) {
  if (!srvOn() || (m.type !== 'text' && m.type !== 'event')) return;
  let to = null;
  if (g.direct) { const f = friendById(g.members[0]); if (!f || !f.srv) return; to = f.code; }
  else if (!g.srv) return;
  const body = m.type === 'text' ? { type: 'text', text: m.text } : { type: 'event', mood: m.mood, fx: m.fx || 0, note: m.note || '' };
  const ok = srvSend(g.direct ? { t: 'dm', to, id: m.id, m: body } : { t: 'gm', gid: g.id, id: m.id, m: body });
  if (ok) delete m.pending; else m.pending = true;
}
function srvFlush() {
  for (const g of state.groups) for (const m of g.messages) if (m.pending && m.from === 'me') srvRelay(g, m);
}

function addServerGroup(s) {
  Object.entries(s.names || {}).forEach(([c, n]) => { state.names[c] = n; });
  if (groupById(s.gid)) return null;
  const members = s.members.filter(c => c !== state.me.code).map(c => (friendByCode(c) || {}).id).filter(Boolean);
  const g = { id: s.gid, name: s.name, members, codes: s.members, notify: false, srv: true, messages: [], events: [], unread: 0, created: Date.now() };
  state.groups.push(g);
  return g;
}

function srvReady(m) {
  state.names[m.me.code] = m.me.name;
  m.friends.forEach(s => {
    state.names[s.code] = s.name;
    let f = friendByCode(s.code);
    if (!f) { f = { id: uid(), name: s.name, code: s.code }; state.friends.push(f); }
    f.srv = true;
    f.name = s.name;
  });
  state.friends.filter(f => f.srv && !m.friends.some(s => s.code === f.code)).forEach(dropFriend);
  state.friends.forEach(f => { f.on = m.online.includes(f.code); });
  const inOld = state.requests.incoming, outOld = state.requests.outgoing;
  state.requests.incoming = inOld.filter(r => !r.srv).concat(m.inReq.map(r => inOld.find(o => o.srv && o.code === r.code) || { id: uid(), name: r.name, code: r.code, ts: r.ts, srv: true }));
  state.requests.outgoing = outOld.filter(r => !r.srv).concat(m.outReq.map(r => outOld.find(o => o.srv && o.code === r.code) || { id: uid(), code: r.code, ts: r.ts, srv: true }));
  m.groups.forEach(addServerGroup);
  srvFlush();
  save();
  renderAll();
}

function onSrvMsg(m) {
  switch (m.t) {
    case 'ready': srvReady(m); return;
    case 'req':
      state.names[m.from] = m.name;
      if (!friendByCode(m.from)) receiveRequest({ id: uid(), name: m.name, code: m.from, ts: m.ts, srv: true });
      return;
    case 'ok':
      if (m.re === 'req') {
        state.names[m.to] = m.name;
        state.requests.outgoing.push({ id: uid(), code: m.to, ts: Date.now(), srv: true });
        save();
        $('#codeInput').value = '';
        setCodeMsg(state.me.name === 'Yo' ? 'Solicitud enviada. Ponte un nombre en Perfil para que te reconozcan.' : 'Solicitud enviada. Cuando la acepte, aparecerá en tus amigos.', 'ok');
        toast('Solicitud enviada');
        renderSocial();
      }
      return;
    case 'err':
      if (m.re === 'req') setCodeMsg(ERR_REQ[m.why] || 'No se pudo enviar la solicitud.', 'err');
      else if (m.re === 'gnew') toast('No se pudo crear el grupo en el servidor');
      return;
    case 'accepted': {
      state.names[m.code] = m.name;
      state.requests.incoming = state.requests.incoming.filter(r => r.code !== m.code);
      state.requests.outgoing = state.requests.outgoing.filter(r => r.code !== m.code);
      let f = friendByCode(m.code);
      const isNew = !f;
      if (!f) { f = { id: uid(), name: m.name, code: m.code }; state.friends.push(f); }
      f.srv = true; f.name = m.name; f.on = !!m.online;
      setCodeMsg('');
      save();
      renderAll();
      if (isNew) toast(`${m.name} y tú ya sois amigos 🎉`);
      return;
    }
    case 'rejected':
    case 'cancelled': {
      const c = m.code || m.from;
      state.requests.outgoing = state.requests.outgoing.filter(r => r.code !== c);
      state.requests.incoming = state.requests.incoming.filter(r => r.code !== c);
      save(); renderSocial();
      return;
    }
    case 'unfriended': {
      const f = friendByCode(m.code);
      if (f) { dropFriend(f); if (openGroupId && !groupById(openGroupId)) closeChat(); save(); renderAll(); }
      return;
    }
    case 'dm': {
      const f = friendByCode(m.from);
      if (!f) return;
      const g = ensureDirect(f);
      if (g.messages.some(x => x.id === m.id)) return;
      receive(g, toLocalMsg(m, f.id));
      return;
    }
    case 'group': {
      const g = addServerGroup(m);
      if (g) { save(); renderSocial(); toast(`Te han añadido al grupo ${m.name}`); }
      return;
    }
    case 'gm': {
      const g = groupById(m.gid);
      if (!g || g.messages.some(x => x.id === m.id)) return;
      const f = friendByCode(m.from);
      receive(g, toLocalMsg(m, f ? f.id : m.from));
      return;
    }
    case 'gleft': {
      const g = groupById(m.gid);
      if (!g) return;
      const f = friendByCode(m.code);
      if (f) g.members = g.members.filter(id => id !== f.id);
      if (g.codes) g.codes = g.codes.filter(c => c !== m.code);
      g.messages.push({ id: uid(), type: 'sys', text: `${(f || {}).name || state.names[m.code] || 'Alguien'} salió del grupo`, ts: Date.now() });
      save(); renderSocial(); if (openGroupId === g.id) renderChat(true);
      return;
    }
    case 'pres': {
      const f = friendByCode(m.code);
      if (f) { f.on = !!m.on; renderFriends(); }
      return;
    }
    case 'fname': {
      state.names[m.code] = m.name;
      const f = friendByCode(m.code);
      if (f) { f.name = m.name; save(); renderSocial(); }
      return;
    }
    case 'evt': onSrvEvent(m); return;
    case 'inv': srvInvite(m); return;
    case 'invr': srvInviteReply(m); return;
  }
}

/* --- Eventos de chat entre móviles --- */
function chatTarget(g) {
  if (!srvOn()) return null;
  if (g.direct) { const f = friendById(g.members[0]); return f && f.srv ? { to: f.code } : null; }
  return g.srv ? { gid: g.id } : null;
}
function evSyncLaunch(g, ev) {
  const t = chatTarget(g);
  if (!t) return;
  const e = { id: ev.id, kind: ev.kind, dur: ev.dur };
  if (ev.q) e.q = ev.q;
  if (ev.kind === 'encuesta') e.opts = ev.opts;
  if (ev.kind === 'meta') e.goal = ev.goal;
  if (ev.kind === 'prediccion') e.coin = ev.coin;
  if (!srvSend(Object.assign({ t: 'evt', p: { op: 'launch', ev: e } }, t))) toast('Sin conexión: el evento solo lo verás tú');
}
function evSync(g, ev, v) {
  const t = chatTarget(g);
  if (t) srvSend(Object.assign({ t: 'evt', p: { op: 'act', evId: ev.id, v } }, t));
}
function onSrvEvent(m) {
  const f = friendByCode(m.from);
  if (!f) return;
  const g = m.gid ? groupById(m.gid) : ensureDirect(f);
  if (!g) return;
  const p = m.p || {};
  if (p.op === 'launch') {
    const e = p.ev;
    if (!e || findEvent(e.id) || activeEvent(g) || !EV[e.kind]) return;
    const ev = makeEvent(e.kind, { by: f.id, dur: e.dur, q: e.q, opts: e.opts, goal: e.goal });
    ev.id = e.id;
    if (e.coin !== undefined) ev.coin = e.coin;
    ev.start = Math.min(Date.now(), (m.ts || Date.now()) - Srv.skew);
    ev.end = ev.start + ev.dur * 60000;
    receiveEvent(g, ev);
  } else if (p.op === 'act') {
    const found = findEvent(p.evId);
    if (!found || found.g !== g || found.ev.status !== 'active') return;
    const ev = found.ev, v = Number(p.v);
    if (ev.kind === 'encuesta' || ev.kind === 'semaforo') { if (v < ev.opts.length) evVote(g, ev, f.id, v); }
    else if (ev.kind === 'pulso') { if (v >= 1 && v <= 5) evMood(g, ev, f.id, v); }
    else if (ev.kind === 'dado') { if (v >= 1 && v <= 6) evDado(g, ev, f.id, v); }
    else if (ev.kind === 'ruleta') { if (WHEEL.includes(v)) evSpin(g, ev, f.id, v); }
    else if (ev.kind === 'prediccion') { if (v === 0 || v === 1) evPick(g, ev, f.id, v); }
  }
}

/* --- Retos: invitar a un amigo conectado a un duelo --- */
let invOut = null, invIn = null;

function openChallenge(f) {
  if (!window.RTCPeerConnection) { toast('Tu navegador no admite partidas en línea'); return; }
  if (!window.Srv || !Srv.online) { toast('Sin conexión con el servidor'); return; }
  $('#chWho').textContent = f.name;
  const box = $('#chGames');
  box.innerHTML = '';
  DUELS.forEach(d => {
    const b = el('button', 'btn', `${d.emoji} ${d.name}`);
    b.type = 'button';
    b.addEventListener('click', () => startInvite(f, d.id));
    box.appendChild(b);
  });
  openSheet('sheetChallenge');
}

async function startInvite(f, gameId) {
  const Net = window.DuelNet;
  const info = DUELS.find(d => d.id === gameId);
  olGame = gameId;
  Net.close();
  closeSheets();
  ['olChoose', 'olHostBox', 'olJoinBox', 'olAnswerBox', 'olJoinCodeBox', 'olManualChoose'].forEach(x => $('#' + x).classList.add('hidden'));
  $('#olRoomBox').classList.remove('hidden');
  $('#olCode').textContent = '········';
  $('#olTitle').textContent = `${info.emoji} ${info.name} · Reto 🎮`;
  openSheet('sheetOnline');
  olSet('Creando partida…');
  try {
    const room = await Net.createRoom();
    $('#olCode').textContent = room;
    const id = uid();
    invOut = { id, to: f.code, name: f.name };
    if (!srvSend({ t: 'inv', to: f.code, id, game: gameId, room })) throw new Error('sin conexión con el servidor');
    olSet('Esperando a que tu amigo acepte…');
  } catch (e) { olSet('No se pudo invitar: ' + e.message); }
}

function srvInvite(m) {
  const f = friendByCode(m.from);
  const busy = (duel && duel.mode !== 'solo') || invIn || !f || !window.RTCPeerConnection;
  if (busy) { srvSend({ t: 'invr', to: m.from, id: m.id, ok: false }); return; }
  const info = DUELS.find(d => d.id === m.game) || DUELS[0];
  invIn = m;
  $('#invWho').textContent = f.name;
  $('#invGame').textContent = `${info.emoji} ${info.name}`;
  openSheet('sheetInv');
  systemNotify('Reto de duelo', `${f.name} te reta a ${info.name}`);
  setTimeout(() => { if (invIn === m) invAnswer(false); }, 60000);
}

async function invAnswer(ok) {
  const m = invIn;
  if (!m) return;
  invIn = null;
  closeSheets();
  srvSend({ t: 'invr', to: m.from, id: m.id, ok });
  if (!ok) return;
  window.DuelNet.close();
  try { await window.DuelNet.joinRoom(m.room); toast('Conectando…'); }
  catch (e) { toast('No se pudo unir: ' + e.message); }
}

function srvInviteReply(m) {
  if (!invOut || invOut.id !== m.id) return;
  if (m.ok) { olSet('Tu amigo aceptó. Conectando…'); return; }
  toast(m.why === 'offline' ? `${invOut.name} no está conectado` : `${invOut.name} no puede jugar ahora`);
  invOut = null;
  window.DuelNet.close();
  closeSheets();
}

/* --- Estado de la conexión (Ajustes) --- */
let srvRegen = 0;
function srvStatusUI() {
  const st = Srv.status;
  const txt = {
    none: 'Sin servidor: la app funciona solo en este móvil (modo prueba).',
    connecting: 'Conectando con el servidor…',
    online: 'Conectado ✅ Tu código es ' + state.me.code,
    offline: 'Sin conexión. Reintentando…',
    error: Srv.why === 'taken' ? 'Este código ya lo usa otro dispositivo. Pulsa "Cambiar mi código".' : 'No se pudo entrar en el servidor.'
  }[st] || '';
  $('#srvState').textContent = txt;
  $('#srvDot').className = 'srv-dot ' + st;
  $('#srvNewCode').classList.toggle('hidden', !(st === 'error' && Srv.why === 'taken'));
  $('#simCard').classList.toggle('hidden', Srv.enabled);
  if (document.activeElement !== $('#srvUrl')) $('#srvUrl').value = Srv.url;
}
function onSrvStatus(st, why) {
  // Código repetido y todavía sin amigos en el servidor: se estrena otro sin avisar
  if (st === 'error' && why === 'taken' && !state.friends.some(f => f.srv) && srvRegen++ < 5) {
    state.me.code = genCode();
    save();
    renderAll();
    Srv.identify({ code: state.me.code, name: state.me.name }, true);
    return;
  }
  srvStatusUI();
  if (st === 'online') renderSocial();
}
function bindSrv() {
  $('#srvSave').addEventListener('click', async () => { await Srv.setUrl($('#srvUrl').value); srvStatusUI(); });
  $('#srvNewCode').addEventListener('click', () => {
    if (!confirm(T('Tu código cambiará y tus amigos del servidor tendrán que volver a añadirte. ¿Continuar?'))) return;
    state.me.code = genCode();
    state.friends = state.friends.filter(f => !f.srv);
    save();
    renderAll();
    Srv.identify({ code: state.me.code, name: state.me.name }, true);
  });
  $('#invYes').addEventListener('click', () => invAnswer(true));
  $('#invNo').addEventListener('click', () => invAnswer(false));
  Srv.onmsg = onSrvMsg;
  Srv.onstatus = onSrvStatus;
  Srv.start({ code: state.me.code, name: state.me.name }).then(srvStatusUI);
}

/* ---------- Rollos de papel 🧻 y tienda ---------- */
// Se ganan con: un registro al día, hablar al día con un amigo o en un grupo, logros y eventos de chat.
// Se canjean por iconos de perfil, fondos, color de nombre y marcos animados.
const ROLL = { registro: 3, directo: 2, grupo: 2, logro: 10, retoOk: 4, voto: 2, pulso: 2, meta: 2, bonus: 3 };

const SHOP = {
  icons: [
    { id: '😎', name: 'Gafas', price: 15 }, { id: '🦊', name: 'Zorro', price: 20 }, { id: '🐼', name: 'Panda', price: 20 },
    { id: '🌵', name: 'Cactus', price: 25 }, { id: '👻', name: 'Fantasma', price: 25 }, { id: '🤖', name: 'Robot', price: 30 },
    { id: '🚀', name: 'Cohete', price: 30 }, { id: '🐙', name: 'Pulpo', price: 35 }, { id: '🦄', name: 'Unicornio', price: 40 },
    { id: '🍆', name: 'Berenjena', price: 40 }, { id: '🧻', name: 'Rollo de oro', price: 60 },
    { id: '🐢', name: 'Tortuga', price: 20 }, { id: '🍑', name: 'Melocotón', price: 30 }, { id: '🦖', name: 'Dino', price: 40 },
    { id: '🐲', name: 'Dragón', price: 50 }, { id: '💎', name: 'Diamante', price: 70 }, { id: '👑', name: 'Corona', price: 80 }
  ],
  skins: [
    { id: 'sunset', name: 'Atardecer', price: 25, sw: ['#ffb36b', '#ff6f91', '#7c5cff'] },
    { id: 'forest', name: 'Bosque', price: 25, sw: ['#7be495', '#2bb39a', '#17624c'] },
    { id: 'sakura', name: 'Sakura', price: 30, sw: ['#ffc2d9', '#ff8fb8', '#c9a4ff'] },
    { id: 'neon', name: 'Neón', price: 40, sw: ['#00f0ff', '#ff2bd6', '#9b5cff'] },
    { id: 'deep', name: 'Abismo', price: 40, sw: ['#1ea0ff', '#2a4bd6', '#0a1a5c'] },
    { id: 'galaxy', name: 'Galaxia', price: 60, sw: ['#b06bff', '#ff5ccf', '#3a2a8f'] },
    { id: 'aurora', name: 'Aurora', price: 45, sw: ['#34d399', '#38bdf8', '#a78bfa'] },
    { id: 'candy', name: 'Caramelo', price: 35, sw: ['#ff9ad5', '#9be7ff', '#ffe27a'] },
    { id: 'lava', name: 'Lava', price: 50, sw: ['#ff5e1a', '#c1121f', '#ffb703'] },
    { id: 'mono', name: 'Monocromo', price: 30, sw: ['#e5e5e5', '#8a8a8a', '#2b2b2b'] }
  ],
  colors: [
    { id: 'rose', name: 'Rosa', price: 15 }, { id: 'sky', name: 'Cielo', price: 15 }, { id: 'mint', name: 'Menta', price: 20 },
    { id: 'gold', name: 'Oro', price: 35 }, { id: 'rainbow', name: 'Arcoíris', price: 50 },
    { id: 'ocean', name: 'Océano', price: 25 }, { id: 'violet', name: 'Violeta', price: 25 }, { id: 'candy', name: 'Caramelo', price: 30 }, { id: 'lava', name: 'Lava', price: 45 }
  ],
  frames: [
    { id: 'neon', name: 'Neón', price: 35 }, { id: 'rainbow', name: 'Arcoíris', price: 40 }, { id: 'toxic', name: 'Tóxico', price: 45 },
    { id: 'plasma', name: 'Plasma', price: 55 }, { id: 'nebula', name: 'Nebulosa', price: 70 },
    { id: 'ember', name: 'Ascuas', price: 40 }, { id: 'frost', name: 'Escarcha', price: 45 }, { id: 'glitch', name: 'Glitch', price: 60 }, { id: 'royal', name: 'Real', price: 80 }
  ]
};
SHOP.frames.forEach(f => { FRAME_NAME[f.id] = f.name; });
/* ---------- Más cosméticos, burbujas de mensaje y rotación diaria de la tienda ---------- */
SHOP.icons.push(
  { id: '🐱', name: 'Gato', price: 15 }, { id: '🐶', name: 'Perro', price: 15 }, { id: '🐸', name: 'Rana', price: 20 },
  { id: '🍕', name: 'Pizza', price: 20 }, { id: '🦉', name: 'Búho', price: 25 }, { id: '🎮', name: 'Mando', price: 30 },
  { id: '⚡', name: 'Rayo', price: 30 }, { id: '🔥', name: 'Fuego', price: 35 }, { id: '🌈', name: 'Arcoíris', price: 35 }, { id: '🛸', name: 'Ovni', price: 45 }
);
SHOP.skins.push(
  { id: 'ice', name: 'Hielo', price: 30, sw: ['#bfe9ff', '#7cc7ff', '#e8f6ff'] },
  { id: 'desert', name: 'Desierto', price: 30, sw: ['#ffd58a', '#e8954a', '#b5542a'] },
  { id: 'cherry', name: 'Cereza', price: 35, sw: ['#ff5c7a', '#b0102f', '#ffb3c1'] },
  { id: 'midnight', name: 'Medianoche', price: 40, sw: ['#3b2a8f', '#0f1b45', '#6b5cff'] },
  { id: 'tropic', name: 'Trópico', price: 45, sw: ['#19e0a8', '#ffd23f', '#ff6f91'] },
  { id: 'cotton', name: 'Algodón', price: 25, sw: ['#ffd6ec', '#d6ecff', '#fff3c9'] }
);
SHOP.colors.push(
  { id: 'coral', name: 'Coral', price: 15 }, { id: 'lime', name: 'Lima', price: 20 }, { id: 'grape', name: 'Uva', price: 25 },
  { id: 'ice', name: 'Hielo', price: 30 }, { id: 'sunrise', name: 'Amanecer', price: 40 }, { id: 'chrome', name: 'Cromo', price: 55 }
);
SHOP.frames.push(
  { id: 'petal', name: 'Pétalo', price: 35 }, { id: 'volt', name: 'Voltio', price: 45 }, { id: 'magma', name: 'Magma', price: 50 },
  { id: 'emerald', name: 'Esmeralda', price: 55 }, { id: 'bubble', name: 'Burbuja', price: 40 }, { id: 'cosmic', name: 'Cósmico', price: 75 }
);
SHOP.frames.forEach(f => { FRAME_NAME[f.id] = f.name; });
SHOP.bubbles = [
  { id: 'sunset', name: 'Atardecer', price: 15 }, { id: 'ocean', name: 'Océano', price: 15 }, { id: 'mint', name: 'Menta', price: 15 },
  { id: 'candy', name: 'Caramelo', price: 20 }, { id: 'sakura', name: 'Sakura', price: 20 }, { id: 'glass', name: 'Cristal', price: 25 },
  { id: 'midnight', name: 'Medianoche', price: 25 }, { id: 'pixel', name: 'Píxel', price: 30 }, { id: 'neon', name: 'Neón', price: 35 },
  { id: 'lava', name: 'Lava', price: 35 }, { id: 'gold', name: 'Oro', price: 45 }, { id: 'rainbow', name: 'Arcoíris', price: 50 },
  { id: 'chrome', name: 'Cromo', price: 50 }, { id: 'aurora', name: 'Aurora', price: 60 }
];
const ROT_N = 6;
let lastShopDay = ymd(new Date());

function seedRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
// Los 6 objetos de hoy en cada apartado: sale igual para todos durante el mismo día
function dailyPick(cat, day) {
  const rng = seedRng((day || ymd(new Date())) + '|' + cat);
  const idx = SHOP[cat].map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, ROT_N).sort((a, b) => a - b).map(i => SHOP[cat][i]);
}
function shopFresh() { return state.shopSeen !== ymd(new Date()); }
function updateShopDot() {
  const on = shopFresh();
  $$('.shop-dot').forEach(d => d.classList.toggle('hidden', !on));
}
function markShopSeen() {
  if (!shopFresh()) return;
  state.shopSeen = ymd(new Date());
  save();
  updateShopDot();
}
function shopTick() {
  const now = new Date(), d = ymd(now);
  if (d !== lastShopDay) {
    lastShopDay = d;
    updateShopDot();
    toast('🛍️ ¡La tienda se ha renovado!');
    if (currentTab === 'tienda') { markShopSeen(); renderShop(true); }
  }
  const t = $('#shopTimer');
  if (t) {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    t.textContent = `Se renueva en ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }
}

const CATS = ['icons', 'skins', 'colors', 'frames', 'bubbles'];
let shopCat = 'icons';

function evParticipated(ev) {
  if (ev.kind === 'reto') return !!ev.done.me;
  if (ev.kind === 'encuesta') return ev.votes.me !== undefined;
  if (ev.kind === 'pulso') return !!ev.moods.me;
  if (ev.kind === 'dado') return ev.rolls.me !== undefined;
  if (ev.kind === 'ruleta') return ev.spins.me !== undefined;
  if (ev.kind === 'prediccion') return ev.picks.me !== undefined;
  if (ev.kind === 'semaforo') return ev.votes.me !== undefined;
  return !!(ev.contrib && ev.contrib.me);
}

let shownRolls = null;
function rollsAdd(n, why, quiet) {
  if (!n) return;
  state.rolls = Math.max(0, state.rolls + n);
  if (n > 0) { state.rollsTotal += n; if (!/partida|inscrip|torneo|prueba|pase/i.test(why || '')) xpAdd(n * 6); }
  save();
  renderRolls(true);
  if (!quiet && n > 0) toast(`🧻 +${n} ${n === 1 ? 'rollo' : 'rollos'} · ${why}`);
}

// Recompensa que solo se da una vez al día
function dailyReward(key, n, why) {
  const d = ymd(new Date());
  if (state.daily.date !== d) state.daily = { date: d };
  if (state.daily[key]) return false;
  state.daily[key] = true;
  rollsAdd(n, why);
  return true;
}
const dailyDone = key => state.daily.date === ymd(new Date()) && !!state.daily[key];

function renderRolls(animate) {
  const pill = $('#rollPill');
  pill.innerHTML = '';
  pill.append(el('span', 'f', '🧻'), el('b', '', String(state.rolls)));
  pill.setAttribute('aria-label', `${state.rolls} rollos de papel`);
  const num = $('#rollBal');
  const from = shownRolls === null || !animate ? state.rolls : shownRolls;
  shownRolls = state.rolls;
  if (animate && from !== state.rolls) {
    replay(pill, 'pop');
    replay($('.bal-num'), 'pop');
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 700);
      num.textContent = Math.round(from + (state.rolls - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else num.textContent = state.rolls;
}

// Fondo, color de nombre e icono equipados
function applyCosmetics() {
  const eq = state.shop.eq;
  if (eq.skin) root.dataset.skin = eq.skin; else delete root.dataset.skin;
  $$('.nm:not(.nm-demo)').forEach(n => { if (eq.color) n.dataset.c = eq.color; else delete n.dataset.c; });
  $$('.bubble.me:not(.demo)').forEach(b => { if (eq.bubble) b.dataset.bub = eq.bubble; else delete b.dataset.bub; });
}

function initShop() {
  if (state.shopInit) return;
  // Quien ya tenía logros de antes recibe sus rollos
  state.rolls += ROLL.logro * ACH.filter(a => state.achievements[a.id]).length;
  state.rollsTotal = state.rolls;
  state.shopInit = true;
  save();
}

function missionRow(icon, title, sub, done, reward) {
  const li = el('li', 'glass row static mis' + (done ? ' done' : ''));
  const main = el('div', 'main');
  main.append(el('strong', '', title), el('small', '', sub));
  const side = el('div', 'side');
  if (done) { const ck = el('span', 'check'); ck.innerHTML = ICON.check; side.appendChild(ck); }
  else side.appendChild(el('span', 'mis-r', reward));
  li.append(el('span', 'ach-ico', icon), main, side);
  return li;
}

function renderMissions() {
  const ul = $('#missions');
  ul.innerHTML = '';
  const st = streakInfo().cur;
  ul.append(
    missionRow('📝', 'Registro del día', `+${ROLL.registro} al día, y +1 por cada 7 de racha${st >= 7 ? ` (hoy +${Math.min(3, Math.floor(st / 7))})` : ''}`, dailyDone('reg'), '+' + ROLL.registro),
    missionRow('💬', 'Habla con un amigo', `+${ROLL.directo} al día en un chat directo`, dailyDone('direct'), '+' + ROLL.directo),
    missionRow('👥', 'Habla en un grupo', `+${ROLL.grupo} al día en un grupo`, dailyDone('group'), '+' + ROLL.grupo),
    missionRow('🏅', 'Logros', `+${ROLL.logro} por cada logro nuevo · ${ACH.filter(a => state.achievements[a.id]).length}/${ACH.length}`, ACH.every(a => state.achievements[a.id]), '+' + ROLL.logro),
    missionRow('⚡', 'Eventos de chat', `Participa y gana hasta +${ROLL.retoOk + ROLL.bonus} por evento`, false, '+' + ROLL.retoOk)
  );
  if (RSET().goal) ul.append(missionRow('🎯', 'Meta del día', `+${GOAL_REWARD} al día cumpliendo la meta de Inicio`, RT().goal.paid, '+' + GOAL_REWARD));
  if (RSET().missions) {
    weeklyMissions().forEach(m => ul.append(missionRow(m.icon, m.title, `Esta semana · ${Math.min(m.prog, m.goal)}/${m.goal} · máx. ${WEEK_CAP} a la semana`, !!RT().wk.claimed[m.id], '+' + m.reward)));
  }
  setStagger(ul);
}

const ownsItem = (cat, id) => !id || !!state.shop.owned[cat + ':' + id];
function equippedId(cat) {
  if (cat === 'icons') return state.shop.eq.icon;
  if (cat === 'skins') return state.shop.eq.skin;
  if (cat === 'colors') return state.shop.eq.color;
  if (cat === 'bubbles') return state.shop.eq.bubble;
  return state.me.frame;
}
function equipItem(cat, id) {
  if (cat === 'icons') state.shop.eq.icon = id;
  else if (cat === 'skins') state.shop.eq.skin = id;
  else if (cat === 'colors') state.shop.eq.color = id;
  else if (cat === 'bubbles') state.shop.eq.bubble = id;
  else state.me.frame = id;
  save();
  renderMe();
  applyCosmetics();
  renderFrames();
}

function buyItem(cat, it) {
  if (state.rolls < it.price) { toast(`Te faltan ${it.price - state.rolls} rollos 🧻`); return false; }
  state.rolls -= it.price;
  state.shop.owned[cat + ':' + it.id] = Date.now();
  equipItem(cat, it.id);
  renderRolls(true);
  toast(`🛍️ Canjeado: ${it.name} · −${it.price} rollos`);
  return true;
}

function shopPreview(cat, it) {
  const p = el('div', 'sp-prev');
  if (cat === 'icons') {
    p.classList.add('p-icon');
    p.textContent = it.id || '🙂';
    if (!it.id) p.classList.add('dim');
  } else if (cat === 'skins') {
    p.classList.add('p-skin');
    const c = it.sw || ['#46c2ff', '#ff7ac6', '#ffd24a'];
    p.style.background = `radial-gradient(circle at 25% 30%, ${c[0]} 0 32%, transparent 60%), radial-gradient(circle at 75% 70%, ${c[1]} 0 34%, transparent 62%), radial-gradient(circle at 70% 20%, ${c[2]} 0 26%, transparent 55%), linear-gradient(160deg, ${c[2]}55, ${c[1]}55)`;
  } else if (cat === 'colors') {
    p.classList.add('p-name');
    const n = el('span', 'nm nm-demo', state.me.name && state.me.name !== 'Yo' ? state.me.name : 'Tu nombre');
    if (it.id) n.dataset.c = it.id;
    p.appendChild(n);
  } else if (cat === 'bubbles') {
    p.classList.add('p-bubble');
    const b = el('div', 'bubble me demo', 'Hola 👋');
    if (it.id) b.dataset.bub = it.id;
    p.appendChild(b);
  } else {
    p.classList.add('p-frame');
    const a = mountAva(p, 54);
    updateAva(a, { name: state.me.name, photo: state.me.photo, frame: it.id, icon: state.shop.eq.icon });
  }
  return p;
}

function renderShop(animate) {
  $('#shopSeg').dataset.idx = String(CATS.indexOf(shopCat));
  const grid = $('#shopGrid');
  grid.innerHTML = '';
  const items = dailyPick(shopCat);
  items.forEach((it, i) => {
    const owned = ownsItem(shopCat, it.id);
    const on = equippedId(shopCat) === it.id;
    const card = el('div', 'shop-item glass' + (on ? ' on' : '') + (owned ? ' owned' : ''));
    card.dataset.item = it.id || 'none';
    card.style.setProperty('--i', i);
    const btn = el('button', 'btn sm shop-btn');
    btn.type = 'button';
    if (on) { btn.textContent = '✓ Equipado'; btn.disabled = true; btn.classList.add('equipped'); }
    else if (owned) { btn.textContent = 'Equipar'; btn.addEventListener('click', () => { equipItem(shopCat, it.id); renderShop(false); }); }
    else {
      btn.classList.add('primary', 'buy');
      btn.append(document.createTextNode(`🧻 ${it.price}`));
      if (state.rolls < it.price) btn.classList.add('poor');
      btn.addEventListener('click', () => {
        if (buyItem(shopCat, it)) { renderShop(false); const c = $(`.shop-item[data-item="${it.id}"]`); if (c) replay(c, 'bought'); }
        else replay(card, 'shake');
      });
    }
    card.append(shopPreview(shopCat, it), el('strong', '', it.name), btn);
    grid.appendChild(card);
  });
  if (animate) { grid.classList.remove('swap-in'); void grid.offsetWidth; grid.classList.add('swap-in'); }
  renderMissions();
}

function setShopCat(c) {
  if (c === shopCat) return;
  shopCat = c;
  renderShop(true);
}

/* ---------- Pase de temporada 🎃: 20 niveles, vía gratis y vía premium (150 rollos) ---------- */
const SEASON = { id: 'noche-encantada-2026', name: 'Noche Encantada', emoji: '🎃', end: '2026-12-01', xpLevel: 100, levels: 20, premiumCost: 150 };
// Objetos exclusivos de la temporada: no se venden en la tienda, solo salen del pase
const PASS_ITEMS = {
  icons: [
    { id: '🎃', name: 'Calabaza' }, { id: '🦇', name: 'Murciélago' }, { id: '🕸️', name: 'Telaraña' }, { id: '🧛', name: 'Vampiro' },
    { id: '🧙', name: 'Brujo' }, { id: '👁️', name: 'Ojo vigilante' }, { id: '🪦', name: 'Lápida' }, { id: '🐺', name: 'Hombre lobo' }, { id: '🌕', name: 'Luna llena' }, { id: '🧟', name: 'Zombi' }
  ],
  skins: [
    { id: 'haunt', name: 'Noche Encantada', sw: ['#ff8a1f', '#7c3aed', '#1b0b2e'] },
    { id: 'graveyard', name: 'Cementerio', sw: ['#7a8f86', '#3b4a45', '#c9d6cf'] },
    { id: 'moonlit', name: 'Luna embrujada', sw: ['#dbe4ff', '#8b9cff', '#4c3a9a'] }
  ],
  colors: [{ id: 'pumpkin', name: 'Calabaza' }, { id: 'ghostly', name: 'Espectral' }, { id: 'moonlight', name: 'Claro de luna' }],
  frames: [
    { id: 'bats', name: 'Murciélagos' }, { id: 'web', name: 'Telaraña' }, { id: 'witchfire', name: 'Fuego bruja' },
    { id: 'spectral', name: 'Espectro' }, { id: 'phantom', name: 'Fantasma real' }
  ]
};
PASS_ITEMS.frames.forEach(f => { FRAME_NAME[f.id] = f.name; });
PASS_ITEMS.bubbles = [
  { id: 'pumpkin', name: 'Burbuja calabaza' }, { id: 'cobweb', name: 'Burbuja telaraña' }, { id: 'vampire', name: 'Burbuja vampiro' },
  { id: 'spooky', name: 'Burbuja fantasmal' }, { id: 'bone', name: 'Burbuja de hueso' }
];
const passItem = (cat, id) => PASS_ITEMS[cat].find(i => i.id === id);
const I = (cat, id) => ({ cat, id });
// Cada nivel: f = vía gratis, p = vía premium. r = rollos, o { cat, id } = objeto
const PASS = [
  { f: { r: 10 }, p: I('icons', '🎃') },
  { f: I('icons', '🦇'), p: I('bubbles', 'pumpkin') },
  { f: { r: 10 }, p: I('colors', 'pumpkin') },
  { f: I('bubbles', 'cobweb'), p: { r: 25 } },
  { f: I('icons', '🕸️'), p: I('frames', 'bats') },
  { f: { r: 15 }, p: I('icons', '🧛') },
  { f: I('frames', 'web'), p: I('bubbles', 'vampire') },
  { f: { r: 15 }, p: I('skins', 'haunt') },
  { f: I('colors', 'ghostly'), p: { r: 35 } },
  { f: { r: 25 }, p: I('icons', '🧙') },
  { f: I('icons', '👁️'), p: I('frames', 'witchfire') },
  { f: { r: 20 }, p: I('bubbles', 'spooky') },
  { f: I('icons', '🪦'), p: { r: 45 } },
  { f: { r: 25 }, p: I('colors', 'moonlight') },
  { f: I('skins', 'graveyard'), p: I('icons', '🐺') },
  { f: { r: 30 }, p: I('frames', 'spectral') },
  { f: I('bubbles', 'bone'), p: { r: 55 } },
  { f: { r: 30 }, p: I('icons', '🧟') },
  { f: { r: 40 }, p: I('skins', 'moonlit') },
  { f: I('icons', '🌕'), p: I('frames', 'phantom') }
];
const CAT_LABEL = { icons: 'Icono', skins: 'Fondo', colors: 'Color de nombre', frames: 'Marco', bubbles: 'Burbuja' };
const EXCL_LABEL = { icons: 'Icono exclusivo', skins: 'Fondo exclusivo', colors: 'Color de nombre exclusivo', frames: 'Marco exclusivo', bubbles: 'Burbuja exclusiva' };
let passTrack = 'free';

function passState() {
  if (!state.pass || state.pass.season !== SEASON.id) state.pass = { season: SEASON.id, xp: 0, premium: false, claimed: {} };
  return state.pass;
}
const seasonActive = () => ymd(new Date()) < SEASON.end;
const passLevel = () => Math.min(SEASON.levels, Math.floor(passState().xp / SEASON.xpLevel));
function passDaysLeft() {
  const e = new Date(SEASON.end + 'T00:00:00');
  return Math.max(0, Math.ceil((e - new Date()) / 86400000));
}
function passClaimable() {
  const ps = passState(), lv = passLevel();
  let n = 0;
  for (let i = 1; i <= lv; i++) {
    if (!ps.claimed['f' + i]) n++;
    if (ps.premium && !ps.claimed['p' + i]) n++;
  }
  return n;
}

function xpAdd(n) {
  if (!seasonActive() || n <= 0) return;
  const ps = passState(), before = passLevel();
  ps.xp = Math.min(SEASON.levels * SEASON.xpLevel, ps.xp + Math.round(n));
  const after = passLevel();
  if (after > before) toast(`${SEASON.emoji} ¡Nivel ${after} del pase de temporada!`);
}

function passReward(track, lvl) { return PASS[lvl - 1][track === 'free' ? 'f' : 'p']; }
function rewardText(rw) {
  if (rw.r) return `${rw.r} 🧻`;
  return passItem(rw.cat, rw.id).name;
}

function passClaim(track, lvl, quiet) {
  const ps = passState(), key = (track === 'free' ? 'f' : 'p') + lvl;
  if (lvl > passLevel() || ps.claimed[key] || (track === 'premium' && !ps.premium)) return false;
  const rw = passReward(track, lvl);
  ps.claimed[key] = true;
  if (rw.r) rollsAdd(rw.r, 'premio del pase', true);
  else state.shop.owned[rw.cat + ':' + rw.id] = Date.now();
  save();
  if (!quiet) toast(`${SEASON.emoji} Nivel ${lvl}: ${rewardText(rw)}${rw.r ? '' : ' · mira tu inventario'}`);
  return true;
}

function passClaimAll() {
  let n = 0;
  for (let i = 1; i <= passLevel(); i++) { if (passClaim('free', i, true)) n++; if (passClaim('premium', i, true)) n++; }
  if (n) toast(`${SEASON.emoji} ${n} recompensa${n === 1 ? '' : 's'} reclamada${n === 1 ? '' : 's'}`);
  renderPass();
  renderInventory(false);
}

function passUnlock() {
  const ps = passState();
  if (ps.premium) return false;
  if (state.rolls < SEASON.premiumCost) { toast(`Te faltan ${SEASON.premiumCost - state.rolls} rollos 🧻`); return false; }
  rollsAdd(-SEASON.premiumCost, 'pase premium', true);
  ps.premium = true;
  save();
  toast(`${SEASON.emoji} ¡Pase premium desbloqueado!`);
  renderPass();
  return true;
}

function passRewardIcon(rw) {
  const box = el('div', 'pass-ico');
  if (rw.r) { box.classList.add('rolls'); box.append(el('span', 'f', '🧻'), el('b', '', '+' + rw.r)); }
  else box.appendChild(shopPreview(rw.cat, passItem(rw.cat, rw.id)));
  return box;
}

function renderPass() {
  const ps = passState(), lv = passLevel();
  const inLevel = lv >= SEASON.levels ? SEASON.xpLevel : ps.xp % SEASON.xpLevel;
  const pct = Math.round((inLevel / SEASON.xpLevel) * 100);
  const claim = passClaimable();
  // Tarjeta de Inicio
  const card = $('#passCard');
  if (card) {
    $('#passLv').textContent = lv;
    $('#passBar').style.width = (lv >= SEASON.levels ? 100 : pct) + '%';
    $('#passXp').textContent = lv >= SEASON.levels ? 'Pase completado' : `${inLevel}/${SEASON.xpLevel} XP para el nivel ${lv + 1}`;
    card.classList.toggle('premium', ps.premium);
    $('#passBadge').classList.toggle('hidden', !claim);
    $('#passBadge').textContent = claim;
    $('#passSub').textContent = seasonActive() ? `Termina en ${passDaysLeft()} días · ${ps.premium ? 'Premium' : 'Gratis'}` : 'Temporada terminada';
  }
  // Barra de experiencia fija arriba
  const xt = $('#xpTop');
  if (xt) {
    xt.classList.toggle('premium', ps.premium);
    $('#xpTopLv').textContent = lv >= SEASON.levels ? 'MAX' : `Nv ${lv}`;
    $('#xpTopFill').style.width = (lv >= SEASON.levels ? 100 : pct) + '%';
    $('#xpTopTxt').textContent = lv >= SEASON.levels ? '¡Completado!' : `${inLevel}/${SEASON.xpLevel} XP`;
    xt.setAttribute('aria-label', `Pase de temporada: nivel ${lv}, ${inLevel} de ${SEASON.xpLevel} XP`);
  }
  $('#passHero').classList.toggle('premium', ps.premium);
  // Pantalla del pase
  $('#passTitle').textContent = `${SEASON.emoji} ${SEASON.name}`;
  $('#passBigLv').textContent = lv;
  $('#passBigBar').style.width = (lv >= SEASON.levels ? 100 : pct) + '%';
  $('#passBigXp').textContent = lv >= SEASON.levels ? '¡Has completado el pase!' : `${inLevel}/${SEASON.xpLevel} XP · nivel ${lv + 1}`;
  $('#passDays').textContent = seasonActive() ? `Quedan ${passDaysLeft()} días de temporada` : 'Temporada terminada: aún puedes reclamar lo que ganaste';
  $('#passPremBtn').classList.toggle('hidden', ps.premium);
  $('#passPremBtn').textContent = `Desbloquear premium · ${SEASON.premiumCost} 🧻`;
  $('#passPremOn').classList.toggle('hidden', !ps.premium);
  $('#passAll').classList.toggle('hidden', !claim);
  $('#passSeg').dataset.idx = passTrack === 'free' ? '0' : '1';
  const list = $('#passList');
  list.innerHTML = '';
  for (let i = 1; i <= SEASON.levels; i++) {
    const rw = passReward(passTrack, i);
    const reached = i <= lv, got = !!ps.claimed[(passTrack === 'free' ? 'f' : 'p') + i];
    const locked = passTrack === 'premium' && !ps.premium;
    const li = el('li', 'glass row static pass-row' + (got ? ' got' : '') + (!reached ? ' far' : '') + (passTrack === 'premium' ? ' prem' : ''));
    li.dataset.lvl = i;
    const main = el('div', 'main');
    main.append(el('strong', '', rw.r ? `${rw.r} rollos` : rewardText(rw)), el('small', '', rw.r ? 'Para la tienda' : EXCL_LABEL[rw.cat]));
    const side = el('div', 'side');
    if (got) { const ck = el('span', 'check'); ck.innerHTML = ICON.check; side.appendChild(ck); }
    else if (locked) side.appendChild(el('span', 'pass-lock', '🔒'));
    else if (reached) {
      const b = el('button', 'btn sm primary', 'Reclamar');
      b.type = 'button';
      b.addEventListener('click', () => { if (passClaim(passTrack, i)) { renderPass(); renderInventory(false); } });
      side.appendChild(b);
    } else side.appendChild(el('span', 'pass-need', `${i * SEASON.xpLevel - ps.xp} XP`));
    li.append(el('span', 'pass-n', String(i)), passRewardIcon(rw), main, side);
    list.appendChild(li);
  }
  setStagger(list);
}

function openPass() {
  renderPass();
  $('#pass').classList.add('open');
  $('#pass').setAttribute('aria-hidden', 'false');
  syncOverlayClass();
}
function closePass() {
  $('#pass').classList.remove('open');
  $('#pass').setAttribute('aria-hidden', 'true');
  syncOverlayClass();
  renderPass();
}

function bindPass() {
  $('#passCard').addEventListener('click', openPass);
  $('#xpTop').addEventListener('click', openPass);
  $('#passBack').addEventListener('click', closePass);
  $('#passPremBtn').addEventListener('click', passUnlock);
  $('#passAll').addEventListener('click', passClaimAll);
  $$('#passSeg button').forEach(b => b.addEventListener('click', () => { passTrack = b.dataset.track; renderPass(); }));
}

/* ---------- Inventario y carpetas plegables del perfil ---------- */
let invCat = 'icons';
const NONE_NAME = { icons: 'Foto / inicial', skins: 'Clásico', colors: 'Normal', frames: 'Sin marco', bubbles: 'Clásica' };

function invItems(cat) {
  const list = [{ id: '', name: NONE_NAME[cat] }];
  if (cat === 'frames') ACH.filter(a => state.achievements[a.id]).forEach(a => list.push({ id: a.frame, name: FRAME_NAME[a.frame] }));
  SHOP[cat].filter(it => ownsItem(cat, it.id)).forEach(it => list.push(it));
  PASS_ITEMS[cat].filter(it => ownsItem(cat, it.id)).forEach(it => list.push(Object.assign({ pass: true }, it)));
  return list;
}

function renderInventory(animate) {
  const total = CATS.reduce((n, c) => n + invItems(c).length - 1, 0);
  $('#invCount').textContent = `${total} objeto${total === 1 ? '' : 's'} para equipar`;
  $('#invSeg').dataset.idx = String(CATS.indexOf(invCat));
  const grid = $('#invGrid');
  grid.innerHTML = '';
  const items = invItems(invCat);
  $('#invHint').classList.toggle('hidden', items.length > 1);
  items.forEach((it, i) => {
    const on = equippedId(invCat) === it.id;
    const card = el('div', 'shop-item inv-item glass' + (on ? ' on' : ''));
    card.dataset.item = it.id || 'none';
    card.style.setProperty('--i', i);
    const btn = el('button', 'btn sm shop-btn' + (on ? ' equipped' : ''), on ? '✓ Equipado' : 'Equipar');
    btn.type = 'button';
    btn.disabled = on;
    btn.addEventListener('click', () => { equipItem(invCat, it.id); });
    card.append(shopPreview(invCat, it), el('strong', '', it.name), btn);
    grid.appendChild(card);
  });
  if (animate) { grid.classList.remove('swap-in'); void grid.offsetWidth; grid.classList.add('swap-in'); }
}

function setInvCat(c) {
  if (c === invCat) return;
  invCat = c;
  renderInventory(true);
}

const FOLD_DEFAULT = { inv: false, achDone: true, achTodo: true, missions: true };
function paintFold(btn) {
  const key = btn.dataset.fold;
  const open = key in state.ui.fold ? !!state.ui.fold[key] : FOLD_DEFAULT[key];
  btn.setAttribute('aria-expanded', String(open));
  const body = $('#' + btn.dataset.target);
  body.classList.toggle('open', open);
  body.inert = !open;
}
function applyFolds() { $$('.fold').forEach(paintFold); }
function toggleFold(btn) {
  const key = btn.dataset.fold;
  state.ui.fold[key] = btn.getAttribute('aria-expanded') !== 'true';
  save();
  paintFold(btn);
}

/* ---------- Duelos ⚔️: minijuegos rápidos (contra el robot o en línea entre dos móviles). Los juegos están en duels.js ---------- */
const DUEL_CAP = 50;
const DUEL_WIN = { solo: 6, online: 6 };
const PLAY_FREE = 2, PLAY_COST = 3;
const CW = 360, CH = 560;
const DUELS = [
  { id: 'hockey', emoji: '🏒', name: 'Air hockey', desc: 'Mete 5 goles antes que tu rival. Arrastra tu pala.' },
  { id: 'race', emoji: '🏎️', name: 'Carrera de coches', desc: 'Esquiva los barriles, coge los rayos y llega primero. Toca izquierda o derecha.' },
  { id: 'reflex', emoji: '⚡', name: 'Reflejos', desc: 'Toca en cuanto se ponga verde, pero ojo con las trampas. Gana quien lleve 2 rondas.' },
  { id: 'connect4', emoji: '🔴', name: 'Conecta 4', desc: 'Alinea 4 fichas antes que tu rival. Toca una columna.' },
  { id: 'rps', emoji: '✌️', name: 'Piedra, papel o tijera', desc: 'Al mejor de 3. Elige rápido: el tiempo corre.' },
  { id: 'tug', emoji: '🪢', name: 'Tira y afloja', desc: 'Toca la pantalla lo más rápido que puedas para arrastrar la cuerda a tu lado.' }
];
let duel = null;
window.DUEL_T = s => T(s);

function duelToday() {
  const d = ymd(new Date());
  if (state.daily.date !== d) state.daily = { date: d };
  return state.daily.duel || 0;
}

// Devuelve los rollos concedidos (0 si ya se llegó al límite diario)
function duelAward(mode) {
  const got = duelToday();
  const n = Math.min(DUEL_WIN[mode], DUEL_CAP - got);
  if (n <= 0) return 0;
  state.daily.duel = got + n;
  rollsAdd(n, 'ganar un duelo', true);
  return n;
}

// Cobra la partida: 2 gratis al día y después PLAY_COST rollos
function payPlay() {
  duelToday();
  const used = state.daily.plays || 0;
  if (used < PLAY_FREE) { state.daily.plays = used + 1; save(); return true; }
  if (state.rolls < PLAY_COST) {
    toast(`Necesitas ${PLAY_COST} rollos 🧻 para jugar (ya usaste las ${PLAY_FREE} partidas gratis de hoy)`);
    return false;
  }
  state.daily.plays = used + 1;
  rollsAdd(-PLAY_COST, 'partida', true);
  toast(`🧻 −${PLAY_COST} rollos · partida`);
  return true;
}

function renderDuelos() {
  const got = duelToday();
  const left = Math.max(0, PLAY_FREE - (state.daily.plays || 0));
  $('#duelPlays').textContent = left ? `Partidas gratis hoy: ${left} de ${PLAY_FREE}. Después, ${PLAY_COST} 🧻 por partida.` : `Hoy ya no quedan partidas gratis: cada partida cuesta ${PLAY_COST} 🧻.`;
  renderTourn();
  $('#duelCapTxt').textContent = got;
  $('#duelCapBar').style.width = Math.round((got / DUEL_CAP) * 100) + '%';
  $('#duelWins').textContent = `Victorias: ${state.duelWins}`;
  const ul = $('#duelList');
  if (ul.children.length) return;
  DUELS.forEach(d => {
    const li = el('li', 'glass row static duel-row');
    li.dataset.duel = d.id;
    const main = el('div', 'main');
    main.append(el('strong', '', `${d.emoji} ${d.name}`), el('small', '', d.desc));
    const btns = el('div', 'duel-btns');
    [['solo', '🤖 Solo'], ['online', '🌐 En línea']].forEach(([mode, label]) => {
      const b = el('button', 'btn sm' + (mode === 'solo' ? ' primary' : ''), label);
      b.type = 'button';
      b.dataset.mode = mode;
      b.addEventListener('click', () => (mode === 'solo' ? duelStart(d.id, 'solo') : onlineOpen(d.id)));
      btns.appendChild(b);
    });
    li.append(main, btns);
    ul.appendChild(li);
  });
  setStagger(ul);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);


/* --- Torneos con amigos: 3 rondas (air hockey, carrera, reflejos), cada uno pone rollos en el bote --- */
const TGAMES = ['hockey', 'race', 'reflex'];
const T_FEES = [5, 10, 20, 50];
let tPick = new Set();
let tFee = 10;

const gameInfo = id => DUELS.find(d => d.id === id);

function createTournament(friendIds, fee, bot) {
  if (state.tourn && state.tourn.status === 'active') { toast('Ya tienes un torneo en marcha'); return false; }
  if (!friendIds.length) { toast('Invita al menos a un amigo'); return false; }
  if (state.rolls < fee) { toast(`Te faltan ${fee - state.rolls} rollos para entrar 🧻`); return false; }
  const players = ['me', ...friendIds];
  const wins = {};
  players.forEach(p => { wins[p] = 0; });
  rollsAdd(-fee, 'inscripción', true);
  state.tourn = { id: uid(), players, fee, bot: !!bot, round: 0, wins, history: [], status: 'active' };
  save();
  toast(`🏆 Torneo creado · bote de ${fee * players.length} rollos`);
  return true;
}

const tournRival = t => { const f = t.players.filter(p => p !== 'me'); return f[t.round % f.length]; };

function playTournRound() {
  const t = state.tourn;
  if (!t || t.status !== 'active') return;
  duelStart(TGAMES[t.round], 'solo', { tourn: true, rival: tournRival(t), round: t.round });
}

function recordTournRound(myWin) {
  const t = state.tourn;
  if (!t || t.status !== 'active') return;
  const rival = tournRival(t);
  const w = myWin ? 'me' : rival;
  t.wins[w]++;
  // El resto de amigos se enfrentan entre sí (simulado)
  const others = t.players.filter(p => p !== 'me' && p !== rival).sort(() => Math.random() - 0.5);
  for (let i = 0; i + 1 < others.length; i += 2) t.wins[Math.random() < 0.5 ? others[i] : others[i + 1]]++;
  t.history.push({ round: t.round, game: TGAMES[t.round], winner: w });
  t.round++;
  if (t.round >= TGAMES.length) finishTournament(t);
  save();
  renderTourn();
}

function finishTournament(t) {
  const best = Math.max(...t.players.map(p => t.wins[p]));
  const winners = t.players.filter(p => t.wins[p] === best);
  const pot = t.fee * t.players.length;
  const share = Math.floor(pot / winners.length);
  let payout = 0, capped = false;
  if (winners.includes('me')) {
    const profit = share - t.fee;
    if (profit > 0) {
      // La ganancia extra cuenta para el límite diario de 50 rollos por duelos
      const allowed = Math.max(0, Math.min(profit, DUEL_CAP - duelToday()));
      capped = allowed < profit;
      state.daily.duel = duelToday() + allowed;
      payout = t.fee + allowed;
    } else payout = share;
    if (payout) rollsAdd(payout, 'premio del torneo', true);
  }
  t.status = 'done';
  t.result = { winners, pot, share, payout, capped, best };
}

function renderTourn() {
  const box = $('#tournBox');
  const t = state.tourn;
  box.innerHTML = '';
  if (!t) {
    box.append(el('p', 'muted small', 'Reta a tus amigos: cada uno pone rollos en el bote y quien gane más rondas se lleva todo.'));
    const b = el('button', 'btn primary wide', '🏆 Crear torneo');
    b.id = 'tournNew'; b.type = 'button';
    b.addEventListener('click', openTournSheet);
    box.appendChild(b);
    return;
  }
  const pot = t.fee * t.players.length;
  const head = el('div', 'tourn-head');
  head.append(el('strong', '', t.status === 'done' ? '🏆 Torneo terminado' : `🏆 Torneo · ronda ${t.round + 1}/${TGAMES.length}`), el('span', 'tourn-pot', `Bote ${pot} 🧻`));
  const list = el('div', 'tourn-players');
  t.players.slice().sort((a, b) => t.wins[b] - t.wins[a]).forEach(p => {
    const row = el('div', 'tourn-row' + (t.status === 'done' && t.result.winners.includes(p) ? ' win' : ''));
    row.append(personAvatar(p), ut(el('span', 'tn', whoName(p))), el('span', 'tw', '●'.repeat(t.wins[p]) + '○'.repeat(Math.max(0, TGAMES.length - t.wins[p]))));
    list.appendChild(row);
  });
  box.append(head, list);
  if (t.status === 'active') {
    const g = gameInfo(TGAMES[t.round]);
    box.append(el('p', 'muted small', `Ahora: ${g.emoji} ${g.name} contra ${whoName(tournRival(t))} · tu amigo lo juega el robot`));
    const row = el('div', 'row2');
    const play = el('button', 'btn primary', 'Jugar ronda');
    play.id = 'tournPlay'; play.type = 'button';
    play.addEventListener('click', playTournRound);
    const quit = el('button', 'btn', 'Abandonar');
    quit.id = 'tournQuit'; quit.type = 'button';
    quit.addEventListener('click', () => {
      if (!confirm(T('Si abandonas pierdes lo que pusiste en el bote. ¿Seguro?'))) return;
      state.tourn = null; save(); renderTourn();
    });
    row.append(play, quit);
    box.appendChild(row);
  } else {
    const r = t.result;
    const names = r.winners.map(whoName).join(' y ');
    let msg = r.winners.includes('me')
      ? (r.payout > t.fee ? `¡Ganaste! Te llevas ${r.payout} 🧻.` : `Quedaste en ${r.winners.length > 1 ? 'empate' : 'primer lugar'}: recuperas ${r.payout} 🧻.`)
      : `Gana ${names}. Perdiste los ${t.fee} 🧻 que pusiste.`;
    if (r.capped) msg += ' La ganancia extra se recortó por el límite diario de 50 rollos.';
    box.append(el('p', 'small', msg));
    const close = el('button', 'btn wide', 'Cerrar');
    close.id = 'tournClose'; close.type = 'button';
    close.addEventListener('click', () => { state.tourn = null; save(); renderTourn(); });
    box.appendChild(close);
  }
}

function paintTournSheet() {
  const box = $('#tFriends');
  box.innerHTML = '';
  $('#tNoFriends').classList.toggle('hidden', state.friends.length > 0);
  state.friends.forEach(f => {
    const b = ut(el('button', 'chip-btn' + (tPick.has(f.id) ? ' on' : ''), f.name));
    b.type = 'button';
    b.addEventListener('click', () => {
      if (tPick.has(f.id)) tPick.delete(f.id);
      else if (tPick.size < 3) tPick.add(f.id);
      else { toast('Máximo 3 amigos'); return; }
      b.classList.toggle('on', tPick.has(f.id));
      paintTournSum();
    });
    box.appendChild(b);
  });
  buildChips($('#tFee'), T_FEES, v => `${v} 🧻`, tFee, v => { tFee = v; paintTournSum(); });
  paintTournSum();
}

function paintTournSum() {
  const n = tPick.size + 1;
  $('#tSum').textContent = tPick.size ? `Bote: ${tFee * n} 🧻 (${n} jugadores). Tú pones ${tFee}.` : 'Elige al menos un amigo.';
}

function openTournSheet() {
  if (state.tourn && state.tourn.status === 'active') { toast('Ya tienes un torneo en marcha'); return; }
  tPick = new Set();
  paintTournSheet();
  openSheet('sheetTourn');
}

function fitCanvas() {
  const stage = $('#duelStage'), cvs = $('#duelCv');
  const s = Math.min((stage.clientWidth - 16) / CW, (stage.clientHeight - 16) / CH);
  if (s > 0) { cvs.style.width = Math.floor(CW * s) + 'px'; cvs.style.height = Math.floor(CH * s) + 'px'; }
}

// mode: 'solo' (contra el robot) | 'host' (en línea, tú simulas) | 'guest' (en línea, recibes el estado)
function duelStart(id, mode, opts = {}) {
  if (mode === 'solo' && !opts.tourn && !payPlay()) return;
  if (duel && duel.opts.tourn && !duel.over) return;
  duelStop();
  const role = mode === 'solo' ? 'solo' : mode;
  const g = window.DuelGames[id]({ role, init: opts.init });
  const info = DUELS.find(d => d.id === id);
  duel = { id, mode, opts, g, over: false, raf: 0, last: performance.now(), frame: 0, lastMove: 0 };
  $('#duelTitle').textContent = `${info.emoji} ${info.name}`;
  $('#duelSub').textContent = opts.tourn ? `Torneo · ronda ${opts.round + 1}/${TGAMES.length} · Tú vs ${whoName(opts.rival)}` : mode === 'solo' ? 'Tú contra el robot' : 'En línea · tú contra tu rival';
  $('#duelAgain').classList.toggle('hidden', !!opts.tourn || mode !== 'solo');
  $('#duelExit').textContent = opts.tourn ? 'Continuar' : 'Salir';
  $('#duelEnd').classList.add('hidden');
  $('#duel').classList.add('open');
  syncOverlayClass();
  fitCanvas();
  if (mode === 'host') window.DuelNet.send({ t: 'start', id, init: g.init || null });
  duel.raf = requestAnimationFrame(duelLoop);
  return duel;
}

function duelStop() {
  if (duel) cancelAnimationFrame(duel.raf);
  duel = null;
}

function duelLoop(now) {
  if (!duel) return;
  const d = duel, g = d.g;
  const dt = Math.min(0.05, Math.max(0.001, (now - d.last) / 1000));
  d.last = now;
  if (d.mode === 'guest') g.guestUpdate(dt);
  else { g.rtt = window.DuelNet.rtt || 0; g.update(dt); }
  const evs = g.evq.splice(0);
  evs.forEach(e => window.DuelFx.play(e));
  if (d.mode === 'host') {
    d.frame++;
    if (evs.length) {
      const swap = d.id === 'rps' || d.id === 'reflex';
      window.DuelNet.send({ t: 'e', l: evs.map(e => (swap ? (e === 'goal' ? 'bad' : e === 'bad' ? 'goal' : e) : e)) });
    }
    if (d.frame % 3 === 0 || g.win) window.DuelNet.send({ t: 's', s: g.snapshot() });
  }
  const cv = $('#duelCv'), c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, CW, CH);
  c.save();
  if (g.flip) { c.translate(CW, CH); c.rotate(Math.PI); }
  g.draw(c);
  c.restore();
  if (g.win && !d.over) { d.over = true; setTimeout(duelFinish, 900); }
  d.raf = requestAnimationFrame(duelLoop);
}

function duelFinish(lost) {
  if (!duel) return;
  const w = duel.g.win, me = duel.g.me, mode = duel.mode;
  let emoji, res, msg;
  if (lost) {
    emoji = '📡'; res = 'Conexión perdida'; msg = 'Tu rival se desconectó. Esta partida no suma rollos.';
  } else if (duel.opts.tourn) {
    const rival = duel.opts.rival;
    recordTournRound(w === 1);
    emoji = w === 1 ? '🏆' : '😅';
    res = w === 1 ? '¡Punto para ti!' : `Punto para ${whoName(rival)}`;
    const t = state.tourn;
    msg = t && t.status === 'done' ? 'Torneo terminado: mira el resultado en Duelos.' : `Siguiente ronda en Duelos. Llevas ${t ? t.wins.me : 0} punto${t && t.wins.me === 1 ? '' : 's'}.`;
  } else if (w === 3) {
    emoji = '🤝'; res = 'Empate'; msg = 'Nadie gana esta vez.';
  } else if (w === me) {
    state.duelWins++;
    const n = duelAward(mode === 'solo' ? 'solo' : 'online');
    emoji = '🏆'; res = '¡Ganaste!';
    msg = n ? `+${n} rollos 🧻` : `Hoy ya has llegado al límite de ${DUEL_CAP} rollos.`;
    save();
    window.DuelFx.play('win');
  } else {
    emoji = '😅'; res = 'Perdiste';
    msg = mode === 'solo' ? 'El robot fue más rápido. ¡Revancha!' : 'Tu rival fue mejor. ¡Otra vez será!';
    window.DuelFx.play('lose');
  }
  $('#duelEmoji').textContent = emoji;
  $('#duelRes').textContent = res;
  $('#duelMsg').textContent = msg;
  const end = $('#duelEnd');
  end.classList.remove('hidden');
  replay(end, 'pop-in');
  renderDuelos();
}

function duelExit() {
  if (duel && duel.opts.tourn && !duel.over) {
    const rival = duel.opts.rival;
    recordTournRound(false);
    toast(`Abandonaste la ronda: punto para ${whoName(rival)}`);
  }
  if (duel && duel.mode !== 'solo') { window.DuelNet.send({ t: 'bye' }); window.DuelNet.close(); }
  duelStop();
  $('#duel').classList.remove('open');
  syncOverlayClass();
  renderDuelos();
}

/* ---------- En línea: dos móviles, intercambio de códigos ---------- */
let olGame = 'hockey';

function olSet(msg) { $('#olMsg').textContent = msg ? T(msg) : ''; }

function onlineOpen(id) {
  if (!window.RTCPeerConnection) { toast('Tu navegador no admite partidas en línea'); return; }
  olGame = id;
  window.DuelNet.close();
  $('#olChoose').classList.remove('hidden');
  ['olHostBox', 'olJoinBox', 'olAnswerBox', 'olRoomBox', 'olJoinCodeBox', 'olManualChoose'].forEach(x => $('#' + x).classList.add('hidden'));
  $('#olCodeIn').value = ''; $('#olCode').textContent = '········';
  ['olOffer', 'olAnswerIn', 'olOfferIn', 'olAnswer'].forEach(x => { $('#' + x).value = ''; });
  const info = DUELS.find(d => d.id === id);
  $('#olTitle').textContent = `${info.emoji} ${info.name} · En línea 🌐`;
  olSet('');
  openSheet('sheetOnline');
}

async function olCopy(id, text) {
  const ta = $('#' + id);
  const val = text ? ta.textContent : ta.value;
  try { await navigator.clipboard.writeText(val); toast('Código copiado'); }
  catch { if (!text) ta.select(); try { document.execCommand('copy'); toast('Código copiado'); } catch { toast('Copia el código manualmente'); } }
}

function bindOnline() {
  const Net = window.DuelNet;
  Net.onopen = () => {
    closeSheets();
    if (Net.role === 'host') {
      if (!payPlay()) { Net.send({ t: 'bye' }); Net.close(); return; }
      duelStart(olGame, 'host');
    } else toast('Conectado · esperando a que empiece la partida');
  };
  Net.onclose = () => {
    if (!duel || duel.mode === 'solo') return;
    if (!duel.over) { duel.over = true; duelFinish(true); }
  };
  Net.onmsg = m => {
    if (m.t === 'bye') { Net.onclose(); return; }
    if (Net.role === 'host') {
      if (m.t === 'i' && duel && duel.mode === 'host') duel.g.input(2, m.k, m.x, m.y, 'g' + m.id);
      return;
    }
    if (m.t === 'start') {
      if (!payPlay()) { Net.send({ t: 'bye' }); Net.close(); return; }
      olGame = m.id;
      duelStart(m.id, 'guest', { init: m.init || undefined });
    } else if (m.t === 's' && duel && duel.mode === 'guest') duel.g.apply(m.s);
    else if (m.t === 'e' && duel) m.l.forEach(e => window.DuelFx.play(e));
  };
  $('#olHost').addEventListener('click', async () => {
    $('#olChoose').classList.add('hidden'); $('#olRoomBox').classList.remove('hidden');
    olSet('Creando partida…');
    try { $('#olCode').textContent = await Net.createRoom(); olSet(''); }
    catch (e) { olSet('No se pudo crear la partida: ' + e.message + '. Prueba con los códigos largos.'); }
  });
  $('#olJoin').addEventListener('click', () => { $('#olChoose').classList.add('hidden'); $('#olJoinCodeBox').classList.remove('hidden'); olSet(''); setTimeout(() => $('#olCodeIn').focus(), 100); });
  $('#olCopyCode').addEventListener('click', () => olCopy('olCode', true));
  $('#olCodeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); });
  $('#olJoinGo').addEventListener('click', async () => {
    olSet('Buscando la partida…');
    try { await Net.joinRoom($('#olCodeIn').value); olSet('Conectando…'); }
    catch (e) { olSet('No se pudo unir: ' + e.message); }
  });
  $('#olManual').addEventListener('click', () => { $('#olChoose').classList.add('hidden'); $('#olManualChoose').classList.remove('hidden'); olSet(''); });
  $('#olHostM').addEventListener('click', async () => {
    $('#olManualChoose').classList.add('hidden'); $('#olHostBox').classList.remove('hidden');
    olSet('Creando código…');
    try { $('#olOffer').value = await Net.host(); olSet('Envía el código y pega la respuesta de tu rival.'); }
    catch (e) { olSet('No se pudo crear el código: ' + e.message); }
  });
  $('#olJoinM').addEventListener('click', () => { $('#olManualChoose').classList.add('hidden'); $('#olJoinBox').classList.remove('hidden'); olSet(''); });
  $('#olCopyOffer').addEventListener('click', () => olCopy('olOffer'));
  $('#olCopyAnswer').addEventListener('click', () => olCopy('olAnswer'));
  $('#olConnect').addEventListener('click', async () => {
    olSet('Conectando…');
    try { await Net.accept($('#olAnswerIn').value); olSet('Esperando conexión…'); }
    catch (e) { olSet('Código no válido: ' + e.message); }
  });
  $('#olMake').addEventListener('click', async () => {
    olSet('Generando respuesta…');
    try { $('#olAnswer').value = await Net.answer($('#olOfferIn').value); $('#olAnswerBox').classList.remove('hidden'); olSet('Envía la respuesta y espera: la partida empieza sola.'); }
    catch (e) { olSet('Código no válido: ' + e.message); }
  });
}

function bindDuels() {
  const cvs = $('#duelCv');
  const pos = e => {
    const r = cvs.getBoundingClientRect();
    let x = (e.clientX - r.left) * CW / r.width, y = (e.clientY - r.top) * CH / r.height;
    if (duel && duel.g.flip) { x = CW - x; y = CH - y; }
    return [x, y];
  };
  const send = (k, e) => {
    if (!duel || duel.over) return;
    const [x, y] = pos(e);
    if (duel.mode === 'guest') {
      window.DuelNet.send({ t: 'i', k, x: Math.round(x), y: Math.round(y), id: e.pointerId });
      if (duel.g.localInput) duel.g.input(2, k, x, y, e.pointerId);
    } else duel.g.input(1, k, x, y, e.pointerId);
  };
  cvs.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { cvs.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    send('down', e);
  });
  cvs.addEventListener('pointermove', e => {
    if (!duel || duel.over) return;
    const n = performance.now();
    if (duel.mode === 'guest' && n - duel.lastMove < 30) return;
    duel.lastMove = n;
    send('move', e);
  });
  const up = e => send('up', e);
  cvs.addEventListener('pointerup', up);
  cvs.addEventListener('pointercancel', up);
  $('#duelBack').addEventListener('click', duelExit);
  $('#duelExit').addEventListener('click', duelExit);
  $('#duelAgain').addEventListener('click', () => { if (duel && duel.mode === 'solo') duelStart(duel.id, 'solo'); });
  window.addEventListener('resize', () => { if (duel) fitCanvas(); });
  document.addEventListener('visibilitychange', () => { if (duel) duel.last = performance.now(); });
  bindOnline();
}

/* ---------- Eventos de chat ---------- */
// Un evento trata de una sola cosa y dura un tiempo limitado: reto relámpago, encuesta,
// pulso del grupo o meta del grupo. Solo puede haber uno activo por chat.
// Con un servidor real, los eventos y las participaciones llegarían por tiempo real:
// receiveEvent(g, ev) para los que lanzan otros y evVote / evMood / evMarkRegistro para las respuestas.
const EV = {
  reto: { emoji: '⏱️', name: 'Reto relámpago', desc: 'Todos tienen un tiempo limitado para subir un registro.', durs: [15, 30, 60], def: 30 },
  encuesta: { emoji: '🗳️', name: 'Encuesta', desc: 'Una pregunta rápida con opciones para votar.', durs: [15, 60, 1440], def: 60 },
  pulso: { emoji: '😄', name: 'Pulso del grupo', desc: 'Todos cuentan cómo se sienten y se ve el ánimo medio.', durs: [15, 30, 60], def: 30 },
  meta: { emoji: '🎯', name: 'Meta del grupo', desc: 'Entre todos, llegad a un número de registros antes de que acabe el tiempo.', durs: [60, 360, 1440], def: 360, goals: [5, 10, 20], defGoal: 10 },
  dado: { emoji: '🎲', name: 'Duelo de dados', desc: 'Todos lanzan un dado. Gana quien saque más.', durs: [15, 30, 60], def: 30 },
  ruleta: { emoji: '🎡', name: 'Ruleta de rollos', desc: 'Cada uno gira la ruleta una vez y se lleva un premio de rollos.', durs: [15, 60, 1440], def: 60 },
  prediccion: { emoji: '🔮', name: 'Predicción', desc: 'Cara o cruz: quien acierte al terminar gana rollos.', durs: [15, 30, 60], def: 30 },
  semaforo: { emoji: '🚦', name: 'Semáforo', desc: 'Proponed un plan y cada uno responde: verde, amarillo o rojo.', durs: [15, 60, 1440], def: 60 }
};
const SEMAFORO = ['🟢 Me apunto', '🟡 Puede ser', '🔴 No puedo'];
const WHEEL = [1, 1, 2, 2, 3, 5];
const EV_DAILY_CAP = 14;
// Los rollos de los eventos tienen un tope diario para que no se puedan fabricar sin parar
function evRolls(n, why) {
  const d = ymd(new Date());
  if (state.daily.date !== d) state.daily = { date: d };
  const used = state.daily.evr || 0;
  const k = Math.min(n, EV_DAILY_CAP - used);
  if (k <= 0) { toast(`Hoy ya llegaste al límite de ${EV_DAILY_CAP} 🧻 por eventos`); return 0; }
  state.daily.evr = used + k;
  rollsAdd(k, why);
  return k;
}

const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtDur = m => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`);
function fmtCount(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

function activeEvent(g) { return (g.events || []).find(e => e.status === 'active'); }
function findEvent(id) {
  for (const g of state.groups) {
    const ev = (g.events || []).find(e => e.id === id);
    if (ev) return { g, ev };
  }
  return null;
}
const people = g => ['me', ...g.members.filter(id => friendById(id))];
const whoName = id => (id === 'me' ? 'Tú' : senderName(id));

function personAvatar(id) {
  const a = el('span', 'avatar xs');
  paintAvatar(a, id === 'me' ? (state.me.name || 'Yo') : senderName(id));
  if (id === 'me' && state.shop.eq.icon) a.textContent = state.shop.eq.icon;
  return a;
}

function syncEvBtn() {
  const g = groupById(openGroupId);
  $('#evBtn').classList.toggle('live', !!(g && activeEvent(g)));
}

function makeEvent(kind, o) {
  const now = Date.now();
  const ev = { id: uid(), kind, by: o.by, start: now, end: now + o.dur * 60000, dur: o.dur, status: 'active' };
  if (kind === 'reto') ev.done = {};
  if (kind === 'encuesta') { ev.q = o.q; ev.opts = o.opts; ev.votes = {}; }
  if (kind === 'pulso') ev.moods = {};
  if (kind === 'meta') { ev.goal = o.goal; ev.count = 0; ev.contrib = {}; }
  if (kind === 'dado') ev.rolls = {};
  if (kind === 'ruleta') ev.spins = {};
  if (kind === 'prediccion') { ev.picks = {}; ev.coin = rnd(2); }
  if (kind === 'semaforo') { ev.q = o.q; ev.opts = SEMAFORO; ev.votes = {}; }
  return ev;
}

// Añade el evento al chat. Si lo lanza otra persona entra por receive() (avisos, no leídos...)
function launchEvent(g, ev) {
  (g.events = g.events || []).push(ev);
  const m = { id: uid(), from: ev.by, type: 'evento', evId: ev.id, ts: ev.start };
  if (ev.by === 'me') {
    g.messages.push(m);
    save();
    if (openGroupId === g.id) renderChat(true);
    renderSocial();
  } else receive(g, m);
}

function evResult(g, ev) {
  const P = people(g);
  if (ev.kind === 'reto') {
    const ok = P.filter(id => ev.done[id]);
    const no = P.filter(id => !ev.done[id]);
    if (!ok.length) return 'Nadie subió registro a tiempo.';
    return no.length ? `Subieron: ${ok.map(whoName).join(', ')}. Faltaron: ${no.map(whoName).join(', ')}.` : `¡Subieron todos! (${ok.length}/${P.length}) 🎉`;
  }
  if (ev.kind === 'encuesta') {
    const counts = ev.opts.map((_, i) => Object.values(ev.votes).filter(v => v === i).length);
    const max = Math.max(...counts);
    if (max === 0) return 'Nadie votó.';
    const win = ev.opts.filter((_, i) => counts[i] === max);
    return win.length === 1 ? `Gana «${win[0]}» con ${pl(max, 'voto', 'votos')}.` : `Empate entre ${win.map(w => `«${w}»`).join(' y ')} (${pl(max, 'voto', 'votos')}).`;
  }
  if (ev.kind === 'pulso') {
    const vals = Object.values(ev.moods);
    if (!vals.length) return 'Nadie respondió.';
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return `Ánimo medio ${EMOJIS[Math.round(avg)]} ${avg.toFixed(1)}/5 (${pl(vals.length, 'respuesta', 'respuestas')}).`;
  }
  if (ev.kind === 'dado') {
    const ent = Object.entries(ev.rolls);
    if (!ent.length) return 'Nadie tiró el dado.';
    const best = Math.max(...ent.map(e => e[1]));
    const win = ent.filter(e => e[1] === best).map(e => whoName(e[0]));
    return `${win.join(' y ')} ${win.length > 1 ? 'empatan' : 'gana'} con un ${best} 🎲`;
  }
  if (ev.kind === 'ruleta') {
    const ent = Object.entries(ev.spins);
    if (!ent.length) return 'Nadie giró la ruleta.';
    return `Premios: ${ent.map(e => `${whoName(e[0])} +${e[1]}`).join(', ')} 🧻`;
  }
  if (ev.kind === 'prediccion') {
    const face = ev.coin === 0 ? 'Cara' : 'Cruz';
    const ok = Object.entries(ev.picks).filter(e => e[1] === ev.coin).map(e => whoName(e[0]));
    return ok.length ? `Salió ${face} 🪙 · Acertaron: ${ok.join(', ')}.` : `Salió ${face} 🪙 · Nadie acertó.`;
  }
  if (ev.kind === 'semaforo') {
    const c = SEMAFORO.map((_, i) => Object.values(ev.votes).filter(v => v === i).length);
    return Object.keys(ev.votes).length ? `🟢 ${c[0]} · 🟡 ${c[1]} · 🔴 ${c[2]}` : 'Nadie respondió.';
  }
  return ev.count >= ev.goal ? `¡Meta cumplida! ${ev.count}/${ev.goal} registros 🎉` : `Quedó en ${ev.count}/${ev.goal} registros.`;
}

function finalizeEvent(g, ev) {
  if (ev.status !== 'active') return;
  if (evComplete(g, ev) && evParticipated(ev)) evRolls(ROLL.bonus, 'evento completado');
  if (ev.kind === 'dado' && ev.rolls.me !== undefined && ev.rolls.me === Math.max(...Object.values(ev.rolls)) && Object.keys(ev.rolls).length > 1) evRolls(3, 'ganar el dado');
  if (ev.kind === 'prediccion' && ev.picks.me === ev.coin) evRolls(4, 'acertar la predicción');
  ev.status = 'ended';
  ev.endedAt = Date.now();
  ev.result = evResult(g, ev);
  const meta = EV[ev.kind];
  g.messages.push({ id: uid(), from: 'sys', type: 'sys', text: `${meta.emoji} ${meta.name} terminado · ${ev.result}`, ts: Date.now() });
  const viewing = openGroupId === g.id;
  if (!viewing) {
    g.unread = (g.unread || 0) + 1;
    toast(`${meta.emoji} ${chatName(g)} · ${meta.name} terminado`);
    systemNotify(chatName(g), `${meta.name} terminado · ${ev.result}`);
  }
  save();
  if (viewing) renderChat(true);
  renderSocial();
}

// ¿Se cumplió ya el objetivo del evento? (todos participaron o se llegó a la meta)
function evComplete(g, ev) {
  const P = people(g);
  if (ev.kind === 'reto') return P.every(id => ev.done[id]);
  if (ev.kind === 'encuesta') return P.every(id => ev.votes[id] !== undefined);
  if (ev.kind === 'pulso') return P.every(id => ev.moods[id]);
  if (ev.kind === 'dado') return P.every(id => ev.rolls[id] !== undefined);
  if (ev.kind === 'ruleta') return P.every(id => ev.spins[id] !== undefined);
  if (ev.kind === 'prediccion') return P.every(id => ev.picks[id] !== undefined);
  if (ev.kind === 'semaforo') return P.every(id => ev.votes[id] !== undefined);
  return ev.count >= ev.goal;
}

function evChanged(g, ev) {
  if (evComplete(g, ev)) { finalizeEvent(g, ev); return; }
  save();
  refreshEventCard(g, ev);
  renderSocial();
}

function evMarkRegistro(g, from, ts) {
  const ev = activeEvent(g);
  if (!ev || (ev.kind !== 'reto' && ev.kind !== 'meta')) return;
  if (ts < ev.start || ts > ev.end || !people(g).includes(from)) return;
  if (ev.kind === 'reto') {
    if (ev.done[from]) return;
    ev.done[from] = ts;
  } else {
    ev.count++;
    ev.contrib[from] = (ev.contrib[from] || 0) + 1;
  }
  if (from === 'me') {
    toast(ev.kind === 'reto' ? '⏱️ ¡Reto superado! Tu registro cuenta' : '🎯 Tu registro suma a la meta');
    evRolls(ev.kind === 'reto' ? ROLL.retoOk : ROLL.meta, ev.kind === 'reto' ? 'reto superado' : 'meta del grupo');
  }
  evChanged(g, ev);
}

function evVote(g, ev, who, idx) {
  if (ev.status !== 'active' || ev.votes[who] !== undefined) return;
  ev.votes[who] = idx;
  if (who === 'me') { evRolls(ROLL.voto, 'votar en la encuesta'); evSync(g, ev, idx); }
  evChanged(g, ev);
}

function evMood(g, ev, who, n) {
  if (ev.status !== 'active' || ev.moods[who]) return;
  ev.moods[who] = n;
  if (who === 'me') { evRolls(ROLL.pulso, 'pulso del grupo'); evSync(g, ev, n); }
  evChanged(g, ev);
}

function evDado(g, ev, who, val) {
  if (ev.status !== 'active' || ev.rolls[who] !== undefined) return;
  ev.rolls[who] = val || 1 + rnd(6);
  if (who === 'me') { evRolls(ROLL.pulso, 'lanzar el dado'); evSync(g, ev, ev.rolls.me); }
  evChanged(g, ev);
}
function evSpin(g, ev, who, val) {
  if (ev.status !== 'active' || ev.spins[who] !== undefined) return;
  ev.spins[who] = val || WHEEL[rnd(WHEEL.length)];
  if (who === 'me') { evRolls(ev.spins.me, 'ruleta de rollos'); evSync(g, ev, ev.spins.me); }
  evChanged(g, ev);
}
function evPick(g, ev, who, side) {
  if (ev.status !== 'active' || ev.picks[who] !== undefined) return;
  ev.picks[who] = side;
  if (who === 'me') { evRolls(1, 'predicción'); evSync(g, ev, side); }
  evChanged(g, ev);
}

/* --- Tarjetas de evento dentro del chat --- */
function uploadBtn() {
  const b = el('button', 'btn primary sm wide', 'Subir mi registro');
  b.type = 'button';
  b.addEventListener('click', () => openLog());
  return b;
}

function bodyReto(c, g, ev, active) {
  c.appendChild(el('p', 'ev-desc', 'Sube un registro antes de que acabe el tiempo.'));
  const ppl = el('div', 'ev-people');
  for (const id of people(g)) {
    const p = el('span', 'ev-person' + (ev.done[id] ? ' ok' : ''));
    p.append(personAvatar(id), document.createTextNode(`${whoName(id)} ${ev.done[id] ? '✅' : '⏳'}`));
    ppl.appendChild(p);
  }
  c.appendChild(ppl);
  if (active && !ev.done.me) c.appendChild(uploadBtn());
}

function bodyEncuesta(c, g, ev, active) {
  c.appendChild(ut(el('p', 'ev-desc ev-q', ev.q)));
  const total = Object.keys(ev.votes).length;
  const counts = ev.opts.map((_, i) => Object.values(ev.votes).filter(v => v === i).length);
  ev.opts.forEach((o, i) => {
    const b = el('button', 'ev-opt' + (ev.votes.me === i ? ' mine' : ''));
    b.type = 'button';
    b.disabled = !active || ev.votes.me !== undefined;
    const fill = el('i', 'ev-fill');
    fill.style.setProperty('--w', (total ? (counts[i] / total) * 100 : 0) + '%');
    b.append(fill, ev.kind === 'semaforo' ? el('span', '', o) : ut(el('span', '', o)), el('span', 'n', counts[i]));
    b.addEventListener('click', () => evVote(g, ev, 'me', i));
    c.appendChild(b);
  });
  c.appendChild(el('small', 'ev-meta', `${pl(total, 'voto', 'votos')} de ${people(g).length}`));
}

function bodyPulso(c, g, ev, active) {
  c.appendChild(el('p', 'ev-desc', '¿Cómo te sientes ahora mismo? Responde y mira el ánimo del grupo.'));
  const vals = Object.values(ev.moods);
  if (active && !ev.moods.me) {
    const row = el('div', 'ev-moods');
    for (let n = 1; n <= 5; n++) {
      const b = el('button', 'ev-mood', EMOJIS[n]);
      b.type = 'button';
      b.setAttribute('aria-label', MOOD_LABEL[n]);
      b.addEventListener('click', () => evMood(g, ev, 'me', n));
      row.appendChild(b);
    }
    c.appendChild(row);
    c.appendChild(el('small', 'ev-meta', `${pl(vals.length, 'respuesta', 'respuestas')} de ${people(g).length}. Responde para ver el resultado.`));
    return;
  }
  const d = el('div', 'ev-dist');
  for (let n = 1; n <= 5; n++) {
    const it = el('div', ev.moods.me === n ? 'mine' : '');
    it.append(el('span', '', EMOJIS[n]), el('small', '', vals.filter(v => v === n).length));
    d.appendChild(it);
  }
  c.appendChild(d);
  if (vals.length) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    c.appendChild(el('small', 'ev-meta', `Media ${avg.toFixed(1)}/5 · ${pl(vals.length, 'respuesta', 'respuestas')} de ${people(g).length}`));
  }
}

function bodyDado(c, g, ev, active) {
  c.appendChild(el('p', 'ev-desc', 'Lanza tu dado: gana quien saque más.'));
  const ppl = el('div', 'ev-people');
  for (const id of people(g)) {
    const p = el('span', 'ev-person' + (ev.rolls[id] ? ' ok' : ''));
    p.append(personAvatar(id), document.createTextNode(`${whoName(id)} ${ev.rolls[id] ? '🎲 ' + ev.rolls[id] : '⏳'}`));
    ppl.appendChild(p);
  }
  c.appendChild(ppl);
  if (active && ev.rolls.me === undefined) {
    const b = el('button', 'btn primary sm wide', '🎲 Lanzar dado');
    b.type = 'button';
    b.addEventListener('click', () => { b.classList.add('rolling'); setTimeout(() => evDado(g, ev, 'me'), 450); });
    c.appendChild(b);
  }
}

function bodyRuleta(c, g, ev, active) {
  c.appendChild(el('p', 'ev-desc', 'Gira la ruleta una vez y llévate rollos.'));
  const ppl = el('div', 'ev-people');
  for (const id of people(g)) {
    const p = el('span', 'ev-person' + (ev.spins[id] !== undefined ? ' ok' : ''));
    p.append(personAvatar(id), document.createTextNode(`${whoName(id)} ${ev.spins[id] !== undefined ? '+' + ev.spins[id] + ' 🧻' : '⏳'}`));
    ppl.appendChild(p);
  }
  c.appendChild(ppl);
  if (active && ev.spins.me === undefined) {
    const b = el('button', 'btn primary sm wide', '🎡 Girar ruleta');
    b.type = 'button';
    b.addEventListener('click', () => { b.classList.add('rolling'); setTimeout(() => evSpin(g, ev, 'me'), 450); });
    c.appendChild(b);
  }
}

function bodyPrediccion(c, g, ev, active) {
  c.appendChild(el('p', 'ev-desc', 'Elige cara o cruz. Al terminar el evento se lanza la moneda.'));
  const row = el('div', 'ev-moods');
  ['Cara 🙂', 'Cruz ✖️'].forEach((t, i) => {
    const b = el('button', 'btn sm' + (ev.picks.me === i ? ' primary' : ''), t);
    b.type = 'button';
    b.disabled = !active || ev.picks.me !== undefined;
    b.addEventListener('click', () => evPick(g, ev, 'me', i));
    row.appendChild(b);
  });
  c.appendChild(row);
  const n = Object.keys(ev.picks).length;
  c.appendChild(el('small', 'ev-meta', `${pl(n, 'predicción', 'predicciones')} de ${people(g).length}`));
}

function bodyMeta(c, g, ev, active) {
  c.appendChild(el('p', 'ev-desc', `Entre todos: ${ev.goal} registros antes de que acabe el tiempo.`));
  const box = el('div', 'ev-goal');
  const lab = el('div', 'lab');
  lab.append(el('span', '', 'Progreso'), el('span', '', `${Math.min(ev.count, ev.goal)}/${ev.goal}`));
  const bar = el('div', 'ev-goalbar');
  const i = el('i');
  i.style.width = Math.min(100, (ev.count / ev.goal) * 100) + '%';
  bar.appendChild(i);
  box.append(lab, bar);
  c.appendChild(box);
  const ppl = el('div', 'ev-people');
  for (const id of people(g)) {
    const p = el('span', 'ev-person' + (ev.contrib[id] ? ' ok' : ''));
    p.append(personAvatar(id), document.createTextNode(`${whoName(id)} · ${ev.contrib[id] || 0}`));
    ppl.appendChild(p);
  }
  c.appendChild(ppl);
  if (active) c.appendChild(uploadBtn());
}

function eventCard(g, ev) {
  const meta = EV[ev.kind];
  const active = ev.status === 'active';
  const c = el('div', 'evcard glass' + (active ? '' : ' ended'));
  c.dataset.ev = ev.id;

  const head = el('div', 'ev-head');
  const title = el('div', 'ev-title');
  title.append(el('strong', '', meta.name), el('small', '', `${ev.by === 'me' ? 'Lo lanzaste tú' : 'Lo lanzó ' + senderName(ev.by)} · ${fmtDur(ev.dur)}`));
  head.append(el('span', 'ev-ico', meta.emoji), title, el('span', 'ev-time', active ? fmtCount(ev.end - Date.now()) : 'Terminado'));
  c.appendChild(head);

  if (active) {
    const tb = el('div', 'ev-timebar');
    const i = el('i');
    i.style.width = Math.max(0, Math.min(100, ((ev.end - Date.now()) / (ev.end - ev.start)) * 100)) + '%';
    tb.appendChild(i);
    c.appendChild(tb);
  }

  if (ev.kind === 'reto') bodyReto(c, g, ev, active);
  else if (ev.kind === 'encuesta') bodyEncuesta(c, g, ev, active);
  else if (ev.kind === 'pulso') bodyPulso(c, g, ev, active);
  else if (ev.kind === 'dado') bodyDado(c, g, ev, active);
  else if (ev.kind === 'ruleta') bodyRuleta(c, g, ev, active);
  else if (ev.kind === 'prediccion') bodyPrediccion(c, g, ev, active);
  else if (ev.kind === 'semaforo') bodyEncuesta(c, g, ev, active);
  else bodyMeta(c, g, ev, active);

  if (!active && ev.result) c.appendChild(el('p', 'ev-res', ev.result));
  if (active && ev.by === 'me') {
    const end = el('button', 'ev-end', 'Terminar ahora');
    end.type = 'button';
    end.addEventListener('click', () => finalizeEvent(g, ev));
    c.appendChild(end);
  }
  return c;
}

function refreshEventCard(g, ev) {
  if (openGroupId !== g.id) return;
  const old = $(`#msgs .evcard[data-ev="${ev.id}"]`);
  if (old) old.replaceWith(eventCard(g, ev));
  syncEvBtn();
}

// Cada segundo: cierra los eventos que se acabaron y actualiza las cuentas atrás visibles
function tickEvents() {
  shopTick();
  const now = Date.now();
  for (const g of state.groups.slice()) {
    for (const ev of (g.events || []).slice()) if (ev.status === 'active' && now >= ev.end) finalizeEvent(g, ev);
  }
  $$('#msgs .evcard').forEach(node => {
    const f = findEvent(node.dataset.ev);
    if (!f || f.ev.status !== 'active') return;
    node.querySelector('.ev-time').textContent = fmtCount(f.ev.end - now);
    const bar = node.querySelector('.ev-timebar i');
    if (bar) bar.style.width = Math.max(0, ((f.ev.end - now) / (f.ev.end - f.ev.start)) * 100) + '%';
  });
}

/* --- Hoja para lanzar un evento --- */
let evKind = null, evDurSel = 0, evGoalSel = 0;

function buildChips(box, values, label, current, onPick) {
  box.innerHTML = '';
  values.forEach(v => {
    const b = el('button', 'chip-btn' + (v === current ? ' on' : ''), label(v));
    b.type = 'button';
    b.addEventListener('click', () => {
      $$('.chip-btn', box).forEach(x => x.classList.toggle('on', x === b));
      onPick(v);
    });
    box.appendChild(b);
  });
}

function openEvents() {
  const g = groupById(openGroupId);
  if (!g) return;
  const act = activeEvent(g);
  $('#evForm').classList.add('hidden');
  $('#evPick').classList.remove('hidden');
  $('#evPickHint').textContent = act
    ? 'Ya hay un evento en marcha en este chat. Termínalo o espera a que acabe para lanzar otro.'
    : 'Elige qué quieres proponer al chat. Solo puede haber un evento activo a la vez.';
  const box = $('#evTypes');
  box.innerHTML = '';
  Object.keys(EV).forEach((k, i) => {
    const meta = EV[k];
    const b = el('button', 'ev-type');
    b.type = 'button';
    b.disabled = !!act;
    b.style.setProperty('--i', i);
    b.append(el('span', 'e', meta.emoji), el('strong', '', meta.name), el('small', '', meta.desc));
    b.addEventListener('click', () => openEventForm(k));
    box.appendChild(b);
  });
  openSheet('sheetEvents');
}

function openEventForm(kind) {
  const meta = EV[kind];
  evKind = kind;
  evDurSel = meta.def;
  evGoalSel = meta.defGoal || 0;
  $('#evFormTitle').textContent = `${meta.emoji} ${meta.name}`;
  $('#evFormDesc').textContent = meta.desc;
  $('#evQWrap').classList.toggle('hidden', kind !== 'encuesta' && kind !== 'semaforo');
  $('#evQWrap .ev-opts').classList.toggle('hidden', kind === 'semaforo');
  $('#evQ').placeholder = kind === 'semaforo' ? T('Ej. ¿Cena el viernes?') : T('Ej. ¿Qué hacemos el finde?');
  $('#evGoalWrap').classList.toggle('hidden', kind !== 'meta');
  if (kind === 'encuesta' || kind === 'semaforo') {
    $('#evQ').value = '';
    for (let i = 1; i <= 4; i++) $('#evOpt' + i).value = '';
  }
  buildChips($('#evDur'), meta.durs, fmtDur, evDurSel, v => { evDurSel = v; });
  if (kind === 'meta') buildChips($('#evGoal'), meta.goals, v => `${v} registros`, evGoalSel, v => { evGoalSel = v; });
  $('#evPick').classList.add('hidden');
  $('#evForm').classList.remove('hidden');
  $('#evForm').style.setProperty('--dx', '30px');
  replay($('#evForm'), 'pane-in');
}

function evBack() {
  $('#evForm').classList.add('hidden');
  $('#evPick').classList.remove('hidden');
  $('#evPick').style.setProperty('--dx', '-30px');
  replay($('#evPick'), 'pane-in');
}

function launchFromForm() {
  const g = groupById(openGroupId);
  if (!g || !evKind) return;
  if (activeEvent(g)) { toast('Ya hay un evento activo en este chat'); return; }
  const o = { by: 'me', dur: evDurSel };
  if (evKind === 'encuesta') {
    const q = $('#evQ').value.trim();
    const opts = [1, 2, 3, 4].map(i => $('#evOpt' + i).value.trim()).filter(Boolean);
    if (!q) { toast('Escribe la pregunta'); return; }
    if (opts.length < 2) { toast('Pon al menos 2 opciones'); return; }
    o.q = q;
    o.opts = opts;
  }
  if (evKind === 'semaforo') {
    const q = $('#evQ').value.trim();
    if (!q) { toast('Escribe el plan'); return; }
    o.q = q;
  }
  if (evKind === 'meta') o.goal = evGoalSel;
  const ev = makeEvent(evKind, o);
  closeSheets();
  launchEvent(g, ev);
  evSyncLaunch(g, ev);
  toast(`${EV[evKind].emoji} ${EV[evKind].name} en marcha`);
}

/* ---------- Modo prueba ---------- */
const pick = arr => arr[rnd(arr.length)];
const SIM_TEXTS = ['¡Ánimo! 💪', '¿Qué tal el día?', 'Mañana quedamos, ¿no?', 'Jajaja 😂', 'Buenas 👋'];
const SIM_NOTES = ['Día largo', 'Con la cabeza en otra parte', 'Tranquilo hoy', 'Hoy sí 😅', ''];
const SIM_NAMES = ['Marcos', 'Lucía', 'Pablo', 'Ana', 'Sergio', 'Irene', 'Dani', 'Nerea'];

function simulate() {
  const gs = state.groups.filter(g => g.members.some(id => friendById(id)));
  if (!gs.length) { toast('Crea un chat con algún amigo primero'); return; }
  const g = pick(gs);
  const from = pick(g.members.filter(id => friendById(id)));
  if (rnd(2) === 0) receive(g, { id: uid(), from, ts: Date.now(), type: 'event', mood: 1 + rnd(5), note: pick(SIM_NOTES) });
  else receive(g, { id: uid(), from, ts: Date.now(), type: 'text', text: pick(SIM_TEXTS) });
}

function simulateRequest() {
  let code;
  do { code = genCode(); } while (code === state.me.code || state.friends.some(f => f.code === code));
  receiveRequest({ id: uid(), name: pick(SIM_NAMES), code, ts: Date.now() });
}

function simulateAccept() {
  const r = state.requests.outgoing[0];
  if (!r) { toast('Envía antes una solicitud con un código'); return; }
  state.requests.outgoing.shift();
  const name = pick(SIM_NAMES);
  state.friends.push({ id: uid(), name, code: r.code });
  save();
  renderAll();
  toast(`${name} aceptó tu solicitud 🎉`);
}

// Punto de entrada para eventos lanzados por otras personas (ev.by = id del amigo)
function receiveEvent(g, ev) { launchEvent(g, ev); }

const SIM_POLLS = [
  ['¿Qué hacemos el finde?', ['Cine', 'Parque', 'Casa', 'Fútbol']],
  ['¿A qué hora quedamos?', ['17:00', '19:00', '21:00']],
  ['¿Pizza o hamburguesa?', ['Pizza', 'Hamburguesa']]
];

function simulateEventLaunch() {
  const gs = state.groups.filter(g => g.members.some(id => friendById(id)) && !activeEvent(g));
  if (!gs.length) { toast('Necesitas un chat con un amigo y sin evento activo'); return; }
  const g = pick(gs);
  const by = pick(g.members.filter(id => friendById(id)));
  const kind = pick(Object.keys(EV));
  const o = { by, dur: EV[kind].def, goal: EV[kind].defGoal };
  if (kind === 'encuesta') { const [q, opts] = pick(SIM_POLLS); o.q = q; o.opts = opts; }
  if (kind === 'semaforo') o.q = pick(['¿Cena el viernes?', '¿Partida online esta noche?', '¿Quedamos a las 6?']);
  receiveEvent(g, makeEvent(kind, o));
}

// Un amigo participa en un evento activo (vota, responde o sube un registro)
function simulateEventStep() {
  const cands = [];
  for (const g of state.groups) {
    const ev = activeEvent(g);
    if (!ev) continue;
    for (const id of people(g)) {
      if (id === 'me') continue;
      const did = ev.kind === 'reto' ? ev.done[id] : ev.kind === 'encuesta' || ev.kind === 'semaforo' ? ev.votes[id] !== undefined : ev.kind === 'pulso' ? ev.moods[id] : ev.kind === 'dado' ? ev.rolls[id] !== undefined : ev.kind === 'ruleta' ? ev.spins[id] !== undefined : ev.kind === 'prediccion' ? ev.picks[id] !== undefined : false;
      if (!did) cands.push([g, ev, id]);
    }
  }
  if (!cands.length) { toast('No hay eventos activos con amigos pendientes'); return; }
  const [g, ev, id] = pick(cands);
  if (ev.kind === 'encuesta' || ev.kind === 'semaforo') evVote(g, ev, id, rnd(ev.opts.length));
  else if (ev.kind === 'dado') evDado(g, ev, id);
  else if (ev.kind === 'ruleta') evSpin(g, ev, id);
  else if (ev.kind === 'prediccion') evPick(g, ev, id, rnd(2));
  else if (ev.kind === 'pulso') evMood(g, ev, id, 1 + rnd(5));
  else receive(g, { id: uid(), from: id, ts: Date.now(), type: 'event', mood: 1 + rnd(5), fx: 1 + rnd(4), note: pick(SIM_NOTES) });
}

/* ---------- Hábitos: meta del día, protector de racha, resumen semanal, recordatorio, misiones semanales ---------- */
const RT = () => state.retain;
const RSET = () => state.settings.retain;
const GOAL_REWARD = 2;
const SHIELD_MAX = 2, SHIELD_PER_MONTH = 2, SHIELD_MIN_STREAK = 3;
const WEEK_CAP = 10; // tope semanal de rollos de misiones semanales

// Metas: unas se cumplen solas con tus datos, otras las marcas tú (premio fijo y una vez al día)
const GOALS = [
  { id: 'log', icon: '📝', text: 'Haz tu registro de hoy', auto: () => state.entries.some(e => e.date === ymd(new Date())) },
  { id: 'note', icon: '✍️', text: 'Escribe una nota en tu registro de hoy', auto: () => state.entries.some(e => e.date === ymd(new Date()) && e.note) },
  { id: 'hist', icon: '📅', text: 'Echa un vistazo a tu historial', auto: () => RT().seen.date === ymd(new Date()) && RT().seen.hist },
  { id: 'chat', icon: '💬', text: 'Escribe a un amigo o a un grupo', auto: () => dailyDone('direct') || dailyDone('group') },
  { id: 'water', icon: '💧', text: 'Bebe un vaso de agua con calma' },
  { id: 'walk', icon: '🚶', text: 'Da un paseo de 10 minutos' },
  { id: 'stretch', icon: '🧘', text: 'Estira el cuerpo durante 2 minutos' },
  { id: 'breathe', icon: '🌬️', text: 'Respira hondo cinco veces' },
  { id: 'sun', icon: '☀️', text: 'Sal un rato a que te dé el aire' },
  { id: 'good', icon: '🙏', text: 'Piensa en algo bueno que te pasó hoy' },
  { id: 'sleep', icon: '😴', text: 'Procura acostarte a una hora razonable' }
];

function goalToday() {
  const d = ymd(new Date()), r = RT();
  if (r.goal.date !== d) {
    const i = Math.floor(seedRng(d + '|goal')() * GOALS.length);
    r.goal = { date: d, id: GOALS[i].id, done: false, paid: false };
    save();
  }
  return GOALS.find(g => g.id === r.goal.id) || GOALS[0];
}
function goalComplete() {
  const g = goalToday();
  return g.auto ? !!g.auto() : RT().goal.done;
}
// Cobra la meta una sola vez al día; suma al contador de metas y a la semana
function goalPay() {
  const r = RT();
  if (!RSET().goal || r.goal.paid || !goalComplete()) return false;
  r.goal.paid = true;
  r.goalsDone++;
  weeklyRoll();
  r.wk.goals++;
  save();
  dailyReward('goal', GOAL_REWARD, 'meta del día');
  return true;
}

// Protector de racha: perdona un día suelto si ya llevabas racha. Se gana cada 7 días, máx. 2 guardados y 2 usos al mes.
function shieldUsesIn(ym) { return RT().shield.used.filter(x => x.slice(0, 7) === ym).length; }
function shieldApply() {
  if (!RSET().shield) return;
  const sh = RT().shield, t = today();
  const y = ymd(addDays(t, -1));
  const days = new Set(state.entries.map(e => e.date));
  if (days.has(y) || sh.used.includes(y) || sh.tokens < 1 || shieldUsesIn(y.slice(0, 7)) >= SHIELD_PER_MONTH) return;
  let n = 0, d = addDays(t, -2);
  while (days.has(ymd(d)) || sh.used.includes(ymd(d))) { if (days.has(ymd(d))) n++; d = addDays(d, -1); }
  if (n < SHIELD_MIN_STREAK) return;
  sh.tokens--;
  sh.used.push(y);
  sh.used = sh.used.slice(-60);
  save();
  toast('🛡️ Tu protector cubrió ayer. Tu racha sigue.');
}
function shieldEarn() {
  if (!RSET().shield) return;
  const sh = RT().shield, s = streakInfo(), d = ymd(new Date());
  if (!s.loggedToday || s.cur < 7 || s.cur % 7 !== 0 || sh.earnedOn === d || sh.tokens >= SHIELD_MAX) return;
  sh.tokens++;
  sh.earnedOn = d;
  save();
  toast('🛡️ Has ganado un protector de racha');
}

// Resumen semanal: domingo (semana en curso) y lunes (semana anterior). Solo datos propios.
const WD_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
function weekStats(start) {
  const end = ymd(addDays(start, 6)), s0 = ymd(start);
  const list = state.entries.filter(e => e.date >= s0 && e.date <= end);
  const days = new Set(list.map(e => e.date));
  const moods = list.map(e => Number(e.mood)).filter(Boolean);
  const byDay = {};
  list.forEach(e => { const w = (parse(e.date).getDay() + 6) % 7; (byDay[w] = byDay[w] || []).push(Number(e.mood) || 3); });
  let best = -1, bestAvg = 0;
  Object.keys(byDay).forEach(w => { const a = byDay[w].reduce((x, y) => x + y, 0) / byDay[w].length; if (a > bestAvg) { bestAvg = a; best = Number(w); } });
  return { days: days.size, count: list.length, mood: moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10 : null, best };
}
function weeklySummaryFor() {
  const t = today(), wd = t.getDay();
  if (wd !== 0 && wd !== 1) return null;
  const start = wd === 0 ? startOfWeek(t) : addDays(startOfWeek(t), -7);
  return { key: ymd(start), cur: weekStats(start), prev: weekStats(addDays(start, -7)) };
}
function renderWeekly() {
  const card = $('#weeklyCard');
  const w = RSET().weekly ? weeklySummaryFor() : null;
  const show = !!w && w.key !== RT().weeklySeen && (w.cur.count > 0 || w.prev.count > 0);
  card.classList.toggle('hidden', !show);
  if (!show) return;
  $('#wkDays').textContent = w.cur.days;
  $('#wkMood').textContent = w.cur.mood === null ? '—' : w.cur.mood + '/5';
  $('#wkBest').textContent = w.cur.best < 0 ? '—' : WD_NAMES[w.cur.best];
  const diff = w.cur.days - w.prev.days;
  $('#wkDiff').textContent = diff > 0 ? '+' + diff : diff < 0 ? '−' + Math.abs(diff) : '=';
  $('#wkMsg').textContent = w.cur.count === 0 ? 'Esta semana no hubo registros. Cuando te apetezca, empezamos de nuevo.' :
    diff > 0 ? 'Has estado más constante que la semana pasada. Buen ritmo.' :
    diff === 0 ? 'Has mantenido el mismo ritmo que la semana pasada.' :
    'Una semana más tranquila. Lo importante es volver a tu ritmo.';
}

// Misiones semanales (tope WEEK_CAP rollos por semana)
function weeklyRoll() {
  const k = ymd(startOfWeek(today())), r = RT();
  if (r.wk.week !== k) { r.wk = { week: k, claimed: {}, goals: 0 }; save(); }
}
function weekEntries() {
  const s0 = ymd(startOfWeek(today())), e0 = ymd(addDays(startOfWeek(today()), 6));
  return state.entries.filter(e => e.date >= s0 && e.date <= e0);
}
function weeklyMissions() {
  weeklyRoll();
  const list = weekEntries();
  return [
    { id: 'days', icon: '🗓️', title: 'Registra 4 días esta semana', goal: 4, reward: 5, prog: new Set(list.map(e => e.date)).size },
    { id: 'notes', icon: '📝', title: 'Escribe 2 notas esta semana', goal: 2, reward: 3, prog: list.filter(e => e.note).length },
    { id: 'goals', icon: '🎯', title: 'Cumple 3 metas del día esta semana', goal: 3, reward: 2, prog: RT().wk.goals }
  ];
}
function weeklyPay() {
  if (!RSET().missions) return;
  const ms = weeklyMissions(), c = RT().wk.claimed;
  let paid = Object.keys(c).reduce((a, id) => a + ((ms.find(m => m.id === id) || {}).reward || 0), 0);
  for (const m of ms) {
    if (c[m.id] || m.prog < m.goal || paid + m.reward > WEEK_CAP) continue;
    c[m.id] = Date.now();
    paid += m.reward;
    save();
    rollsAdd(m.reward, 'misión semanal');
    if (ms.every(x => c[x.id])) { RT().weeksDone++; save(); }
  }
}

// Recordatorio diario opcional: una sola notificación al día, solo si aún no has registrado y con la app abierta
function remindTick() {
  const r = RSET(), rt = RT();
  if (!r.remindOn || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), d = ymd(now);
  if (rt.remindSent === d) return;
  const m = /^(\d{2}):(\d{2})$/.exec(r.remindAt);
  if (!m) return;
  const mins = now.getHours() * 60 + now.getMinutes(), at = Number(m[1]) * 60 + Number(m[2]);
  if (mins < at) return;
  rt.remindSent = d;
  save();
  if (mins - at > 120 || state.entries.some(e => e.date === d)) return; // ya pasó la hora o ya registraste: sin aviso
  try { new Notification('HandShake', { body: T('Un momento para ti: ¿registras cómo ha ido el día?') }); } catch { /* ignorar */ }
}

function renderGoal() {
  const card = $('#goalCard');
  card.classList.toggle('hidden', !RSET().goal);
  if (!RSET().goal) return;
  const g = goalToday();
  goalPay();
  const done = RT().goal.paid;
  card.classList.toggle('done', done);
  $('#goalIco').textContent = done ? '✅' : g.icon;
  $('#goalText').textContent = g.text;
  const b = $('#goalBtn');
  b.classList.toggle('hidden', !!g.auto || done);
  $('#goalSub').textContent = done ? 'Meta cumplida. Vuelve mañana para la siguiente.' : g.auto ? `Se marca sola · +${GOAL_REWARD} rollos` : `Márcala cuando la hagas · +${GOAL_REWARD} rollos`;
}

function renderShield() {
  const p = $('#shieldInfo'), on = RSET().shield, n = RT().shield.tokens;
  p.classList.toggle('hidden', !on);
  if (!on) return;
  p.textContent = n > 0 ? `🛡️ Protector de racha: ${n} guardado${n === 1 ? '' : 's'}. Perdona un día suelto.` : '🛡️ Gana un protector con cada 7 días de racha.';
}

function renderRetain() {
  shieldApply();
  shieldEarn();
  weeklyPay();
}
function renderRetainUi() {
  renderGoal();
  renderShield();
  renderWeekly();
}

function paintRetainSettings() {
  const r = RSET();
  $('#rsGoal').checked = r.goal;
  $('#rsShield').checked = r.shield;
  $('#rsWeekly').checked = r.weekly;
  $('#rsMissions').checked = r.missions;
  $('#rsRemind').checked = r.remindOn && 'Notification' in window && Notification.permission === 'granted';
  $('#rsRemindAt').value = r.remindAt;
  $('#rsRemindRow').classList.toggle('hidden', !$('#rsRemind').checked);
}

function bindRetain() {
  const map = { rsGoal: 'goal', rsShield: 'shield', rsWeekly: 'weekly', rsMissions: 'missions' };
  Object.keys(map).forEach(id => $('#' + id).addEventListener('change', e => {
    RSET()[map[id]] = e.target.checked;
    save();
    renderAll();
  }));
  $('#rsRemind').addEventListener('change', async e => {
    if (!e.target.checked) { RSET().remindOn = false; save(); paintRetainSettings(); return; }
    if (!('Notification' in window)) { toast('Tu navegador no admite avisos'); e.target.checked = false; return; }
    let p = Notification.permission;
    if (p === 'default') p = await Notification.requestPermission();
    RSET().remindOn = p === 'granted';
    save();
    if (p !== 'granted') toast('El navegador no ha dado permiso para los avisos');
    else toast('Recordatorio activado');
    paintRetainSettings();
  });
  $('#rsRemindAt').addEventListener('change', e => {
    if (/^\d{2}:\d{2}$/.test(e.target.value)) { RSET().remindAt = e.target.value; RT().remindSent = ''; save(); }
  });
  $('#goalBtn').addEventListener('click', () => {
    RT().goal.done = true;
    save();
    renderAll();
  });
  $('#wkOk').addEventListener('click', () => {
    const w = weeklySummaryFor();
    if (w) { RT().weeklySeen = w.key; save(); renderWeekly(); }
  });
  setInterval(remindTick, 30000);
  remindTick();
}

/* ---------- Ajustes ---------- */
function updateNotifBtn() {
  const b = $('#btnBrowserNotif');
  if (!('Notification' in window)) { b.textContent = 'Tu navegador no admite avisos'; b.disabled = true; return; }
  if (Notification.permission === 'denied') b.textContent = 'Avisos bloqueados en el navegador';
  else if (Notification.permission === 'granted' && state.settings.browserNotif) b.textContent = 'Avisos del navegador: activados';
  else b.textContent = 'Activar avisos del navegador';
}

function openSettings() {
  paintAppearance();
  paintRetainSettings();
  updateNotifBtn();
  $('#settings').classList.add('open');
  syncOverlayClass();
}
function closeSettings() {
  $('#settings').classList.remove('open');
  syncOverlayClass();
}

/* ---------- Teclado del móvil: mantiene el chat visible ---------- */
function bindViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    root.style.setProperty('--vvh', vv.height + 'px');
    root.style.setProperty('--vvt', vv.offsetTop + 'px');
    if (openGroupId) { const box = $('#msgs'); box.scrollTop = box.scrollHeight; }
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}

/* ---------- Eventos ---------- */
function bind() {
  $$('.tab').forEach(b => b.addEventListener('click', () => showTab(GROUP[currentTab] === b.dataset.tab ? currentTab : b.dataset.tab)));
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.goto)));
  $('#hdrAva').addEventListener('click', () => showTab('perfil'));
  $('#fab').addEventListener('click', () => openLog());
  $('#openSettings').addEventListener('click', openSettings);
  $('#settingsBack').addEventListener('click', closeSettings);
  $('#backdrop').addEventListener('click', closeSheets);

  window.addEventListener('resize', () => moveIndicator(false));
  if ('ResizeObserver' in window) new ResizeObserver(() => moveIndicator(false)).observe($('#tabbar'));
  bindViewport();

  // Registro
  $('#saveLog').addEventListener('click', saveLog);
  $('#fDate').addEventListener('change', updateNotifyRow);
  $('#fNotify').addEventListener('change', e => $('#noteCollapse').classList.toggle('open', e.target.checked));
  $$('#fxRow .fx').forEach(b => b.addEventListener('click', () => {
    const n = Number(b.dataset.fx);
    setFx(logFx === n ? 0 : n);
  }));

  // Eventos del chat
  $('#evBtn').addEventListener('click', openEvents);
  $('#evBack').addEventListener('click', evBack);
  $('#evLaunch').addEventListener('click', launchFromForm);

  // Historial
  $('#prevMonth').addEventListener('click', () => changeMonth(-1));
  $('#nextMonth').addEventListener('click', () => changeMonth(1));
  $$('[data-hseg]').forEach(b => b.addEventListener('click', () => setHseg(b.dataset.hseg)));

  // Amigos y chats
  $$('[data-seg]').forEach(b => b.addEventListener('click', () => {
    if (seg === b.dataset.seg) return;
    seg = b.dataset.seg;
    renderSocial();
    swapList();
  }));
  $('#segAdd').addEventListener('click', () => { if (seg === 'chats') openGroupSheet(); else goRequests(); });
  $('#reqHead').addEventListener('click', () => { reqOpen = !reqOpen; renderRequests(); });
  $('#codeInput').addEventListener('input', e => { e.target.value = normCode(e.target.value).slice(0, 7); setCodeMsg(''); });
  $('#codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendRequest(); });
  $('#sendReq').addEventListener('click', sendRequest);
  $('#todayCta').addEventListener('click', () => openLog());
  const copyMine = async () => toast((await copyText(state.me.code)) ? 'Código copiado' : `Tu código: ${state.me.code}`);
  $('#copyCode').addEventListener('click', copyMine);
  $('#copyCode2').addEventListener('click', copyMine);

  $('#saveGroup').addEventListener('click', createGroup);
  $('#chatBack').addEventListener('click', closeChat);
  $('#chatInfo').addEventListener('click', openGroupInfo);
  $('#composer').addEventListener('submit', sendMessage);
  $('#giNotify').addEventListener('change', e => {
    const g = groupById(openGroupId);
    if (g) { g.notify = e.target.checked; save(); }
  });
  $('#giDelete').addEventListener('click', () => {
    const g = groupById(openGroupId);
    if (g && confirm(T(`¿Eliminar "${chatName(g)}" y su chat?`))) {
      if (g.srv) srvSend({ t: 'gleave', gid: g.id });
      state.groups = state.groups.filter(x => x.id !== g.id);
      save();
      closeSheets();
      closeChat();
    }
  });

  // Perfil
  $('#nameInput').addEventListener('change', e => {
    state.me.name = e.target.value.trim().slice(0, 20) || 'Yo';
    save();
    renderAll();
    if (window.Srv) Srv.identify({ code: state.me.code, name: state.me.name });
  });
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  const pickPhoto = () => $('#photoInput').click();
  $('#avaBig').addEventListener('click', pickPhoto);
  $('#photoBtn').addEventListener('click', pickPhoto);
  $('#photoInput').addEventListener('change', async e => { await setPhotoFromFile(e.target.files[0]); e.target.value = ''; });
  $('#photoDel').addEventListener('click', () => { state.me.photo = ''; save(); renderAll(); toast('Foto quitada'); });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { applyTheme(); tickEvents(); }
  });
  $('#gFallback').addEventListener('click', () => { $('#loginMsg').textContent = 'Falta configurar el ID de cliente de Google en config.js (mira el README).'; replay($('.login-card'), 'shake'); });
  $('#loginSkip').addEventListener('click', () => { state.loginSkipped = true; save(); hideLogin(); });
  $('#btnLogout').addEventListener('click', logout);
  $('#btnLogin').addEventListener('click', () => { $('#settings').classList.remove('open'); syncOverlayClass(); showLogin(); });

  // Ajustes: avisos y modo prueba
  $('#btnBrowserNotif').addEventListener('click', async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    state.settings.browserNotif = p === 'granted';
    save();
    updateNotifBtn();
    if (p === 'granted') toast('Avisos activados');
  });
  $('#btnSim').addEventListener('click', simulate);
  $('#btnSimReq').addEventListener('click', simulateRequest);
  $('#btnSimAccept').addEventListener('click', simulateAccept);
  $('#btnSimEv').addEventListener('click', simulateEventLaunch);
  $('#btnSimEvStep').addEventListener('click', simulateEventStep);
  $('#btnRolls').addEventListener('click', () => { rollsAdd(50, 'regalo de prueba'); });
  $$('[data-cat]').forEach(b => b.addEventListener('click', () => setShopCat(b.dataset.cat)));
  $$('[data-icat]').forEach(b => b.addEventListener('click', () => setInvCat(b.dataset.icat)));
  $$('.fold').forEach(b => b.addEventListener('click', () => toggleFold(b)));
  bindDuels();
  bindPass();
  bindTour();
  $('#tCreate').addEventListener('click', () => {
    if (createTournament([...tPick], tFee, true)) { closeSheets(); renderDuelos(); renderRolls(true); }
  });
  $$('[data-theme-opt]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeOpt)));
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  // Ajustes: datos
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ entries: state.entries }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `handshake-${ymd(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importFile').addEventListener('change', async ev => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.entries)) throw new Error();
      const known = new Set(state.entries.map(e => e.id));
      for (const e of data.entries) {
        if (e && e.id && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && !known.has(e.id)) {
          state.entries.push({ id: String(e.id), date: e.date, time: e.time || '', mood: Number(e.mood) || 3, fx: Math.min(4, Math.max(0, Number(e.fx) || 0)), note: String(e.note || '').slice(0, 200) });
        }
      }
      save();
      renderAll();
      toast('Importación completada');
    } catch { toast('El archivo no es una copia válida'); }
    ev.target.value = '';
  });
  $('#wipeEntries').addEventListener('click', () => {
    if (confirm(T('Se borrarán todos tus registros y tu racha. No se puede deshacer. ¿Continuar?'))) {
      state.entries = [];
      state.retain.shield.used = [];
      save();
      renderAll();
      toast('Registros borrados');
    }
  });
  $('#wipeSocial').addEventListener('click', () => {
    if (confirm(T('Se borrarán tus amigos, solicitudes, grupos y chats. No se puede deshacer. ¿Continuar?'))) {
      if (srvOn()) {
        if (!Srv.online) { toast('Necesitas conexión con el servidor para borrar tus amigos'); return; }
        state.friends.filter(f => f.srv).forEach(f => Srv.send({ t: 'unfriend', code: f.code }));
        state.groups.filter(g => g.srv).forEach(g => Srv.send({ t: 'gleave', gid: g.id }));
        state.requests.incoming.filter(r => r.srv).forEach(r => Srv.send({ t: 'reject', from: r.code }));
        state.requests.outgoing.filter(r => r.srv).forEach(r => Srv.send({ t: 'cancel', to: r.code }));
      }
      state.friends = [];
      state.groups = [];
      state.requests = { incoming: [], outgoing: [] };
      openGroupId = null;
      $('#chat').classList.remove('open');
      syncOverlayClass();
      save();
      renderAll();
      toast('Amigos y chats borrados');
    }
  });
}

/* ---------- Arranque ---------- */
applyTheme();
setInterval(applyTheme, 30000);
hdrAva = mountAva($('#hdrAva'), 44);
bigAva = mountAva($('#avaBig'), 110);
$('#avaBig').appendChild(Object.assign(el('span', 'cam'), { innerHTML: ICON.cam }));
bind();
bindRetain();
bindSplash();
initShop();
applyFolds();
paintAppearance();
if (state.settings.lang === 'en') applyLang(false);
checkAchievements(true);
tickEvents();
updateShopDot();
setInterval(tickEvents, 1000);
if (needLogin()) showLogin(); else showApp();
bindSrv();
