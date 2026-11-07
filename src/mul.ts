import { S, get, step, wpick, shuffle, pick, rand, type Mastery } from './core';
import { MUL } from './curriculum';
import { G } from './round';
import type { Question, Spec } from './types';

export const mulPrior = (a: number, b: number): number =>
  a === 1 || b === 1 || a === 10 || b === 10 ? 0.5 : a === 2 || b === 2 || a === 5 || b === 5 ? 0.38 : 0.3;

export interface MulItem { a: number; b: number; k: string }
export function mulItems(s: number): MulItem[] {
  const st = MUL[s], out: MulItem[] = [];
  for (const t of st.t) for (let b = 1; b <= st.max; b++) out.push({ a: t, b, k: t + 'x' + b });
  return out;
}
export function mulMastery(s: number): { p: number; n: number } {
  const it = mulItems(s); let p = 0, n = 0;
  for (const x of it) { const g = get(S.mul, x.k, mulPrior(x.a, x.b)); p += g.p; n += g.n; }
  return { p: p / it.length, n };
}

/** Aim for the "lagom svårt" zone: easier after mistakes, harder when everything is right. */
export function target(): number {
  const R = G.R; if (!R || R.log.length < 3) return 0.62;
  const l = R.log.slice(-6), a = l.filter(x => x).length / l.length;
  return a > 0.85 ? 0.45 : a < 0.6 ? 0.8 : 0.62;
}
export function recentAcc(): number {
  const R = G.R; if (!R || R.log.length < 3) return 0.75;
  const l = R.log.slice(-6); return l.filter(x => x).length / l.length;
}

export function pickMul(): Spec {
  const s = step(), st = MUL[s], tg = target(), items: (MulItem & { it: Mastery })[] = [], w: number[] = [];
  for (const x of mulItems(s)) {
    const it = get(S.mul, x.k, mulPrior(x.a, x.b));
    let sc = Math.exp(-((it.p - tg) ** 2) / 0.06) + (it.n === 0 ? 0.35 : 0) + 0.05;
    if (G.R!.recent.includes(x.k)) sc *= 0.03;
    items.push({ ...x, it }); w.push(sc);
  }
  const base = wpick(items, w);
  let kind = 'fact'; const r = Math.random();
  if (st.two && r < st.two) kind = 'two'; else if (st.tens && r < (st.two || 0) + st.tens) kind = 'tens';
  return { a: base.a, b: base.b, k: base.k, kind };
}

function mulWhy(it: Mastery, a: number, b: number): string {
  if (it.n === 0) return `${a} × ${b} har vi inte provat än. Spännande!`;
  if (it.p < 0.4) return `${a} × ${b} var lite klurig förut. Jag ritar prickar som hjälp.`;
  if (it.p > 0.8) return `Du kan ${a} × ${b} jättebra. Nu gör jag den lite knepigare!`;
  return `Du håller på att lära dig ${a} × ${b}. Vi tränar den en gång till.`;
}

const NAMES = ['Ella', 'Omar', 'Saga', 'Noah', 'Alva', 'Liam', 'Maja', 'Elias', 'Leo', 'Selma', 'Yusuf', 'Ines'];
const THINGS = [['påsar', 'äpplen'], ['askar', 'kritor'], ['burkar', 'kulor'], ['ark', 'klistermärken'], ['fat', 'bullar'], ['lådor', 'pennor']];
function story(a: number, b: number): string {
  const r = Math.random(), n = pick(NAMES);
  if (b === 4 && r < 0.3) return `En hund har 4 ben. Hur många ben har ${a} hundar?`;
  if (r < 0.6) { const [box, thing] = pick(THINGS); return `${n} har ${a} ${box}. I varje finns ${b} ${thing}. Hur många ${thing} är det totalt?`; }
  return `Det står ${a} bord i klassrummet. Vid varje bord sitter ${b} barn. Hur många barn är det?`;
}
/** Up to n plausible wrong answers, never the right one or ≤ 0. */
export function uniq(ans: number, c: number[], n = 3): number[] {
  const out: number[] = [];
  for (const x of c) if (x > 0 && x !== ans && !out.includes(x)) out.push(x);
  let k = 1;
  while (out.length < n) { const v = ans + k * (k % 2 ? 1 : -1) * 2; if (v > 0 && !out.includes(v) && v !== ans) out.push(v); k++; }
  return out;
}
const mulDistract = (a: number, b: number, ans: number): number[] =>
  shuffle(shuffle(uniq(ans, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b, ans + 1, ans - 1, ans + 10, ans - 10])).slice(0, 5)).slice(0, 3);

