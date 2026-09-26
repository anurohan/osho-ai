import { Plus, MessageSquare, Trash2, BookOpen, Settings, X } from "lucide-react";
import type { AppMode, Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenDiscourses: () => void;
  onOpenSettings: () => void;
  mode?: AppMode;
}

export default function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onOpenDiscourses,
  onOpenSettings,
  mode = "osho",
}: Props) {
  const isAi = mode === "ai";
  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-night/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r transition-transform duration-300 ease-dawn md:static md:z-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${isAi ? "sidebar-ai" : "sidebar-osho"}`}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`select-none text-lg leading-none ${
                isAi
                  ? "font-ui font-bold text-[#6ea8fe] [text-shadow:0_0_14px_rgba(110,168,254,0.5)]"
                  : "font-deva text-dawn [text-shadow:0_0_14px_rgba(232,161,76,0.5)]"
              }`}
            >
              {isAi ? "⚡" : "॥"}
            </span>
            <span className={`font-display text-lg font-medium ${isAi ? "text-white" : "text-parchment"}`}>
              {isAi ? "AI" : "Osho"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ash transition-colors hover:bg-white/5 hover:text-parchment md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={onNew}
            className={`group flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 font-ui text-sm font-medium transition-all duration-300 ease-dawn ${
              isAi
                ? "border-[#6ea8fe]/25 bg-[#6ea8fe]/10 text-[#9ec5fe] hover:border-[#6ea8fe]/45 hover:shadow-[0_0_24px_-6px_rgba(110,168,254,0.55)]"
                : "border-dawn/25 bg-dawn-veil text-dawn-soft hover:border-dawn/45 hover:shadow-glow"
            }`}
          >
            <Plus
              size={16}
              className="transition-transform duration-300 ease-dawn group-hover:rotate-90"
            />
            New conversation
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 font-ui text-xs text-ash/70">
              No conversations yet.
            </p>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center gap-2 rounded-lg px-2.5 py-2 font-ui text-sm transition-colors ${
                    active
                      ? "bg-white/[0.06] text-parchment"
                      : "text-ash hover:bg-white/[0.035] hover:text-parchment"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-dawn shadow-glow" />
                  )}
                  <button
                    onClick={() => onSelect(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <MessageSquare
                      size={14}
                      className={`shrink-0 ${active ? "text-dawn/80" : "opacity-70"}`}
                    />
                    <span className="truncate">{c.title || "Untitled"}</span>
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    aria-label="Delete conversation"
                    className="shrink-0 rounded p-1 text-ash opacity-60 transition-opacity hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-white/[0.06] px-2 py-3">
          <button
            onClick={onOpenDiscourses}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm text-ash transition-colors hover:bg-white/5 hover:text-parchment"
          >
            <BookOpen size={15} className="text-ash transition-colors group-hover:text-dawn" />
            Discourses
          </button>
          <button
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm text-ash transition-colors hover:bg-white/5 hover:text-parchment"
          >
            <Settings size={15} />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
