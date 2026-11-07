import { S, get, step, wpick, shuffle, pick, rand, pad } from './core';
import { CLK } from './curriculum';
import { G } from './round';
import { target, recentAcc } from './mul';
import type { Question, Spec, ChoiceOpt } from './types';

const NUM = ['tolv', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
export const wrapH = (h: number): number => (((h - 1) % 12) + 12) % 12 + 1;
const hw = (h: number): string => NUM[wrapH(h)];
export const digital = (h: number, m: number): string => wrapH(h) + ':' + pad(m);
function phrase(h: number, m: number): string {
  const c = hw(h), n = hw(h + 1);
  const p: Record<number, string> = {
    0: 'klockan är ' + c, 5: 'fem över ' + c, 10: 'tio över ' + c, 15: 'kvart över ' + c, 20: 'tio i halv ' + n, 25: 'fem i halv ' + n,
    30: 'halv ' + n, 35: 'fem över halv ' + n, 40: 'tio över halv ' + n, 45: 'kvart i ' + n, 50: 'tio i ' + n, 55: 'fem i ' + n,
  };
  return p[m] || digital(h, m);
}
export function clockSVG(h: number, m: number, w?: number): string {
  let s = `<svg class="clock" viewBox="0 0 200 200" role="img" aria-label="En klocka"${w ? ` style="width:${w}px"` : ''}><circle class="face" cx="100" cy="100" r="93"/>`;
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180, big = i % 5 === 0, r1 = big ? 80 : 84;
    s += `<line class="tick${big ? ' big' : ''}" x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + 88 * Math.sin(a)).toFixed(1)}" y2="${(100 - 88 * Math.cos(a)).toFixed(1)}"/>`;
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    s += `<text x="${(100 + 66 * Math.sin(a)).toFixed(1)}" y="${(100 - 66 * Math.cos(a) + 7).toFixed(1)}" text-anchor="middle">${i}</text>`;
  }
  const ha = (((h % 12) + m / 60) * 30 * Math.PI) / 180, ma = (m * 6 * Math.PI) / 180;
  s += `<line class="hh" x1="100" y1="100" x2="${(100 + 44 * Math.sin(ha)).toFixed(1)}" y2="${(100 - 44 * Math.cos(ha)).toFixed(1)}"/>`;
  s += `<line class="mh" x1="100" y1="100" x2="${(100 + 74 * Math.sin(ma)).toFixed(1)}" y2="${(100 - 74 * Math.cos(ma)).toFixed(1)}"/>`;
  return s + '<circle class="pin" cx="100" cy="100" r="7"/></svg>';
}

export const clockLevels = (): number[] => { const s = step(); return [s, s - 1, s - 2].filter(x => x >= 0); };

export function pickClock(): Spec {
  const s = step(), tg = target(), lv = clockLevels(), struggle = recentAcc() < 0.6;
  const w = lv.map(L => (L === s ? (struggle ? 1 : 3) : (struggle ? 2 : 0.8) * (1 - get(S.clock, 'S' + L).p + 0.25)));
  const L = wpick(lv, w), c = CLK[L];
  let m: number;
  if (c.mins) {
    const ws = c.mins.map(mm => { const it = get(S.clock, 'm' + mm); return Math.exp(-((it.p - tg) ** 2) / 0.08) + 0.1; });
    m = wpick(c.mins, ws);
  } else { do { m = rand(1, 59); } while (m % 5 === 0); }
  let h = rand(1, 12);
  if (G.R!.recent.includes(digital(h, m))) h = wrapH(h + rand(2, 9));
  let type = 'read';
  if (c.f === 'diff') type = 'diff';
  else if ((c.f === 'w' || c.f === 'd') && get(S.clock, 'S' + L + '-read').p > 0.5 && Math.random() < 0.45) type = 'match';
  return { L, h, m, type };
}

