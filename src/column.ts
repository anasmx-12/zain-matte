// Uppställning: + − × in columns (right to left) and ÷ with liggande stolen (left to right).
import { $, $$, S, learn, rand, pick, range, step, speak, mood, tone, show } from './core';
import { G, startRound, dots, scoreAnswer, feedback, padHTML, bindPad } from './round';
import type { Question, Spec } from './types';

export type Op = 'add' | 'sub' | 'mul' | 'div';
export const OPS: Record<Op, { n: string; s: string; w: string }> = {
  add: { n: 'Addition', s: '+', w: 'plus' }, sub: { n: 'Subtraktion', s: '−', w: 'minus' },
  mul: { n: 'Multiplikation', s: '×', w: 'gånger' }, div: { n: 'Division', s: '÷', w: 'delat med' },
};

export interface ColQuestion extends Question {
  op: Op; a: number; b: number; answer: number;
  W: number; D?: number[];
  /** Expected digit per answer cell ('' = leave empty). */ exp: string[];
  /** Carries (or borrow results / remainders) per helper cell. */ cryExp: string[];
  steps: string[]; dir: 1 | -1; tries: number; hints: number; revealed?: boolean;
}
interface ColState { ans: string[]; cry: string[]; sel: { r: 'a' | 'c'; j: number }; lastA: number; marks: (boolean | null)[] | null }
let C: ColState;

