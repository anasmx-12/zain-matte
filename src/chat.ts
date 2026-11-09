// "Fråga Sonic": a chat where the AI explains what the child didn't understand.
// Every answer has a button that reads it aloud. Not available during a test (prov).
import { $, $$, S, speak, voice } from './core';
import { aiChat, type ChatMsg, type ChatContext } from './ai';

let msgs: ChatMsg[] = [];
let ctx: ChatContext = {};
let fallback = '';
let busy = false;

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** Plain text from the explanation HTML that the practice modes already have. */
export const plain = (html: string): string => {
  const d = document.createElement('div'); d.innerHTML = html.replace(/<\/div>/g, '. </div>');
  return (d.textContent || '').replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim();
};

const QUICK = ['Förklara på ett annat sätt', 'Ge mig ett lättare exempel', 'Varför blir det så?', 'Ge mig en liknande uppgift att testa'];

export function openChat(c: ChatContext = {}, fallbackText = ''): void {
  if (!$('#examrun').hidden) return; // no help during a test
  ctx = { ...c, grade: S.profile?.grade }; fallback = fallbackText; msgs = [];
  $('#chat').hidden = false; document.body.classList.add('noscroll');
  if (c.question) send('Jag förstår inte den här uppgiften. Kan du förklara?');
  else { msgs.push({ role: 'assistant', content: 'Hej! Jag är Sonic. Skriv en matteuppgift eller en fråga, till exempel "vad är 7 × 8?" eller "vad betyder kvart i?", så förklarar jag.' }); render(); }
  setTimeout(() => $('#chatInput').focus(), 50);
}
export function closeChat(): void {
  $('#chat').hidden = true; document.body.classList.remove('noscroll');
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
}

function render(): void {
  const q = ctx.question ? `<div class="ctxq"><small>Uppgiften</small>${esc(ctx.question)}${ctx.correct ? `<span>Rätt svar: <b>${esc(ctx.correct)}</b></span>` : ''}</div>` : '';
  $('#chatLog').innerHTML = q + msgs.map((m, i) => m.role === 'user'
    ? `<div class="msg me"><p>${esc(m.content)}</p></div>`
    : `<div class="msg ai"><svg class="robbi" viewBox="0 0 64 64" aria-hidden="true"></svg><div><p>${esc(m.content)}</p><button class="readbtn" data-i="${i}">🔊 Läs upp</button></div></div>`).join('') +
    (busy ? '<div class="msg ai"><svg class="robbi" viewBox="0 0 64 64" aria-hidden="true"></svg><div><p class="typing"><i></i><i></i><i></i></p></div></div>' : '');
  const face = document.querySelector('.logo .robbi')?.innerHTML || '';
  $$('#chatLog .robbi').forEach(s => (s.innerHTML = face));
  $$<HTMLButtonElement>('#chatLog .readbtn').forEach(b => (b.onclick = () => speak(msgs[+b.dataset.i!].content, true)));
  $('#chatQuick').innerHTML = QUICK.map(t => `<button class="qchip">${t}</button>`).join('');
  $$<HTMLButtonElement>('#chatQuick .qchip').forEach(b => (b.onclick = () => send(b.textContent!)));
  const log = $('#chatLog'); log.scrollTop = log.scrollHeight;
}

async function send(text: string): Promise<void> {
  text = text.trim();
  if (!text || busy) return;
  msgs.push({ role: 'user', content: text }); busy = true; render();
  const r = await aiChat(msgs, ctx);
  busy = false;
  let reply: string;
  if (r) reply = r.reply;
  else if (fallback && msgs.filter(m => m.role === 'user').length === 1) reply = fallback + ' (Sonic-AI är inte igång, så det här är appens egen förklaring.)';
  else reply = 'Jag når inte Sonic-AI just nu. Be en vuxen starta den. Hur man gör står under "För vuxna".';
  msgs.push({ role: 'assistant', content: reply });
  render();
  if (voice) speak(reply, true);
}

export function bindChat(): void {
  $('#chatClose').onclick = closeChat;
  $('#chat').onclick = e => { if (e.target === $('#chat')) closeChat(); };
  $<HTMLFormElement>('#chatForm').onsubmit = e => {
    e.preventDefault();
    const i = $<HTMLInputElement>('#chatInput'); const v = i.value; i.value = ''; send(v);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#chat').hidden) closeChat(); });
}
