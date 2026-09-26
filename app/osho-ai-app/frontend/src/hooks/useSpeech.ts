import { useEffect, useRef, useState } from "react";
import type { Language } from "../types";

const supported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/** Text-to-speech for reading answers aloud, in the chosen language. */
export function useSpeech(rate = 0.95) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => window.speechSynthesis.cancel();
  }, []);

  function pickVoice(language: Language) {
    const voices = voicesRef.current;
    if (language === "hi") {
      return (
        voices.find((v) => v.lang.toLowerCase().startsWith("hi")) ??
        voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
        voices[0]
      );
    }
    return (
      voices.find((v) => v.lang.toLowerCase() === "en-in") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
      voices[0]
    );
  }

  function speak(id: string, text: string, language: Language) {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(language);
    if (voice) utter.voice = voice;
    utter.lang = language === "hi" ? "hi-IN" : "en-IN";
    utter.rate = rate;
    utter.pitch = 1;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utter);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }

  return { supported, speakingId, speak, stop };
}
