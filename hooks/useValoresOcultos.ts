"use client";

import { useSyncExternalStore, useCallback } from "react";

const EVENT_NAME = "rankftv:toggle-valores-ocultos";
const STORAGE_KEY = "rankftv:valores-ocultos";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

export function useValoresOcultos(_defaultOculto = true) {
  const oculto = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    try {
      const current = getSnapshot();
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { oculto: next } }));
    } catch {
      // Ignora erro de acesso a localStorage
    }
  }, []);

  return { oculto, toggle };
}
