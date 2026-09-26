import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import type { AppMode, Language } from "../types";
import { useSpeechInput } from "../hooks/useSpeechInput";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  language: Language;
  mode?: AppMode;
}

const placeholders: Record<Language, string> = {
  en: "Ask what stirs within you…",
  hi: "जो भीतर उठ रहा है, वह पूछें…",
  hinglish: "Jo bhitar uth raha hai, wo poochho…",
};

export default function Composer({ onSend, disabled, language, mode = "osho" }: Props) {
  const [text, setText] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const { supported: micSupported, listening, start, stop } = useSpeechInput(
    (transcript) => {
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      requestAnimationFrame(() => areaRef.current?.focus());
    }
  );

  // Auto-grow the textarea.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const deva = /[ऀ-ॿ]/.test(text);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-2">
      <div
        className={`flex items-end gap-2 rounded-2xl glass px-3 py-2 transition-all duration-300 ease-dawn ${
          listening
            ? "border-dawn/60 shadow-glow"
            : "focus-within:border-dawn/50 focus-within:shadow-glow"
        }`}
      >
        {micSupported && (
          <button
            onClick={() => (listening ? stop() : start(language))}
            title={listening ? "Stop listening" : "Speak"}
            aria-label={listening ? "Stop listening" : "Speak your question"}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
              listening
                ? "animate-listening bg-dawn/20 text-dawn-soft"
                : "text-ash hover:bg-white/5 hover:text-dawn"
            }`}
          >
            {listening ? <Square size={16} /> : <Mic size={17} />}
          </button>
        )}

        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? "Listening…" : placeholders[language]}
          lang={deva ? "hi" : "en"}
          className={`max-h-[200px] flex-1 resize-none bg-transparent py-1.5 font-ui text-[15px] leading-relaxed text-parchment placeholder:text-ash/60 focus:outline-none ${
            deva ? "font-deva" : ""
          }`}
        />

        <button
          onClick={submit}
          disabled={!text.trim() || disabled}
          title="Send"
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-dawn-grad text-night shadow-glow transition-all duration-300 ease-dawn hover:scale-105 hover:brightness-110 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-none disabled:bg-veil disabled:text-ash disabled:shadow-none"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </div>
      <p className="mt-2.5 text-center font-ui text-[11px] text-ash/55">
        {mode === "osho"
          ? "Grounded in Osho's discourses · reflections may be imperfect"
          : "AI Assistant · powered by local LLM"}
      </p>
    </div>
  );
}
