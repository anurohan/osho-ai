import type { AppMode } from "../types";

interface Props {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeToggle({ mode, onChange }: Props) {
  const isOsho = mode === "osho";

  return (
    <div className="mode-toggle-wrapper">
      <button
        onClick={() => onChange(isOsho ? "ai" : "osho")}
        className={`mode-toggle-track ${isOsho ? "mode-osho" : "mode-ai"}`}
        aria-label={`Switch to ${isOsho ? "AI" : "OSHO"} mode`}
        title={`Currently: ${isOsho ? "OSHO" : "AI"} MODE`}
      >
        <span className={`mode-toggle-label mode-label-left ${isOsho ? "active" : ""}`}>
          OSHO
        </span>
        <span className={`mode-toggle-label mode-label-right ${!isOsho ? "active" : ""}`}>
          AI
        </span>
        <span className={`mode-toggle-thumb ${isOsho ? "thumb-left" : "thumb-right"}`} />
        {/* Glow effect */}
        <span className={`mode-toggle-glow ${isOsho ? "glow-osho" : "glow-ai"}`} />
      </button>
    </div>
  );
}
