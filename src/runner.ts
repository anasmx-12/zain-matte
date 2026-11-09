// Matte Dash: a 2D lane runner. Swipe or use the arrows: left/right to change lane, up to jump.
// Jump over the low fences, dodge the crates, collect rings. Open only during the reward time,
// and everything in it is bought with stars from maths.
import { $, S, save, tone, show } from './core';
import { rewardLeft, rewardActive, fmt } from './timer';
import { heroById, heroSVG, runItem } from './heroes';

type Kind = 'ring' | 'fence' | 'crate' | 'magnet' | 'shield';
interface Obj { lane: number; y: number; kind: Kind }
interface Pop { x: number; y: number; t: number; text: string; col: string }

let cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let W = 0, H = 0, dpr = 1, raf = 0, last = 0;
let state: 'intro' | 'play' | 'over' | 'timeup' = 'intro';
let lane = 1, lx = 1, jumpT = 0, jumpLen = 0.7, speed = 0, dist = 0, rings = 0, lives = 1, shield = false, magnetT = 0, magnetLen = 6;
let hurt = 0, elapsed = 0, spawnD = 0, objs: Obj[] = [], pops: Pop[] = [], trail: { x: number; y: number; t: number }[] = [];
let imgs: HTMLImageElement[] = [], usedBoosts: string[] = [];
const MAG_BASE = 6;

const score = () => Math.floor(dist / 40) + rings * 5;
const geo = () => { const tw = Math.min(W * 0.84, 460), x0 = (W - tw) / 2, lw = tw / 3; return { tw, x0, lw, size: lw * 0.7, py: H * 0.78 }; };
const laneX = (l: number) => { const g = geo(); return g.x0 + g.lw * (l + 0.5); };

export function openRunner(): void {
  if (!rewardActive()) return;
  show('runner');
  cv = $('#runCanvas') as HTMLCanvasElement; ctx = cv.getContext('2d')!;
  resize();
  const h = heroById(S.runner.hero);
  imgs = [0, 1].map(f => { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(heroSVG(h, f)); return i; });
  state = 'intro';
  let sx = 0, sy = 0, st = 0;
  cv.onpointerdown = e => { sx = e.clientX; sy = e.clientY; st = performance.now(); };
  cv.onpointerup = e => {
    const dx = e.clientX - sx, dy = e.clientY - sy, quick = performance.now() - st < 600;
    if (state !== 'play') { if (state === 'timeup') leave(); else start(); return; }
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) && quick) move(dx > 0 ? 1 : -1);
    else if (dy < -28 && quick) jump();
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) jump();
  };
  $('#runLeft').onclick = () => (state === 'play' ? move(-1) : null);
  $('#runRight').onclick = () => (state === 'play' ? move(1) : null);
  $('#runJump').onclick = () => (state === 'play' ? jump() : state === 'timeup' ? leave() : start());
  window.onresize = resize;
  cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
}

function leave(): void { $<HTMLButtonElement>('#runner [data-go="garage"]').click(); }
function resize(): void {
  const box = cv.parentElement!;
  W = box.clientWidth; H = Math.round(Math.min(window.innerHeight * 0.66, W * 1.4));
  dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function start(): void {
  const h = heroById(S.runner.hero);
  state = 'play'; lane = 1; lx = 1; jumpT = 0; dist = 0; rings = 0; elapsed = 0; hurt = 0; objs = []; pops = []; trail = [];
  spawnD = H * 0.6; lives = 1 + (h.id === 'knuckles' ? 1 : 0); shield = h.id === 'shadow'; magnetT = 0;
  jumpLen = h.id === 'sonic' ? 0.85 : 0.7; magnetLen = MAG_BASE * (h.id === 'amy' ? 2 : 1);
  // Boosts the child chose to bring are used up now.
  usedBoosts = [];
  for (const [key, id] of [['shield', 'run-shield'], ['magnet', 'run-magnet'], ['life', 'run-life']] as const) {
    if (!S.runner.bring[key] || !(S.owned[id] > 0)) continue;
    S.owned[id]--; usedBoosts.push(runItem(id)!.emoji);
    if (key === 'shield') shield = true; else if (key === 'magnet') magnetT = magnetLen * 1.5; else lives++;
  }
  save();
}

function move(d: number): void { const n = Math.max(0, Math.min(2, lane + d)); if (n !== lane) { lane = n; tone('blip'); } }
function jump(): void { if (jumpT <= 0) jumpT = jumpLen; }

function spawn(): void {
  const r = Math.random(), { size } = geo();
  const ringLine = (l: number, n: number, from = 0) => { for (let i = 0; i < n; i++) objs.push({ lane: l, y: -from - i * size * 0.75, kind: 'ring' }); };
  const hard = Math.min(1, elapsed / 90);
  if (r < 0.06) { objs.push({ lane: Math.floor(Math.random() * 3), y: -size, kind: Math.random() < 0.5 ? 'magnet' : 'shield' }); return; }
  if (r < 0.3) { ringLine(Math.floor(Math.random() * 3), 5); return; }
  // Obstacles never block all three lanes with crates, so there is always a way through.
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5), n = Math.random() < 0.35 + hard * 0.35 ? 2 : 1;
  lanes.slice(0, n).forEach((l, i) => {
    const kind: Kind = i === 1 || Math.random() < 0.45 ? 'fence' : 'crate';
    objs.push({ lane: l, y: -size, kind });
    if (kind === 'fence' && Math.random() < 0.5) ringLine(l, 3, size * 0.1);
  });
  if (Math.random() < 0.5) ringLine(lanes[2], 4, size * 0.4);
}

