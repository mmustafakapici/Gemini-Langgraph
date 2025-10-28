// Basit localStorage tabanlı session ve mesaj yönetimi
import { generateSessionId } from './session';

export interface SessionMeta {
  id: string;
  title?: string;
  lastMessage?: string;
  updatedAt: number;
  unread?: number;
}

const SESSIONS_KEY = 'chat_sessions';

function safeParse<T>(input: string | null, fallback: T): T {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch (e) {
    console.error('storage parse error', e);
    return fallback;
  }
}

export function listSessions(): SessionMeta[] {
  return safeParse<SessionMeta[]>(localStorage.getItem(SESSIONS_KEY), []);
}

export function saveSessions(sessions: SessionMeta[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function createSession(title?: string): SessionMeta {
  const id = generateSessionId();
  const meta: SessionMeta = { id, title: title || 'Yeni Sohbet', updatedAt: Date.now(), unread: 0 };
  const sessions = listSessions();
  sessions.unshift(meta);
  saveSessions(sessions);
  // initialize empty messages
  localStorage.setItem(`chat_messages:${id}`, JSON.stringify([]));
  return meta;
}

export function updateSession(meta: Partial<SessionMeta> & { id: string }) {
  const sessions = listSessions();
  const idx = sessions.findIndex((s) => s.id === meta.id);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], ...meta, updatedAt: Date.now() };
  // move to front
  const item = sessions.splice(idx, 1)[0];
  sessions.unshift(item);
  saveSessions(sessions);
}

export function deleteSession(id: string) {
  const sessions = listSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
  localStorage.removeItem(`chat_messages:${id}`);
}

export function loadMessages(sessionId: string) {
  return safeParse<any[]>(localStorage.getItem(`chat_messages:${sessionId}`), []);
}

export function saveMessage(sessionId: string, message: any) {
  const msgs = loadMessages(sessionId);
  msgs.push(message);
  localStorage.setItem(`chat_messages:${sessionId}`, JSON.stringify(msgs));
  // update session meta
  const sessions = listSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx].lastMessage = message.text ?? '';
    sessions[idx].updatedAt = Date.now();
    sessions[idx].unread = (sessions[idx].unread || 0) + (message.sender === 'ai' ? 1 : 0);
    saveSessions(sessions);
  }
}

export function clearMessages(sessionId: string) {
  localStorage.setItem(`chat_messages:${sessionId}`, JSON.stringify([]));
}
