import type { Language, AppMode, Source, Library, Status, DailyVichaar } from "../types";

const BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || "/api";

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getStatus(): Promise<Status | null> {
  try {
    const res = await fetch(`${BASE}/status`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getLibrary(): Promise<Library | null> {
  try {
    const res = await fetch(`${BASE}/library`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getDaily(language: Language): Promise<DailyVichaar | null> {
  try {
    const res = await fetch(`${BASE}/daily?language=${encodeURIComponent(language)}`);
    if (!res.ok) return null;
    const data: DailyVichaar = await res.json();
    return data.passage ? data : null;
  } catch {
    return null;
  }
}

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export async function sendChat(
  message: string,
  language: Language,
  history: HistoryTurn[] = [],
  mode: AppMode = "osho"
): Promise<{ answer: string; sources: Source[] }> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, language, history, mode }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export interface StreamHandlers {
  onSources?: (sources: Source[]) => void;
  onDelta?: (text: string) => void;
  onDone?: () => void;
}

/**
 * Stream a chat answer token-by-token from /chat/stream (Server-Sent Events).
 * Throws if the stream can't be established or read — callers should fall back
 * to sendChat() in that case. Resolves once the stream ends.
 */
export async function streamChat(
  message: string,
  language: Language,
  history: HistoryTurn[],
  handlers: StreamHandlers,
  mode: AppMode = "osho"
): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, language, history, mode }),
  });

  if (!res.ok || !res.body) throw new Error("Stream request failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (raw: string) => {
    // An SSE event may span multiple `data:` lines; join their payloads.
    const payload = raw
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("");
    if (!payload) return;

    let ev: { type?: string; text?: string; sources?: Source[] };
    try {
      ev = JSON.parse(payload);
    } catch {
      return;
    }

    if (ev.type === "sources") handlers.onSources?.(ev.sources ?? []);
    else if (ev.type === "delta") handlers.onDelta?.(ev.text ?? "");
    else if (ev.type === "done") handlers.onDone?.();
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (chunk.trim()) handleEvent(chunk);
    }
  }

  // Flush any trailing event without a final blank line.
  if (buffer.trim()) handleEvent(buffer);
}

export async function sendFeedback(
  rating: "up" | "down",
  question?: string,
  answer?: string
): Promise<void> {
  try {
    await fetch(`${BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, question, answer }),
    });
  } catch {
    // Feedback is best-effort; ignore network errors.
  }
}
