export async function askRag(query) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error("API error!");

  return res.json();
}
