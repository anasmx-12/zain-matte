// The four speed heroes in Matte Dash, and everything for the game that is bought with maths stars.
// Sonic, Shadow, Amy and Knuckles, drawn as simple fan-art SVGs for this home app.

export type HeroId = 'sonic' | 'shadow' | 'amy' | 'knuckles';
export interface Hero {
  id: HeroId; name: string; animal: string; perk: string; price: number;
  body: string; skin: string; shoe: string; accent: string; iris: string;
}

export const HEROES: Hero[] = [
  { id: 'sonic', name: 'Sonic', animal: 'blå igelkott', perk: 'Hoppar längst av alla.', price: 0, body: '#1F5FE0', skin: '#F6C996', shoe: '#E3262E', accent: '#FFFFFF', iris: '#1E9E3E' },
  { id: 'shadow', name: 'Shadow', animal: 'svart igelkott', perk: 'Börjar varje lopp med en sköld.', price: 60, body: '#22222C', skin: '#F2C9A0', shoe: '#F4F4F4', accent: '#E2232A', iris: '#D3202A' },
  { id: 'amy', name: 'Amy', animal: 'rosa igelkott', perk: 'Magneten håller dubbelt så länge.', price: 60, body: '#FF6FAE', skin: '#F8D2AE', shoe: '#E3262E', accent: '#E8235F', iris: '#1E9E3E' },
  { id: 'knuckles', name: 'Knuckles', animal: 'röd myrpiggsvin', perk: 'Har ett extra liv.', price: 80, body: '#E2302B', skin: '#F3C89D', shoe: '#2BB24C', accent: '#FFD23F', iris: '#7A3FD0' },
];
const OLD_IDS: Record<string, HeroId> = { blixt: 'sonic', natt: 'shadow', rosa: 'amy', tank: 'knuckles' };
export const heroById = (id: string | undefined): Hero => HEROES.find(h => h.id === (OLD_IDS[id || ''] || id)) || HEROES[0];
/** Saves from the version with Blixt, Natt, Rosa and Tank: keep what the child bought. */
export function migrateHeroes(runner: { hero: string }, owned: Record<string, number>): void {
  if (OLD_IDS[runner.hero]) runner.hero = OLD_IDS[runner.hero];
  for (const [old, now] of Object.entries(OLD_IDS)) if (owned['hero-' + old]) { owned['hero-' + now] = owned['hero-' + old]; delete owned['hero-' + old]; }
}

export interface RunItem { id: string; name: string; emoji: string; price: number; kind: 'boost' | 'trail'; desc: string; colors?: string[] }
export const RUN_ITEMS: RunItem[] = [
  { id: 'run-shield', name: 'Sköld', emoji: '🛡️', price: 8, kind: 'boost', desc: 'Skyddar dig mot en krock.' },
  { id: 'run-magnet', name: 'Magnet', emoji: '🧲', price: 6, kind: 'boost', desc: 'Drar till dig ringar i början av loppet.' },
  { id: 'run-life', name: 'Extraliv', emoji: '❤️', price: 10, kind: 'boost', desc: 'Ett liv till i ett lopp.' },
  { id: 'run-trail-rainbow', name: 'Regnbågsspår', emoji: '🌈', price: 25, kind: 'trail', desc: 'Ett spår i alla färger.', colors: ['#FF4D4D', '#FF9F1C', '#FFE14D', '#3DDC84', '#3DA5FF', '#9B5DE5'] },
  { id: 'run-trail-fire', name: 'Eldspår', emoji: '🔥', price: 25, kind: 'trail', desc: 'Det brinner bakom dig!', colors: ['#FFE14D', '#FF9F1C', '#FF4D1C'] },
  { id: 'run-trail-stars', name: 'Stjärnspår', emoji: '✨', price: 30, kind: 'trail', desc: 'Glittrande stjärnor.', colors: ['#FFFFFF', '#FFE58A', '#BFD7FF'] },
];
export const runItem = (id: string | undefined): RunItem | undefined => RUN_ITEMS.find(i => i.id === id);

const INK = 'var(--ink)';