function hit(): void {
  if (hurt > 0) return;
  const { py } = geo();
  tone(false); hurt = 1.3;
  if (shield) { shield = false; pops.push({ x: laneX(lx), y: py - 30, t: 0, text: 'Skölden tog smällen!', col: '#BFD7FF' }); return; }
  lives--;
  pops.push({ x: laneX(lx), y: py - 30, t: 0, text: 'Aj!', col: '#FF8A7A' });
  if (lives <= 0) { state = 'over'; endRun(); }
}

function endRun(): void { if (score() > S.runner.best) { S.runner.best = score(); } save(); }

function loop(now: number): void {
  if ($('#runner').hidden) { cancelAnimationFrame(raf); window.onresize = null; return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const left = rewardLeft();
  $('#runTime').textContent = `⏱ ${left > 0 ? fmt(left) : '0:00'}`;
  $('#runScore').textContent = `Poäng: ${state === 'intro' ? 0 : score()}`;
  if (left <= 0 && state !== 'timeup') { if (state === 'play') endRun(); state = 'timeup'; }
  if (state === 'play') update(dt);
  for (const p of pops) p.t += dt;
  pops = pops.filter(p => p.t < 1);
  draw();
  raf = requestAnimationFrame(loop);
}

function update(dt: number): void {
  const g = geo();
  elapsed += dt;
  speed = H * (0.62 + Math.min(elapsed * 0.01, 0.85));
  const mv = speed * dt; dist += mv;
  lx += (lane - lx) * Math.min(1, dt * 16);
  jumpT = Math.max(0, jumpT - dt); hurt = Math.max(0, hurt - dt); magnetT = Math.max(0, magnetT - dt);
  for (const o of objs) o.y += mv;
  spawnD -= mv;
  if (spawnD <= 0) { spawn(); spawnD = g.size * (3.2 + Math.random() * 1.6) * (1 - Math.min(elapsed / 200, 0.3)); }
  const me = Math.round(lx), px = laneX(lx);
  objs = objs.filter(o => {
    const near = Math.abs(o.y - g.py) < g.size * 0.42;
    if (o.kind === 'ring') {
      const pulled = magnetT > 0 && o.y > g.py - H * 0.32 && o.y < g.py + g.size * 0.3;
      if ((near && o.lane === me) || pulled) { rings++; if (rings % 5 === 0) tone('blip'); pops.push({ x: pulled ? laneX(o.lane) : px, y: o.y, t: 0.5, text: '+5', col: '#FFE27A' }); return false; }
    } else if (near && o.lane === me) {
      if (o.kind === 'magnet') { magnetT = magnetLen; pops.push({ x: px, y: o.y, t: 0, text: 'Magnet!', col: '#FFE27A' }); tone('buy'); return false; }
      if (o.kind === 'shield') { shield = true; pops.push({ x: px, y: o.y, t: 0, text: 'Sköld!', col: '#BFD7FF' }); tone('buy'); return false; }
      if (o.kind === 'crate' || jumpT <= 0) { hit(); return false; }
    }
    return o.y < H + g.size;
  });
  trail.push({ x: px, y: g.py + g.size * 0.35, t: 0 });
  for (const p of trail) { p.t += dt; p.y += mv; }
  trail = trail.filter(p => p.t < 0.45);
}

/* ---------- drawing ---------- */
function draw(): void {
  const g = geo(), off = dist % 80;
  // grass with a checkered pattern on both sides
  ctx.fillStyle = '#3CC35A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2FA84B';
  for (let y = -80 + off; y < H; y += 40) for (let x = 0; x < W; x += 40) if (((x / 40) + Math.round((y - off) / 40)) % 2 === 0) ctx.fillRect(x, y, 40, 40);
  // track
  ctx.fillStyle = '#E9C988'; ctx.fillRect(g.x0 - 10, 0, g.tw + 20, H);
  ctx.fillStyle = '#C79A55'; ctx.fillRect(g.x0 - 14, 0, 6, H); ctx.fillRect(g.x0 + g.tw + 8, 0, 6, H);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.setLineDash([26, 26]); ctx.lineDashOffset = -dist % 52;
  for (const l of [1, 2]) { ctx.beginPath(); ctx.moveTo(g.x0 + g.lw * l, 0); ctx.lineTo(g.x0 + g.lw * l, H); ctx.stroke(); }
  ctx.setLineDash([]);
  // palms on the sides
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(26, g.lw * 0.45)}px system-ui, "Apple Color Emoji", sans-serif`;
  const poff = dist % 220;
  for (let y = -220 + poff; y < H + 60; y += 220) {
    if (g.x0 > 40) { ctx.fillText('🌴', g.x0 / 2, y); ctx.fillText('🌴', W - g.x0 / 2, y + 110); }
  }
  // objects
  for (const o of objs) {
    const x = laneX(o.lane), s = g.size;
    if (o.kind === 'ring') {
      ctx.lineWidth = Math.max(4, s * 0.09); ctx.strokeStyle = '#B88400'; ctx.beginPath(); ctx.ellipse(x, o.y, s * 0.2, s * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = Math.max(2, s * 0.05); ctx.strokeStyle = '#FFD23F'; ctx.stroke();
    } else if (o.kind === 'fence') {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - s * 0.6, o.y + s * 0.12, s * 1.2, s * 0.14);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#E8352B'; ctx.fillRect(x - s * 0.6 + (i * s * 1.2) / 6, o.y - s * 0.1, (s * 1.2) / 6, s * 0.2); }
      ctx.strokeStyle = '#141A33'; ctx.lineWidth = 2.5; ctx.strokeRect(x - s * 0.6, o.y - s * 0.1, s * 1.2, s * 0.2);
    } else if (o.kind === 'crate') {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - s * 0.42, o.y - s * 0.3, s * 0.9, s * 0.8);
      ctx.fillStyle = '#B5652B'; ctx.fillRect(x - s * 0.48, o.y - s * 0.42, s * 0.9, s * 0.8);
      ctx.strokeStyle = '#5A2E12'; ctx.lineWidth = 3; ctx.strokeRect(x - s * 0.48, o.y - s * 0.42, s * 0.9, s * 0.8);
      ctx.beginPath(); ctx.moveTo(x - s * 0.48, o.y - s * 0.42); ctx.lineTo(x + s * 0.42, o.y + s * 0.38); ctx.moveTo(x + s * 0.42, o.y - s * 0.42); ctx.lineTo(x - s * 0.48, o.y + s * 0.38); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, o.y, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.font = `${s * 0.4}px system-ui, "Apple Color Emoji", sans-serif`; ctx.fillText(o.kind === 'magnet' ? '🧲' : '🛡️', x, o.y + 2);
    }
  }
  // trail
  const tr = runItem(S.runner.trail);
  if (tr?.colors && state === 'play') {
    trail.forEach((p, i) => { ctx.globalAlpha = 0.7 * (1 - p.t / 0.45); ctx.fillStyle = tr.colors![i % tr.colors!.length]; ctx.beginPath(); ctx.arc(p.x + Math.sin(i) * 4, p.y, g.size * 0.13 * (1 - p.t), 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  // hero
  const px = laneX(lx), jp = jumpT > 0 ? Math.sin(Math.PI * (1 - jumpT / jumpLen)) : 0, sc = 1 + jp * 0.4, s = g.size * 1.1 * sc;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(px, g.py + g.size * 0.45, g.size * 0.35 * (1 - jp * 0.4), g.size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  if (!(hurt > 0 && Math.floor(hurt * 10) % 2)) {
    const img = imgs[state === 'play' && jp === 0 ? Math.floor(elapsed * 10) % 2 : 0];
    if (img?.complete) ctx.drawImage(img, px - s / 2, g.py - s * 0.62 - jp * g.size * 0.5, s, s * 1.09);
  }
  if (shield) { ctx.strokeStyle = 'rgba(150,200,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, g.py - jp * g.size * 0.5, g.size * 0.7, 0, Math.PI * 2); ctx.stroke(); }
  // HUD
  ctx.textAlign = 'left'; ctx.font = 'bold 20px "Lilita One", Fredoka, system-ui, sans-serif'; ctx.fillStyle = '#141A33';
  ctx.fillStyle = 'rgba(20,26,51,.7)'; roundRect(8, 8, 150, 62, 12); ctx.fill();
  ctx.fillStyle = '#FFD23F'; ctx.fillText(`◯ ${rings}`, 18, 30);
  ctx.font = '18px system-ui, "Apple Color Emoji", sans-serif'; ctx.fillText('❤️'.repeat(Math.max(0, lives)) + (shield ? ' 🛡️' : '') + (magnetT > 0 ? ' 🧲' : ''), 18, 55);
  ctx.textAlign = 'center';
  for (const p of pops) {
    ctx.globalAlpha = 1 - p.t; ctx.fillStyle = p.col; ctx.font = 'bold 24px "Lilita One", Fredoka, system-ui, sans-serif';
    ctx.strokeStyle = '#141A33'; ctx.lineWidth = 4; ctx.strokeText(p.text, p.x, p.y - p.t * 60); ctx.fillText(p.text, p.x, p.y - p.t * 60);
  }
  ctx.globalAlpha = 1;
  const h = heroById(S.runner.hero);
  if (state === 'intro') overlay('Matte Dash', `Du springer som ${h.name}. Svep åt sidan för att byta fil, svep upp för att hoppa. Hoppa över staketen, spring runt lådorna och samla guldringar!`, 'Tryck för att springa');
  if (state === 'over') overlay(`${score()} poäng!`, `${rings} ringar. Ditt rekord: ${S.runner.best}.${usedBoosts.length ? ' Du använde ' + usedBoosts.join(' ') + '.' : ''}`, 'Tryck för att springa igen');
  if (state === 'timeup') overlay('Speltiden är slut!', 'Räkna 30 minuter till, så får du springa igen. Stjärnorna från matten kan du handla för i Garaget.', 'Tryck för att gå tillbaka');
}

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function overlay(title: string, text: string, cta: string): void {
  ctx.fillStyle = 'rgba(10,20,70,.66)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#141A33'; ctx.lineWidth = 6;
  ctx.font = `${Math.min(46, W * 0.1)}px "Lilita One", Fredoka, system-ui, sans-serif`;
  ctx.strokeText(title, W / 2, H * 0.32); ctx.fillText(title, W / 2, H * 0.32);
  ctx.fillStyle = '#FFFFFF'; ctx.font = `700 ${Math.min(19, W * 0.045)}px Nunito, system-ui, sans-serif`;
  wrap(text, W / 2, H * 0.43, W * 0.8, Math.min(26, W * 0.06));
  ctx.fillStyle = '#FFD23F'; ctx.font = `${Math.min(26, W * 0.06)}px "Lilita One", Fredoka, system-ui, sans-serif`; ctx.fillText(cta, W / 2, H * 0.68);
}
function wrap(text: string, x: number, y: number, maxW: number, lh: number): void {
  let line = '', yy = y;
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = t;
  }
  ctx.fillText(line, x, yy);
}

export function bindRunnerKeys(): void {
  document.addEventListener('keydown', e => {
    if ($('#runner').hidden) return;
    const k = e.key.toLowerCase();
    if (state !== 'play') { if (k === ' ' || k === 'enter') { e.preventDefault(); state === 'timeup' ? leave() : start(); } return; }
    if (k === 'arrowleft' || k === 'a') { e.preventDefault(); move(-1); }
    if (k === 'arrowright' || k === 'd') { e.preventDefault(); move(1); }
    if (k === 'arrowup' || k === 'w' || k === ' ') { e.preventDefault(); jump(); }
  });
}