function clockWhy(L: number, m: number, type: string): string {
  const it = get(S.clock, 'm' + m), c = CLK[L];
  if (L < step()) return `Vi repeterar ${c.n.toLowerCase()} så att det sitter.`;
  if (type === 'match') return 'Nu vänder jag på det: hitta rätt klocka!';
  if (c.f === '24') return 'Efter klockan tolv på dagen lägger vi till 12 timmar.';
  if (c.f === 'diff') return 'Räkna framåt med stora visaren.';
  if (c.f === 'd') return 'Stora visaren visar minuterna efter kolon.';
  if (it.n === 0) return `Ny sak: ${c.n.toLowerCase()}. Titta noga på stora visaren.`;
  if (it.p < 0.4) return m === 30 ? 'Halv är klurigt. Vid halv är vi halvvägs till nästa timme.' : 'Den här var lite svår förut. Vi tränar igen!';
  return 'Titta på lilla visaren först, sen på stora.';
}

function timePairs(h: number, m: number, L: number, extra?: [number, number][]): [number, number][] {
  const c: [number, number][] = [], words = CLK[L].f === 'w';
  const swapH = m === 0 ? 12 : m / 5, swapM = (h % 12) * 5;
  if (Number.isInteger(swapH)) c.push([swapH, swapM]);
  if (m === 30) c.push([h - 1, 30]); if (m === 15) c.push([h, 45]); if (m === 45) c.push([h, 15]);
  c.push([h + 1, m], [h - 1, m]);
  if (L >= 4) c.push([h, (m + 5) % 60], [h, (m + 55) % 60]);
  if (!words) c.push([h, (m + 10) % 60], [h, (m + 50) % 60]);
  const seen = new Set([digital(h, m)]), out: [number, number][] = [];
  for (let [hh, mm] of [...(extra || []), ...c]) {
    hh = wrapH(hh); const d = digital(hh, mm);
    if (!seen.has(d) && (!words || mm % 5 === 0)) { seen.add(d); out.push([hh, mm]); }
  }
  while (out.length < 3) {
    const hh = rand(1, 12), mins = CLK[L].mins, mm = mins ? pick(mins) : rand(0, 59), d = digital(hh, mm);
    if (!seen.has(d)) { seen.add(d); out.push([hh, mm]); }
  }
  return out;
}
const LEGEND = '<div class="legend"><span><b style="background:var(--tomato)"></b>Lilla visaren: timmar</span><span><b style="background:var(--sky)"></b>Stora visaren: minuter</span></div>';
function handsText(h: number, m: number, words: boolean): string {
  const big = m === 0 ? 12 : m % 5 === 0 ? m / 5 : null;
  return `Lilla visaren pekar ${m >= 30 && words ? 'mellan ' + wrapH(h) + ' och ' + wrapH(h + 1) : 'på (eller strax efter) ' + wrapH(h)}. Stora visaren pekar på ${big ? big + (big !== 12 ? ' (det är ' + m + ' minuter)' : ' (hel timme)') : m + ' minuter'}.`;
}

