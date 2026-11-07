// The star shop: buy things for the room, clothes for Robbi, walls and floors.
import { $, $$, S, save, head, tone, speak, show, drawRobbi, STAR } from './core';
import { ITEMS, SHOP_TABS, type Item, type ShopTab } from './catalog';

let tab: ShopTab = 'saker';
const owned = (id: string) => S.owned[id] || 0;

function isEquipped(it: Item): boolean {
  if (it.slot === 'wall') return S.room.wall === it.id;
  if (it.slot === 'floor') return S.room.floor === it.id;
  if (it.slot) return S.outfit[it.slot] === it.id;
  return false;
}
function setEquipped(it: Item, on: boolean): void {
  const v = on ? it.id : undefined;
  if (it.slot === 'wall') S.room.wall = v;
  else if (it.slot === 'floor') S.room.floor = v;
  else if (it.slot) S.outfit[it.slot] = v;
}

export function openShop(): void { show('shop'); drawShop(); }

function swatch(it: Item): string {
  if (it.slot === 'color') return `<span class="swatch round" style="background:${it.value}"></span>`;
  if (it.slot === 'wall' || it.slot === 'floor') return `<span class="swatch" style="background:${it.value}"></span>`;
  return `<span class="emo">${it.emoji}</span>`;
}

function drawShop(): void {
  $('#shopTabs').innerHTML = SHOP_TABS.map(t =>
    `<button class="tabb" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${t.name}</button>`).join('');
  $$('#shopTabs .tabb').forEach(b => (b.onclick = () => { tab = b.dataset.tab as ShopTab; drawShop(); }));

  $('#shopItems').innerHTML = ITEMS.filter(i => i.tab === tab).map(it => {
    const n = owned(it.id), short = it.price - S.stars;
    let btn: string;
    if (it.slot && n) btn = `<button class="buy ${isEquipped(it) ? 'off' : 'use'}" data-act="equip" data-id="${it.id}">${isEquipped(it) ? (it.slot === 'wall' || it.slot === 'floor' ? 'Byt tillbaka' : 'Ta av') : 'Använd'}</button>`;
    else if (short > 0) btn = `<button class="buy" disabled>Behöver ${short} till</button>`;
    else btn = `<button class="buy" data-act="buy" data-id="${it.id}">Köp</button>`;
    const have = !it.slot && n ? `<span class="have">Du har ${n}</span>` : '';
    return `<div class="itemc${isEquipped(it) ? ' on' : ''}">${swatch(it)}<b>${it.name}</b><span class="price">${STAR}${it.price}</span>${have}${btn}</div>`;
  }).join('');

  $$('#shopItems [data-act]').forEach(b => (b.onclick = () => {
    const it = ITEMS.find(i => i.id === b.dataset.id)!;
    if (b.dataset.act === 'buy') buy(it); else { setEquipped(it, !isEquipped(it)); save(); drawRobbi(); drawShop(); }
  }));
}

function buy(it: Item): void {
  if (S.stars < it.price) return;
  S.stars -= it.price;
  S.owned[it.id] = owned(it.id) + 1;
  if (it.slot) setEquipped(it, true);
  save(); head(); tone('buy'); drawRobbi();
  const say = it.slot === 'color' || it.slot === 'hat' || it.slot === 'glasses' ? `Snyggt! Robbi har nu ${it.name.toLowerCase()}.` :
    it.slot ? `Klart! Ditt rum har nu ${it.name.toLowerCase()}.` : `Du köpte ${it.name.toLowerCase()}! Den ligger i lådan i ditt rum.`;
  $('#shopSay').textContent = say; speak(say);
  drawShop();
}
