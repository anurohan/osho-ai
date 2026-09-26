import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Download } from "lucide-react";
import Sidebar from "./components/Sidebar";
import StatusDot from "./components/StatusDot";
import LanguageToggle from "./components/LanguageToggle";
import ModeToggle from "./components/ModeToggle";
import Welcome from "./components/Welcome";
import MessageBubble from "./components/MessageBubble";
import Composer from "./components/Composer";
import DiscoursesPanel from "./components/DiscoursesPanel";
import SettingsPanel from "./components/SettingsPanel";
import { useHealth } from "./hooks/useHealth";
import { useSpeech } from "./hooks/useSpeech";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  sendChat,
  streamChat,
  sendFeedback,
  getDaily,
  type HistoryTurn,
} from "./lib/api";
import { downloadConversation } from "./lib/export";
import type {
  AppMode,
  ChatMessage,
  Conversation,
  DailyVichaar,
  Language,
  Settings,
  Source,
} from "./types";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const DEFAULT_SETTINGS: Settings = {
  language: "en",
  speechRate: 0.95,
  autoSpeak: false,
  mode: "osho",
};

const errorText: Record<Language, string> = {
  en: "The connection to the discourse was lost. Please make sure the server is running and try again.",
  hi: "प्रवचन से संपर्क टूट गया। कृपया सुनिश्चित करें कि सर्वर चल रहा है और पुनः प्रयास करें।",
  hinglish: "Pravachan se sampark toot gaya. Kripya sunishchit karein ki server chal raha hai aur phir se try karein.",
};

