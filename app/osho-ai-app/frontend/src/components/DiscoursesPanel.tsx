import { useEffect, useState } from "react";
import { X, BookOpen, Loader2 } from "lucide-react";
import type { Library } from "../types";
import { getLibrary } from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DiscoursesPanel({ open, onClose }: Props) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || library) return;
    setLoading(true);
    setError(false);
    getLibrary()
      .then((lib) => {
        if (lib) setLibrary(lib);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, library]);

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
              <BookOpen size={16} />
            </span>
            <h2 className="font-display text-lg font-medium text-parchment">Discourses</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ash transition-colors hover:bg-white/5 hover:text-parchment"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 py-8 font-ui text-sm text-ash">
              <Loader2 size={16} className="animate-spin text-dawn" />
              Gathering the library…
            </div>
          )}

          {error && (
            <p className="py-8 font-ui text-sm text-ash">
              The library couldn't be reached. Make sure the server is running.
            </p>
          )}

          {library && (
            <>
              <p className="mb-5 font-ui text-xs text-ash">
                {library.total_series} series · {library.total_chunks} passages indexed
              </p>
              <div className="space-y-6">
                {library.series.map((s) => (
                  <div key={s.name}>
                    <h3 className="font-display text-base font-medium text-dawn-soft">
                      {s.name}
                    </h3>
                    <p className="mb-2.5 font-ui text-[10.5px] font-semibold uppercase tracking-eyebrow text-ash">
                      {s.discourse_count} discourses · {s.chunks} passages
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.discourses.map((d) => (
                        <span
                          key={d}
                          className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 font-ui text-xs text-parchment/80 transition-colors hover:border-dawn/30 hover:text-parchment"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
