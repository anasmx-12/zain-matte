// A round = 10 exercises (5 for uppställning). Shared flow for all practice modes.
import { $, $$, S, save, head, tone, speak, mood, show, pick, step, learn, STAR } from './core';
import { CLK } from './curriculum';
import { pickMul, buildMul, mulItems, mulMastery, mulPrior } from './mul';
import { pickClock, buildClock, clockSVG, digital } from './clock';
import { tableSpec, buildTab, renderTab, typeTab, type TabOpt } from './table';
import { colSpec, buildCol, renderCol, typeCol, OPS, type Op, type ColQuestion } from './column';
import { markActive, creditStudy, keyHTML } from './timer';
import type { Mode, Question, Round, Spec, ChoiceOpt } from './types';

export const G: { R: Round | null } = { R: null };

export function startRound(mode: Mode, opt?: unknown): void {
  const R: Round = { mode, opt, i: 0, len: mode === 'col' ? 5 : 10, log: [], recent: [], retry: [], stars: 0, seen: [],
    pad: mode === 'col' || mode === 'tab', facts: [], extra: 0, t0: 0, typed: '' };
  const t = opt as TabOpt | undefined;
  if (mode === 'tab' && t?.t) R.order = t.order ? Array.from({ length: 10 }, (_, i) => i + 1) : shuffleOrder();
  G.R = R; markActive(); show('play'); next();
}
const shuffleOrder = () => { const a = Array.from({ length: 10 }, (_, i) => i + 1); for (let i = 9; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function next(): void {
  const R = G.R; if (!R || $('#play').hidden) return;
  if (R.i >= R.len) return finish();
  let spec: Spec | null = null;
  const due = R.retry.findIndex(r => r.at <= R.i);
  if (due >= 0) { spec = { ...R.retry[due].spec, retry: true }; R.retry.splice(due, 1); }
  let q: Question;
  if (R.mode === 'tab') { spec = spec || tableSpec(); R.recent = [...R.recent.slice(-3), spec.k as string]; q = buildTab(spec); }
  else if (R.mode === 'col') { spec = spec || colSpec(); q = buildCol(spec); }
  else if (R.mode === 'mul') { spec = spec || pickMul(); q = buildMul(spec); R.recent = [...R.recent.slice(-3), spec.k as string]; }
  else { spec = spec || pickClock(); q = buildClock(spec); R.recent = [...R.recent.slice(-3), digital(spec.h as number, spec.m as number)]; }
  q.spec = spec; R.q = q; R.t0 = performance.now();
  if (R.mode === 'tab') renderTab(q); else if (R.mode === 'col') renderCol(q as ColQuestion); else renderChoice(q);
}

export function dots(): void {
  const R = G.R!;
  $('#dots').innerHTML = Array.from({ length: R.len }, (_, i) => `<i class="${i < R.log.length ? (R.log[i] ? 'ok' : 'no') : i === R.i ? 'now' : ''}"></i>`).join('');
}

/* ---------- multiple choice (gångertabellen + klockan) ---------- */
function renderChoice(q: Question): void {
  dots(); mood('think'); $('#why').textContent = q.why;
  const isClockOpts = q.kind === 'clock' && q.type === 'match';
  const words = q.kind === 'clock' && CLK[q.L!].f === 'w' && !isClockOpts;
  $('#card').innerHTML = q.html + `<button class="speak" id="sayBtn">Lyssna</button><div class="choices">` +
    q.options!.map((o, i) => {
      const v = typeof o === 'object' ? o.val : o;
      const inner = isClockOpts ? clockSVG((o as ChoiceOpt).h!, (o as ChoiceOpt).m!) : typeof o === 'object' ? o.label : o;
      return `<button class="ch${words ? ' words' : ''}" data-v="${v}"><span class="k">${i + 1}</span>${inner}</button>`;
    }).join('') + '</div><div id="fbSlot" style="width:100%"></div>';
  $('#sayBtn').onclick = () => speak(q.say, true);
  $$('.ch').forEach(b => (b.onclick = () => answerChoice(b as HTMLButtonElement)));
  speak(q.say);
}
function answerChoice(btn: HTMLButtonElement): void {
  const R = G.R!, q = R.q!; if (q.done) return; q.done = true;
  const ok = String(btn.dataset.v) === String(q.answer), secs = (performance.now() - R.t0) / 1000;
  const slow = secs > (q.kind === 'clock' ? 14 : q.mk !== 'fact' ? 15 : 9);
  $$<HTMLButtonElement>('.ch').forEach(b => { b.disabled = true; if (String(b.dataset.v) === String(q.answer)) b.classList.add('right'); });
  if (!ok) btn.classList.add('wrong');
  if (q.kind === 'mul') {
    if (q.mk !== 'two') learn(S.mul, q.k!, ok, slow, mulPrior(q.a!, q.b!));
    if (q.mk !== 'fact') learn(S.mul, q.mk!, ok, slow);
    R.seen.push(q.mk === 'two' ? 'two' : q.k!);
  } else {
    learn(S.clock, 'S' + q.L, ok, slow); learn(S.clock, 'S' + q.L + '-' + q.type, ok, slow);
    if (CLK[q.L!].f === 'w') learn(S.clock, 'm' + q.m, ok, slow);
    R.seen.push('S' + q.L);
  }
  if (!ok && !q.spec!.retry) R.retry.push({ at: R.i + 3, spec: q.spec! });
  scoreAnswer(ok, 1);
  feedback(ok, q.explain!(), slow ? ' Nästa gång går det nog ännu snabbare.' : '', slow ? 1300 : 900, 'Inga problem. Jag ger dig den här igen lite senare.');
}

/* ---------- number pad (tabellträning + uppställning) ---------- */
export const padHTML = (): string =>
  `<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="pk" data-k="${n}">${n}</button>`).join('')}` +
  `<button class="pk del" data-k="del">Sudda</button><button class="pk" data-k="0">0</button><button class="pk ok" data-k="ok">Rätta</button></div>`;
export const bindPad = (): void => $$('.pk').forEach(b => (b.onclick = () => padKey(b.dataset.k!)));
export function padKey(k: string): void {
  const R = G.R; const q = R?.q; if (!R || !q) return;
  if (q.done) { if (k === 'ok') $('#goBtn')?.click(); return; }
  if (R.mode === 'tab') typeTab(k); else if (R.mode === 'col') typeCol(k);
}

/* ---------- scoring + feedback ---------- */
export function scoreAnswer(ok: boolean, stars: number): void {
  const R = G.R!;
  R.log.push(ok); S.answered++;
  if (ok) { S.stars += stars; S.earned += stars; R.stars += stars; S.streak = (S.streak || 0) + 1; S.best = Math.max(S.best, S.streak); }
  else S.streak = 0;
  const unlocked = creditStudy();
  save(); head(); tone(ok); dots();
  if (unlocked) {
    $('#card').insertAdjacentHTML('afterbegin', '<div class="unlock">🎮 Du har räknat i 30 minuter! Spelet är upplåst. Gör klart omgången och starta det från startsidan.</div>');
    speak('Spelet är upplåst!');
  }
}
export function feedback(ok: boolean, explainHTML: string, extra = '', delay = 900, whyWrong = 'Inga problem. Titta hur man gör, så tränar vi mer.'): void {
  const R = G.R!;
  const praise = pick(['Rätt!', 'Snyggt!', 'Jättebra!', 'Ja, precis!', 'Toppen!']);
  const f = document.createElement('div'); f.className = 'fb ' + (ok ? 'good' : 'bad');
  f.innerHTML = ok ? `<div class="math">${praise}${extra}</div>` : `<div>Nästan! Så här blir det:</div>${explainHTML}<button class="go" id="goBtn">Okej, nästa</button>`;
  $('#fbSlot').append(f); mood(ok ? 'happy' : 'oops');
  $('#why').textContent = ok ? (S.streak >= 5 ? `${S.streak} rätt i rad! Du är grym.` : praise) : whyWrong;
  speak(ok ? praise : 'Nästan!');
  R.i++;
  if (ok) setTimeout(() => { if (G.R === R) next(); }, delay);
  else { $('#goBtn').focus(); $('#goBtn').onclick = next; }
}

/* ---------- end of round ---------- */
function finish(): void {
  const R = G.R!, right = R.log.filter(x => x).length, tot = R.log.length, f = right / tot, s = step(), P = S.profile!;
  show('done');
  $('#doneTitle').textContent = f >= 0.9 ? 'Fantastiskt!' : f >= 0.7 ? 'Bra jobbat!' : f >= 0.5 ? 'Bra kämpat!' : 'Du tränar och blir bättre!';
  $('#doneScore').textContent = right + '/' + tot;
  $('#doneStars').innerHTML = Array.from({ length: Math.min(R.stars, 30) }, (_, i) => STAR.replace('class="star"', `class="star" style="animation-delay:${i * 0.06}s"`)).join('');
  $('#doneKey').innerHTML = keyHTML();
  const sb = $('#suggestBtn'); sb.hidden = true;
  const offer = (label: string, go: () => void) => { sb.hidden = false; sb.textContent = label; sb.onclick = go; };
  let say = `Du fick ${R.stars} stjärnor att handla för. `;

  if (R.mode === 'tab') {
    const o = R.opt as TabOpt, t = o.t, miss = [...new Set(R.facts.filter(x => !x[1]).map(x => x[0]))];
    if (t) {
      say += miss.length ? `Öva lite mer på ${miss.slice(0, 3).map(b => b + ' × ' + t).join(', ')}.` : `Du kan ${t}:ans tabell!`;
      if (!miss.length && o.order) { say += ' Prova nu blandat, utan ordning.'; offer('Öva blandat', () => startRound('tab', { t, order: false })); }
      else if (!miss.length && t < 10) { say += ` Vill du prova ${t + 1}:ans tabell?`; offer(`${t + 1}:ans tabell`, () => startRound('tab', { t: t + 1, order: true })); }
    } else {
      const weak = [...new Set(R.seen)].map(k => ({ k, p: S.mul[k].p })).sort((a, b) => a.p - b.p)[0];
      say += weak && weak.p < 0.6 ? `Nästa gång tränar vi mer på ${weak.k.replace('x', ' × ')}.` : 'Allt gick bra idag!';
    }
  } else if (R.mode === 'col') {
    const weak = [...new Set(R.seen)].map(o => ({ o: o as Op, p: S.col[o].p })).sort((a, b) => a.p - b.p)[0];
    say += f === 1 ? 'Alla uppställningar blev rätt. Snyggt räknat!' :
      weak && weak.p < 0.6 ? `Vi tränar mer ${OPS[weak.o].n.toLowerCase()} nästa gång. Ledtråden hjälper dig steg för steg.` : 'Du blir bättre och bättre på uppställning!';
  } else {
    let mast: number, enough: boolean;
    if (R.mode === 'mul') {
      const weak = [...new Set(R.seen)].filter(k => k.includes('x')).map(k => ({ k, p: S.mul[k].p })).sort((a, b) => a.p - b.p)[0];
      say += weak && weak.p < 0.6 ? `Nästa gång tränar vi lite mer på ${weak.k.replace('x', ' × ')}.` : 'Allt du övade på idag gick bra!';
      const mm = mulMastery(s); mast = mm.p; enough = mm.n >= Math.min(40, mulItems(s).length * 2);
    } else {
      const it = S.clock['S' + s] || { p: 0.3, n: 0 }; mast = it.p; enough = it.n >= 8;
      say += it.p < 0.6 ? `Vi fortsätter med ${CLK[s].n.toLowerCase()} nästa gång.` : `Du blir riktigt bra på ${CLK[s].n.toLowerCase()}!`;
    }
    if (mast >= 0.75 && enough && P.level < 3) {
      say += ` Den här nivån sitter. Vill du prova nivå ${P.level + 1}?`;
      offer(`Prova nivå ${P.level + 1}`, () => { P.level++; save(); head(); startRound(R.mode); });
    } else if (mast >= 0.75 && enough && P.level === 3 && s < 9) say += ' Du klarar nivå 3! Fråga en vuxen om du ska prova nästa termin.';
    else if (right <= 4 && P.level > 1) {
      say += ` Vill du köra nivå ${P.level - 1} en stund?`;
      offer(`Byt till nivå ${P.level - 1}`, () => { P.level--; save(); head(); startRound(R.mode); });
    }
  }
  $('#doneSay').textContent = say;
  speak($('#doneTitle').textContent + ' ' + say);
  tone(true);
}
