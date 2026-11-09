// Prov: a test per chapter, made by Sonic-AI. No help during the test: no hints, no right/wrong,
// no chat. The child sees the result and can ask Sonic about each mistake afterwards.
import { $, $$, S, save, head, show, step, speak, tone, rand, pick, shuffle, range, STAR } from './core';
import { MUL, CLK } from './curriculum';
import { clockSVG, digital, phrase, wrapH } from './clock';
import { colGen, OPS, type Op } from './column';
import { creditStudy, markActive } from './timer';
import { startRound } from './round';
import { openChat } from './chat';
import { aiExam, aiSaveResult, type Exam, type ExamQ } from './ai';
import type { Mode } from './types';

const CHAPTERS: { id: string; n: string; d: string; art: string; mode?: Mode }[] = [
  { id: 'mul', n: 'Gångertabellen', d: '12 frågor på din nivå', art: '3 × 4', mode: 'mul' },
  { id: 'clock', n: 'Klockan', d: '10 klockor att läsa', art: '🕒', mode: 'clock' },
  { id: 'col', n: 'Uppställning', d: '6 tal: + − × ÷', art: '47 + 38', mode: 'col' },
  { id: 'tab', n: 'En tabell', d: 'Välj tabell 1–10', art: '7, 14, 21' },
  { id: 'mix', n: 'Blandat prov', d: 'Lite av allt', art: '🏁' },
];

interface Run { exam: Exam; i: number; given: string[]; t0: number; local: boolean; confirm: boolean }
let E: Run | null = null;
let chosen = 'mul', table = 0, loading = false;

/* ---------- choose a chapter ---------- */
export function examPick(): void { show('exampick'); drawPick(); }
function drawPick(): void {
  $('#examGrid').innerHTML = CHAPTERS.map(c =>
    `<button class="exc" data-ch="${c.id}" aria-pressed="${c.id === chosen}"><span class="art">${c.art}</span><b>${c.n}</b><span>${c.d}</span></button>`).join('');
  $('#examTables').hidden = chosen !== 'tab';
  $('#examTables').innerHTML = '<h3>Vilken tabell?</h3><div class="opts">' +
    range(1, 10).map(t => `<button class="opt" data-t="${t}" aria-pressed="${t === table}">${t}:an</button>`).join('') + '</div>';
  $$('#examGrid .exc').forEach(b => (b.onclick = () => { chosen = b.dataset.ch!; drawPick(); }));
  $$('#examTables .opt').forEach(b => (b.onclick = () => { table = +b.dataset.t!; drawPick(); }));
  const go = $<HTMLButtonElement>('#examGo');
  go.disabled = loading || (chosen === 'tab' && !table);
  go.textContent = loading ? 'Sonic-AI gör ditt prov …' : chosen === 'tab' && !table ? 'Välj en tabell först' : 'Starta provet';
}

async function startExam(chapter: string, t = 0): Promise<void> {
  if (loading || !S.profile) return;
  loading = true; drawPick();
  const P = S.profile;
  let exam = await aiExam({ chapter, grade: P.grade, term: P.term, level: P.level, table: t });
  const local = !exam;
  if (!exam) exam = localExam(chapter, step(), t);
  loading = false;
  if ($('#exampick').hidden) return; // the child left while we waited
  E = { exam, i: 0, given: exam.questions.map(() => ''), t0: Date.now(), local, confirm: false };
  markActive(); show('examrun'); drawQ();
}

