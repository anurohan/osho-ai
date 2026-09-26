import { X, Settings as SettingsIcon } from "lucide-react";
import type { Language, Settings, Status } from "../types";
import LanguageToggle from "./LanguageToggle";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  status: Status | null;
  online: boolean | null;
  onClearAll: () => void;
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 font-ui text-sm">
      <span className="text-ash">{label}</span>
      <span className="flex items-center gap-2 text-parchment/90">
        {detail && <span className="text-xs text-ash">{detail}</span>}
        <span
          className={`h-2 w-2 rounded-full ${
            ok ? "bg-jade shadow-[0_0_6px_rgba(111,174,147,0.6)]" : "bg-red-400"
          }`}
        />
      </span>
    </div>
  );
}

export default function SettingsPanel({
  open,
  onClose,
  settings,
  onChange,
  status,
  online,
  onClearAll,
}: Props) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-night/70 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.06] frost transition-transform duration-300 ease-dawn ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-dawn/25 bg-dawn-veil text-dawn">
              <SettingsIcon size={16} />
            </span>
            <h2 className="font-display text-lg font-medium text-parchment">Settings</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ash transition-colors hover:bg-white/5 hover:text-parchment"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {/* Language */}
          <section>
            <h3 className="mb-2.5 font-ui text-[10.5px] font-semibold uppercase tracking-eyebrow text-dawn/70">
              Answer language
            </h3>
            <LanguageToggle
              language={settings.language}
              onChange={(l: Language) => onChange({ language: l })}
            />
          </section>

          {/* Speech */}
          <section>
            <h3 className="mb-3 font-ui text-[10.5px] font-semibold uppercase tracking-eyebrow text-dawn/70">
              Reading voice
            </h3>
            <div className="flex items-center justify-between font-ui text-sm">
              <span className="text-parchment/90">Speak answers automatically</span>
              <button
                role="switch"
                aria-checked={settings.autoSpeak}
                onClick={() => onChange({ autoSpeak: !settings.autoSpeak })}
                className={`relative h-6 w-11 rounded-full transition-all duration-300 ${
                  settings.autoSpeak ? "bg-dawn-grad shadow-glow" : "bg-veil"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-parchment shadow-sm transition-transform duration-300 ease-dawn ${
                    settings.autoSpeak ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between font-ui text-sm">
                <span className="text-parchment/90">Speaking pace</span>
                <span className="tabular-nums text-xs text-ash">
                  {settings.speechRate.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.2}
                step={0.05}
                value={settings.speechRate}
                onChange={(e) => onChange({ speechRate: parseFloat(e.target.value) })}
                className="w-full accent-dawn"
              />
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="mb-2 font-ui text-[10.5px] font-semibold uppercase tracking-eyebrow text-dawn/70">
              System
            </h3>
            <StatusRow label="Server" ok={online === true} />
            <StatusRow
              label="Knowledge index"
              ok={!!status?.rag_loaded}
              detail={status?.vectors ? `${status.vectors} passages` : undefined}
            />
            <StatusRow
              label="Ollama"
              ok={!!status?.ollama_reachable}
            />
            <StatusRow
              label="Language model"
              ok={!!status?.ollama_has_model}
              detail={status?.llama_model || undefined}
            />
          </section>

          {/* Danger */}
          <section className="border-t border-white/[0.06] pt-5">
            <button
              onClick={onClearAll}
              className="w-full rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-2.5 font-ui text-sm text-red-300 transition-colors hover:border-red-400/50 hover:bg-red-400/15"
            >
              Clear all conversations
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}
