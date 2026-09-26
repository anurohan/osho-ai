import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persist a piece of state to localStorage. Safe if storage is unavailable
 * (private mode, etc.) — it simply behaves like normal React state.
 *
 * Writes are debounced so high-frequency updates (e.g. an answer streaming in
 * token-by-token) don't stringify and persist the whole store on every change.
 * The latest value always wins, and it's flushed on unmount / tab close so
 * nothing is lost.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  // Always keep a ref to the newest value so flushes write the latest.
  const valueRef = useRef(value);
  valueRef.current = value;

  const write = useCallback(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(valueRef.current));
    } catch {
      // storage full / unavailable — ignore
    }
  }, [key]);

  // Debounced persist: coalesce bursts of updates into a single write.
  useEffect(() => {
    const timer = setTimeout(write, 350);
    return () => clearTimeout(timer);
  }, [value, write]);

  // Flush the latest value on tab close and on unmount.
  useEffect(() => {
    window.addEventListener("beforeunload", write);
    return () => {
      window.removeEventListener("beforeunload", write);
      write();
    };
  }, [write]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