export function buildClock(spec: Spec): Question {
  const L = spec.L as number, h = spec.h as number, m = spec.m as number, type = spec.type as string;
  const c = CLK[L], words = c.f === 'w';
  const q: Question = { kind: 'clock', L, h, m, type, say: '', answer: '', why: spec.retry ? 'Den här klockan var svår nyss. Vi provar igen!' : clockWhy(L, m, type) };
  if (c.f === '24') {
    const part = pick(['morgon', 'eftermiddag', 'eftermiddag', 'kväll']);
    const hh = part === 'morgon' ? rand(6, 11) : part === 'eftermiddag' ? rand(1, 5) : rand(6, 10);
    const H = part === 'morgon' ? hh : hh + 12, f24 = (H: number, mm: number) => pad(((H % 24) + 24) % 24) + ':' + pad(mm);
    q.h = hh; q.answer = f24(H, m);
    const alt = [f24(H - 12, m), f24(H + 1, m), f24(H - 1, m), f24(H, (m + 5) % 60), f24(part === 'morgon' ? H + 12 : H, (m + 30) % 60)];
    const opts = [q.answer, ...shuffle([...new Set(alt)].filter(x => x !== q.answer)).slice(0, 3)];
    q.options = shuffle(opts).map(v => ({ val: v, label: v }));
    const pt = ({ morgon: 'på morgonen', eftermiddag: 'på eftermiddagen', kväll: 'på kvällen' } as Record<string, string>)[part];
    q.html = clockSVG(hh, m) + `<span class="daypart">Det är ${pt}</span><div class="story">Vad är klockan med 24-timmarsklockan?</div>`;
    q.say = `Det är ${pt}. Vad är klockan med 24-timmarsklockan?`;
    q.explain = () => `<div class="math">${q.answer}</div><div>${handsText(hh, m, false)} ${part === 'morgon' ? 'På morgonen skriver vi bara ' + q.answer + '.' : 'Det är ' + pt + ', så vi lägger till 12: ' + hh + ' + 12 = ' + H + '.'}</div>`;
    return q;
  }
  if (c.f === 'diff') {
    const add = pick(m % 15 === 0 ? [15, 30, 45, 60, 20] : [10, 15, 20, 30, 60]);
    const tot = h * 60 + m + add, eh = wrapH(Math.floor(tot / 60)), em = tot % 60;
    q.answer = digital(eh, em);
    const cand: [number, number][] = [[eh, (em + 5) % 60], [eh + 1, em], [eh - 1, em], [h, (m + add) % 60], [h + Math.round(add / 10), m]];
    q.options = shuffle([[eh, em] as [number, number], ...timePairs(eh, em, 7, cand).slice(0, 3)]).map(([a, b]) => ({ val: digital(a, b), label: digital(a, b) }));
    const addTxt = add === 60 ? 'en timme' : add + ' minuter';
    q.html = clockSVG(h, m) + LEGEND + `<div class="story">Klockan är ${digital(h, m)}. Vad är klockan om ${addTxt}?</div>`;
    q.say = `Klockan är ${digital(h, m)}. Vad är klockan om ${addTxt}?`;
    q.explain = () => `<div class="math">${digital(h, m)} + ${addTxt} = ${q.answer}</div><div>${add < 60 ? `Från ${m} minuter och ${add} minuter framåt blir det ${m + add} minuter.${m + add >= 60 ? ' 60 minuter är en ny timme, så det blir ' + eh + ' och ' + em + ' minuter.' : ''}` : 'En timme senare pekar lilla visaren på nästa siffra.'}</div>`;
    return q;
  }
  const label = (hh: number, mm: number) => (words ? phrase(hh, mm) : digital(hh, mm));
  q.answer = digital(h, m);
  q.options = shuffle([[h, m] as [number, number], ...shuffle(timePairs(h, m, L)).slice(0, 3)])
    .map(([a, b]): ChoiceOpt => ({ val: digital(a, b), h: a, m: b, label: label(a, b) }));
  if (type === 'read') { q.html = clockSVG(h, m) + LEGEND + '<div class="story">Vad är klockan?</div>'; q.say = 'Vad är klockan?'; }
  else { q.html = `<div class="story">Vilken klocka visar</div><div class="timeq">${label(h, m)}</div>`; q.say = 'Vilken klocka visar ' + label(h, m); }
  q.explain = () => {
    let t = `<div class="math">Klockan är ${label(h, m)}${words ? ' (' + digital(h, m) + ')' : ''}</div><div>${handsText(h, m, words)}</div>`;
    if (words && m >= 20 && m <= 40) t += '<div>Halv betyder halvvägs till nästa timme. Därför säger vi halv ' + hw(h + 1) + '.</div>';
    if (words && m > 40) t += '<div>Det är snart ' + hw(h + 1) + ', därför säger vi "i ' + hw(h + 1) + '".</div>';
    return t;
  };
  return q;
}
