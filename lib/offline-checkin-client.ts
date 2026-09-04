"use client";

import { enqueuePendingCheckin, parsePendingCheckins, type PendingCheckin } from "@/lib/offline-checkin";

const KEY = "rankftv:pending-checkins";

export function getPendingCheckins() {
  return parsePendingCheckins(window.sessionStorage.getItem(KEY));
}

export function queuePendingCheckin(item: PendingCheckin) {
  const next = enqueuePendingCheckin(getPendingCheckins(), item);
  window.sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removePendingCheckin(item: PendingCheckin) {
  const next = getPendingCheckins().filter((current) => !(current.championshipId === item.championshipId && current.token === item.token));
  window.sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
