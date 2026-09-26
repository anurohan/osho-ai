import type { Conversation, Language } from "../types";

// Localised labels for the exported file's header and role markers.
const LABELS: Record<Language, { seeker: string; osho: string; sources: string; on: string }> = {
  en: { seeker: "Seeker", osho: "Osho AI", sources: "Sources", on: "on" },
  hi: { seeker: "जिज्ञासु", osho: "ओशो AI", sources: "स्रोत", on: "—" },
  hinglish: { seeker: "Jigyasu", osho: "Osho AI", sources: "Sources", on: "—" },
};

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "conversation";
}

/** Build a clean Markdown transcript of a conversation. */
export function conversationToMarkdown(conv: Conversation, language: Language): string {
  const t = LABELS[language] ?? LABELS.en;
  const date = new Date(conv.createdAt || Date.now());
  const dateStr = date.toLocaleString();

  const lines: string[] = [];
  lines.push(`# ${conv.title || t.osho}`);
  lines.push("");
  lines.push(`*Osho AI ${t.on} ${dateStr}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const m of conv.messages) {
    if (m.pending || !m.content) continue;

    if (m.role === "user") {
      lines.push(`**${t.seeker}:**`);
      lines.push("");
      lines.push(m.content.trim());
      lines.push("");
    } else {
      lines.push(`**${t.osho}:**`);
      lines.push("");
      lines.push(m.content.trim());
      lines.push("");

      if (m.sources && m.sources.length > 0) {
        lines.push(`_${t.sources}:_`);
        for (const s of m.sources) {
          const label = [s.series, s.discourse].filter(Boolean).join(" · ");
          lines.push(`> ${label}`);
          if (s.passage) {
            const snippet = s.passage.trim().replace(/\s+/g, " ").slice(0, 240);
            lines.push(`> ${snippet}${s.passage.length > 240 ? "…" : ""}`);
          }
          lines.push("");
        }
      }
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** Trigger a browser download of the conversation as a .md file. */
export function downloadConversation(conv: Conversation, language: Language): void {
  const md = conversationToMarkdown(conv, language);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `osho-${slugify(conv.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Release the object URL on the next tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
