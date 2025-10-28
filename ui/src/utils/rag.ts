const API_BASE = import.meta.env.VITE_API_URL;

function nowTs() {
  const d = new Date();
  return d.toLocaleTimeString();
}

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

  // STREAM başladı
  console.info(`${nowTs()} - STREAM başladı: bağlanıldı ${API_BASE}/rag/stream status=${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let firstChunkReceived = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    try {
      // alınan ham chunk boyutu
      console.debug(`${nowTs()} - alınan chunk bytes=${value ? value.length : 0}`);
    } catch {}

    buffer += decoder.decode(value, { stream: true });

    let lines = buffer.split("\n");
    buffer = lines.pop() || ""; // incomplete line sakla

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const content = line.replace("data:", "").trim();

  // alınan event'in içeriği (kısa önizleme)
  console.debug(`${nowTs()} - alınan chunk içerik uzunluğu=${content.length} önizleme=${JSON.stringify(content.slice(0,120))}`);

      // Özel başlangıç event'ini algıla ve hemen logla
      if (content === "[STREAM_STARTED]") {
        console.info(`${nowTs()} - STREAM olay bildirimi: sunucu stream başlattı (server-side)`);
        firstChunkReceived = true;
        continue;
      }

      if (content === "[DONE]") return;
      if (content.startsWith("[ERROR]")) {
        console.error(`[ragStream] ERROR event: ${content}`);
        return; // Stop on error
      }

      // Emit content in small chunks so UI can render progressively even if server
      // sent a large single chunk. This makes the client-side rendering fluid
      // regardless of backend chunking behavior.
  const MIN_CHUNK_FOR_SLICE = 40; // if content longer than this, slice it
  const SLICE_SIZE = 6; // characters per slice
  const SLICE_DELAY_MS = 15; // ms between slices

  if (content.length > MIN_CHUNK_FOR_SLICE) {
  console.debug(`${nowTs()} - büyük chunk tespit edildi; dilimleme başlıyor len=${content.length} sliceSize=${SLICE_SIZE}`);
        // emit slices asynchronously to yield to the UI thread
        for (let i = 0; i < content.length; i += SLICE_SIZE) {
          const slice = content.slice(i, i + SLICE_SIZE);
          // small token emitted
          try { console.debug(`${nowTs()} - emit edilen dilim idx=${i}/${content.length} len=${slice.length} önizleme=${JSON.stringify(slice)}`); } catch {}
          if (!firstChunkReceived) {
            console.info(`${nowTs()} - İlk içerik parçası alındı — client artık anlık tokenları işlemeye başladı`);
            firstChunkReceived = true;
          }
          onToken(slice);
          // small pause to allow render; use micro-delay
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, SLICE_DELAY_MS));
        }
      } else {
        try { console.debug(`emit edilen token len=${content.length} önizleme=${JSON.stringify(content)}`); } catch {}
        try { console.debug(`${nowTs()} - emit edilen token len=${content.length} önizleme=${JSON.stringify(content)}`); } catch {}
        if (!firstChunkReceived) {
          console.info(`${nowTs()} - İlk içerik parçası alındı — client artık anlık tokenları işlemeye başladı`);
          firstChunkReceived = true;
        }
        onToken(content);
      }
    }
  }
}
