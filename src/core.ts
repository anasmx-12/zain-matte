import { itemById } from './catalog';

/* ---------- small helpers ---------- */
export const $ = <T extends HTMLElement = HTMLElement>(s: string): T => document.querySelector(s) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(s: string): T[] => [...document.querySelectorAll<T>(s)];
export const rand = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function wpick<T>(items: T[], w: number[]): T {
  const s = w.reduce((x, y) => x + y, 0);
  let r = Math.random() * s;
  for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
export const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const pad = (n: number): string => String(n).padStart(2, '0');
export const uid = (): string => Math.random().toString(36).slice(2, 10);

/* ---------- saved state ---------- */
export interface Mastery { p: number; n: number; c: number; t?: number }
export type MasteryMap = Record<string, Mastery>;
export interface Profile { grade: number; term: 'ht' | 'vt'; level: number }
export interface Placement { uid: string; item: string; x: number; y: number; flip?: boolean }
export interface Store {
  mul: MasteryMap; clock: MasteryMap; col: MasteryMap;
  /** Spendable stars. */ stars: number;
  /** Stars earned in total (never goes down). */ earned: number;
  best: number; streak: number; answered: number; hiscore: number;
  profile: Profile | null;
  /** Item id -> how many the child owns. */ owned: Record<string, number>;
  room: { wall?: string; floor?: string; items: Placement[] };
  outfit: { hat?: string; glasses?: string; color?: string };
  timer: { studyMs: number; lastCredit: number; rewardEndsAt: number; rewards: number };
}

const KEY = 'raknarobbi-v1';
const fresh = (): Store => ({
  mul: {}, clock: {}, col: {}, stars: 0, earned: 0, best: 0, streak: 0, answered: 0, hiscore: 0, profile: null,
  owned: {}, room: { items: [] }, outfit: {}, timer: { studyMs: 0, lastCredit: 0, rewardEndsAt: 0, rewards: 0 },
});
function load(): Store {
  const s = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Store>;
      Object.assign(s, d);
      if (d.earned == null) s.earned = s.stars; // saves from version 1
      s.room = { ...fresh().room, ...(d.room || {}) };
      s.timer = { ...fresh().timer, ...(d.timer || {}) };
      s.owned = d.owned || {};
      s.outfit = d.outfit || {};
    }
  } catch { /* private mode or broken data: start fresh */ }
  return s;
}
export let S: Store = load();
export const save = (): void => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } };
/** Forget what Robbi knows about the child's skills, keep stars, room and items. */
export function resetLearning(): void {
  const f = fresh();
  Object.assign(S, { mul: f.mul, clock: f.clock, col: f.col, streak: 0, best: 0, answered: 0 });
  save();
}

export const stepOf = (g: number, t: 'ht' | 'vt', l: number): number => Math.min(9, (g - 1) * 2 + (t === 'vt' ? 1 : 0) + (l - 1));
export const step = (): number => (S.profile ? stepOf(S.profile.grade, S.profile.term, S.profile.level) : 0);

/* ---------- Robbi's mastery model ---------- */
const PRIOR = 0.3;
export const get = (map: MasteryMap, k: string, prior = PRIOR): Mastery => map[k] || { p: prior, n: 0, c: 0 };
export function learn(map: MasteryMap, k: string, ok: boolean, slow: boolean, prior?: number): Mastery {
  const it = { ...get(map, k, prior) };
  const out = ok ? (slow ? 0.7 : 1) : 0;
  const rate = Math.max(0.15, 0.45 / (1 + it.n * 0.15));
  it.p += rate * (out - it.p); it.n++; if (ok) it.c++; it.t = Date.now();
  map[k] = it;
  return it;
}

