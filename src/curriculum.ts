// 10 steps; each (årskurs, termin, nivå) maps to one via stepOf() in core.ts.
import { range } from './core';

export interface MulStep { n: string; d: string; t: number[]; max: number; visual?: number; missing?: number; tens?: number; two?: number }
export const MUL: MulStep[] = [
  { n: 'Lika stora grupper', d: '2:an upp till 2 × 5, med prickar', t: [2], max: 5, visual: 1 },
  { n: '2:an och 10:an', d: 'Upp till × 5, ofta med prickar', t: [2, 10], max: 5, visual: 0.6 },
  { n: '2:an, 5:an och 10:an', d: 'Hela tabellerna', t: [2, 5, 10], max: 10, visual: 0.3 },
  { n: '… och 3:an', d: 'Tabellerna 2, 3, 5 och 10', t: [2, 3, 5, 10], max: 10, visual: 0.15 },
  { n: '… och 1:an och 4:an', d: 'Tabellerna 1–5 och 10', t: [1, 2, 3, 4, 5, 10], max: 10, missing: 0.1 },
  { n: '… och 6:an', d: 'Tabellerna 1–6 och 10', t: [1, 2, 3, 4, 5, 6, 10], max: 10, missing: 0.15 },
  { n: '… och 7:an och 8:an', d: 'Tabellerna 1–8 och 10', t: [1, 2, 3, 4, 5, 6, 7, 8, 10], max: 10, missing: 0.2 },
  { n: 'Hela gångertabellen', d: 'Alla tabeller 1–10, även 3 × ? = 12', t: range(1, 10), max: 10, missing: 0.3 },
  { n: 'Gånger med tiotal', d: 'Som 4 × 30 = 120', t: range(1, 10), max: 10, missing: 0.3, tens: 0.35 },
  { n: 'Tvåsiffrigt × ensiffrigt', d: 'Som 14 × 3 = 42', t: range(1, 10), max: 10, missing: 0.2, tens: 0.25, two: 0.35 },
];

export const FIVES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
export interface ClockStep { n: string; d: string; mins: number[] | null; f: 'w' | 'd' | '24' | 'diff' }
export const CLK: ClockStep[] = [
  { n: 'Hela timmar', d: 'Klockan är tre', mins: [0], f: 'w' },
  { n: 'Hel och halv timme', d: 'Halv fyra', mins: [0, 30, 30], f: 'w' },
  { n: 'Halv och kvart över', d: 'Kvart över fyra', mins: [30, 15, 15, 0], f: 'w' },
  { n: 'Kvart över och kvart i', d: 'Kvart i fem', mins: [15, 45, 45, 30], f: 'w' },
  { n: 'Fem och tio över och i', d: 'Tio i sex', mins: [5, 10, 50, 55, 15, 45], f: 'w' },
  { n: 'Fem i halv, fem över halv', d: 'Fem i halv sju', mins: [20, 25, 35, 40, 5, 55], f: 'w' },
  { n: 'Digital tid', d: 'Analog till 6:25', mins: FIVES, f: 'd' },
  { n: 'Exakta minuter', d: 'Som 7:43', mins: null, f: 'd' },
  { n: '24-timmarsklockan', d: 'Eftermiddag: 15:25', mins: FIVES, f: '24' },
  { n: 'Hur lång tid?', d: 'Vad är klockan om 20 minuter?', mins: FIVES, f: 'diff' },
];
export const LEVELNAMES = ['Lugn start', 'Lagom', 'Utmaning'];
export const TERMS = { ht: 'Hösttermin', vt: 'Vårtermin' } as const;
