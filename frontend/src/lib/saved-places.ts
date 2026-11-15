"use client";

import { useSyncExternalStore } from "react";

/**
 * Lugares guardados por la persona (casa, chacra, familia…).
 * Viven SOLO en este navegador (localStorage): no se envían a ningún servidor.
 */
export type SavedPlace = { id: string; name: string; lat: number; lon: number };

const KEY = "yakana-places";
export const MAX_PLACES = 8;

const listeners = new Set<() => void>();
let cache: SavedPlace[] | null = null;
let raw: string | null = null;
const EMPTY: SavedPlace[] = [];

const read = (): SavedPlace[] => {
  try {
    const text = localStorage.getItem(KEY);
    if (text === raw && cache) return cache;
    raw = text;
    const parsed = text ? (JSON.parse(text) as SavedPlace[]) : EMPTY;
    cache = Array.isArray(parsed)
      ? parsed
          .filter(
            (p) => p && typeof p.lat === "number" && typeof p.lon === "number",
          )
          .slice(0, MAX_PLACES)
      : EMPTY;
    return cache;
  } catch {
    return EMPTY;
  }
};

const write = (list: SavedPlace[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  listeners.forEach((f) => f());
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    removeEventListener("storage", cb);
  };
};

export const addPlace = (p: Omit<SavedPlace, "id">) => {
  const list = read();
  if (list.length >= MAX_PLACES) return false;
  write([
    ...list,
    {
      ...p,
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    },
  ]);
  return true;
};

export const removePlace = (id: string) =>
  write(read().filter((p) => p.id !== id));

export const renamePlace = (id: string, name: string) =>
  write(read().map((p) => (p.id === id ? { ...p, name } : p)));

/** Lista de lugares guardados (vacía en el servidor, sin desajustes de hidratación). */
export const useSavedPlaces = () =>
  useSyncExternalStore(subscribe, read, () => EMPTY);
