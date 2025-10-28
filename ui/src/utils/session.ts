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
    id = generateId();
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
