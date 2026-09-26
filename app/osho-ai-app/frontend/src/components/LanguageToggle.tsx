import type { Language } from "../types";

interface Props {
  language: Language;
  onChange: (l: Language) => void;
}

const languages: { id: Language; label: string; className?: string }[] = [
  { id: "en", label: "EN" },
  { id: "hi", label: "हिं", className: "font-deva" },
  { id: "hinglish", label: "Hinglish" },
];

export default function LanguageToggle({ language, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Answer language"
      className="flex rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5 font-ui text-xs backdrop-blur-sm"
    >
      {languages.map((item) => {
        const active = language === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`rounded-full px-2.5 py-1 font-medium transition-all duration-200 ${
              item.className ?? ""
            } ${
              active
                ? "bg-dawn/20 text-dawn-soft shadow-[inset_0_0_0_1px_rgba(232,161,76,0.28)]"
                : "text-ash hover:text-parchment"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