/* ---------- during the test ---------- */
const cur = (): ExamQ => E!.exam.questions[E!.i];
function drawQ(): void {
  if (!E) return;
  const q = cur(), n = E.exam.questions.length, g = E.given[E.i];
  $('#examTitle').textContent = E.exam.title;
  $('#examNav').innerHTML = E.exam.questions.map((_, i) =>
    `<button class="qn${i === E!.i ? ' now' : ''}${E!.given[i] ? ' done' : ''}" data-i="${i}" aria-label="Fråga ${i + 1}">${i + 1}</button>`).join('');
  let h = `<div class="qcount">Fråga ${E.i + 1} av ${n}</div>`;
  if (q.clock) h += clockSVG(q.clock.h, q.clock.m);
  if (q.story) h += `<div class="story">${q.story}</div>`;
  else if (!q.show) h += `<div class="story">${q.text}</div>`;
  if (q.show) h += `<div class="q">${q.show.replace(/([×÷+−])/g, '<span class="x">$1</span>').replace('?', `<span class="gap${g ? '' : ' empty'}">${q.kind === 'number' ? g || '?' : '?'}</span>`)}</div>`;
  else if (q.kind === 'number') h += `<div class="q"><span class="gap${g ? '' : ' empty'}">${g || '?'}</span></div>`;
  h += '<button class="speak" id="exSay">Lyssna på frågan</button>';
  if (q.kind === 'choice') {
    const words = q.choices!.some(c => /[a-zåäö]/i.test(c));
    h += '<div class="choices">' + q.choices!.map((c, i) =>
      `<button class="ch${words ? ' words' : ''}${g === c ? ' picked' : ''}" data-v="${c}"><span class="k">${i + 1}</span>${c}</button>`).join('') + '</div>';
  } else {
    h += `<div class="pad">${range(1, 9).map(k => `<button class="pk" data-k="${k}">${k}</button>`).join('')}<button class="pk del" data-k="del">Sudda</button><button class="pk" data-k="0">0</button><button class="pk ok" data-k="ok">${E.i === n - 1 ? 'Klar' : 'Nästa'}</button></div>`;
  }
  const left = E.given.filter(x => !x).length;
  h += `<div class="row exrow"><button class="ghost" id="exPrev"${E.i === 0 ? ' disabled' : ''}>Föregående</button>` +
    (E.i < n - 1 ? '<button class="go" id="exNext">Nästa</button>' : '<button class="go" id="exHand">Lämna in</button>') + '</div>';
  if (E.confirm) h += `<div class="fb bad"><div>Du har ${left} ${left === 1 ? 'fråga' : 'frågor'} utan svar. Vill du lämna in ändå?</div><div class="row"><button class="go" id="exYes">Ja, lämna in</button><button class="ghost" id="exNo">Nej, fortsätt</button></div></div>`;
  $('#examCard').innerHTML = h;

  $$('#examNav .qn').forEach(b => (b.onclick = () => go(+b.dataset.i!)));
  $('#exSay').onclick = () => speak(q.text, true);
  $$<HTMLButtonElement>('#examCard .ch').forEach(b => (b.onclick = () => answer(b.dataset.v!)));
  $$<HTMLButtonElement>('#examCard .pk').forEach(b => (b.onclick = () => key(b.dataset.k!)));
  $<HTMLButtonElement>('#exPrev').onclick = () => go(E!.i - 1);
  const nx = document.querySelector<HTMLButtonElement>('#exNext'); if (nx) nx.onclick = () => go(E!.i + 1);
  const hd = document.querySelector<HTMLButtonElement>('#exHand'); if (hd) hd.onclick = handIn;
  const y = document.querySelector<HTMLButtonElement>('#exYes'); if (y) y.onclick = finish;
  const no = document.querySelector<HTMLButtonElement>('#exNo'); if (no) no.onclick = () => { E!.confirm = false; go(E!.given.findIndex(x => !x)); };
}
function go(i: number): void { if (!E) return; E.i = Math.max(0, Math.min(E.exam.questions.length - 1, i)); E.confirm = false; drawQ(); }
function answer(v: string): void {
  if (!E) return;
  if (!E.given[E.i]) creditStudy();
  E.given[E.i] = v; tone('blip'); drawQ();
}
function key(k: string): void {
  if (!E || cur().kind !== 'number') return;
  const g = E.given[E.i];
  if (k === 'ok') { if (E.i < E.exam.questions.length - 1) go(E.i + 1); else handIn(); return; }
  if (k === 'del') { E.given[E.i] = g.slice(0, -1); drawQ(); return; }
  if (g.length >= 6) return;
  if (!g) creditStudy();
  E.given[E.i] = (g === '0' ? '' : g) + k; drawQ();
}
function handIn(): void {
  if (!E) return;
  if (E.given.some(x => !x)) { E.confirm = true; drawQ(); return; }
  finish();
}

