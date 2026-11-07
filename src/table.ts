// Tabellträning: one table 1–10, in order or mixed, answered with the number pad.
import { $, $$, S, get, learn, wpick, range, speak, mood, show } from './core';
import { G, startRound, dots, scoreAnswer, feedback, padHTML, bindPad } from './round';
import { mulPrior } from './mul';
import type { Question, Spec } from './types';

export interface TabOpt { t: number; order: boolean }

export const TIPS: Record<number, string> = {
  1: '1 gånger ett tal är talet självt.', 2: '2:ans tabell är dubbelt: 2, 4, 6, 8 …', 3: 'Räkna 3 steg i taget: 3, 6, 9, 12 …',
  4: '4:an är dubbla 2:an. 3 × 2 = 6, så 3 × 4 = 12.', 5: 'Svaren slutar alltid på 0 eller 5.', 6: '6:an är dubbla 3:an. 4 × 3 = 12, så 4 × 6 = 24.',
  7: 'Räkna 7 steg i taget. Kom ihåg: 7 × 8 = 56 (5, 6, 7, 8).', 8: '8:an är dubbla 4:an. 3 × 4 = 12, så 3 × 8 = 24.',
  9: 'Knep: 4 × 9 = 36. Tiotalet (3) är ett mindre än 4, och 3 + 6 = 9.', 10: 'Sätt bara en nolla efter talet: 6 × 10 = 60.',
};

export function tabMast(t: number): { p: number; n: number } {
  let p = 0, n = 0;
  for (let b = 1; b <= 10; b++) { const it = get(S.mul, t + 'x' + b, mulPrior(t, b)); p += it.p; n += it.n; }
  return { p: p / 10, n };
}

export function tabPick(): void { show('tabpick'); $('#tabView').hidden = true; drawTabGrid(); }
function drawTabGrid(sel?: number): void {
  $('#tabGrid').innerHTML = range(1, 10).map(t => {
    const m = tabMast(t);
    return `<button class="tb" data-t="${t}" aria-pressed="${sel === t}"><b>${t}:an</b><span class="meter"><b style="width:${m.n ? Math.round(m.p * 100) : 0}%"></b></span></button>`;
  }).join('') + '<button class="tb all" data-t="0">Alla tabeller blandade</button>';
  $$('#tabGrid .tb').forEach(b => (b.onclick = () => tabView(+b.dataset.t!)));
}
function tabView(t: number): void {
  if (!t) return startRound('tab', { t: 0, order: false } satisfies TabOpt);
  drawTabGrid(t);
  const v = $('#tabView'); v.hidden = false;
  v.innerHTML = `<h2>${t}:ans tabell</h2><p>${TIPS[t]}</p><div class="tlist">${range(1, 10).map(b => `<div>${b} × ${t} = <b>${b * t}</b></div>`).join('')}</div>
    <div class="row" style="justify-content:flex-start"><button class="go" id="tOrd" style="align-self:auto">Öva i ordning</button><button class="ghost sky" id="tMix">Öva blandat</button></div>`;
  $('#tOrd').onclick = () => startRound('tab', { t, order: true } satisfies TabOpt);
  $('#tMix').onclick = () => startRound('tab', { t, order: false } satisfies TabOpt);
  v.scrollIntoView({ behavior: 'smooth', block: 'start' });
  speak(`${t}:ans tabell. ${TIPS[t]}`);
}

export function tableSpec(): Spec {
  const R = G.R!, o = R.opt as TabOpt;
  if (o.t) { const b = R.order![R.i]; return { a: o.t, b, k: o.t + 'x' + b, retry: R.i >= 10 }; }
  // all tables: favour facts the child is unsure of
  const items: Spec[] = [], w: number[] = [];
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
    const k = a + 'x' + b, it = get(S.mul, k, mulPrior(a, b));
    let sc = 1 - it.p + 0.15 + (it.n === 0 ? 0.3 : 0);
    if (R.recent.includes(k)) sc *= 0.03;
    items.push({ a, b, k }); w.push(sc);
  }
  return wpick(items, w);
}

export function buildTab(spec: Spec): Question {
  const R = G.R!, o = R.opt as TabOpt, t = spec.a as number, b = spec.b as number, k = spec.k as string;
  const it = get(S.mul, k, mulPrior(t, b)), ord = o.t && o.order;
  const why = spec.retry ? `Den här, ${b} × ${t}, var svår nyss. Vi provar igen!` :
    ord ? (b === 1 ? `${t}:ans tabell. Vi börjar från början.` : `Förra svaret var ${(b - 1) * t}. Lägg till ${t} till!`) :
    it.n === 0 ? `${b} × ${t} har vi inte provat än.` : it.p < 0.4 ? `${b} × ${t} var klurig förut. Ta det lugnt.` :
    it.p > 0.8 ? `${b} × ${t} kan du. Hur snabbt går det?` : `Vi tränar ${b} × ${t} en gång till.`;
  return { kind: 'tab', a: t, b, k, answer: t * b, say: `${b} gånger ${t}`, why };
}

export function renderTab(q: Question): void {
  const R = G.R!, o = R.opt as TabOpt;
  dots(); mood('think'); $('#why').textContent = q.why; R.typed = '';
  const strip = o.t && o.order && R.facts.length
    ? `<div class="strip">${R.facts.map(([b, ok]) => `<span class="${ok ? '' : 'miss'}">${b} × ${q.a} = ${b * q.a!}</span>`).join('')}</div>` : '';
  $('#card').innerHTML = strip + `<div class="q">${q.b} <span class="x">×</span> ${q.a} = <span class="gap empty" id="typed">?</span></div>` +
    `<button class="speak" id="sayBtn">Lyssna</button>${padHTML()}<div id="fbSlot" style="width:100%"></div>`;
  $('#sayBtn').onclick = () => speak(q.say, true);
  bindPad(); speak(q.say);
}

export function typeTab(k: string): void {
  const R = G.R!;
  if (k === 'ok') { if (R.typed) checkTab(); return; }
  if (k === 'del') R.typed = R.typed.slice(0, -1); else if (R.typed.length < 3) R.typed += k;
  const g = $('#typed'); g.textContent = R.typed || '?'; g.classList.toggle('empty', !R.typed);
}

function checkTab(): void {
  const R = G.R!, q = R.q!, o = R.opt as TabOpt; q.done = true;
  const ok = +R.typed === q.answer, slow = (performance.now() - R.t0) / 1000 > 8;
  learn(S.mul, q.k!, ok, slow, mulPrior(q.a!, q.b!)); R.seen.push(q.k!); R.facts.push([q.b!, ok]);
  if (!ok) {
    if (o.t) { if (R.extra < 5) { R.order!.push(q.b!); R.len++; R.extra++; } } // asked again at the end
    else if (!q.spec!.retry) R.retry.push({ at: R.i + 3, spec: q.spec! });
  }
  $('#typed').classList.add(ok ? 'okc' : 'noc');
  $$('.pk').forEach(b => { if (b.dataset.k !== 'ok') (b as HTMLButtonElement).disabled = true; });
  scoreAnswer(ok, 1);
  const t = q.a!, b = q.b!, ans = t * b;
  const tip = b > 1 ? `Tänk: ${b - 1} × ${t} = ${(b - 1) * t}. Lägg till ${t}, så blir det ${ans}.` : '1 gånger ett tal är talet självt.';
  feedback(ok, `<div class="math">${b} × ${t} = ${ans}</div><div>${tip}</div>${o.t ? '<div>Den här kommer tillbaka i slutet.</div>' : ''}`,
    slow ? ' Nästa gång går det nog ännu snabbare.' : '');
}