/* ---------- sound + voice ---------- */
let actx: AudioContext | null = null;
export let voice = false;
try { voice = localStorage.getItem(KEY + '-voice') === '1'; } catch { /* ignore */ }
export function tone(ok: boolean | 'buy' | 'blip'): void {
  try {
    actx = actx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = ok === 'blip' ? [990] : ok === 'buy' ? [523, 659, 784] : ok ? [660, 880] : [300, 220];
    notes.forEach((f, i) => {
      const o = actx!.createOscillator(), g = actx!.createGain(), t = actx!.currentTime + i * 0.12;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(actx!.destination); o.start(t); o.stop(t + 0.25);
    });
  } catch { /* no audio */ }
}
export function speak(t: string, force = false): void {
  if (!voice && !force) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'sv-SE'; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('sv'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch { /* no speech */ }
}
export function setVoice(on?: boolean): void {
  if (on != null) { voice = on; try { localStorage.setItem(KEY + '-voice', on ? '1' : '0'); } catch { /* ignore */ } }
  const b = $('#voiceBtn'); b.setAttribute('aria-pressed', String(voice)); b.textContent = voice ? 'Läser upp' : 'Läs upp';
}

/* ---------- Robbi, dressed in what the child has bought ---------- */
export function robbiSVG(extras = true): string {
  const hat = itemById(S.outfit.hat), glasses = itemById(S.outfit.glasses);
  return `<line x1="32" y1="4" x2="32" y2="13" stroke="var(--ink)" stroke-width="3"/><circle cx="32" cy="5" r="4" fill="var(--tomato)" stroke="var(--ink)" stroke-width="2"/>
<rect x="8" y="13" width="48" height="40" rx="14" fill="var(--robbi)" stroke="var(--ink)" stroke-width="3"/>
<rect x="15" y="21" width="34" height="22" rx="9" fill="var(--face)" stroke="var(--ink)" stroke-width="2"/>
<circle class="eye" cx="25" cy="30" r="3.6" fill="var(--ink)"/><circle class="eye" cx="39" cy="30" r="3.6" fill="var(--ink)"/>
<path class="mouth" d="M26 37 Q32 41 38 37" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>
<rect x="3" y="27" width="6" height="12" rx="3" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/><rect x="55" y="27" width="6" height="12" rx="3" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>` +
    (extras && glasses ? `<text x="32" y="38" font-size="24" text-anchor="middle">${glasses.emoji}</text>` : '') +
    (extras && hat ? `<text x="32" y="17" font-size="24" text-anchor="middle">${hat.emoji}</text>` : '');
}
export function drawRobbi(): void {
  const color = itemById(S.outfit.color)?.value;
  if (color) document.documentElement.style.setProperty('--robbi', color);
  else document.documentElement.style.removeProperty('--robbi');
  const svg = robbiSVG();
  $$('.robbi').forEach(s => (s.innerHTML = svg));
}
export function mood(m: 'happy' | 'oops' | 'think'): void {
  const p = document.querySelector('#playRobbi .mouth');
  if (!p) return;
  p.setAttribute('d', m === 'happy' ? 'M24 35 Q32 44 40 35' : m === 'oops' ? 'M27 39 Q32 35 37 39' : 'M26 37 Q32 41 38 37');
}

/* ---------- screens ---------- */
export type Screen = 'profile' | 'home' | 'tabpick' | 'colpick' | 'play' | 'done' | 'brain' | 'shop' | 'room' | 'game';
const SCREENS: Screen[] = ['profile', 'home', 'tabpick', 'colpick', 'play', 'done', 'brain', 'shop', 'room', 'game'];
export function show(id: Screen): void {
  SCREENS.forEach(s => ($('#' + s).hidden = s !== id));
  window.scrollTo(0, 0);
}
export const STAR = '<svg viewBox="0 0 24 24" class="star"><path class="starpath" d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>';
/** Refresh the header chips. */
export function head(): void {
  $$('.walletN').forEach(e => (e.textContent = String(S.stars)));
  $('#streak').textContent = String(S.streak || 0);
  const P = S.profile;
  $('#profBtn').textContent = P ? `Åk ${P.grade} · ${P.term.toUpperCase()} · Nivå ${P.level}` : 'Välj årskurs';
}
