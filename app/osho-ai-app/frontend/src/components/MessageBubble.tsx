import { useState } from "react";
import Markdown from "react-markdown";
import {
  Volume2,
  Square,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import type { AppMode, ChatMessage, Language } from "../types";
import SourceCard from "./SourceCard";

interface Props {
  message: ChatMessage;
  language: Language;
  speaking: boolean;
  onListen: (id: string, text: string) => void;
  onStopListen: () => void;
  onRegenerate?: (id: string) => void;
  onFeedback?: (id: string, rating: "up" | "down") => void;
  canRegenerate?: boolean;
  mode?: AppMode;
}

const isDeva = (t: string) => /[ऀ-ॿ]/.test(t);

export default function MessageBubble({
  message,
  speaking,
  onListen,
  onStopListen,
  onRegenerate,
  onFeedback,
  canRegenerate,
  mode = "osho",
}: Props) {
  const [copied, setCopied] = useState(false);
  const isAi = mode === "ai";

  if (message.role === "user") {
    return (
      <div className="flex msg-enter justify-end">
        <div
          lang={isDeva(message.content) ? "hi" : "en"}
          className={`max-w-[85%] rounded-2xl rounded-br-md border border-white/10 bg-white/[0.06] px-4 py-2.5 font-ui text-[15px] leading-relaxed text-parchment shadow-lift backdrop-blur-sm ${
            isDeva(message.content) ? "font-deva" : ""
          }`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant
  const deva = isDeva(message.content);

  function copy() {
    navigator.clipboard?.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const showSources = mode === "osho" && message.sources && message.sources.length > 0;

  return (
    <div className="flex msg-enter flex-col gap-3">
      <div className="flex gap-3">
        <span
          aria-hidden
          className={`mt-0.5 shrink-0 select-none text-xl leading-none ${
            isAi
              ? "font-ui font-bold text-[#6ea8fe] [text-shadow:0_0_16px_rgba(110,168,254,0.5)]"
              : "font-deva text-dawn [text-shadow:0_0_16px_rgba(232,161,76,0.5)]"
          }`}
        >
          {isAi ? "AI" : "॥"}
        </span>
        <div className="min-w-0 flex-1">
          {message.pending ? (
            <div className="flex items-center gap-1.5 py-1.5">
              <span className={`h-1.5 w-1.5 animate-pulseDot rounded-full [animation-delay:0ms] ${isAi ? "bg-[#6ea8fe]" : "bg-dawn"}`} />
              <span className={`h-1.5 w-1.5 animate-pulseDot rounded-full [animation-delay:150ms] ${isAi ? "bg-[#6ea8fe]" : "bg-dawn"}`} />
              <span className={`h-1.5 w-1.5 animate-pulseDot rounded-full [animation-delay:300ms] ${isAi ? "bg-[#6ea8fe]" : "bg-dawn"}`} />
            </div>
          ) : (
            <div
              lang={deva ? "hi" : "en"}
              className="discourse answer-reveal text-[16px] leading-[1.85] text-parchment"
            >
              <Markdown>{message.content}</Markdown>
            </div>
          )}

          {showSources && (
            <div className="mt-5 space-y-1.5">
              <div className="mb-2 flex items-center gap-2.5">
                <p className="font-ui text-[10.5px] font-semibold uppercase tracking-eyebrow text-dawn/70">
                  Drawn from
                </p>
                <span className="h-px flex-1 bg-gradient-to-r from-dawn/25 to-transparent" />
              </div>
              {message.sources!.map((s, i) => (
                <div
                  key={`${s.series}-${s.discourse}-${i}`}
                  className="source-enter"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <SourceCard source={s} index={i + 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!message.pending && (
        <div className="flex items-center gap-1 pl-7 font-ui text-ash">
          <button
            onClick={() =>
              speaking ? onStopListen() : onListen(message.id, message.content)
            }
            title={speaking ? "Stop" : "Listen"}
            aria-label={speaking ? "Stop" : "Listen"}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5 hover:text-dawn btn-micro"
          >
            {speaking ? <Square size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={copy}
            title="Copy"
            aria-label="Copy answer"
            className="rounded-md p-1.5 transition-colors hover:bg-white/5 hover:text-dawn btn-micro"
          >
            {copied ? <Check size={15} className="text-jade" /> : <Copy size={15} />}
          </button>

          {canRegenerate && onRegenerate && (
            <button
              onClick={() => onRegenerate(message.id)}
              title="Ask again"
              aria-label="Regenerate answer"
              className="rounded-md p-1.5 transition-colors hover:bg-white/5 hover:text-dawn btn-micro"
            >
              <RotateCcw size={15} />
            </button>
          )}

          <span className="mx-1 h-3 w-px bg-veil" />

          <button
            onClick={() => onFeedback?.(message.id, "up")}
            title="Helpful"
            aria-label="Mark helpful"
            className={`rounded-md p-1.5 transition-colors hover:bg-white/5 btn-micro ${
              message.feedback === "up" ? "text-jade" : "hover:text-jade"
            }`}
          >
            <ThumbsUp size={15} />
          </button>
          <button
            onClick={() => onFeedback?.(message.id, "down")}
            title="Not helpful"
            aria-label="Mark not helpful"
            className={`rounded-md p-1.5 transition-colors hover:bg-white/5 btn-micro ${
              message.feedback === "down" ? "text-red-400" : "hover:text-red-400"
            }`}
          >
            <ThumbsDown size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
