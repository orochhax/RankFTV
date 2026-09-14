"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

export function useCarouselControls(length: number, intervalMs: number) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const pointerMoved = useRef(false);

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
    if (length <= 1 || paused) return;
    const timer = window.setTimeout(next, intervalMs);
    return () => window.clearTimeout(timer);
  }, [current, intervalMs, length, next, paused]);

  function pauseOnHover() {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setPaused(true);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = event.clientX;
    pointerMoved.current = false;
    setPaused(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    if (start === null || Math.abs(event.clientX - start) < 8) return;
    pointerMoved.current = true;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
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
    pointerMoved.current = false;
    setPaused(false);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLElement>) {
    if (!pointerMoved.current) return;
    pointerMoved.current = false;
    event.preventDefault();
    event.stopPropagation();
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
    pauseOnHover,
    resume: () => setPaused(false),
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
    focusHandlers: { onFocusCapture, onBlurCapture },
  };
}
