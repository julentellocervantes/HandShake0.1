/* HandShake: minijuegos de duelos y conexión en línea entre dos móviles (WebRTC con códigos, sin servidor).
   Cada juego es una función que devuelve un objeto con:
     update(dt), draw(ctx), input(jugador, tipo, x, y, id), snapshot(), apply(s), win, me, flip, evq
   Jugador 1 = quien juega en solitario o crea la partida; jugador 2 = el robot o quien se une.
   El anfitrión simula; el invitado dibuja el estado que recibe y envía sus toques. */
(function () {
  'use strict';

  const CW = 360, CH = 560;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const OPTS = { sound: true, vibrate: true };

  /* ---------- Sonido y vibración ---------- */
  let actx = null;
  function tone(f, d, type, vol, when, slide) {
    if (!OPTS.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime + (when || 0);
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.07, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* sin audio */ }
  }
  const FX = {
    hit: () => tone(540, 0.06, 'triangle', 0.08),
    wall: () => tone(260, 0.04, 'sine', 0.04),
    goal: () => { tone(440, 0.12, 'square', 0.05); tone(660, 0.12, 'square', 0.05, 0.1); tone(880, 0.2, 'square', 0.05, 0.2); },
    crash: () => tone(160, 0.25, 'sawtooth', 0.08, 0, 60),
    boost: () => tone(300, 0.25, 'triangle', 0.07, 0, 900),
    tap: () => tone(700, 0.04, 'sine', 0.06),
    go: () => tone(880, 0.18, 'square', 0.06),
    bad: () => tone(200, 0.2, 'sawtooth', 0.06, 0, 120),
    drop: () => tone(330, 0.1, 'triangle', 0.07, 0, 200),
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.1)); },
    lose: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.14)); },
    count: () => tone(500, 0.08, 'sine', 0.06)
  };
  const BUZZ = { hit: 8, goal: [30, 40, 60], crash: 60, boost: 20, tap: 6, go: 25, bad: 80, drop: 10, win: [40, 60, 40, 60, 80], lose: 120 };
  function playFx(name) {
    if (FX[name]) FX[name]();
    if (OPTS.vibrate && navigator.vibrate && BUZZ[name]) { try { navigator.vibrate(BUZZ[name]); } catch (e) { /* ignorar */ } }
  }

  /* ---------- Partículas ---------- */
  function Particles() {
    const list = [];
    return {
      burst(x, y, color, n, speed) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, s = rnd(0.3, 1) * (speed || 220);
          list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.35, 0.8), max: 0.8, color });
        }
      },
      update(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
          if (p.life <= 0) list.splice(i, 1);
        }
      },
      draw(c) {
        list.forEach(p => { c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, 3, 0, 7); c.fill(); });
        c.globalAlpha = 1;
      }
    };
  }

  const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  const font = (px, w) => `${w || 700} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  /* ======================= AIR HOCKEY ======================= */
  const txtF = (flip, c, s, x, y) => { if (flip) { c.save(); c.translate(x, y); c.rotate(Math.PI); c.fillText(s, 0, 0); c.restore(); } else c.fillText(s, x, y); };
  function hockey(o) {
    const txt = (c, s, x, y) => txtF(g.flip, c, s, x, y);
    const solo = o.role === 'solo';
    const R = 26, PR = 13, GOAL = 130, TO = 5;
    const g = { win: null, flip: o.role === 'guest', me: o.role === 'guest' ? 2 : 1, score: [0, 0], evq: [], hint: 'Arrastra tu pala', localInput: true };
    const parts = Particles();
    const pads = [
      { x: CW / 2, y: CH - 90, tx: CW / 2, ty: CH - 90, vx: 0, vy: 0, id: null },
      { x: CW / 2, y: 90, tx: CW / 2, ty: 90, vx: 0, vy: 0, id: null }
    ];
    const puck = { x: CW / 2, y: CH / 2, vx: 0, vy: 0 };
    const trail = [];
    let pause = 1.1, serveDir = Math.random() < 0.5 ? 1 : -1, flash = 0, flashTxt = '', touched = false, t = 0;
    let botErr = 0, botErrT = 0;

    const lim = (i, x, y) => ({ x: clamp(x, R, CW - R), y: i === 0 ? clamp(y, CH / 2 + R, CH - R) : clamp(y, R, CH / 2 - R) });

    g.input = (pl, type, x, y, id) => {
      const i = pl - 1, p = pads[i];
      if (type === 'up') { if (p.id === id) p.id = null; return; }
      if (type === 'down') p.id = id;
      if (p.id !== id) return;
      touched = true;
      const l = lim(i, x, y + (i === 0 ? -34 : 34));
      p.tx = l.x; p.ty = l.y;
    };

    const hitPad = p => {
      const dx = puck.x - p.x, dy = puck.y - p.y, d = Math.hypot(dx, dy) || 0.001;
      if (d >= R + PR) return;
      const nx = dx / d, ny = dy / d;
      puck.x = p.x + nx * (R + PR); puck.y = p.y + ny * (R + PR);
      const vn = (puck.vx - p.vx) * nx + (puck.vy - p.vy) * ny;
      if (vn < 0) { puck.vx -= 2 * vn * nx; puck.vy -= 2 * vn * ny; }
      let sp = Math.hypot(puck.vx, puck.vy);
      if (sp < 200) { puck.vx = nx * 200; puck.vy = ny * 200; sp = 200; }
      if (sp > 860) { puck.vx *= 860 / sp; puck.vy *= 860 / sp; }
      g.evq.push('hit');
      parts.burst(puck.x, puck.y, '#fff', 6, 160);
    };

    const movePads = dt => {
      pads.forEach((p, i) => {
        let tx = p.tx, ty = p.ty, k = 26;
        if (i === 1 && solo) {
          const lead = clamp(Math.max(score(), 0), 0, 3);
          k = 7 + lead;
          botErrT -= dt;
          if (botErrT <= 0) { botErr = rnd(-22, 22); botErrT = 0.8; }
          if (puck.y < CH / 2 + 10) {
            tx = puck.x + botErr * 0.5; ty = Math.max(R, puck.y - 36);
          } else {
            // anticipa dónde llegará el disco (con rebotes)
            let px = puck.x, vx = puck.vx; const tt = puck.vy > 5 ? Math.min(1.2, (CH / 2 - puck.y) / Math.max(40, puck.vy)) : 0;
            px += vx * tt * 0.4;
            tx = CW / 2 + (px - CW / 2) * 0.55 + botErr; ty = 72;
          }
          const l = lim(1, tx, ty); tx = l.x; ty = l.y;
        }
        const nx = p.x + (tx - p.x) * Math.min(1, k * dt), ny = p.y + (ty - p.y) * Math.min(1, k * dt);
        p.vx = clamp((nx - p.x) / dt, -1800, 1800); p.vy = clamp((ny - p.y) / dt, -1800, 1800);
        p.x = nx; p.y = ny;
      });
    };
    const score = () => g.score[0] - g.score[1];

    const reset = dir => { puck.x = CW / 2; puck.y = CH / 2; puck.vx = 0; puck.vy = 0; pause = 1; serveDir = dir; trail.length = 0; };

    g.update = dt => {
      t += dt;
      parts.update(dt);
      flash = Math.max(0, flash - dt);
      movePads(dt);
      if (g.win) return;
      if (pause > 0) { pause -= dt; if (pause <= 0) { puck.vy = serveDir * 210; puck.vx = rnd(-90, 90); } return; }
      const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
      for (let k = 0; k < n; k++) {
        puck.x += puck.vx * h; puck.y += puck.vy * h;
        if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.97; g.evq.push('wall'); }
        if (puck.x > CW - PR) { puck.x = CW - PR; puck.vx = -Math.abs(puck.vx) * 0.97; g.evq.push('wall'); }
        const inGoal = Math.abs(puck.x - CW / 2) < GOAL / 2 - 4;
        if (puck.y < PR && !inGoal) { puck.y = PR; puck.vy = Math.abs(puck.vy) * 0.97; g.evq.push('wall'); }
        if (puck.y > CH - PR && !inGoal) { puck.y = CH - PR; puck.vy = -Math.abs(puck.vy) * 0.97; g.evq.push('wall'); }
        pads.forEach(hitPad);
        puck.x = clamp(puck.x, PR, CW - PR);
        if (puck.y < -PR * 2 || puck.y > CH + PR * 2) {
          const sc = puck.y < 0 ? 0 : 1;
          g.score[sc]++;
          g.evq.push('goal');
          flash = 1; flashTxt = sc === 0 ? '¡GOL!' : '¡GOL!';
          parts.burst(puck.x, clamp(puck.y, 20, CH - 20), sc === 0 ? '#4cc9ff' : '#ff5c7a', 34, 320);
          if (g.score[sc] >= TO) g.win = sc + 1;
          reset(sc === 0 ? -1 : 1);
          return;
        }
        const f = Math.pow(0.82, h);
        puck.vx *= f; puck.vy *= f;
      }
      trail.push([puck.x, puck.y]);
      if (trail.length > 12) trail.shift();
    };

    g.guestUpdate = dt => {
      parts.update(dt);
      flash = Math.max(0, flash - dt);
      const p = pads[1];
      p.x += (p.tx - p.x) * Math.min(1, 26 * dt); p.y += (p.ty - p.y) * Math.min(1, 26 * dt);
      if (!pause) { puck.x += puck.vx * dt; puck.y += puck.vy * dt; trail.push([puck.x, puck.y]); if (trail.length > 12) trail.shift(); }
    };

    g.snapshot = () => ({ p: [[pads[0].x, pads[0].y], [pads[1].x, pads[1].y]], k: [puck.x, puck.y, puck.vx, puck.vy], s: g.score, w: g.win, z: pause > 0 ? 1 : 0 });
    g.apply = s => {
      pads[0].x = s.p[0][0]; pads[0].y = s.p[0][1];
      if (!touched) { pads[1].x = s.p[1][0]; pads[1].y = s.p[1][1]; }
      puck.x = s.k[0]; puck.y = s.k[1]; puck.vx = s.k[2]; puck.vy = s.k[3];
      if (s.s[0] + s.s[1] !== g.score[0] + g.score[1]) { flash = 1; parts.burst(puck.x, puck.y, '#fff', 30, 300); }
      g.score = s.s; g.win = s.w; pause = s.z ? 1 : 0;
    };
    g.onEvent = name => { if (name === 'goal') { flash = 1; } };

    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, '#0f1b45'); bg.addColorStop(1, '#1d1450');
      c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
      c.strokeStyle = 'rgba(140,180,255,.35)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, CH / 2); c.lineTo(CW, CH / 2); c.stroke();
      c.beginPath(); c.arc(CW / 2, CH / 2, 54, 0, 7); c.stroke();
      c.lineWidth = 2; c.strokeStyle = 'rgba(140,180,255,.18)';
      c.beginPath(); c.arc(CW / 2, 0, 90, 0, 3.1416); c.stroke();
      c.beginPath(); c.arc(CW / 2, CH, 90, 3.1416, 6.283); c.stroke();
      c.textAlign = 'center'; c.font = font(120, 800); c.fillStyle = 'rgba(255,255,255,.07)';
      txt(c, g.score[1], CW / 2, CH / 2 - 60); txt(c, g.score[0], CW / 2, CH / 2 + 150);
      c.shadowBlur = 14;
      c.shadowColor = '#ff5c7a'; c.fillStyle = '#ff5c7a'; c.fillRect((CW - GOAL) / 2, 0, GOAL, 6);
      c.shadowColor = '#4cc9ff'; c.fillStyle = '#4cc9ff'; c.fillRect((CW - GOAL) / 2, CH - 6, GOAL, 6);
      c.shadowBlur = 0;
      // estela del disco
      trail.forEach((q, i) => { c.globalAlpha = (i / trail.length) * 0.35; c.fillStyle = '#9fd8ff'; c.beginPath(); c.arc(q[0], q[1], PR * (0.4 + i / trail.length * 0.5), 0, 7); c.fill(); });
      c.globalAlpha = 1;
      const pad = (p, c1, c2) => {
        const gr = c.createRadialGradient(p.x - 8, p.y - 8, 4, p.x, p.y, R);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2);
        c.shadowColor = c2; c.shadowBlur = 16;
        c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, R, 0, 7); c.fill();
        c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.stroke();
        c.beginPath(); c.arc(p.x, p.y, R * 0.45, 0, 7); c.stroke();
      };
      pad(pads[1], '#ff9db0', '#d6204b');
      pad(pads[0], '#9fe3ff', '#1b7fe0');
      c.shadowColor = '#fff'; c.shadowBlur = 14; c.fillStyle = '#fff';
      c.beginPath(); c.arc(puck.x, puck.y, PR, 0, 7); c.fill(); c.shadowBlur = 0;
      parts.draw(c);
      if (flash > 0) { c.globalAlpha = flash * 0.9; c.fillStyle = '#fff'; c.font = font(54, 800); txt(c, T('¡GOL!'), CW / 2, CH / 2 + 18); c.globalAlpha = 1; }
      if (!touched && t < 6) { c.globalAlpha = 0.8; c.fillStyle = '#fff'; c.font = font(20, 700); txt(c, T(g.hint), CW / 2, CH - 24); c.globalAlpha = 1; }
    };
    return g;
  }

  /* ======================= CARRERA ======================= */
  function race(o) {
    const solo = o.role === 'solo';
    const TW = CW / 2, LW = TW / 3, FIN = 4200, BASE = 300, CARY = CH - 130;
    const g = { win: null, flip: false, me: o.role === 'guest' ? 2 : 1, evq: [], hint: 'Toca a la izquierda o a la derecha' };
    const parts = Particles();
    let obs = o.init && o.init.obs;
    if (!obs) {
      obs = [];
      for (let d = 520; d < FIN - 200; d += rnd(110, 180)) obs.push({ d: Math.round(d), lane: Math.floor(rnd(0, 3)), k: Math.random() < 0.2 ? 1 : 0 });
    }
    g.init = { obs };
    const mk = i => ({ lane: 1, x: i * TW + LW * 1.5, d: 0, spd: 0, crash: 0, boost: 0, hit: new Set(), cool: 0 });
    const P = [mk(0), mk(1)];
    let cd = 3, lastCd = 4, t = 0;
    const laneX = (i, l) => i * TW + LW * (l + 0.5);

    g.input = (pl, type, x) => {
      if (type !== 'down' || cd > 0.3 || g.win) return;
      const p = P[pl - 1];
      p.lane = clamp(p.lane + (x < CW / 2 ? -1 : 1), 0, 2);
      g.evq.push('tap');
    };

    const stepPlayer = (p, i, dt, bot) => {
      if (bot) {
        p.cool -= dt;
        if (p.cool <= 0) {
          const ahead = ob => ob.d - p.d > 20 && ob.d - p.d < 200;
          const bad = l => obs.some((ob, k) => ahead(ob) && ob.lane === l && !ob.k);
          if (bad(p.lane)) {
            if (Math.random() < 0.9) {
              const free = [p.lane - 1, p.lane + 1].filter(l => l >= 0 && l <= 2 && !bad(l));
              if (free.length) p.lane = free[Math.floor(Math.random() * free.length)];
            }
            p.cool = rnd(0.3, 0.5);
          } else {
            const want = obs.find(ob => ob.k && ahead(ob) && Math.abs(ob.lane - p.lane) === 1 && !bad(ob.lane));
            if (want && Math.random() < 0.5) p.lane = want.lane;
            p.cool = rnd(0.25, 0.45);
          }
        }
      }
      p.crash = Math.max(0, p.crash - dt);
      p.boost = Math.max(0, p.boost - dt);
      const target = p.crash > 0 ? BASE * 0.3 : p.boost > 0 ? BASE * 1.5 : BASE + 30;
      p.spd += (target - p.spd) * Math.min(1, 4 * dt);
      p.d += p.spd * dt;
      p.x += (laneX(i, p.lane) - p.x) * Math.min(1, 14 * dt);
      obs.forEach((ob, k) => {
        if (p.hit.has(k)) return;
        if (Math.abs(ob.d - p.d) < 38 && Math.abs(laneX(i, ob.lane) - p.x) < 38) {
          p.hit.add(k);
          if (ob.k) { p.boost = 1.1; if (i === g.me - 1) g.evq.push('boost'); }
          else { p.crash = 0.9; parts.burst(p.x, CARY - 30, '#ffb347', 14, 200); if (i === g.me - 1) g.evq.push('crash'); }
        }
      });
      if (p.d >= FIN && !g.win) g.win = i + 1;
    };

    g.update = dt => {
      t += dt; parts.update(dt);
      if (cd > 0) { cd -= dt; const n = Math.ceil(cd); if (n !== lastCd && n > 0) { lastCd = n; g.evq.push('count'); } if (cd <= 0) g.evq.push('go'); return; }
      if (g.win) return;
      P.forEach((p, i) => stepPlayer(p, i, dt, i === 1 && solo));
    };
    g.guestUpdate = dt => {
      t += dt; parts.update(dt);
      P.forEach((p, i) => { p.x += (laneX(i, p.lane) - p.x) * Math.min(1, 14 * dt); if (cd <= 0) p.d += p.spd * dt; });
      if (cd > 0) cd -= dt;
    };
    g.snapshot = () => ({ p: P.map(p => [p.lane, Math.round(p.d), Math.round(p.spd), p.crash > 0 ? 1 : 0, [...p.hit]]), cd, w: g.win });
    g.apply = s => {
      s.p.forEach((q, i) => { const p = P[i]; p.lane = q[0]; p.d = q[1]; p.spd = q[2]; p.crash = q[3] ? 0.5 : 0; p.hit = new Set(q[4]); });
      cd = s.cd; g.win = s.w;
    };

    g.draw = c => {
      P.forEach((p, i) => {
        c.save();
        c.beginPath(); c.rect(i * TW, 0, TW, CH); c.clip();
        c.fillStyle = i === 0 ? '#1a2a52' : '#2a1a46'; c.fillRect(i * TW, 0, TW, CH);
        c.fillStyle = 'rgba(255,255,255,.28)';
        const off = p.d % 80;
        for (let l = 1; l < 3; l++) for (let y = -80; y < CH + 80; y += 80) c.fillRect(i * TW + l * LW - 2, y + off, 4, 40);
        c.fillStyle = 'rgba(255,255,255,.06)';
        for (let y = -80; y < CH + 80; y += 80) { c.fillRect(i * TW, y + off, 6, 40); c.fillRect(i * TW + TW - 6, y + off, 6, 40); }
        const fy = CARY - (FIN - p.d);
        if (fy > -40) for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? '#111' : '#fff'; c.fillRect(i * TW + k * (TW / 12), fy - 10, TW / 12, 20); }
        c.font = '32px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        obs.forEach((ob, k) => {
          const y = CARY - (ob.d - p.d);
          if (y < -40 || y > CH + 40 || p.hit.has(k)) return;
          c.fillText(ob.k ? '⚡' : '🛢️', laneX(i, ob.lane), y);
        });
        // estela de turbo
        if (p.boost > 0) { c.fillStyle = 'rgba(255,220,80,.55)'; c.fillRect(p.x - 10, CARY + 30, 20, 50); }
        const flashing = p.crash > 0 && Math.floor(t * 14) % 2 === 0;
        c.fillStyle = flashing ? '#fff' : (i === 0 ? '#38bdf8' : '#fb5d7a');
        rr(c, p.x - 20, CARY - 32, 40, 64, 10); c.fill();
        c.fillStyle = 'rgba(0,0,30,.55)'; rr(c, p.x - 14, CARY - 18, 28, 18, 6); c.fill();
        c.fillStyle = '#ffe36e'; c.fillRect(p.x - 16, CARY - 30, 8, 5); c.fillRect(p.x + 8, CARY - 30, 8, 5);
        c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(i * TW + 10, 10, TW - 20, 8);
        c.fillStyle = i === 0 ? '#38bdf8' : '#fb5d7a'; c.fillRect(i * TW + 10, 10, (TW - 20) * Math.min(1, p.d / FIN), 8);
        c.fillStyle = '#fff'; c.font = font(13, 800); c.textBaseline = 'alphabetic';
        c.fillText(T(i === g.me - 1 ? 'TÚ' : (solo ? 'ROBOT' : 'RIVAL')), i * TW + TW / 2, 36);
        c.restore();
      });
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(TW - 1, 0, 2, CH);
      parts.draw(c);
      if (cd <= 0 && t < 7) {
        c.globalAlpha = 0.55; c.fillStyle = '#fff'; c.font = font(34, 800); c.textAlign = 'center';
        c.fillText('◀', CW * 0.16, CH - 24); c.fillText('▶', CW * 0.84, CH - 24); c.globalAlpha = 1;
      }
      if (cd > 0) {
        c.fillStyle = 'rgba(0,0,20,.45)'; c.fillRect(0, 0, CW, CH);
        c.fillStyle = '#fff'; c.font = font(110, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(Math.ceil(cd), CW / 2, CH / 2);
        c.font = font(18, 600); c.fillText(T(g.hint), CW / 2, CH / 2 + 86);
      }
      c.textBaseline = 'alphabetic';
    };
    return g;
  }

  /* ======================= REFLEJOS ======================= */
  function reflex(o) {
    const solo = o.role === 'solo';
    const g = { win: null, flip: o.role === 'guest', me: o.role === 'guest' ? 2 : 1, score: [0, 0], evq: [], rtt: 0 };
    let phase = 'ready', timer = 0.9, wait = 0, decoy = 0, goAt = 0, botT = 0, roundWin = 0, info = '', clock = 0, round = 1, dec = false;
    let taps = [], windowEnd = 0, decoyLeft = 0;
    g.getPhase = () => phase;
    g.guestUpdate = dt => { clock += dt; };

    const endRound = (w, msg) => {
      roundWin = w; info = msg; phase = 'show'; timer = 1.3; taps = [];
      g.score[w - 1]++;
      if (g.score[w - 1] >= 2) g.win = w;
      g.evq.push(w === g.me ? 'goal' : 'bad');
    };
    g.input = (pl, type) => {
      if (type !== 'down' || g.win) return;
      if (phase === 'wait') { endRound(pl === 1 ? 2 : 1, '¡Salida en falso!'); return; }
      if (phase === 'go') {
        if (taps.some(q => q.p === pl)) return;
        const r = Math.max(0, clock - goAt - (pl === 2 && !solo ? g.rtt : 0));
        taps.push({ p: pl, r });
        if (taps.length === 1) windowEnd = clock + (solo ? 0 : Math.min(0.3, g.rtt + 0.04));
        g.evq.push('tap');
      }
    };
    g.update = dt => {
      clock += dt;
      if (phase === 'go') {
        if (solo && !taps.length && clock - goAt >= botT) taps.push({ p: 2, r: botT });
        if (taps.length && clock >= windowEnd) {
          const best = taps.slice().sort((a, b) => a.r - b.r)[0];
          endRound(best.p, `${Math.round(best.r * 1000)} ms`);
        }
        return;
      }
      if (g.win && phase === 'show') return;
      if (phase === 'ready') { timer -= dt; if (timer <= 0) { phase = 'wait'; wait = rnd(1.4, 3.6); decoyLeft = Math.random() < 0.55 ? rnd(0.5, Math.max(0.6, wait - 0.7)) : -1; dec = false; } }
      else if (phase === 'wait') {
        wait -= dt;
        if (decoyLeft >= 0) { decoyLeft -= dt; if (decoyLeft < 0) { dec = true; decoy = 0.35; } }
        if (dec) { decoy -= dt; if (decoy <= 0) dec = false; }
        if (wait <= 0) { phase = 'go'; goAt = clock; botT = rnd(0.32, 0.62); taps = []; g.evq.push('go'); }
      } else if (phase === 'show') { timer -= dt; if (timer <= 0) { round++; phase = 'ready'; timer = 0.9; } }
    };
    g.snapshot = () => ({ ph: phase, sc: g.score, r: round, rw: roundWin, inf: info, w: g.win, d: dec ? 1 : 0 });
    g.apply = s => { phase = s.ph; g.score = s.sc; round = s.r; roundWin = s.rw; info = s.inf; g.win = s.w; dec = !!s.d; };

    g.draw = c => {
      const half = (i, y0) => {
        const win = phase === 'show' && roundWin === i;
        const base = phase === 'go' ? '#1ec26b' : phase === 'wait' ? (dec ? '#e0a82e' : '#d63b52') : '#2a3a78';
        c.fillStyle = phase === 'show' ? (win ? '#1ec26b' : '#3a3f66') : base;
        c.fillRect(0, y0, CW, CH / 2);
        c.save();
        c.translate(CW / 2, y0 + CH / 4);
        if (i === 2) c.rotate(Math.PI);
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(44, 800);
        const label = phase === 'ready' ? `Ronda ${round}` : phase === 'wait' ? (dec ? '¿…?' : 'Espera…') : phase === 'go' ? '¡YA!' : (win ? '¡Punto!' : '');
        c.fillText(T(label), 0, -10);
        c.font = font(18, 600); c.fillStyle = 'rgba(255,255,255,.85)';
        const sub = phase === 'show' && win ? info : (i === g.me ? 'Tú' : (solo ? 'Robot' : 'Rival'));
        c.fillText(T(sub), 0, 36);
        c.font = font(28, 800);
        c.fillText('●'.repeat(g.score[i - 1]) + '○'.repeat(2 - g.score[i - 1]), 0, -64);
        c.restore();
      };
      half(2, 0); half(1, CH / 2);
      c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(0, CH / 2 - 2, CW, 4);
      c.textBaseline = 'alphabetic';
    };
    return g;
  }
  // texto traducible: la app define window.DUEL_T
  const T = s => (window.DUEL_T ? window.DUEL_T(s) : s);

  /* ======================= CONECTA 4 ======================= */
  function connect4(o) {
    const solo = o.role === 'solo';
    const COLS = 7, ROWS = 6, CELL = 46, BX = (CW - COLS * CELL) / 2, BY = 190;
    const g = { win: null, flip: false, me: o.role === 'guest' ? 2 : 1, evq: [], hint: 'Toca una columna para soltar tu ficha' };
    const parts = Particles();
    const b = new Array(COLS * ROWS).fill(0);
    let turn = 1, last = null, lw = [], anim = null, timer = 20, botWait = 0.7, pendingWin = null, hover = -1, t = 0;

    const rowFor = c => { for (let r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + c]) return r; return -1; };
    const lines = (bd, p) => {
      const out = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(([dc, dr]) => {
          const cells = [];
          for (let k = 0; k < 4; k++) { const cc = c + dc * k, rr2 = r + dr * k; if (cc < 0 || cc >= COLS || rr2 < 0 || rr2 >= ROWS) return; cells.push(rr2 * COLS + cc); }
          out.push(cells);
        });
      }
      return out;
    };
    const LINES = lines();
    const winner = bd => { for (const l of LINES) { const v = bd[l[0]]; if (v && l.every(i => bd[i] === v)) return { p: v, cells: l }; } return null; };
    const full = bd => bd.every(Boolean);

    const drop = (pl, c) => {
      const r = rowFor(c);
      if (r < 0) return false;
      b[r * COLS + c] = pl; last = [c, r];
      anim = { c, r, y: -1.2, v: 0, p: pl };
      g.evq.push('drop');
      const w = winner(b);
      pendingWin = w ? { p: w.p, cells: w.cells } : (full(b) ? { p: 0, cells: [] } : null);
      turn = pl === 1 ? 2 : 1; timer = 20; botWait = 0.7;
      return true;
    };

    g.input = (pl, type, x) => {
      if (g.win !== null || anim) return;
      if (type === 'move' || type === 'down') hover = Math.floor((x - BX) / CELL);
      if (type !== 'down' || turn !== pl) return;
      const c = Math.floor((x - BX) / CELL);
      if (c >= 0 && c < COLS) drop(pl, c);
    };

    // Robot: negamax con poda alfa-beta
    const score4 = (bd, p) => {
      let s = 0; const q = p === 1 ? 2 : 1;
      for (const l of LINES) {
        let a = 0, e = 0;
        for (const i of l) { if (bd[i] === p) a++; else if (bd[i] === q) e++; }
        if (a && e) continue;
        if (a === 3) s += 5; else if (a === 2) s += 2; else if (e === 3) s -= 4; else if (e === 2) s -= 1;
      }
      for (let r = 0; r < ROWS; r++) if (bd[r * COLS + 3] === p) s += 3;
      return s;
    };
    const order = [3, 2, 4, 1, 5, 0, 6];
    const rowIn = (bd, c) => { for (let r = ROWS - 1; r >= 0; r--) if (!bd[r * COLS + c]) return r; return -1; };
    const nega = (bd, depth, a, bb, p) => {
      const w = winner(bd);
      if (w) return w.p === p ? 1000 + depth : -1000 - depth;
      if (depth === 0 || full(bd)) return score4(bd, p);
      let best = -1e9;
      for (const c of order) {
        const r = rowIn(bd, c);
        if (r < 0) continue;
        bd[r * COLS + c] = p;
        const v = -nega(bd, depth - 1, -bb, -a, p === 1 ? 2 : 1);
        bd[r * COLS + c] = 0;
        if (v > best) best = v;
        if (best > a) a = best;
        if (a >= bb) break;
      }
      return best;
    };
    const botMove = () => {
      let bestC = -1, bestV = -1e9;
      const bd = b.slice();
      for (const c of order) {
        const r = rowIn(bd, c);
        if (r < 0) continue;
        bd[r * COLS + c] = 2;
        let v = -nega(bd, 4, -1e9, 1e9, 1);
        bd[r * COLS + c] = 0;
        v += Math.random() * 2;
        if (v > bestV) { bestV = v; bestC = c; }
      }
      if (Math.random() < 0.08) { const free = order.filter(c => rowIn(bd, c) >= 0); bestC = free[Math.floor(Math.random() * free.length)]; }
      if (bestC >= 0) drop(2, bestC);
    };

    g.update = dt => {
      t += dt; parts.update(dt);
      if (anim) {
        anim.v += 40 * dt; anim.y += anim.v * dt;
        if (anim.y >= anim.r) {
          anim = null;
          g.evq.push('hit');
          if (pendingWin) { lw = pendingWin.cells; g.win = pendingWin.p === 0 ? 3 : pendingWin.p; pendingWin = null; if (g.win !== 3) lw.forEach(i => parts.burst(BX + (i % COLS + 0.5) * CELL, BY + (Math.floor(i / COLS) + 0.5) * CELL, '#fff', 4, 160)); }
        }
        return;
      }
      if (g.win !== null) return;
      timer -= dt;
      if (timer <= 0) { const free = order.filter(c => rowFor(c) >= 0); drop(turn, free[Math.floor(Math.random() * free.length)]); return; }
      if (solo && turn === 2) { botWait -= dt; if (botWait <= 0) botMove(); }
    };
    g.guestUpdate = dt => {
      t += dt; parts.update(dt);
      if (anim) { anim.v += 40 * dt; anim.y += anim.v * dt; if (anim.y >= anim.r) anim = null; }
    };
    g.snapshot = () => ({ b: b.join(''), t: turn, l: last, lw, w: g.win, tm: Math.round(timer) });
    g.apply = s => {
      const nb = s.b.split('').map(Number);
      const changed = s.l && (!last || last[0] !== s.l[0] || last[1] !== s.l[1] || nb.join('') !== b.join(''));
      for (let i = 0; i < b.length; i++) b[i] = nb[i];
      if (changed && s.l) { last = s.l; anim = { c: s.l[0], r: s.l[1], y: -1.2, v: 0, p: nb[s.l[1] * COLS + s.l[0]] }; g.evq.push('drop'); }
      turn = s.t; lw = s.lw || []; timer = s.tm;
      if (s.w !== null && !anim) g.win = s.w; else if (s.w !== null) setTimeout(() => { g.win = s.w; }, 600);
    };

    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, '#16205a'); bg.addColorStop(1, '#2a1650');
      c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const mine = turn === g.me;
      c.font = font(22, 800); c.fillStyle = '#fff';
      c.fillText(g.win !== null ? '' : (mine ? T('Tu turno') : T(solo ? 'Turno del robot' : 'Turno del rival')), CW / 2, 70);
      c.font = font(16, 600); c.fillStyle = 'rgba(255,255,255,.7)';
      if (g.win === null) c.fillText(`${timer} s`, CW / 2, 96);
      // ficha en cursor
      if (mine && g.win === null && !anim && hover >= 0 && hover < COLS) {
        c.globalAlpha = 0.6; c.fillStyle = g.me === 1 ? '#ff4d6d' : '#ffd23f';
        c.beginPath(); c.arc(BX + (hover + 0.5) * CELL, BY - 34, CELL * 0.38, 0, 7); c.fill(); c.globalAlpha = 1;
      }
      // fichas (debajo del tablero)
      const disc = (col, row, y, p) => {
        const x = BX + (col + 0.5) * CELL, yy = BY + (y + 0.5) * CELL;
        c.fillStyle = p === 1 ? '#ff4d6d' : '#ffd23f';
        c.beginPath(); c.arc(x, yy, CELL * 0.4, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - 6, yy - 6, CELL * 0.14, 0, 7); c.fill();
      };
      for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
        const v = b[r * COLS + col];
        if (!v) continue;
        if (anim && anim.c === col && anim.r === r) continue;
        disc(col, r, r, v);
      }
      if (anim) disc(anim.c, anim.r, Math.min(anim.y, anim.r), anim.p);
      // tablero con agujeros
      c.fillStyle = '#2547d6';
      c.beginPath();
      rr(c, BX - 6, BY - 6, COLS * CELL + 12, ROWS * CELL + 12, 18);
      for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) { c.moveTo(BX + (col + 0.5) * CELL + CELL * 0.4, BY + (r + 0.5) * CELL); c.arc(BX + (col + 0.5) * CELL, BY + (r + 0.5) * CELL, CELL * 0.4, 0, 6.2832, true); }
      c.fill('evenodd');
      // celdas ganadoras
      lw.forEach(i => {
        c.strokeStyle = '#fff'; c.lineWidth = 4; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
        c.beginPath(); c.arc(BX + (i % COLS + 0.5) * CELL, BY + (Math.floor(i / COLS) + 0.5) * CELL, CELL * 0.4, 0, 7); c.stroke(); c.globalAlpha = 1;
      });
      parts.draw(c);
      c.font = font(15, 600); c.fillStyle = 'rgba(255,255,255,.7)';
      c.fillText(g.me === 1 ? T('Tú: rojo · Rival: amarillo') : T('Tú: amarillo · Rival: rojo'), CW / 2, BY + ROWS * CELL + 44);
      if (g.win === null && t < 7) { c.fillText(T(g.hint), CW / 2, BY + ROWS * CELL + 70); }
      if (g.win === 3) { c.fillStyle = '#fff'; c.font = font(26, 800); c.fillText(T('¡Empate!'), CW / 2, 130); }
    };
    return g;
  }

  /* ======================= PIEDRA, PAPEL O TIJERA ======================= */
  function rps(o) {
    const solo = o.role === 'solo';
    const ICONS = ['✊', '✋', '✌️'];
    const g = { win: null, flip: false, me: o.role === 'guest' ? 2 : 1, score: [0, 0], evq: [], hint: 'Elige antes de que se acabe el tiempo', localInput: true };
    let pick = [null, null], phase = 'pick', timer = 6, show = 0, rw = 0, round = 1, t = 0, botAt = rnd(0.8, 3);
    const beats = (a, b) => (a === 0 && b === 2) || (a === 1 && b === 0) || (a === 2 && b === 1);
    const btnRect = i => ({ x: 20 + i * 112, y: 400, w: 100, h: 110 });

    const resolve = () => {
      const [a, b] = pick;
      rw = a === b ? 0 : beats(a, b) ? 1 : 2;
      if (rw) g.score[rw - 1]++;
      phase = 'show'; show = 2;
      g.evq.push(rw === 0 ? 'wall' : rw === g.me ? 'goal' : 'bad');
      if (g.score[0] >= 2) g.win = 1; else if (g.score[1] >= 2) g.win = 2;
    };
    g.input = (pl, type, x, y) => {
      if (type !== 'down' || phase !== 'pick' || g.win) return;
      for (let i = 0; i < 3; i++) {
        const r = btnRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { if (pick[pl - 1] === null) { pick[pl - 1] = i; g.evq.push('tap'); } }
      }
    };
    g.update = dt => {
      t += dt;
      if (phase === 'pick') {
        timer -= dt;
        if (solo && pick[1] === null) { botAt -= dt; if (botAt <= 0) pick[1] = Math.floor(Math.random() * 3); }
        if (timer <= 0) { for (let i = 0; i < 2; i++) if (pick[i] === null) pick[i] = Math.floor(Math.random() * 3); }
        if (pick[0] !== null && pick[1] !== null) resolve();
      } else if (phase === 'show') {
        show -= dt;
        if (show <= 0 && !g.win) { phase = 'pick'; pick = [null, null]; timer = 6; round++; botAt = rnd(0.8, 3); }
      }
    };
    g.snapshot = () => ({ ph: phase, pk: phase === 'show' ? pick : [pick[0] !== null ? -1 : null, pick[1] !== null ? -1 : null], sc: g.score, rw, r: round, w: g.win, tm: Math.ceil(timer) });
    g.apply = s => {
      if (s.ph === 'pick' && phase === 'show') { /* nueva ronda */ }
      const keep = pick[g.me - 1], was = phase;
      phase = s.ph; pick = s.pk.slice(); g.score = s.sc; rw = s.rw; round = s.r; g.win = s.w; timer = s.tm;
      if (phase === 'pick' && was === 'pick' && keep !== null && keep >= 0) pick[g.me - 1] = keep;
    };
    g.guestUpdate = () => {};
    g.localPick = i => { if (g.me === 2 && pick[1] === null) pick[1] = i; };

    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, '#2a1650'); bg.addColorStop(1, '#16205a');
      c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const me = g.me, op = me === 1 ? 2 : 1;
      c.fillStyle = '#fff'; c.font = font(20, 800);
      c.fillText(T(`Ronda ${round}`), CW / 2, 36);
      c.font = font(28, 800);
      c.fillText('●'.repeat(g.score[op - 1]) + '○'.repeat(2 - g.score[op - 1]), CW / 2, 80);
      // rival
      c.font = font(14, 600); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(T(solo ? 'Robot' : 'Rival'), CW / 2, 120);
      const opPick = pick[op - 1];
      c.font = '80px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.fillStyle = '#fff';
      c.fillText(phase === 'show' && opPick >= 0 ? ICONS[opPick] : (opPick === null ? '🤔' : '🙈'), CW / 2, 190);
      // resultado
      c.font = font(30, 800);
      if (phase === 'show') { c.fillStyle = rw === 0 ? '#ffd23f' : rw === me ? '#3ddc97' : '#ff6b81'; c.fillText(T(rw === 0 ? 'Empate' : rw === me ? '¡Punto!' : 'Punto rival'), CW / 2, 285); }
      else { c.fillStyle = 'rgba(255,255,255,.8)'; c.font = font(24, 700); c.fillText(`${Math.max(0, Math.ceil(timer))} s`, CW / 2, 285); }
      // mi elección
      const mp = pick[me - 1];
      if (phase === 'show' && mp >= 0) { c.font = '80px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.fillText(ICONS[mp], CW / 2, 355); }
      // botones
      for (let i = 0; i < 3; i++) {
        const r = btnRect(i), on = mp === i;
        c.fillStyle = on ? 'rgba(61,220,151,.45)' : 'rgba(255,255,255,.16)';
        rr(c, r.x, r.y, r.w, r.h, 24); c.fill();
        c.strokeStyle = on ? '#3ddc97' : 'rgba(255,255,255,.35)'; c.lineWidth = on ? 4 : 2; c.stroke();
        c.font = '54px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.fillStyle = '#fff';
        c.fillText(ICONS[i], r.x + r.w / 2, r.y + r.h / 2);
      }
      c.font = font(14, 600); c.fillStyle = 'rgba(255,255,255,.7)';
      c.fillText(T(`Tú · ${'●'.repeat(g.score[me - 1])}${'○'.repeat(2 - g.score[me - 1])}`), CW / 2, 535);
      c.textBaseline = 'alphabetic';
    };
    return g;
  }

  /* ======================= TIRA Y AFLOJA ======================= */
  function tug(o) {
    const solo = o.role === 'solo';
    const g = { win: null, flip: false, me: o.role === 'guest' ? 2 : 1, evq: [], hint: '¡Toca lo más rápido que puedas!' };
    const parts = Particles();
    let m = 0, left = 15, cd = 3, lastCd = 4, t = 0, botT = 0, taps = [0, 0], pulse = [0, 0];

    g.input = (pl, type) => {
      if (type !== 'down' || cd > 0 || g.win) return;
      m += pl === 1 ? 0.028 : -0.028;
      taps[pl - 1]++; pulse[pl - 1] = 1;
      if (pl === g.me) g.evq.push('tap');
    };
    g.update = dt => {
      t += dt; parts.update(dt); pulse = pulse.map(v => Math.max(0, v - dt * 5));
      if (cd > 0) { cd -= dt; const n = Math.ceil(cd); if (n !== lastCd && n > 0) { lastCd = n; g.evq.push('count'); } if (cd <= 0) g.evq.push('go'); return; }
      if (g.win) return;
      left -= dt;
      if (solo) {
        botT -= dt;
        const rate = 6 + Math.min(2.5, (15 - left) * 0.15);
        if (botT <= 0) { g.input(2, 'down'); botT = (1 / rate) * rnd(0.75, 1.25); }
      }
      m = clamp(m, -1, 1);
      if (m >= 1) g.win = 1; else if (m <= -1) g.win = 2;
      else if (left <= 0) g.win = m > 0.01 ? 1 : m < -0.01 ? 2 : (taps[0] >= taps[1] ? 1 : 2);
    };
    g.guestUpdate = dt => { t += dt; parts.update(dt); pulse = pulse.map(v => Math.max(0, v - dt * 5)); if (cd > 0) cd -= dt; };
    g.snapshot = () => ({ m: Math.round(m * 1000) / 1000, l: Math.round(left * 10) / 10, cd, w: g.win });
    g.apply = s => { m = s.m; left = s.l; cd = s.cd; g.win = s.w; };
    g.localTap = () => { pulse[1] = 1; };

    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, '#2a1450'); bg.addColorStop(1, '#10224f');
      c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const me = g.me, sign = me === 1 ? 1 : -1;      // positivo = hacia mí
      const mm = m * sign;
      // zonas
      c.fillStyle = 'rgba(255,92,122,.10)'; c.fillRect(0, 0, CW, CH / 2);
      c.fillStyle = 'rgba(76,201,255,.12)'; c.fillRect(0, CH / 2, CW, CH / 2);
      // cuerda
      const cy = CH / 2 - mm * (CH / 2 - 70);
      c.strokeStyle = '#c9a36b'; c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.moveTo(CW / 2, 30); c.lineTo(CW / 2, CH - 30); c.stroke();
      c.strokeStyle = '#8a6a3a'; c.lineWidth = 3; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(CW / 2, 30); c.lineTo(CW / 2, CH - 30); c.stroke(); c.setLineDash([]);
      // metas
      c.fillStyle = '#ff5c7a'; c.fillRect(60, 40, CW - 120, 6);
      c.fillStyle = '#4cc9ff'; c.fillRect(60, CH - 46, CW - 120, 6);
      // marcador
      c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 16;
      rr(c, CW / 2 - 26, cy - 14, 52, 28, 12); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#d33'; c.font = font(18, 800); c.textBaseline = 'middle'; c.fillText('🚩', CW / 2, cy + 1);
      c.textBaseline = 'alphabetic';
      // jugadores
      const grow = i => 1 + pulse[i] * 0.25;
      c.font = `${Math.round(64 * grow(me === 1 ? 1 : 0))}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; c.textBaseline = 'middle';
      c.fillText('💪', 70, CH - 110);
      c.font = `${Math.round(64 * grow(me === 1 ? 0 : 1))}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      c.fillText('💪', CW - 70, 110);
      c.textBaseline = 'alphabetic';
      c.font = font(16, 700); c.fillStyle = '#fff';
      c.fillText(T('Tú'), 70, CH - 62); c.fillText(T(solo ? 'Robot' : 'Rival'), CW - 70, 62);
      c.font = font(30, 800); c.fillText(`${Math.max(0, Math.ceil(left))} s`, CW / 2 + 0, CH / 2 + (mm > 0 ? -60 : 70));
      parts.draw(c);
      if (cd > 0) {
        c.fillStyle = 'rgba(0,0,20,.5)'; c.fillRect(0, 0, CW, CH);
        c.fillStyle = '#fff'; c.font = font(110, 800); c.textBaseline = 'middle'; c.fillText(Math.ceil(cd), CW / 2, CH / 2);
        c.font = font(18, 600); c.fillText(T(g.hint), CW / 2, CH / 2 + 86); c.textBaseline = 'alphabetic';
      }
    };
    return g;
  }

  /* ======================= Conexión en línea (WebRTC con códigos) ======================= */
  const Net = {
    pc: null, ch: null, ws: null, role: null, rtt: 0, open: false,
    onopen: null, onclose: null, onmsg: null, _ping: 0,

    cfg() { return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }; },

    async pack(desc) {
      const json = JSON.stringify({ t: desc.type, s: desc.sdp });
      let bytes = new TextEncoder().encode(json), tag = 'JK0-';
      if (window.CompressionStream) {
        const cs = new CompressionStream('deflate-raw');
        const w = cs.writable.getWriter(); w.write(bytes); w.close();
        bytes = new Uint8Array(await new Response(cs.readable).arrayBuffer()); tag = 'JK1-';
      }
      let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
      return tag + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    async unpack(code) {
      const c = String(code).replace(/\s+/g, '');
      const tag = c.slice(0, 4);
      if (tag !== 'JK0-' && tag !== 'JK1-') throw new Error('código no válido');
      const b64 = c.slice(4).replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
      let bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
      if (tag === 'JK1-') {
        const ds = new DecompressionStream('deflate-raw');
        const w = ds.writable.getWriter(); w.write(bytes); w.close();
        bytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
      }
      const o = JSON.parse(new TextDecoder().decode(bytes));
      return { type: o.t, sdp: o.s };
    },
    gathered(pc) {
      return new Promise(res => {
        if (pc.iceGatheringState === 'complete') return res();
        const done = () => { pc.removeEventListener('icegatheringstatechange', chk); res(); };
        const chk = () => { if (pc.iceGatheringState === 'complete') done(); };
        pc.addEventListener('icegatheringstatechange', chk);
        setTimeout(done, 4000);
      });
    },
    wire(ch) {
      this.ch = ch;
      ch.onopen = () => { this.open = true; this.closeSignal(); this.startPing(); if (this.onopen) this.onopen(); };
      ch.onclose = () => { this.open = false; if (this.onclose) this.onclose(); };
      ch.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'ping') { this.send({ t: 'pong', ts: m.ts }); return; }
        if (m.t === 'pong') { const r = (performance.now() - m.ts) / 1000; this.rtt = this.rtt ? this.rtt * 0.7 + r * 0.3 : r; return; }
        if (this.onmsg) this.onmsg(m);
      };
    },
    startPing() { clearInterval(this._ping); this._ping = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 1500); this.send({ t: 'ping', ts: performance.now() }); },
    send(m) { if (this.ch && this.ch.readyState === 'open') { try { this.ch.send(JSON.stringify(m)); } catch (e) { /* ignorar */ } } },


    /* ---- Códigos cortos (5 letras + 3 números): un servidor público solo hace de «cartero» para el primer mensaje ---- */
    signalUrl(id) { return (window.DUEL_SIGNAL || 'wss://0.peerjs.com/peerjs?key=peerjs') + '&id=' + encodeURIComponent(id) + '&token=' + Math.random().toString(36).slice(2, 12); },
    newCode() {
      const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c = '';
      for (let i = 0; i < 5; i++) c += L[Math.floor(Math.random() * L.length)];
      for (let i = 0; i < 3; i++) c += Math.floor(Math.random() * 10);
      return c;
    },
    validCode: c => /^[A-Z]{5}\d{3}$/.test(c),
    closeSignal() {
      clearInterval(this._hb);
      if (this.ws) { this.ws.onclose = null; this.ws.onmessage = null; try { this.ws.close(); } catch (e) { /* ignorar */ } }
      this.ws = null;
    },
    // Abre el canal con el servidor de señal; resuelve cuando el id queda registrado
    openSignal(id) {
      return new Promise((res, rej) => {
        let ws;
        try { ws = new WebSocket(this.signalUrl(id)); } catch (e) { rej(new Error('sin conexión con el servidor')); return; }
        this.ws = ws;
        const t = setTimeout(() => { rej(new Error('el servidor no responde')); }, 8000);
        ws.onerror = () => { clearTimeout(t); rej(new Error('sin conexión con el servidor')); };
        ws.onclose = () => { clearTimeout(t); rej(new Error('sin conexión con el servidor')); };
        ws.onmessage = e => {
          let m; try { m = JSON.parse(e.data); } catch (x) { return; }
          if (m.type === 'OPEN') { clearTimeout(t); ws.onerror = null; ws.onclose = null; this._hb = setInterval(() => { try { ws.send(JSON.stringify({ type: 'HEARTBEAT' })); } catch (x) { /* ignorar */ } }, 5000); res(); }
          else if (m.type === 'ID-TAKEN') { clearTimeout(t); rej(Object.assign(new Error('código ocupado'), { taken: true })); }
          else if (m.type === 'INVALID-KEY') { clearTimeout(t); rej(new Error('servidor no válido')); }
        };
      });
    },
    sig(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },

    // Quien crea la partida: registra su código y espera a que alguien se una
    async createRoom() {
      this.close();
      this.role = 'host';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code = this.newCode();
        try { await this.openSignal('jerkon-' + code); break; }
        catch (e) { this.closeSignal(); if (!e.taken || i === 5) throw e; }
      }
      this.ws.onmessage = async e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.type !== 'OFFER' || this.pc) return;
        try {
          const pc = this.pc = new RTCPeerConnection(this.cfg());
          pc.ondatachannel = ev => this.wire(ev.channel);
          pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) && this.onclose) this.onclose(); };
          await pc.setRemoteDescription(m.payload.d);
          await pc.setLocalDescription(await pc.createAnswer());
          await this.gathered(pc);
          this.sig({ type: 'ANSWER', dst: m.src, payload: { d: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } } });
        } catch (err) { if (this.onerror) this.onerror(err); }
      };
      return code;
    },
    // Quien se une: manda su oferta al código y recibe la respuesta
    async joinRoom(code) {
      this.close();
      this.role = 'guest';
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!this.validCode(code)) throw new Error('El código son 5 letras y 3 números');
      await this.openSignal('jerkon-g' + Math.random().toString(36).slice(2, 10));
      const pc = this.pc = new RTCPeerConnection(this.cfg());
      this.wire(pc.createDataChannel('duel'));
      pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) && this.onclose) this.onclose(); };
      await pc.setLocalDescription(await pc.createOffer());
      await this.gathered(pc);
      return new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('nadie contesta a ese código')), 12000);
        this.ws.onmessage = async e => {
          let m; try { m = JSON.parse(e.data); } catch (x) { return; }
          if (m.type === 'EXPIRE' || m.type === 'ERROR') { clearTimeout(t); rej(new Error('no hay ninguna partida con ese código')); }
          else if (m.type === 'ANSWER') { clearTimeout(t); try { await pc.setRemoteDescription(m.payload.d); res(); } catch (err) { rej(err); } }
        };
        this.sig({ type: 'OFFER', dst: 'jerkon-' + code, payload: { d: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } } });
      });
    },

    async host() {
      this.close();
      this.role = 'host';
      const pc = this.pc = new RTCPeerConnection(this.cfg());
      this.wire(pc.createDataChannel('duel'));
      pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) && this.onclose) this.onclose(); };
      await pc.setLocalDescription(await pc.createOffer());
      await this.gathered(pc);
      return this.pack(pc.localDescription);
    },
    async answer(code) {
      this.close();
      this.role = 'guest';
      const desc = await this.unpack(code);
      if (desc.type !== 'offer') throw new Error('Ese no es un código de invitación');
      const pc = this.pc = new RTCPeerConnection(this.cfg());
      pc.ondatachannel = e => this.wire(e.channel);
      pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) && this.onclose) this.onclose(); };
      await pc.setRemoteDescription(desc);
      await pc.setLocalDescription(await pc.createAnswer());
      await this.gathered(pc);
      return this.pack(pc.localDescription);
    },
    async accept(code) {
      const desc = await this.unpack(code);
      if (desc.type !== 'answer') throw new Error('Ese no es un código de respuesta');
      await this.pc.setRemoteDescription(desc);
    },
    close() {
      clearInterval(this._ping);
      this.closeSignal();
      const had = !!this.pc;
      this.open = false; this.rtt = 0;
      if (this.ch) { this.ch.onclose = null; try { this.ch.close(); } catch (e) { /* ignorar */ } }
      if (this.pc) { this.pc.onconnectionstatechange = null; try { this.pc.close(); } catch (e) { /* ignorar */ } }
      this.pc = null; this.ch = null;
      return had;
    }
  };

  window.DuelGames = { hockey, race, reflex, connect4, rps, tug, CW, CH };
  window.DuelNet = Net;
  window.DuelFx = { play: playFx, opts: OPTS };
})();