export default function App() {
  const { online, status } = useHealth();

  const [conversations, setConversations] = useLocalStorage<Conversation[]>(
    "osho.conversations",
    []
  );
  const [activeId, setActiveId] = useLocalStorage<string | null>(
    "osho.activeId",
    null
  );
  const [settings, setSettings] = useLocalStorage<Settings>(
    "osho.settings",
    DEFAULT_SETTINGS
  );

  const mode: AppMode = settings.mode ?? "osho";
  const speech = useSpeech(settings.speechRate);

  const [daily, setDaily] = useState<DailyVichaar | null>(null);
  useEffect(() => {
    let alive = true;
    getDaily(settings.language).then((d) => {
      if (alive) setDaily(d);
    });
    return () => {
      alive = false;
    };
  }, [settings.language]);

  const [sending, setSending] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [discoursesOpen, setDiscoursesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const messages = active?.messages ?? [];

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const exists = activeId && conversations.some((c) => c.id === activeId);
    if (!exists) {
      setActiveId(conversations.length > 0 ? conversations[0].id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeId, messages.length, sending]);

  const lastLen = messages.length ? messages[messages.length - 1].content.length : 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [lastLen]);

  // Apply mode class to body for background transition
  useEffect(() => {
    document.body.classList.toggle("ai-mode-body", mode === "ai");
  }, [mode]);

  function patchMessage(convId: string, msgId: string, patch: Partial<ChatMessage>) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }
          : c
      )
    );
  }

  async function runChat(
    question: string,
    history: HistoryTurn[],
    convId: string,
    assistantId: string
  ) {
    setSending(true);
    let acc = "";
    let sources: Source[] | undefined;
    let gotDelta = false;

    try {
      await streamChat(question, settings.language, history, {
        onSources: (s) => {
          sources = s;
        },
        onDelta: (text) => {
          gotDelta = true;
          acc += text;
          patchMessage(convId, assistantId, { content: acc, pending: false });
        },
      }, mode);

      if (!gotDelta) throw new Error("empty stream");

      patchMessage(convId, assistantId, {
        content: acc,
        sources,
        pending: false,
        feedback: null,
      });
      if (settings.autoSpeak && acc) {
        speech.speak(assistantId, acc, settings.language);
      }
    } catch {
      try {
        const res = await sendChat(question, settings.language, history, mode);
        patchMessage(convId, assistantId, {
          content: res.answer,
          sources: res.sources,
          pending: false,
          feedback: null,
        });
        if (settings.autoSpeak && res.answer) {
          speech.speak(assistantId, res.answer, settings.language);
        }
      } catch {
        patchMessage(convId, assistantId, {
          content: errorText[settings.language],
          pending: false,
        });
      }
    } finally {
      setSending(false);
    }
  }

  function handleSend(text: string) {
    if (!text.trim() || sending) return;
    speech.stop();

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const pendingMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      content: "",
      pending: true,
    };

    const history: HistoryTurn[] = messages
      .filter((m) => !m.pending && m.content)
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-10);

    let convId = active?.id ?? null;

    if (!convId) {
      convId = newId();
      const conv: Conversation = {
        id: convId,
        title: text.slice(0, 42),
        messages: [userMsg, pendingMsg],
        createdAt: Date.now(),
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(convId);
    } else {
      const id = convId;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                title: c.messages.length === 0 ? text.slice(0, 42) : c.title,
                messages: [...c.messages, userMsg, pendingMsg],
              }
            : c
        )
      );
    }

    runChat(text, history, convId, pendingMsg.id);
  }

  function handleRegenerate(messageId: string) {
    if (!active || sending) return;
    speech.stop();

    const idx = active.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    let userIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (active.messages[i].role === "user") {
        userIdx = i;
        break;
      }
    }
    if (userIdx === -1) return;

    const question = active.messages[userIdx].content;
    const history: HistoryTurn[] = active.messages
      .slice(0, userIdx)
      .filter((m) => !m.pending && m.content)
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-10);

    patchMessage(active.id, messageId, {
      content: "",
      pending: true,
      sources: undefined,
      feedback: null,
    });
    runChat(question, history, active.id, messageId);
  }

  function handleFeedback(messageId: string, rating: "up" | "down") {
    if (!active) return;
    const msg = active.messages.find((m) => m.id === messageId);
    const next = msg?.feedback === rating ? null : rating;
    patchMessage(active.id, messageId, { feedback: next });
    if (next) {
      const idx = active.messages.findIndex((m) => m.id === messageId);
      const question = idx > 0 ? active.messages[idx - 1]?.content : undefined;
      sendFeedback(next, question, msg?.content);
    }
  }

  function handleNew() {
    speech.stop();
    setActiveId(null);
    setMobileOpen(false);
  }

  function handleSelect(id: string) {
    speech.stop();
    setActiveId(id);
    setMobileOpen(false);
  }

  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  }

  function handleClearAll() {
    speech.stop();
    setConversations([]);
    setActiveId(null);
    setSettingsOpen(false);
  }

  function handleModeChange(newMode: AppMode) {
    speech.stop();
    setSettings((s) => ({ ...s, mode: newMode }));
    // Start fresh conversation on mode switch
    setActiveId(null);
  }

  const modelReady = status ? status.ollama_has_model : undefined;
  const showWelcome = messages.length === 0;
  const isAi = mode === "ai";

  return (
    <div className={`flex h-dvh w-full overflow-hidden mode-transition ${isAi ? "ai-mode" : "osho-mode"}`}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onOpenDiscourses={() => {
          setDiscoursesOpen(true);
          setMobileOpen(false);
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setMobileOpen(false);
        }}
        mode={mode}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`relative z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 header-glass ${isAi ? "header-ai" : "header-osho"}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-ash transition-colors hover:bg-white/5 hover:text-parchment md:hidden btn-micro"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              {isAi ? (
                <span className="select-none font-ui text-xl font-bold leading-none text-[#6ea8fe] [text-shadow:0_0_14px_rgba(110,168,254,0.5)]">⚡</span>
              ) : (
                <span className="danda select-none font-display text-xl leading-none text-dawn" />
              )}
              <h1 className={`font-display text-[19px] font-medium tracking-[0.01em] ${isAi ? "text-white" : "text-parchment"}`}>
                {isAi ? (
                  <>AI <span className="text-[#6ea8fe]">Assistant</span></>
                ) : (
                  <>Osho <span className="text-dawn-soft">AI</span></>
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} onChange={handleModeChange} />
            {!showWelcome && active && (
              <button
                onClick={() => downloadConversation(active, settings.language)}
                aria-label="Export conversation"
                title="Export as Markdown"
                className="rounded-lg p-1.5 text-ash transition-colors hover:bg-white/5 hover:text-parchment btn-micro"
              >
                <Download size={18} />
              </button>
            )}
            <StatusDot online={online} modelReady={modelReady} />
            <div className="hidden sm:block">
              <LanguageToggle
                language={settings.language}
                onChange={(l) => setSettings((s) => ({ ...s, language: l }))}
              />
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <Welcome language={settings.language} daily={daily} onPick={handleSend} mode={mode} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-7 px-4 py-7 sm:px-6">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  language={settings.language}
                  speaking={speech.speakingId === m.id}
                  onListen={(id, text) => speech.speak(id, text, settings.language)}
                  onStopListen={speech.stop}
                  onRegenerate={handleRegenerate}
                  onFeedback={handleFeedback}
                  canRegenerate={!sending}
                  mode={mode}
                />
              ))}
            </div>
          )}
        </div>

        <Composer onSend={handleSend} disabled={sending} language={settings.language} mode={mode} />
      </div>

      <DiscoursesPanel open={discoursesOpen} onClose={() => setDiscoursesOpen(false)} />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        status={status}
        online={online}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
