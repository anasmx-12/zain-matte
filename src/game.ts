// Stjärnfångaren: the reward game (no maths). Move Robbi with a finger, catch treats, dodge meteors.
// Only open while the 20-minute reward window is running.
import { $, S, save, tone, robbiSVG, show } from './core';
import { itemById } from './catalog';
import { rewardLeft, rewardActive, fmt } from './timer';

interface Thing { x: number; y: number; vy: number; e: string; pts: number; bad: boolean; r: number; rot: number; spin: number }
interface Pop { x: number; y: number; t: number; text: string; bad: boolean }

const KINDS = [
  { e: '⭐', pts: 1, w: 50 }, { e: '🍩', pts: 2, w: 14 }, { e: '🍓', pts: 2, w: 12 }, { e: '💎', pts: 5, w: 5 }, { e: '🎁', pts: 3, w: 7 },
];
const BG_STARS = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4 }));

let cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let W = 0, H = 0, dpr = 1, raf = 0, last = 0;
let state: 'intro' | 'play' | 'over' | 'timeup' = 'intro';
let rx = 0, tx = 0, score = 0, lives = 3, things: Thing[] = [], pops: Pop[] = [], spawnT = 0, elapsed = 0, hurt = 0;
let robbiImg: HTMLImageElement | null = null;

export function openGame(): void {
  if (!rewardActive()) return;
  show('game');
  cv = $('#gameCanvas') as HTMLCanvasElement; ctx = cv.getContext('2d')!;
  resize(); robbiImg = makeRobbiImage();
  state = 'intro'; rx = tx = W / 2;
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); tx = toX(e); if (state === 'intro' || state === 'over') reset(); else if (state === 'timeup') leave(); };
  cv.onpointermove = e => { tx = toX(e); };
  window.onresize = resize;
  cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
}

function leave(): void { $<HTMLButtonElement>('#game [data-go="home"]').click(); }
const toX = (e: PointerEvent) => e.clientX - cv.getBoundingClientRect().left;

