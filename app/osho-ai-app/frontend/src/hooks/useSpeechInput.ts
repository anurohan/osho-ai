import { useEffect, useRef, useState } from "react";
import type { Language } from "../types";

/* The Web Speech API (SpeechRecognition) is not in the standard TS DOM lib
   and is vendor-prefixed in Chrome, so we access it defensively. */
type AnyRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => AnyRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const supported = getRecognitionCtor() !== null;

/** Voice input via the browser's SpeechRecognition, matched to the language. */
export function useSpeechInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<AnyRecognition | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  function start(language: Language) {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    // Stop any existing session first.
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = language === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) finalRef.current(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  return { supported, listening, start, stop };
}
