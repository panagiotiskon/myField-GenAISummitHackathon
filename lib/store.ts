"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Analysis } from "./assess";
import type { Lang } from "./types";

// Tiny browser store. Flags, language and the last analysis per plot survive
// moving between the two screens and a page refresh. Nothing leaves the browser.

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return (cache.get(key)?.value as T | undefined) ?? fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = fallback;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private window: keep it in memory for this page only
    cache.set(key, { raw: null, value });
  }
  for (const listener of listeners) listener();
}

function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: T) => write(key, next), [key]);
  return [value, set];
}

const NO_FLAGS: Record<string, string> = {};
const NO_ANALYSES: Record<string, Analysis> = {};

/** parcel id -> ISO time it was flagged */
export function useFlags() {
  const [flags, setFlags] = useStored<Record<string, string>>("plotcheck.flags", NO_FLAGS);
  const toggle = useCallback(
    (id: string) => {
      const next = { ...flags };
      if (next[id]) delete next[id];
      else next[id] = new Date().toISOString();
      setFlags(next);
    },
    [flags, setFlags],
  );
  return { flags, toggle };
}

export function useAnalyses() {
  const [analyses, setAnalyses] = useStored<Record<string, Analysis>>(
    "plotcheck.analyses",
    NO_ANALYSES,
  );
  const save = useCallback(
    (entry: Analysis) => setAnalyses({ ...analyses, [entry.parcelId]: entry }),
    [analyses, setAnalyses],
  );
  return { analyses, save };
}

export function useLang(): [Lang, (lang: Lang) => void] {
  return useStored<Lang>("plotcheck.lang", "el");
}
