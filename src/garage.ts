// Garaget: buy heroes, boosts and trails for Matte Dash with stars earned from maths.
import { $, $$, S, save, head, tone, speak, show, drawRobbi, STAR } from './core';
import { HEROES, RUN_ITEMS, heroSVG, type Hero, type RunItem } from './heroes';
import { rewardActive, rewardLeft, fmt } from './timer';

const owns = (h: Hero) => h.price === 0 || (S.owned['hero-' + h.id] || 0) > 0;
const img = (h: Hero) => `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(heroSVG(h))}">`;
const BRING: Record<string, 'shield' | 'magnet' | 'life'> = { 'run-shield': 'shield', 'run-magnet': 'magnet', 'run-life': 'life' };

export function openGarage(): void { show('garage'); drawGarage(); }

function say(t: string): void { $('#garageSay').textContent = t; speak(t); }

function drawGarage(): void {
  const open = rewardActive();
  $('#garagePlay').innerHTML = open
    ? `<button class="go big" data-go="runner">Spring Matte Dash!</button><span class="hint">${fmt(rewardLeft())} kvar av speltiden</span>`
    : `<div class="keyrow"><span class="emo">🔒</span><div><b>Matte Dash är låst</b><span>Räkna i 30 minuter så öppnas spelen i 20 minuter. Handla gärna nu redan!</span></div></div>`;
  $('#heroGrid').innerHTML = HEROES.map(h => {
    const have = owns(h), on = S.runner.hero === h.id, short = h.price - S.stars;
    const btn = on ? '<button class="buy off" disabled>Vald</button>'
      : have ? `<button class="buy use" data-hero="${h.id}">Välj</button>`
      : short > 0 ? `<button class="buy" disabled>Behöver ${short} till</button>`
      : `<button class="buy" data-buyhero="${h.id}">Köp</button>`;
    return `<div class="itemc hero${on ? ' on' : ''}" style="--hc:${h.body}">${img(h)}<b>${h.name}</b><span class="animal">${h.animal}</span><span class="perk">${h.perk}</span>
      ${have ? '' : `<span class="price">${STAR}${h.price}</span>`}${btn}</div>`;
  }).join('');
  const card = (it: RunItem) => {
    const n = S.owned[it.id] || 0, short = it.price - S.stars;
    let extra = '';
    if (it.kind === 'boost') {
      const b = BRING[it.id], on = !!S.runner.bring[b];
      extra = `<span class="have">Du har ${n}</span>${n ? `<label class="bring"><input type="checkbox" data-bring="${b}"${on ? ' checked' : ''}> Ta med i nästa lopp</label>` : ''}`;
    }
    const isTrail = it.kind === 'trail', worn = S.runner.trail === it.id;
    const btn = isTrail && n ? `<button class="buy ${worn ? 'off' : 'use'}" data-trail="${it.id}">${worn ? 'Ta av' : 'Använd'}</button>`
      : short > 0 ? `<button class="buy" disabled>Behöver ${short} till</button>`
      : `<button class="buy" data-buy="${it.id}">Köp</button>`;
    return `<div class="itemc${worn ? ' on' : ''}"><span class="emo">${it.emoji}</span><b>${it.name}</b><span class="perk">${it.desc}</span>${isTrail && n ? '' : `<span class="price">${STAR}${it.price}</span>`}${extra}${btn}</div>`;
  };
  $('#boostGrid').innerHTML = RUN_ITEMS.filter(i => i.kind === 'boost').map(card).join('');
  $('#trailGrid').innerHTML = RUN_ITEMS.filter(i => i.kind === 'trail').map(card).join('');

  $$<HTMLButtonElement>('#garage [data-hero]').forEach(b => (b.onclick = () => {
    S.runner.hero = b.dataset.hero!; save(); drawRobbi(); drawGarage(); say(`Nu springer du som ${HEROES.find(h => h.id === b.dataset.hero)!.name}!`);
  }));
  $$<HTMLButtonElement>('#garage [data-buyhero]').forEach(b => (b.onclick = () => {
    const h = HEROES.find(x => x.id === b.dataset.buyhero)!;
    if (S.stars < h.price) return;
    S.stars -= h.price; S.owned['hero-' + h.id] = 1; S.runner.hero = h.id;
    save(); head(); tone('buy'); drawRobbi(); drawGarage(); say(`Grattis! ${h.name} är med i laget. ${h.perk}`);
  }));
  $$<HTMLButtonElement>('#garage [data-buy]').forEach(b => (b.onclick = () => {
    const it = RUN_ITEMS.find(x => x.id === b.dataset.buy)!;
    if (S.stars < it.price) return;
    S.stars -= it.price; S.owned[it.id] = (S.owned[it.id] || 0) + 1;
    if (it.kind === 'trail') S.runner.trail = it.id; else S.runner.bring[BRING[it.id]] = true;
    save(); head(); tone('buy'); drawGarage(); say(it.kind === 'trail' ? `Snyggt! Nu har du ${it.name.toLowerCase()}.` : `Du köpte en ${it.name.toLowerCase()}. Den följer med i nästa lopp.`);
  }));
  $$<HTMLButtonElement>('#garage [data-trail]').forEach(b => (b.onclick = () => {
    S.runner.trail = S.runner.trail === b.dataset.trail ? undefined : b.dataset.trail; save(); drawGarage();
  }));
  $$<HTMLInputElement>('#garage [data-bring]').forEach(c => (c.onchange = () => { S.runner.bring[c.dataset.bring as 'shield'] = c.checked; save(); }));
}
