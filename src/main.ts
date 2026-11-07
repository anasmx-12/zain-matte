import './style.css';
import { $, $$, S, save, head, show, step, stepOf, get, range, setVoice, voice, speak, drawRobbi, resetLearning, type Profile } from './core';
import { MUL, CLK, LEVELNAMES, TERMS } from './curriculum';
import { G, startRound, padKey } from './round';
import { mulItems, mulMastery, mulPrior } from './mul';
import { clockSVG, clockLevels } from './clock';
import { tabPick } from './table';
import { colPick, colGen, OPS, type Op } from './column';
import { openShop } from './shop';
import { openRoom, roomThumb, bindRoomButtons } from './room';
import { openGame } from './game';
import { keyHTML, startReward, rewardActive, STUDY_MS } from './timer';
import type { Mode } from './types';

/* ---------- profile ---------- */
let draft: Profile = { grade: 2, term: 'ht', level: 2 };
function profile(): void {
  const m = new Date().getMonth();
  draft = S.profile ? { ...S.profile } : { grade: 2, term: m >= 6 ? 'ht' : 'vt', level: 2 };
  show('profile'); drawProfile();
}
function drawProfile(): void {
  $('#gradeOpts').innerHTML = [1, 2, 3, 4].map(g => `<button class="opt" data-g="${g}" aria-pressed="${draft.grade === g}">Åk ${g}</button>`).join('');
  $('#termOpts').innerHTML = (Object.entries(TERMS) as ['ht' | 'vt', string][]).map(([k, v]) => `<button class="opt" data-t="${k}" aria-pressed="${draft.term === k}">${k.toUpperCase()}<small>${v}</small></button>`).join('');
  $('#levelOpts').innerHTML = [1, 2, 3].map(l => {
    const s = stepOf(draft.grade, draft.term, l);
    return `<button class="lv" data-l="${l}" aria-pressed="${draft.level === l}"><span class="pips">${[1, 2, 3].map(i => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</span><h4>Nivå ${l}<span>${LEVELNAMES[l - 1]}</span></h4>
      <dl><dt>Gånger</dt><dd>${MUL[s].n}<br><span style="color:var(--muted)">${MUL[s].d}</span></dd><dt>Klockan</dt><dd>${CLK[s].n}<br><span style="color:var(--muted)">${CLK[s].d}</span></dd></dl></button>`;
  }).join('');
  $$('#gradeOpts .opt').forEach(b => (b.onclick = () => { draft.grade = +b.dataset.g!; drawProfile(); }));
  $$('#termOpts .opt').forEach(b => (b.onclick = () => { draft.term = b.dataset.t as 'ht' | 'vt'; drawProfile(); }));
  $$('#levelOpts .lv').forEach(b => (b.onclick = () => { draft.level = +b.dataset.l!; drawProfile(); }));
}
$('#profileGo').onclick = () => { S.profile = { ...draft }; save(); home(); };

/* ---------- home ---------- */
function home(): void {
  if (!S.profile) return profile();
  head(); show('home');
  const s = step(), g = colGen('add', s);
  $('#mulInfo').textContent = `${MUL[s].n}. ${MUL[s].d}.`;
  $('#clockInfo').textContent = `${CLK[s].n}. ${CLK[s].d}.`;
  $('#colInfo').textContent = `Ställ upp och räkna plus, minus, gånger och delat med. Som ${g.a} + ${g.b}.`;
  $('#homeClock').innerHTML = clockSVG(3, 30, 110);
  $('#homeRoomArt').innerHTML = roomThumb();
  $('#keyCard').innerHTML = keyHTML();
  $('#homeSay').textContent = S.answered === 0 ? `Hej! Jag är Robbi. Jag har gjort uppgifter för åk ${S.profile.grade}, nivå ${S.profile.level}. För varje rätt svar får du en stjärna att handla för.`
    : `Välkommen tillbaka! Du har ${S.stars} stjärnor att handla för. Vad vill du köra?`;
}