function resize(): void {
  const box = cv.parentElement!;
  W = box.clientWidth; H = Math.round(Math.min(window.innerHeight * 0.7, W * 1.35));
  dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Robbi as an image; CSS colour variables are resolved because images can't read them. */
function makeRobbiImage(): HTMLImageElement {
  const cs = getComputedStyle(document.documentElement);
  const body = robbiSVG(false).replace(/var\(--([a-z]+)\)/g, (_, n: string) => cs.getPropertyValue('--' + n).trim() || '#2B74D6');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="160" height="160">${body}</svg>`);
  return img;
}

function reset(): void { state = 'play'; score = 0; lives = 3; things = []; pops = []; spawnT = 0.6; elapsed = 0; hurt = 0; }

function spawn(): void {
  const meteorChance = Math.min(0.38, 0.14 + elapsed * 0.004);
  const r = Math.max(18, W * 0.045);
  const speed = H * (0.28 + Math.random() * 0.12 + Math.min(elapsed * 0.006, 0.45));
  const base = { x: r + Math.random() * (W - 2 * r), y: -r, vy: speed, r, rot: 0, spin: (Math.random() - 0.5) * 2 };
  if (Math.random() < meteorChance) { things.push({ ...base, e: '☄️', pts: 0, bad: true, vy: speed * 1.1 }); return; }
  const tot = KINDS.reduce((s, k) => s + k.w, 0); let p = Math.random() * tot;
  const k = KINDS.find(k => (p -= k.w) <= 0) || KINDS[0];
  things.push({ ...base, e: k.e, pts: k.pts, bad: false });
}

function loop(now: number): void {
  if ($('#game').hidden) { cancelAnimationFrame(raf); window.onresize = null; return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const left = rewardLeft();
  $('#gameTime').textContent = left > 0 ? `⏱ ${fmt(left)}` : '⏱ 0:00';
  $('#gameScore').textContent = `Poäng: ${score}`;
  if (left <= 0 && state !== 'timeup') { state = 'timeup'; endRun(); }

  rx += (tx - rx) * Math.min(1, dt * 14);
  const rw = Math.max(64, W * 0.17), ry = H - rw - 8;
  if (state === 'play') {
    elapsed += dt; spawnT -= dt; hurt = Math.max(0, hurt - dt);
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.32, 0.85 - elapsed * 0.008); }
    for (const t of things) { t.y += t.vy * dt; t.rot += t.spin * dt; }
    things = things.filter(t => {
      const caught = t.y + t.r * 0.6 > ry + rw * 0.15 && t.y - t.r < ry + rw * 0.7 && Math.abs(t.x - rx) < rw * 0.5 + t.r * 0.5;
      if (caught) {
        if (t.bad) { lives--; hurt = 0.6; tone(false); pops.push({ x: t.x, y: ry, t: 0, text: 'Aj!', bad: true }); if (lives <= 0) { state = 'over'; endRun(); } }
        else { score += t.pts; tone('blip'); pops.push({ x: t.x, y: ry, t: 0, text: '+' + t.pts, bad: false }); }
        return false;
      }
      return t.y < H + t.r;
    });
  }
  for (const p of pops) p.t += dt;
  pops = pops.filter(p => p.t < 0.8);
  draw(rw, ry);
  raf = requestAnimationFrame(loop);
}

function endRun(): void { if (score > S.hiscore) { S.hiscore = score; save(); } }

function draw(rw: number, ry: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16205A'); g.addColorStop(1, '#4A3E9C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (const s of BG_STARS) { ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of things) {
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.bad ? 0 : t.rot * 0.3);
    ctx.font = `${t.r * 2}px system-ui, "Apple Color Emoji", sans-serif`; ctx.fillText(t.e, 0, 0); ctx.restore();
  }
  // Robbi (blinks red when hit) with hat and glasses from the shop
  ctx.save();
  if (hurt > 0 && Math.floor(hurt * 10) % 2) ctx.globalAlpha = 0.4;
  if (robbiImg?.complete) ctx.drawImage(robbiImg, rx - rw / 2, ry, rw, rw);
  const hat = itemById(S.outfit.hat), glasses = itemById(S.outfit.glasses);
  ctx.font = `${rw * 0.38}px system-ui, "Apple Color Emoji", sans-serif`;
  if (glasses) ctx.fillText(glasses.emoji, rx, ry + rw * 0.5);
  if (hat) ctx.fillText(hat.emoji, rx, ry + rw * 0.15);
  ctx.restore();
  // lives
  ctx.font = '22px system-ui, "Apple Color Emoji", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('❤️'.repeat(Math.max(0, lives)), 12, 22);
  ctx.textAlign = 'center';
  for (const p of pops) {
    ctx.globalAlpha = 1 - p.t / 0.8; ctx.fillStyle = p.bad ? '#FF8A7A' : '#FFE27A';
    ctx.font = 'bold 26px Fredoka, system-ui, sans-serif'; ctx.fillText(p.text, p.x, p.y - p.t * 70);
  }
  ctx.globalAlpha = 1;
  if (state === 'intro') overlay('Stjärnfångaren', 'Flytta Robbi med fingret. Fånga godsakerna och akta dig för meteorerna!', 'Tryck för att börja');
  if (state === 'over') overlay(`${score} poäng!`, `Ditt rekord: ${S.hiscore}`, 'Tryck för att spela igen');
  if (state === 'timeup') overlay('Speltiden är slut!', 'Räkna 30 minuter till, så låser du upp spelet igen.', 'Tryck för att gå tillbaka');
}

function overlay(title: string, text: string, cta: string): void {
  ctx.fillStyle = 'rgba(10,14,40,.62)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
  ctx.font = `bold ${Math.min(42, W * 0.09)}px Fredoka, system-ui, sans-serif`; ctx.fillText(title, W / 2, H * 0.36);
  ctx.font = `600 ${Math.min(20, W * 0.045)}px Nunito, system-ui, sans-serif`;
  wrap(text, W / 2, H * 0.47, W * 0.8, Math.min(26, W * 0.06));
  ctx.fillStyle = '#FFD166'; ctx.font = `bold ${Math.min(24, W * 0.055)}px Fredoka, system-ui, sans-serif`; ctx.fillText(cta, W / 2, H * 0.64);
}
function wrap(text: string, x: number, y: number, maxW: number, lh: number): void {
  let line = '', yy = y;
  for (const w of text.split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = test;
  }
  ctx.fillText(line, x, yy);
}
