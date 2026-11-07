// "Mitt rum": an 8 × 7 grid. Drag things from the box (tray) into the room with a finger or mouse.
import { $, $$, S, save, show, speak, uid } from './core';
import { itemById, DEFAULT_FLOOR, DEFAULT_WALL } from './catalog';

export const COLS = 8, ROWS = 7;
let selected: string | null = null;

const placedCount = (id: string) => S.room.items.filter(p => p.item === id).length;
const available = (id: string) => (S.owned[id] || 0) - placedCount(id);
const sizeOf = (id: string) => itemById(id)?.size || 1;

function styleVars(): string {
  const wall = itemById(S.room.wall)?.value || DEFAULT_WALL, floor = itemById(S.room.floor)?.value || DEFAULT_FLOOR;
  return `--wall:${wall};--floor:${floor}`;
}
/** The room picture: used big (interactive) in the room and small on the home card. */
export function roomInner(showSel = true): string {
  return '<div class="wallpart"></div><div class="floorpart"></div>' + S.room.items.map(p => {
    const it = itemById(p.item); if (!it) return '';
    const s = it.size || 1;
    return `<div class="placed${showSel && p.uid === selected ? ' sel' : ''}" data-uid="${p.uid}" style="left:${(p.x / COLS) * 100}%;top:${(p.y / ROWS) * 100}%;width:${(s / COLS) * 100}%;height:${(s / ROWS) * 100}%;--s:${s}"><span${p.flip ? ' class="flip"' : ''}>${it.emoji}</span></div>`;
  }).join('');
}
export const roomThumb = (): string => `<div class="roomthumb" style="${styleVars()}">${roomInner(false)}</div>`;

function fits(x: number, y: number, s: number, ignore?: string): boolean {
  if (x < 0 || y < 0 || x + s > COLS || y + s > ROWS) return false;
  return S.room.items.every(p => {
    if (p.uid === ignore) return true;
    const ps = sizeOf(p.item);
    return !(x < p.x + ps && p.x < x + s && y < p.y + ps && p.y < y + s);
  });
}
function firstFree(s: number): { x: number; y: number } | null {
  for (let y = ROWS - s; y >= 0; y--) for (let x = 0; x <= COLS - s; x++) if (fits(x, y, s)) return { x, y };
  return null;
}

export function openRoom(): void { show('room'); selected = null; drawRoom(); }

function drawRoom(): void {
  const g = $('#roomGrid');
  g.setAttribute('style', styleVars());
  g.innerHTML = roomInner() + '<div class="hl" hidden></div>';
  const ids = Object.keys(S.owned).filter(id => !itemById(id)?.slot && available(id) > 0);
  $('#tray').innerHTML = ids.length
    ? ids.map(id => `<button class="trayitem" data-id="${id}" aria-label="${itemById(id)!.name}"><span>${itemById(id)!.emoji}</span>${available(id) > 1 ? `<small>×${available(id)}</small>` : ''}</button>`).join('')
    : '<p class="empty">Lådan är tom. Köp fler saker i butiken för dina stjärnor!</p>';
  $('#selBar').hidden = !selected;
  $('#roomSay').textContent = selected ? 'Dra saken dit du vill ha den, eller välj en knapp nedanför.' :
    S.room.items.length || ids.length ? 'Dra saker från lådan in i rummet. Tryck på en sak i rummet för att spegla den eller lägga tillbaka den.' :
    'Ditt rum är tomt än så länge. Räkna och samla stjärnor, och köp saker i butiken!';
  $$<HTMLElement>('#roomGrid .placed').forEach(el => (el.onpointerdown = e => startDrag(e, el, S.room.items.find(p => p.uid === el.dataset.uid)!.item, el.dataset.uid)));
  $$<HTMLElement>('#tray .trayitem').forEach(el => (el.onpointerdown = e => startDrag(e, el, el.dataset.id!)));
}

function startDrag(e: PointerEvent, el: HTMLElement, itemId: string, placedUid?: string): void {
  e.preventDefault();
  el.setPointerCapture(e.pointerId);
  const grid = $('#roomGrid'), hl = grid.querySelector<HTMLElement>('.hl')!, s = sizeOf(itemId);
  const sx = e.clientX, sy = e.clientY;
  let ghost: HTMLElement | null = null, target: { x: number; y: number; ok: boolean } | null = null;

  el.onpointermove = ev => {
    if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
    const rect = grid.getBoundingClientRect(), cell = rect.width / COLS;
    if (!ghost) {
      ghost = document.createElement('div'); ghost.className = 'dragghost';
      ghost.style.width = ghost.style.height = cell * s + 'px'; ghost.style.fontSize = cell * s * 0.78 + 'px';
      ghost.textContent = itemById(itemId)!.emoji; document.body.append(ghost);
      el.classList.add('lifting');
    }
    ghost.style.transform = `translate(${ev.clientX - (cell * s) / 2}px, ${ev.clientY - (cell * s) / 2}px)`;
    const inside = ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (!inside) { target = null; hl.hidden = true; return; }
    const x = Math.min(COLS - s, Math.max(0, Math.round((ev.clientX - rect.left) / cell - s / 2)));
    const y = Math.min(ROWS - s, Math.max(0, Math.round((ev.clientY - rect.top) / cell - s / 2)));
    target = { x, y, ok: fits(x, y, s, placedUid) };
    Object.assign(hl.style, { left: (x / COLS) * 100 + '%', top: (y / ROWS) * 100 + '%', width: (s / COLS) * 100 + '%', height: (s / ROWS) * 100 + '%' });
    hl.className = 'hl ' + (target.ok ? 'ok' : 'bad'); hl.hidden = false;
  };
  const end = () => {
    el.onpointermove = el.onpointerup = el.onpointercancel = null;
    if (!ghost) { // a tap, not a drag
      if (placedUid) selected = selected === placedUid ? null : placedUid;
      else { const spot = firstFree(s); if (spot) place(itemId, spot.x, spot.y); else { drawRoom(); say('Rummet är fullt. Lägg något i lådan först.'); return; } }
      drawRoom(); return;
    }
    ghost.remove();
    let msg = '';
    if (target?.ok) {
      if (placedUid) { const p = S.room.items.find(p => p.uid === placedUid)!; p.x = target.x; p.y = target.y; selected = null; }
      else place(itemId, target.x, target.y);
    } else if (target && !target.ok) msg = 'Det är upptaget där. Prova en annan plats.';
    else if (placedUid) { S.room.items = S.room.items.filter(p => p.uid !== placedUid); selected = null; } // dropped outside: back in the box
    save(); drawRoom();
    if (msg) say(msg);
  };
  el.onpointerup = end;
  el.onpointercancel = end;
}

function place(itemId: string, x: number, y: number): void {
  S.room.items.push({ uid: uid(), item: itemId, x, y }); selected = null; save();
}
function say(t: string): void { $('#roomSay').textContent = t; speak(t); }

export function bindRoomButtons(): void {
  $('#flipBtn').onclick = () => { const p = S.room.items.find(p => p.uid === selected); if (p) { p.flip = !p.flip; save(); drawRoom(); } };
  $('#storeBtn').onclick = () => { S.room.items = S.room.items.filter(p => p.uid !== selected); selected = null; save(); drawRoom(); };
}