/* ---------- brain (for grown-ups) ---------- */
function brain(): void {
  show('brain');
  const s = step(), P = S.profile;
  let p = '<tr><th>Årskurs</th>' + [1, 2, 3].map(l => `<th>Nivå ${l}: ${LEVELNAMES[l - 1]}</th>`).join('') + '</tr>';
  for (let g = 1; g <= 4; g++) for (const t of ['ht', 'vt'] as const) {
    const me = P && P.grade === g && P.term === t;
    p += `<tr class="${me ? 'me' : ''}"><th>Åk ${g} ${t.toUpperCase()}</th>` + [1, 2, 3].map(l => {
      const st = stepOf(g, t, l);
      return `<td class="${me && P!.level === l ? 'me' : ''}"><b>${MUL[st].n}</b><span>${CLK[st].n}</span></td>`;
    }).join('') + '</tr>';
  }
  $('#plan').innerHTML = p;
  const inStep = new Set(mulItems(s).map(x => x.k));
  let h = '<tr><th>×</th>' + range(1, 10).map(i => `<th>${i}</th>`).join('') + '</tr>';
  for (let a = 1; a <= 10; a++) {
    h += `<tr><th>${a}</th>`;
    for (let b = 1; b <= 10; b++) {
      const k = a + 'x' + b, it = get(S.mul, k, mulPrior(a, b));
      if (!inStep.has(k) && it.n === 0) { h += `<td class="off">${a * b}</td>`; continue; }
      const col = it.n === 0 ? 'var(--line)' : it.p < 0.45 ? `color-mix(in oklab,var(--tomato) ${Math.round(40 + (0.45 - it.p) * 80)}%,var(--paper))` :
        it.p < 0.72 ? 'color-mix(in oklab,var(--sun) 75%,var(--paper))' : `color-mix(in oklab,var(--grass) ${Math.round(45 + (it.p - 0.72) * 110)}%,var(--paper))`;
      h += `<td style="background:${col}" title="${a} × ${b}: ${Math.round(it.p * 100)} % säker, ${it.n} försök">${a * b}</td>`;
    }
    h += '</tr>';
  }
  $('#heat').innerHTML = h;
  const lv = clockLevels();
  const meterRow = (label: string, it: { p: number; n: number } | undefined, cls = '') =>
    `<div class="lvl${cls}"><span>${label}</span><span class="meter"><b style="width:${it && it.n ? Math.round(it.p * 100) : 0}%"></b></span><span>${it && it.n ? Math.round(it.p * 100) + ' %' : '–'}</span></div>`;
  $('#clockLevels').innerHTML = CLK.map((c, L) => {
    const cur = L === s, rep = !cur && lv.includes(L);
    return meterRow(c.n + (cur ? '<em>Nu</em>' : rep ? '<em>Repetition</em>' : ''), get(S.clock, 'S' + L), cur ? '' : rep ? ' rep' : ' out');
  }).join('');
  $('#colLevels').innerHTML = (Object.entries(OPS) as [Op, (typeof OPS)[Op]][]).map(([op, o]) => meterRow(`${o.n} (${o.s})`, S.col[op])).join('');
  const vals = Object.entries(S.mul).filter(([k]) => k.includes('x')).map(([, v]) => v);
  const corr = vals.reduce((a, b) => a + b.c, 0), tot = vals.reduce((a, b) => a + b.n, 0);
  $('#brainStats').innerHTML = `<div><b>${S.answered}</b>svar totalt</div><div><b>${tot ? Math.round((corr / tot) * 100) + ' %' : '–'}</b>rätt i gånger</div><div><b>${S.best}</b>bästa rad</div><div><b>${Math.round(mulMastery(s).p * 100)} %</b>säker på nivåns gånger</div>`;
  $('#timeStats').innerHTML = `<div><b>${Math.floor(S.timer.studyMs / 60000)} / ${STUDY_MS / 60000}</b>minuter mot nästa speltid</div><div><b>${S.timer.rewards}</b>speltider upplåsta</div><div><b>${S.earned}</b>stjärnor intjänade</div><div><b>${S.hiscore}</b>rekord i spelet</div>`;
  $('#resetRow').innerHTML = '<button class="danger" id="resetBtn">Nollställ kunskaper</button>';
  $('#resetBtn').onclick = () => {
    $('#resetRow').innerHTML = '<span style="font-weight:800">Säker? Robbi glömmer vad barnet kan.</span><button class="danger" id="yesReset">Ja, nollställ</button><button class="back" id="noReset">Avbryt</button>';
    $('#yesReset').onclick = () => { resetLearning(); head(); brain(); $('#resetRow').insertAdjacentHTML('beforeend', '<span class="toast">Nollställt.</span>'); };
    $('#noReset').onclick = brain;
  };
}

/* ---------- navigation ---------- */
const NAV: Record<string, () => void> = { home, colpick: colPick, tabpick: tabPick, shop: openShop, room: openRoom, brain, profile };
document.addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-go],[data-mode],[data-act]');
  if (!el) return;
  if (el.dataset.go) NAV[el.dataset.go]?.();
  else if (el.dataset.mode) startRound(el.dataset.mode as Mode);
  else if (el.dataset.act === 'start') { if (startReward()) openGame(); }
  else if (el.dataset.act === 'play') openGame();
});
$('#homeBtn').onclick = home;
$('#brainBtn').onclick = brain;
$('#profBtn').onclick = profile;
$('#againBtn').onclick = () => startRound(G.R!.mode, G.R!.opt);
$('#voiceBtn').onclick = () => { setVoice(!voice); if (voice) speak('Nu läser jag upp.'); };
bindRoomButtons();

document.addEventListener('keydown', e => {
  if ($('#play').hidden || !G.R) return;
  if (G.R.pad) {
    const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : null;
    if (k) { e.preventDefault(); padKey(k); }
    return;
  }
  if (/^[1-4]$/.test(e.key)) { const b = $$<HTMLButtonElement>('.ch')[+e.key - 1]; if (b && !b.disabled) b.click(); }
  if (e.key === 'Enter' && document.querySelector('#goBtn')) { e.preventDefault(); $('#goBtn').click(); }
});

// Keep the game countdown on the home/done screens fresh.
let wasActive = rewardActive();
setInterval(() => {
  const active = rewardActive();
  if (!active && !wasActive) return;
  wasActive = active;
  if (!$('#home').hidden) $('#keyCard').innerHTML = keyHTML();
  if (!$('#done').hidden) $('#doneKey').innerHTML = keyHTML();
}, 1000);

setVoice(); drawRobbi(); head(); home();
