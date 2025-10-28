import { listSessions, deleteSession, getSessionMeta, createSession as createNewDefaultSession } from './storage';

const ACTIVE_SESSION_KEY = "rag_session_id";

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch (e) {
    // fallback basit rastgele id
    return `id-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function getSessionId(): string {
  let id = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!id) {
    const newSession = createNewDefaultSession(); // Varsayılan olarak kalıcı bir oturum oluştur
    id = newSession.id;
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  }
  return id;
}

export function setActiveSessionId(id: string): void {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function resetSession(): void {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function generateSessionId(): string {
  return generateId();
}

export function cleanupTemporarySessionOnLoad(): void {
  const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (activeId) {
    const sessionMeta = getSessionMeta(activeId);
    if (sessionMeta && sessionMeta.isTemporary) {
      deleteSession(activeId); // Geçici oturumu sil
      resetSession(); // Aktif oturum ID'sini temizle
      // Yeni bir varsayılan oturum oluştur ve onu aktif yap
      const newDefaultSession = createNewDefaultSession();
      setActiveSessionId(newDefaultSession.id);
    }
  }
}
