import { useEffect, useState } from "react";
import { checkHealth, getStatus } from "../lib/api";
import type { Status } from "../types";

/** Polls backend health + status every 15s. */
export function useHealth() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const ok = await checkHealth();
      if (cancelled) return;
      setOnline(ok);
      if (ok) {
        const s = await getStatus();
        if (!cancelled) setStatus(s);
      } else {
        setStatus(null);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { online, status };
}