/* ---------- result ---------- */
function finish(): void {
  if (!E) return;
  const R = E, qs = R.exam.questions;
  const ok = qs.map((q, i) => R.given[i].trim() === q.answer);
  const score = ok.filter(Boolean).length, total = qs.length, f = score / total, secs = Math.round((Date.now() - R.t0) / 1000);
  const bonus = f >= 0.9 ? 5 : f >= 0.7 ? 2 : 0, stars = score + bonus;
  S.stars += stars; S.earned += stars;
  S.exams = [{ at: Date.now(), title: R.exam.title, score, total, seconds: secs }, ...S.exams].slice(0, 30);
  save(); head(); tone(true);
  aiSaveResult({ examId: R.exam.id, chapter: R.exam.chapter, title: R.exam.title, score, total, seconds: secs,
    answers: qs.map((q, i) => ({ id: q.id, given: R.given[i], ok: ok[i] })) });
  E = null;

  show('examdone');
  const medal = f >= 0.9 ? '🥇' : f >= 0.7 ? '🥈' : f >= 0.5 ? '🥉' : '💪';
  const title = f >= 0.9 ? 'Guld! Superbra!' : f >= 0.7 ? 'Silver! Bra jobbat!' : f >= 0.5 ? 'Brons! Bra kämpat!' : 'Bra försök! Träna lite till.';
  const mins = Math.floor(secs / 60), s = secs % 60;
  $('#examResult').innerHTML = `<div class="medal">${medal}</div><h2>${title}</h2><div class="big-score">${score}/${total}</div>
    <p class="hint">Tid: ${mins} min ${s} s · Du fick ${stars} stjärnor${bonus ? ` (varav ${bonus} i bonus)` : ''} ${STAR}</p>
    ${R.local ? '<p class="colnote">Sonic-AI var inte igång, så appen gjorde provet själv.</p>' : ''}`;
  $('#examReview').innerHTML = qs.map((q, i) => {
    const label = q.story || q.text;
    const showTxt = q.show ? q.show.replace('?', ok[i] ? q.answer : '?') : '';
    return `<div class="rv ${ok[i] ? 'ok' : 'no'}"><span class="mark">${ok[i] ? '✓' : '✗'}</span><div class="rvbody">
      <b>${i + 1}. ${showTxt || label}</b>
      ${ok[i] ? `<span>Ditt svar: ${R.given[i]}</span>` : `<span>Ditt svar: ${R.given[i] || 'inget svar'} · Rätt svar: <b>${q.answer}</b></span>
      <button class="ghost sky small" data-ask="${i}">Fråga Sonic varför</button>`}</div>
      ${q.clock ? `<div class="rvclock">${clockSVG(q.clock.h, q.clock.m, 70)}</div>` : ''}</div>`;
  }).join('');
  $$<HTMLButtonElement>('#examReview [data-ask]').forEach(b => (b.onclick = () => {
    const i = +b.dataset.ask!, q = qs[i];
    const clockTxt = q.clock ? ` Klockan i uppgiften visar ${digital(q.clock.h, q.clock.m)}.` : '';
    openChat({ question: (q.story || q.text) + (q.show ? ' ' + q.show : '') + clockTxt, childAnswer: R.given[i] || 'inget svar', correct: q.answer });
  }));
  const ch = CHAPTERS.find(c => c.id === R.exam.chapter);
  $('#examAgain').onclick = () => { examPick(); chosen = R.exam.chapter; drawPick(); };
  const tr = $<HTMLButtonElement>('#examTrain');
  tr.hidden = !ch?.mode && R.exam.chapter !== 'tab';
  tr.onclick = () => (R.exam.chapter === 'tab' ? startRound('tab', { t: table || 2, order: false }) : startRound(ch!.mode!, ch!.mode === 'col' ? 'mix' : undefined));
  speak(`${title} Du fick ${score} av ${total} rätt.`);
}

/* ---------- the app's own test maker, used when Sonic-AI can't be reached ---------- */
let qid = 0;
const nq = (topic: string, text: string, show: string, answer: number, story = ''): ExamQ =>
  ({ id: 'l' + qid++, kind: 'number', topic, text, show, story, answer: String(answer) });
const cq = (topic: string, text: string, answer: string, wrong: string[], clock?: { h: number; m: number }, story = ''): ExamQ =>
  ({ id: 'l' + qid++, kind: 'choice', topic, text, show: '', story, answer, clock, choices: shuffle([answer, ...[...new Set(wrong)].filter(w => w !== answer).slice(0, 3)]) });