const num = (len: number) => rand(10 ** (len - 1), 10 ** len - 1);
export const digitAt = (n: number, j: number, W: number): number | null => { const s = String(n), i = j - (W - s.length); return i >= 0 ? +s[i] : null; };
function hasCarry(a: number, b: number): boolean { while (a || b) { if ((a % 10) + (b % 10) >= 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }
function hasBorrow(a: number, b: number): boolean { while (b) { if (a % 10 < b % 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }

/** Numbers grow with the profile step (0..9): small without carrying first, bigger later. */
export function colGen(op: Op, s: number): { a: number; b: number } {
  const L = s <= 1 ? 2 : s <= 5 ? 3 : 4, shortB = () => num(Math.max(2, L - (Math.random() < 0.4 ? 1 : 0)));
  for (let t = 0; t < 300; t++) {
    if (op === 'add') { const a = num(L), b = shortB(), c = hasCarry(a, b); if (s === 0 && c) continue; if (s >= 2 && !c && Math.random() < 0.8) continue; return { a, b }; }
    if (op === 'sub') {
      let a = num(L), b = shortB(); if (b > a) [a, b] = [b, a]; if (a === b) continue;
      if (s >= 6 && Math.random() < 0.25) return { a: Math.floor(a / 1000) * 1000 + rand(0, 9), b: num(3) }; // like 4006 − 358
      const br = hasBorrow(a, b); if (s === 0 && br) continue; if (s >= 2 && !br && Math.random() < 0.8) continue; return { a, b };
    }
    if (op === 'mul') {
      const a = s <= 1 ? rand(11, 49) : s <= 3 ? rand(12, 99) : s <= 6 ? rand(102, 999) : Math.random() < 0.5 ? rand(102, 999) : rand(1002, 4999);
      return { a, b: s <= 1 ? rand(2, 5) : rand(2, 9) };
    }
    const d = s <= 1 ? rand(2, 5) : rand(2, 9);
    const [lo, hi] = s <= 1 ? [10, 99] : s <= 3 ? [20, 299] : s <= 6 ? [100, 999] : [300, 4999];
    const q = rand(Math.max(2, Math.ceil(lo / d)), Math.floor(hi / d)); if (s <= 1 && q < 10) continue;
    return { a: q * d, b: d };
  }
  return op === 'div' ? { a: 84, b: 4 } : op === 'mul' ? { a: 47, b: 3 } : { a: 47, b: 25 };
}

export function colSpec(): Spec {
  const opt = G.R!.opt as Op | 'mix';
  const op: Op = opt === 'mix' ? pick(Object.keys(OPS) as Op[]) : opt;
  return { op, ...colGen(op, step()) };
}

export function buildCol(spec: Spec): ColQuestion {
  const op = spec.op as Op, a = spec.a as number, b = spec.b as number;
  const base = { kind: 'col' as const, op, a, b, tries: 0, hints: 0, say: `${a} ${OPS[op].w} ${b}` };
  if (op === 'div') {
    const D = String(a).split('').map(Number), W = D.length, exp: string[] = [], cry: string[] = Array(W).fill(''), steps: string[] = [];
    let r = 0, started = false;
    for (let i = 0; i < W; i++) {
      const cur = r * 10 + D[i], qd = Math.floor(cur / b), nr = cur % b;
      if (qd > 0) started = true;
      exp.push(started ? String(qd) : '');
      steps.push(qd === 0 ? `${b} går inte i ${cur}. ${started ? 'Skriv 0' : 'Lämna rutan tom'} och ta med ${cur} till nästa siffra.` :
        `Hur många ${b}:or går det på ${cur}? Det går ${qd}, för ${qd} × ${b} = ${qd * b}.` +
        (nr ? ` ${nr} blir över. Skriv ${nr} som minnessiffra vid nästa siffra.` : i < W - 1 ? ' Inget blir över.' : ' Inget blir över, och vi är klara.'));
      if (i < W - 1 && nr) cry[i + 1] = String(nr);
      r = nr;
    }
    return { ...base, W, D, exp, cryExp: cry, steps, dir: 1, answer: a / b,
      why: `Liggande stolen: börja med siffran längst till vänster. Hur många ${b}:or går det? De små rutorna under är för det som blir över.` };
  }
  const W = op === 'sub' ? String(a).length : op === 'add' ? Math.max(String(a).length, String(b).length) + 1 : String(a).length + 1;
  const exp: string[] = Array(W).fill(''), cry: string[] = Array(W).fill(''), steps: string[] = Array(W).fill('');
  let c = 0;
  for (let j = W - 1; j >= 0; j--) {
    const da = digitAt(a, j, W), db = op === 'mul' ? null : digitAt(b, j, W);
    if (op === 'add') {
      if (da === null && db === null) { if (c) { exp[j] = '1'; steps[j] = 'Minnessiffran 1 flyttar ner och skrivs längst fram.'; } c = 0; continue; }
      const nums = [da, db].filter((v): v is number => v !== null), s = nums.reduce((x, y) => x + y, 0) + c;
      const terms: string[] = nums.map(String); if (c) terms.push('1 (minnessiffran)');
      exp[j] = String(s % 10);
      steps[j] = (terms.length > 1 ? `${terms.join(' + ')} = ${s}. ` : '') + `Skriv ${s % 10}` + (s >= 10 ? ' och sätt 1 som minnessiffra ovanför nästa kolumn.' : '.');
      c = s >= 10 ? 1 : 0; if (c && j > 0) cry[j - 1] = '1';
    } else if (op === 'sub') {
      const y = db ?? 0, x = da! - c, borrow = x < y, r = borrow ? x + 10 - y : x - y;
      let t = '';
      if (c && da === 0) t = `Här står 0, men kolumnen till höger lånade härifrån. Växla från nästa kolumn, så blir 0 till 9. 9 − ${y} = ${r}.`;
      else {
        if (c) t = `${da} lånade ut 1, så nu är det ${x}. `;
        t += borrow ? `${x} − ${y} går inte. Växla 1 från kolumnen till vänster, så blir det ${x + 10}. ${x + 10} − ${y} = ${r}.` : `${x} − ${y} = ${r}.`;
      }
      exp[j] = String(r); steps[j] = t + ` Skriv ${r}.`;
      if (c) cry[j] = String(borrow ? x + 10 : x);
      c = borrow ? 1 : 0;
    } else {
      if (da === null) { if (c) { exp[j] = String(c); steps[j] = `Minnessiffran ${c} skrivs längst fram.`; } c = 0; continue; }
      const p = da * b + c; exp[j] = String(p % 10);
      steps[j] = `${da} × ${b} = ${da * b}` + (c ? `, plus minnessiffran ${c} blir ${p}` : '') + `. Skriv ${p % 10}` +
        (p >= 10 ? ` och sätt ${Math.floor(p / 10)} som minnessiffra ovanför nästa kolumn.` : '.');
      c = Math.floor(p / 10); if (c && j > 0) cry[j - 1] = String(c);
    }
  }
  for (let j = 0; j < W - 1 && exp[j] === '0'; j++) { exp[j] = ''; steps[j] += ' En nolla längst fram behöver inte skrivas.'; }
  return { ...base, W, exp, cryExp: cry, steps, dir: -1, answer: op === 'add' ? a + b : op === 'sub' ? a - b : a * b,
    why: op === 'sub' ? 'Börja längst till höger. Är den övre siffran för liten? Växla från kolumnen till vänster. I de små rutorna kan du skriva vad siffran blir.' :
      'Börja längst till höger, med entalen. Svaret skrivs i de stora rutorna. De små rutorna är för minnessiffror.' };
}

const colOK = (v: string, e: string) => v === e || (e === '' && (v === '' || v === '0'));
const workOrder = (q: ColQuestion) => (q.dir < 0 ? range(0, q.W - 1).reverse() : range(0, q.W - 1));
const cur = () => G.R!.q as ColQuestion;

export function renderCol(q: ColQuestion): void {
  dots(); mood('think'); $('#why').textContent = q.why;
  const start = q.dir < 0 ? q.W - 1 : 0;
  C = { ans: Array(q.W).fill(''), cry: Array(q.W).fill(''), sel: { r: 'a', j: start }, lastA: start, marks: null };
  $('#card').innerHTML = `<div id="colWrap"></div><p class="colnote">Tryck på en ruta och skriv med knapparna.</p>` +
    `<div class="tools"><button class="speak" id="sayBtn">Lyssna</button><button class="speak" id="hintBtn">Ledtråd</button></div>${padHTML()}<div id="fbSlot" style="width:100%"></div>`;
  $('#sayBtn').onclick = () => speak(q.say, true);
  $('#hintBtn').onclick = hintCol;
  bindPad(); drawCol(); speak(q.say);
}

function drawCol(): void {
  const q = cur(), W = q.W;
  const cell = (r: 'a' | 'c', j: number) => {
    const isA = r === 'a', v = isA ? C.ans[j] : C.cry[j];
    let cls = 'cell ' + (isA ? 'ans' : 'cry'), shown = v;
    if (!q.done && C.sel.r === r && C.sel.j === j) cls += ' sel';
    if (isA && C.marks && C.marks[j] != null && v !== '') cls += C.marks[j] ? ' good' : ' bad';
    if (q.revealed) {
      if (isA) { shown = q.exp[j]; if (!colOK(v, q.exp[j])) cls = cls.replace(' bad', '') + ' fix'; }
      else if (q.cryExp[j]) { shown = q.cryExp[j]; if (v !== q.cryExp[j]) cls += ' rev'; }
    }
    return `<button class="${cls}" data-r="${r}" data-j="${j}" aria-label="${isA ? 'Svarsruta' : 'Minnessiffra'} ${j + 1}"${q.done ? ' disabled' : ''}>${shown}</button>`;
  };
  let h: string;
  if (q.op === 'div') {
    h = `<div class="colgrid div" style="--n:${W + 1}">` + range(0, W - 1).map(j => cell('a', j)).join('') + '<span></span>' +
      q.D!.map(d => `<span class="dg bar">${d}</span>`).join('') + `<span class="dg dvs">${q.b}</span>` +
      range(0, W - 1).map(j => (j > 0 ? cell('c', j) : '<span></span>')).join('') + '<span></span></div>';
  } else {
    const lent = (j: number) => q.revealed && q.op === 'sub' && q.cryExp[j] !== '';
    h = `<div class="colgrid" style="--n:${W + 1}"><span></span>` + range(0, W - 1).map(j => (j < W - 1 ? cell('c', j) : '<span></span>')).join('') +
      '<span></span>' + range(0, W - 1).map(j => `<span class="dg${lent(j) ? ' lent' : ''}">${digitAt(q.a, j, W) ?? ''}</span>`).join('') +
      `<span class="dg opr">${OPS[q.op].s}</span>` + range(0, W - 1).map(j => `<span class="dg">${(q.op === 'mul' ? (j === W - 1 ? q.b : null) : digitAt(q.b, j, W)) ?? ''}</span>`).join('') +
      '<span class="rule"></span><span></span>' + range(0, W - 1).map(j => cell('a', j)).join('') + '</div>';
  }
  $('#colWrap').innerHTML = h;
  $$('#colWrap .cell').forEach(b => (b.onclick = () => {
    C.sel = { r: b.dataset.r as 'a' | 'c', j: +b.dataset.j! };
    if (C.sel.r === 'a') C.lastA = C.sel.j;
    drawCol();
  }));
}

/** Number pad input for the column mode. */
export function typeCol(k: string): void {
  const q = cur();
  if (k === 'ok') return checkCol();
  const { r, j } = C.sel;
  if (k === 'del') {
    if (r === 'c') C.cry[j] = '';
    else if (C.ans[j] !== '') C.ans[j] = '';
    else { const pj = j - q.dir; if (pj >= 0 && pj < q.W) { C.sel = { r: 'a', j: pj }; C.lastA = pj; C.ans[pj] = ''; } }
  } else if (r === 'a') {
    C.ans[j] = k; if (C.marks) C.marks[j] = null;
    const nj = j + q.dir; if (nj >= 0 && nj < q.W) C.sel = { r: 'a', j: nj };
    C.lastA = C.sel.j;
  } else { C.cry[j] = k; C.sel = { r: 'a', j: C.lastA }; }
  drawCol();
}

function hintCol(): void {
  const q = cur(); if (q.done) return;
  const j = workOrder(q).find(j => !colOK(C.ans[j], q.exp[j]) && q.steps[j]);
  if (j == null) { $('#why').textContent = 'Allt ser rätt ut. Tryck på Rätta!'; return; }
  q.hints++; C.sel = { r: 'a', j }; C.lastA = j;
  $('#why').textContent = q.steps[j]; speak(q.steps[j]); drawCol();
}

function checkCol(): void {
  const q = cur(); if (q.done) return;
  if (C.ans.every(v => v === '')) { $('#why').textContent = 'Skriv svaret i de stora rutorna först.'; return; }
  const marks = q.exp.map((e, j) => colOK(C.ans[j], e)), ok = marks.every(Boolean);
  q.tries++;
  if (!ok && q.tries === 1) { // one more try: show which cells are wrong
    C.marks = marks; mood('oops');
    const first = workOrder(q).find(j => !marks[j])!;
    C.sel = { r: 'a', j: first }; C.lastA = first;
    $('#why').textContent = 'Nästan! De röda rutorna blev fel. Ändra dem och tryck Rätta igen. Fastnar du, tryck Ledtråd.';
    speak('Nästan! Ändra de röda rutorna.'); tone(false); drawCol();
    return;
  }
  q.done = true; C.marks = marks; if (!ok) q.revealed = true;
  learn(S.col, q.op, ok, q.tries > 1 || q.hints > 0); G.R!.seen.push(q.op);
  $$('.pk').forEach(b => { if (b.dataset.k !== 'ok') (b as HTMLButtonElement).disabled = true; });
  ($('#hintBtn') as HTMLButtonElement).disabled = true;
  drawCol(); scoreAnswer(ok, 3); // a whole column task is worth 3 stars
  feedback(ok, `<div class="math">${q.a} ${OPS[q.op].s} ${q.b} = ${q.answer}</div><ol class="steps">${workOrder(q).filter(j => q.steps[j]).map(j => `<li>${q.steps[j]}</li>`).join('')}</ol>`,
    (q.tries > 1 ? ' Du hittade felet själv. Bra!' : '') + ' +3 stjärnor', 1500);
}

export function colPick(): void {
  show('colpick');
  const s = step();
  $('#opGrid').innerHTML = (Object.entries(OPS) as [Op, (typeof OPS)[Op]][]).map(([op, o]) => {
    const g = colGen(op, s), it = S.col[op];
    return `<button class="opc" data-op="${op}"><span class="sym">${o.s}</span><h3>${o.n}</h3><span>Som ${g.a} ${o.s} ${g.b}</span><span class="meter"><b style="width:${it ? Math.round(it.p * 100) : 0}%"></b></span></button>`;
  }).join('') + '<button class="opc mix" data-op="mix"><span class="sym">?</span><h3>Blandat</h3><span>Alla fyra räknesätten</span></button>';
  $$('#opGrid .opc').forEach(b => (b.onclick = () => startRound('col', b.dataset.op)));
}