export function buildMul(spec: Spec): Question {
  const s = step(), st = MUL[s];
  let a = spec.a as number, b = spec.b as number;
  const k = spec.k as string, kind = spec.kind as string;
  const it = get(S.mul, k, mulPrior(a, b));
  const q: Question = { kind: 'mul', a, b, k, mk: kind, why: '', say: '', answer: 0 };
  if (kind === 'tens' || kind === 'two') {
    if (a === 1 || a === 10) a = rand(2, 9);
    if (b === 10) b = rand(2, 9);
    const x = a, y = kind === 'tens' ? b * 10 : 10 + b, ans = x * y;
    q.a = a; q.b = b; q.k = a + 'x' + b; q.answer = ans;
    q.html = `<div class="q">${y} <span class="x">×</span> ${x} = ?</div>`; q.say = `${y} gånger ${x}`;
    if (kind === 'tens') {
      q.options = shuffle([ans, ...shuffle(uniq(ans, [a * b, ans + 10, ans - 10, ans * 10, a * (b + 1) * 10, a * (b - 1) * 10])).slice(0, 3)]);
      q.why = spec.retry ? 'Den här var svår nyss. Vi provar igen!' : `Gånger med tiotal: ${b} tiotal gånger ${a}.`;
      q.explain = () => `<div class="math">${y} × ${x} = ${ans}</div><div>Tänk: ${b} × ${a} = ${a * b}. ${y} är ${b} tiotal, så svaret blir ${a * b} tiotal, alltså ${ans}.</div>`;
    } else {
      q.options = shuffle([ans, ...shuffle(uniq(ans, [a * 10 + b, ans + a, ans - a, ans + 10, a * b + 10, ans - 10])).slice(0, 3)]);
      q.why = spec.retry ? 'Den här var svår nyss. Vi provar igen!' : `Dela upp ${y} i 10 och ${b}, så blir det lättare.`;
      q.explain = () => `<div class="math">${y} × ${x} = ${ans}</div><div>Dela upp: 10 × ${x} = ${10 * x} och ${b} × ${x} = ${b * x}. ${10 * x} + ${b * x} = ${ans}.</div>`;
    }
    return q;
  }
  const ans = a * b;
  const [x, y] = s <= 1 ? [b, a] : Math.random() < 0.5 ? [a, b] : [b, a]; // early steps: "b groups of 2"
  let type = 'plain';
  if (spec.retry) type = it.p < 0.5 && ans <= 50 ? 'visual' : 'plain';
  else if (ans <= 50 && (Math.random() < (st.visual || 0) || (it.n > 0 && it.p < 0.4))) type = 'visual';
  else if (s >= 2 && it.p > 0.75 && Math.random() < Math.max(st.missing || 0, 0.4)) type = s >= 4 && Math.random() < 0.5 ? 'missing' : 'story';
  else if (s >= 2 && it.p > 0.55 && Math.random() < 0.2) type = 'story';
  else if (s >= 4 && Math.random() < (st.missing || 0)) type = 'missing';
  q.why = spec.retry ? `Den här, ${x} × ${y}, var svår nyss. Vi provar igen!` : mulWhy(it, x, y);
  if (type === 'missing') {
    q.html = `<div class="q">${x} <span class="x">×</span> <span class="gap">?</span> = ${ans}</div>`; q.answer = y;
    q.options = shuffle([y, ...shuffle(uniq(y, [y + 1, y - 1, y + 2, y - 2, x])).slice(0, 3)]); q.say = `${x} gånger vad blir ${ans}?`;
  } else {
    q.answer = ans; q.options = shuffle([ans, ...mulDistract(x, y, ans)]);
    if (type === 'story') {
      q.say = story(x, y);
      q.html = `<div class="story">${q.say}</div><div class="q" style="font-size:2rem">${x} <span class="x">×</span> ${y} = ?</div>`;
    } else {
      q.html = `<div class="q">${x} <span class="x">×</span> ${y} = ?</div>`; q.say = `${x} gånger ${y}`;
      if (type === 'visual') {
        q.html += `<div class="groups" aria-label="${x} grupper med ${y} prickar">${Array.from({ length: x }, () => `<div class="grp">${'<i></i>'.repeat(y)}</div>`).join('')}</div>`;
        q.html += `<div class="hint">${x} grupper med ${y} i varje${x <= 6 ? ': ' + Array(x).fill(y).join(' + ') : ''}</div>`;
      }
    }
  }
  q.explain = () => {
    const parts = x <= 6 ? Array(x).fill(y).join(' + ') : null;
    return `<div class="math">${x} × ${y} = ${ans}</div>` +
      (parts ? `<div>Tänk: ${parts} = ${ans}</div>` : `<div>Tips: ${x - 1} × ${y} = ${(x - 1) * y}. Lägg till ${y} till, så blir det ${ans}.</div>`);
  };
  return q;
}