/** Quills (hedgehogs) or dreadlocks (Knuckles) behind the head. */
function back(h: Hero): string {
  const s = `fill="${h.body}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
  if (h.id === 'knuckles') return `<path d="M13 30 C2 40 4 54 12 58 C12 48 15 42 19 38Z" ${s}/><path d="M51 30 C62 40 60 54 52 58 C52 48 49 42 45 38Z" ${s}/>
    <path d="M18 18 C8 22 4 32 6 40 C10 34 14 30 20 28Z" ${s}/><path d="M46 18 C56 22 60 32 58 40 C54 34 50 30 44 28Z" ${s}/>`;
  if (h.id === 'amy') return `<path d="M14 30 L4 36 L13 40Z M50 30 L60 36 L51 40Z M16 40 L8 48 L19 46Z M48 40 L56 48 L45 46Z" ${s}/>`;
  const quills = `<path d="M14 24 L-1 18 L12 14 L3 3 L20 8 L22 -3 L32 7 L42 -3 L44 8 L61 3 L52 14 L65 18 L50 24 L60 32 L46 32Z" ${s}/>`;
  if (h.id === 'shadow') return quills + `<path d="M3 3 L12 9 M61 3 L52 9 M-1 18 L10 18 M65 18 L54 18 M22 -3 L25 6 M42 -3 L39 6" stroke="${h.accent}" stroke-width="3" stroke-linecap="round"/>`;
  return quills;
}

/** Head only, for the speech bubbles and the chat (keeps the .eye and .mouth classes so moods still work). */
export function heroHead(h: Hero, accessory = ''): string {
  const ear = (x: number, d: number) => `<path d="M${x} 20 L${x + d * 3} 4 L${x + d * 13} 14Z" fill="${h.body}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${x + d * 3} 17 L${x + d * 4} 9 L${x + d * 9} 14Z" fill="${h.skin}"/>`;
  const amy = h.id === 'amy'
    ? `<path d="M13 18 Q32 2 51 18" fill="none" stroke="${h.accent}" stroke-width="5" stroke-linecap="round"/>
       <path d="M21 16 Q25 22 29 18 Q32 23 35 18 Q39 22 43 16" fill="${h.body}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` : '';
  const chest = h.id === 'shadow' ? `<path d="M24 52 L28 46 L32 52 L36 46 L40 52 L32 58Z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` : '';
  return `<g class="speedl"><path d="M1 30h7M3 38h6M5 46h5" stroke="var(--sun)" stroke-width="3" stroke-linecap="round"/></g>
${back(h)}${ear(13, 1)}${ear(51, -1)}
<ellipse cx="32" cy="32" rx="21" ry="20" fill="${h.body}" stroke="${INK}" stroke-width="3"/>${chest}
<path d="M19 30 C19 19 30 18 32 24 C34 18 45 19 45 30 C45 37 37 38 32 34 C27 38 19 37 19 30Z" fill="#fff" stroke="${INK}" stroke-width="2"/>
<circle class="eye" cx="27" cy="29" r="3.6" fill="${h.iris}"/><circle class="eye" cx="37" cy="29" r="3.6" fill="${h.iris}"/>
<circle cx="27.6" cy="29.4" r="1.7" fill="#141A33"/><circle cx="37.6" cy="29.4" r="1.7" fill="#141A33"/>
<circle cx="26" cy="27.6" r=".9" fill="#fff"/><circle cx="36" cy="27.6" r=".9" fill="#fff"/>
<ellipse cx="32" cy="41" rx="12" ry="8" fill="${h.skin}" stroke="${INK}" stroke-width="2"/>
<ellipse cx="32" cy="36.5" rx="3" ry="2.2" fill="#141A33"/>${amy}
<path class="mouth" d="M26 40 Q32 44 38 40" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>${accessory}`;
}

/** Whole running hero for the game and the garage; plain colours so it can be drawn as an image. */
export function heroSVG(h: Hero, frame = 0): string {
  const legA = frame ? 'M27 52 L21 59' : 'M27 52 L29 60', legB = frame ? 'M37 52 L42 60' : 'M37 52 L46 57';
  const footA = frame ? [19, 60] : [29, 61], footB = frame ? [43, 61] : [47, 58];
  const shoe = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.8" fill="${h.shoe}" stroke="#141A33" stroke-width="2"/>
    <path d="M${x - 2} ${y - 3.5} v7" stroke="${h.id === 'shadow' ? '#E2232A' : '#fff'}" stroke-width="2.2"/>`;
  const fist = h.id === 'knuckles' ? 4.6 : 3.4;
  const chest = h.id === 'knuckles'
    ? '<path d="M25 44 Q32 52 39 44 Q32 48 25 44Z" fill="#fff" stroke="#141A33" stroke-width="1.2"/>'
    : `<ellipse cx="32" cy="48" rx="6" ry="5" fill="${h.skin}"/>`;
  const head = heroHead(h).replace(/var\(--ink\)/g, '#141A33').replace(/var\(--sun\)/g, '#FFD23F').replace(/<g class="speedl">.*?<\/g>/s, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -10 72 78" width="144" height="156">
<path d="${legA}" stroke="${h.body}" stroke-width="5" stroke-linecap="round"/><path d="${legB}" stroke="${h.body}" stroke-width="5" stroke-linecap="round"/>
${shoe(footA[0], footA[1])}${shoe(footB[0], footB[1])}
<ellipse cx="32" cy="47" rx="10" ry="8" fill="${h.body}" stroke="#141A33" stroke-width="2.5"/>${chest}
<path d="M23 45 L14 50 M41 45 L50 41" stroke="${h.body}" stroke-width="4" stroke-linecap="round"/>
<circle cx="13" cy="50.5" r="${fist}" fill="#fff" stroke="#141A33" stroke-width="2"/><circle cx="51" cy="40.5" r="${fist}" fill="#fff" stroke="#141A33" stroke-width="2"/>
<g transform="translate(6 -4) scale(.82)">${head}</g></svg>`;
}
