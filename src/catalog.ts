// Everything a child can buy with stars. Prices grow so there is always a next goal.
export type ShopTab = 'saker' | 'robbi' | 'rum';
export type Slot = 'hat' | 'glasses' | 'color' | 'wall' | 'floor';

export interface Item {
  id: string;
  name: string;
  emoji: string;
  price: number;
  tab: ShopTab;
  /** Footprint in room cells (square). Only for things placed in the room. */
  size?: 1 | 2;
  /** Wearables and room styles are equipped, not placed. */
  slot?: Slot;
  /** Colour for Robbi, or a CSS background for walls/floors. */
  value?: string;
}

export const ITEMS: Item[] = [
  // things for the room
  { id: 'balloon', name: 'Ballong', emoji: '🎈', price: 4, tab: 'saker', size: 1 },
  { id: 'plant', name: 'Krukväxt', emoji: '🪴', price: 5, tab: 'saker', size: 1 },
  { id: 'cactus', name: 'Kaktus', emoji: '🌵', price: 5, tab: 'saker', size: 1 },
  { id: 'ball', name: 'Fotboll', emoji: '⚽', price: 6, tab: 'saker', size: 1 },
  { id: 'puzzle', name: 'Pussel', emoji: '🧩', price: 8, tab: 'saker', size: 1 },
  { id: 'lamp', name: 'Lampa', emoji: '💡', price: 8, tab: 'saker', size: 1 },
  { id: 'chair', name: 'Stol', emoji: '🪑', price: 10, tab: 'saker', size: 1 },
  { id: 'books', name: 'Böcker', emoji: '📚', price: 10, tab: 'saker', size: 1 },
  { id: 'picture', name: 'Tavla', emoji: '🖼️', price: 12, tab: 'saker', size: 1 },
  { id: 'clock', name: 'Klocka', emoji: '🕰️', price: 12, tab: 'saker', size: 1 },
  { id: 'teddy', name: 'Nalle', emoji: '🧸', price: 15, tab: 'saker', size: 1 },
  { id: 'rainbow', name: 'Regnbåge', emoji: '🌈', price: 25, tab: 'saker', size: 2 },
  { id: 'guitar', name: 'Gitarr', emoji: '🎸', price: 30, tab: 'saker', size: 1 },
  { id: 'bed', name: 'Säng', emoji: '🛏️', price: 30, tab: 'saker', size: 2 },
  { id: 'sofa', name: 'Soffa', emoji: '🛋️', price: 30, tab: 'saker', size: 2 },
  { id: 'fish', name: 'Guldfisk', emoji: '🐠', price: 40, tab: 'saker', size: 1 },
  { id: 'computer', name: 'Dator', emoji: '🖥️', price: 40, tab: 'saker', size: 1 },
  { id: 'piano', name: 'Piano', emoji: '🎹', price: 45, tab: 'saker', size: 2 },
  { id: 'dino', name: 'Dinosaurie', emoji: '🦖', price: 45, tab: 'saker', size: 2 },
  { id: 'cat', name: 'Katt', emoji: '🐱', price: 60, tab: 'saker', size: 1 },
  { id: 'dog', name: 'Hund', emoji: '🐶', price: 60, tab: 'saker', size: 1 },
  { id: 'rocket', name: 'Raket', emoji: '🚀', price: 80, tab: 'saker', size: 2 },
  { id: 'ufo', name: 'Ufo', emoji: '🛸', price: 90, tab: 'saker', size: 2 },
  { id: 'trophy', name: 'Pokal', emoji: '🏆', price: 100, tab: 'saker', size: 1 },
  // for Robbi
  { id: 'bow', name: 'Rosett', emoji: '🎀', price: 12, tab: 'robbi', slot: 'hat' },
  { id: 'cap', name: 'Keps', emoji: '🧢', price: 15, tab: 'robbi', slot: 'hat' },
  { id: 'specs', name: 'Glasögon', emoji: '👓', price: 15, tab: 'robbi', slot: 'glasses' },
  { id: 'shades', name: 'Solglasögon', emoji: '🕶️', price: 20, tab: 'robbi', slot: 'glasses' },
  { id: 'green', name: 'Grön Robbi', emoji: '🟢', price: 20, tab: 'robbi', slot: 'color', value: '#23955F' },
  { id: 'tophat', name: 'Hög hatt', emoji: '🎩', price: 25, tab: 'robbi', slot: 'hat' },
  { id: 'purple', name: 'Lila Robbi', emoji: '🟣', price: 25, tab: 'robbi', slot: 'color', value: '#8A5CD6' },
  { id: 'pink', name: 'Rosa Robbi', emoji: '🩷', price: 25, tab: 'robbi', slot: 'color', value: '#E5609E' },
  { id: 'gradcap', name: 'Studentmössa', emoji: '🎓', price: 40, tab: 'robbi', slot: 'hat' },
  { id: 'crown', name: 'Krona', emoji: '👑', price: 60, tab: 'robbi', slot: 'hat' },
  { id: 'gold', name: 'Guld-Robbi', emoji: '🟡', price: 80, tab: 'robbi', slot: 'color', value: '#D9A000' },
  // walls and floors
  { id: 'wall-mint', name: 'Mintgrön vägg', emoji: '🟩', price: 10, tab: 'rum', slot: 'wall', value: '#BFE8D4' },
  { id: 'wall-rose', name: 'Rosa vägg', emoji: '🟪', price: 10, tab: 'rum', slot: 'wall', value: '#F6CFE0' },
  { id: 'wall-sun', name: 'Solgul vägg', emoji: '🟨', price: 12, tab: 'rum', slot: 'wall', value: '#FBE3A0' },
  { id: 'floor-check', name: 'Rutigt golv', emoji: '🏁', price: 15, tab: 'rum', slot: 'floor',
    value: 'repeating-conic-gradient(#F3F3F3 0 25%, #C9D3E3 0 50%) 0 0 / 24px 24px' },
  { id: 'floor-grass', name: 'Gräsmatta', emoji: '🌱', price: 20, tab: 'rum', slot: 'floor',
    value: 'radial-gradient(#5FB86E 1.5px, transparent 2px) 0 0 / 12px 12px, #7FCB8A' },
  { id: 'floor-rug', name: 'Mjuk matta', emoji: '🧶', price: 20, tab: 'rum', slot: 'floor',
    value: 'repeating-linear-gradient(45deg, #E8A3B8 0 10px, #F1BFCD 10px 20px)' },
  { id: 'wall-night', name: 'Stjärnhimmel', emoji: '🌌', price: 40, tab: 'rum', slot: 'wall',
    value: 'radial-gradient(#FFF 1px, transparent 1.5px) 0 0 / 22px 22px, radial-gradient(#FFE58A 1.2px, transparent 2px) 11px 9px / 31px 31px, #1E2A5C' },
];

/** Free starting styles, never shown in the shop. */
export const DEFAULT_WALL = '#CFE2F7';
export const DEFAULT_FLOOR = 'repeating-linear-gradient(90deg, #D9A86C 0 46px, #CF9C5F 46px 48px)';

const byId = new Map(ITEMS.map(i => [i.id, i]));
export const itemById = (id: string | undefined): Item | undefined => (id ? byId.get(id) : undefined);

export const SHOP_TABS: { id: ShopTab; name: string }[] = [
  { id: 'saker', name: 'Saker till rummet' },
  { id: 'robbi', name: 'Klä ut Robbi' },
  { id: 'rum', name: 'Väggar och golv' },
];
