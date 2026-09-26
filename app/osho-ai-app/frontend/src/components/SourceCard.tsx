import { useState } from "react";
import { ChevronDown, Volume2, Square } from "lucide-react";
import type { Source } from "../types";

const isDeva = (t: string) => /[ऀ-ॿ]/.test(t);

export default function SourceCard({ source, index }: { source: Source; index: number }) {
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  function listen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(source.passage);
    u.lang = isDeva(source.passage) ? "hi-IN" : "en-IN";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  const pct =
    typeof source.score === "number" && source.score > 0
      ? `${Math.round(source.score * 100)}%`
      : null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025] font-ui text-xs backdrop-blur-sm transition-all duration-300 ease-dawn hover:border-dawn/30 hover:bg-white/[0.05]">
      <div className="flex items-center">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-dawn/40 bg-dawn-veil font-display text-[10px] text-dawn">
            {index}
          </span>
          <span className="min-w-0 truncate font-medium text-dawn-soft">
            {source.series} <span className="text-ash">·</span> Discourse {source.discourse}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 text-ash">
            {pct && <span className="tabular-nums">{pct}</span>}
            <ChevronDown
              size={13}
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        <button
          onClick={listen}
          title={speaking ? "Stop" : "Listen to this passage"}
          aria-label={speaking ? "Stop" : "Listen to this passage"}
          className="mr-2 shrink-0 rounded-md p-1.5 text-ash transition-colors hover:bg-white/5 hover:text-dawn"
        >
          {speaking ? <Square size={13} /> : <Volume2 size={13} />}
        </button>
      </div>

      {open && (
        <p
          lang={isDeva(source.passage) ? "hi" : "en"}
          className="discourse border-t border-white/[0.06] px-3 py-3 text-[13px] text-parchment/70"
        >
          {source.passage}
        </p>
      )}
    </div>
  );
}
