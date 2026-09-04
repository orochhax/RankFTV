"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent } from "react";

export function useCarouselControls(length: number, intervalMs: number) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStart = useRef<number | null>(null);

  const previous = useCallback(() => setCurrent((value) => (value - 1 + length) % length), [length]);
  const next = useCallback(() => setCurrent((value) => (value + 1) % length), [length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (length <= 1 || paused || reducedMotion) return;
    const timer = window.setInterval(next, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, length, next, paused, reducedMotion]);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    pointerStart.current = event.clientX;
    setPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (start !== null) {
      const delta = event.clientX - start;
      if (delta > 45) previous();
      if (delta < -45) next();
    }
    setPaused(false);
  }

  function onPointerCancel() {
    pointerStart.current = null;
    setPaused(false);
  }

  function onFocusCapture(event: ReactFocusEvent<HTMLElement>) {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches(":focus-visible")) setPaused(true);
  }

  function onBlurCapture(event: ReactFocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
  }

  return {
    current,
    goTo: setCurrent,
    previous,
    next,
    reducedMotion,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    pointerHandlers: { onPointerDown, onPointerUp, onPointerCancel },
    focusHandlers: { onFocusCapture, onBlurCapture },
  };
}
