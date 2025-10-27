const API_BASE = import.meta.env.VITE_API_URL;

interface RagQueryOptions {
  query: string;
  session_id: string;
}

interface RagStreamOptions {
  query: string;
  session_id: string;
  onToken: (token: string) => void;
}

export async function ragQuery({ query, session_id }: RagQueryOptions): Promise<any> {
  const res = await fetch(`${API_BASE}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, session_id }),
  });

  if (!res.ok) throw new Error("Backend hatası!");
  return res.json();
}

export async function ragStream({ query, session_id, onToken }: RagStreamOptions): Promise<void> {
  const res = await fetch(`${API_BASE}/rag/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, session_id }),
  });

  if (!res.body) throw new Error("Stream desteklenmiyor!");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let lines = buffer.split("\n");
    buffer = lines.pop() || ""; // incomplete line sakla

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const content = line.replace("data:", "").trim();

      if (content === "[DONE]") return;
      if (content.startsWith("[ERROR]")) {
        console.error(content);
        return; // Stop on error
      }

      onToken(content);
    }
  }
}
