// 30 minutes of maths unlocks 20 minutes of the reward game.
// Only time between real answers counts (max 90 s per answer), so an idle open app earns nothing.
// NOTE: this runs in the browser, so a determined child could change the device clock.
// The planned backend step moves exactly these rules to the server clock.
import { S, save } from './core';

export const STUDY_MS = 30 * 60_000;
export const REWARD_MS = 20 * 60_000;
const GAP_CAP = 90_000;

/** Call when a round starts, so time spent in menus is not counted. */
export function markActive(): void { S.timer.lastCredit = Date.now(); }

/** Credit study time for one answer. Returns true when this answer filled the meter. */
export function creditStudy(): boolean {
  const t = S.timer, now = Date.now();
  if (rewardActive() || t.studyMs >= STUDY_MS) { t.lastCredit = now; return false; }
  const gap = t.lastCredit ? Math.max(0, Math.min(now - t.lastCredit, GAP_CAP)) : 0;
  t.studyMs = Math.min(STUDY_MS, t.studyMs + gap);
  t.lastCredit = now;
  save();
  return t.studyMs >= STUDY_MS;
}

export function rewardLeft(): number {
  const left = S.timer.rewardEndsAt - Date.now();
  if (left > REWARD_MS) { S.timer.rewardEndsAt = Date.now() + REWARD_MS; save(); return REWARD_MS; } // clock moved back
  return Math.max(0, left);
}
export const rewardActive = (): boolean => rewardLeft() > 0;
export const rewardReady = (): boolean => !rewardActive() && S.timer.studyMs >= STUDY_MS;

export function startReward(): boolean {
  if (!rewardReady()) return false;
  S.timer.rewardEndsAt = Date.now() + REWARD_MS;
  S.timer.studyMs = 0;
  S.timer.rewards++;
  save();
  return true;
}

export const fmt = (ms: number): string => {
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/** The "spelmätare" card shown on the home and done screens. */
export function keyHTML(): string {
  if (rewardActive()) {
    return `<div class="keyrow"><span class="emo">🎮</span><div><b>Spelet är öppet!</b><span>${fmt(rewardLeft())} kvar av speltiden</span></div></div>
      <button class="go" data-act="play">Spela Stjärnfångaren</button>`;
  }
  if (rewardReady()) {
    return `<div class="keyrow"><span class="emo">🎉</span><div><b>Du har räknat i 30 minuter!</b><span>Nu får du spela i 20 minuter.</span></div></div>
      <button class="go" data-act="start">Starta spelet</button>`;
  }
  const min = Math.floor(S.timer.studyMs / 60_000), pct = Math.round((S.timer.studyMs / STUDY_MS) * 100);
  return `<div class="keyrow"><span class="emo">🔒</span><div><b>Spelmätaren: ${min} av 30 minuter</b><span>Räkna i 30 minuter, så låser du upp ett spel i 20 minuter.</span></div></div>
    <span class="meter big"><b style="width:${pct}%"></b></span>`;
}
