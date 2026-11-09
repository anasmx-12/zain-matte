// Talks to Sonic-AI, the app's own Python AI server (folder ai/). Every call has a timeout and
// returns null when the server can't be reached, so the app keeps working without it.

const KEY = 'zainmatte-ai-url';

/** Served by the AI server itself (port 8787): same origin. Otherwise the saved address or this computer. */
export function aiBase(): string {
  try { const v = localStorage.getItem(KEY); if (v) return v.replace(/\/+$/, ''); } catch { /* ignore */ }
  if (location.port === '8787') return '';
  return 'http://localhost:8787';
}
export function setAiBase(url: string): void {
  try { url.trim() ? localStorage.setItem(KEY, url.trim()) : localStorage.removeItem(KEY); } catch { /* ignore */ }
}

async function call<T>(path: string, body: unknown, ms: number): Promise<T | null> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(aiBase() + path, body === undefined ? { signal: ctl.signal } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally { clearTimeout(t); }
}

export interface Health { ok: boolean; claude: boolean; model: string }
export const aiHealth = () => call<Health>('/api/health', undefined, 3000);

export interface ExamQ {
  id: string; kind: 'number' | 'choice'; topic: string; text: string; show: string; story: string; answer: string;
  choices?: string[]; clock?: { h: number; m: number };
}
export interface Exam { id: string; chapter: string; title: string; questions: ExamQ[]; source: string }
export const aiExam = (req: { chapter: string; grade: number; term: string; level: number; table?: number }) =>
  call<Exam>('/api/exam', req, 25000);

export interface ExamResult { examId: string; chapter: string; title: string; score: number; total: number; seconds: number; answers: { id: string; given: string; ok: boolean }[] }
export const aiSaveResult = (r: ExamResult) => call<{ ok: boolean }>('/api/exam/result', r, 5000);
export const aiHistory = () => call<{ results: { finished_at: string; title: string; score: number; total: number; seconds: number }[] }>('/api/exam/history', undefined, 4000);

export interface ChatMsg { role: 'user' | 'assistant'; content: string }
export interface ChatContext { question?: string; childAnswer?: string; correct?: string; grade?: number }
export const aiChat = (messages: ChatMsg[], context: ChatContext) =>
  call<{ reply: string; source: 'claude' | 'lokal' }>('/api/chat', { messages, context }, 30000);