function mulQs(s: number, n: number): ExamQ[] {
  const st = MUL[s], pool = st.t.flatMap(t => range(1, st.max).map(b => [t, b] as [number, number]));
  return shuffle(pool).concat(shuffle(pool)).slice(0, n).map(([a, b]) => {
    const r = Math.random();
    if (st.two && r < st.two) { const x = rand(2, 9), y = 10 + rand(1, 9); return nq('Tvåsiffrigt', `Vad är ${y} gånger ${x}?`, `${y} × ${x} = ?`, x * y); }
    if (st.tens && r < (st.two || 0) + st.tens) { const x = rand(2, 9), y = rand(2, 9) * 10; return nq('Tiotal', `Vad är ${y} gånger ${x}?`, `${y} × ${x} = ?`, x * y); }
    if (s >= 4 && a > 1 && Math.random() < 0.25) return nq('Saknad faktor', `${a} gånger vad blir ${a * b}?`, `${a} × ? = ${a * b}`, b);
    if (s >= 2 && Math.random() < 0.2) { const t = `${pick(['Ella', 'Omar', 'Saga', 'Noah'])} har ${a} påsar. I varje finns ${b} äpplen. Hur många äpplen är det totalt?`; return nq('Textuppgift', t, '', a * b, t); }
    return Math.random() < 0.5 ? nq('Gånger', `Vad är ${a} gånger ${b}?`, `${a} × ${b} = ?`, a * b) : nq('Gånger', `Vad är ${b} gånger ${a}?`, `${b} × ${a} = ?`, a * b);
  });
}
function clockQs(s: number, n: number): ExamQ[] {
  return range(1, n).map(i => {
    const L = i <= n * 0.6 || s === 0 ? s : Math.max(0, s - rand(1, 2)), c = CLK[L], h = rand(1, 12), m = c.mins ? pick(c.mins) : rand(0, 59);
    if (c.f === '24') {
      const hh = rand(1, 5), H = hh + 12, f = (x: number, mm: number) => String(x % 24).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
      const t = 'Det är på eftermiddagen. Vad är klockan med 24-timmarsklockan?';
      return cq('24-timmarsklockan', t, f(H, m), [f(hh, m), f(H + 1, m), f(H - 1, m), f(H, (m + 5) % 60)], { h: hh, m }, t);
    }
    if (c.f === 'diff') {
      const add = pick([15, 20, 30, 60]), tot = h * 60 + m + add, eh = wrapH(Math.floor(tot / 60)), em = tot % 60;
      const t = `Klockan är ${digital(h, m)}. Vad är klockan om ${add === 60 ? 'en timme' : add + ' minuter'}?`;
      return cq('Hur lång tid?', t, digital(eh, em), [digital(eh, (em + 5) % 60), digital(eh + 1, em), digital(eh - 1, em), digital(h, (m + add) % 60)], { h, m }, t);
    }
    const lab = (a: number, b: number) => (c.f === 'w' ? phrase(a, b) : digital(a, b)), d = m % 15 ? 5 : 15;
    return cq(c.n, 'Vad är klockan?', lab(h, m), [lab(h, (m + d) % 60), lab(h + 1, m), lab(h - 1, m), lab(h, (m + 30) % 60), lab(h, (m + 60 - d) % 60)], { h, m });
  });
}
function colQs(s: number, n: number): ExamQ[] {
  const ops: Op[] = ['add', 'sub', 'mul', 'div'];
  return shuffle(range(0, n - 1).map(i => {
    const op = i < 4 ? ops[i] : pick(ops), { a, b } = colGen(op, s), ans = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : a / b;
    return nq('Uppställning', `Vad är ${a} ${OPS[op].w} ${b}?`, `${a} ${OPS[op].s} ${b} = ?`, ans);
  }));
}
function localExam(chapter: string, s: number, t: number): Exam {
  const tab = (tt: number) => shuffle(range(1, 10)).map((b, i) => i % 4 === 3 && tt > 1
    ? nq(`${tt}:ans tabell`, `${tt} gånger vad blir ${tt * b}?`, `${tt} × ? = ${tt * b}`, b) : nq(`${tt}:ans tabell`, `Vad är ${b} gånger ${tt}?`, `${b} × ${tt} = ?`, b * tt));
  const qs = chapter === 'mul' ? mulQs(s, 12) : chapter === 'clock' ? clockQs(s, 10) : chapter === 'col' ? colQs(s, 6) : chapter === 'tab' ? tab(t || 2)
    : shuffle([...mulQs(s, 5), ...clockQs(s, 3), ...colQs(s, 3)]);
  const name = CHAPTERS.find(c => c.id === chapter)?.n || 'Prov';
  return { id: 'local-' + Date.now(), chapter, title: chapter === 'tab' ? `Tabellprov: ${t}:ans tabell` : name, questions: qs, source: 'app' };
}

export function bindExam(): void {
  $('#examGo').onclick = () => startExam(chosen, chosen === 'tab' ? table : 0);
  $('#examQuit').onclick = () => { E = null; examPick(); };
  document.addEventListener('keydown', e => {
    if ($('#examrun').hidden || !E) return;
    const q = cur();
    if (q.kind === 'number') {
      const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : null;
      if (k) { e.preventDefault(); key(k); }
    } else if (/^[1-4]$/.test(e.key) && q.choices![+e.key - 1]) answer(q.choices![+e.key - 1]);
    else if (e.key === 'Enter') { e.preventDefault(); E.i < E.exam.questions.length - 1 ? go(E.i + 1) : handIn(); }
    if (e.key === 'ArrowRight') go(E.i + 1);
    if (e.key === 'ArrowLeft') go(E.i - 1);
  });
}
