"use client";
import { useCallback, useSyncExternalStore } from "react";

// Tiny localStorage-backed store so the static demo keeps what you do and
// HR/Admin/Employee previews see the same data. Replace with API calls later.
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; val: unknown }>();

function read<T>(key: string, seed: T): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { /* storage blocked */ }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.val as T;
  let val: T = seed;
  if (raw) { try { val = JSON.parse(raw) as T; } catch { /* keep seed */ } }
  cache.set(key, { raw, val });
  return val;
}

export function usePersisted<T>(key: string, seed: T) {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(key, seed), () => seed);
  const set = useCallback((next: (prev: T) => T) => {
    try { localStorage.setItem(key, JSON.stringify(next(read(key, seed)))); } catch { /* quota */ }
    listeners.forEach((l) => l());
  }, [key, seed]);
  return [value, set] as const;
}
