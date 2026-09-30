import { useSyncExternalStore } from "react";
import { type Application, type ApplicationInput, sanitize } from "./domain";

const KEY = "jobtrack.applications.v1";

export type SaveResult = { ok: true; app?: Application } | { ok: false; error: string };

interface State {
  apps: Application[];
  loadError: string | null;
  available: boolean;
}

function storageAvailable(): boolean {
  try {
    const k = "__jobtrack_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

function load(): State {
  const available = storageAvailable();
  if (!available) return { apps: [], available, loadError: "This browser is blocking local storage, so nothing can be saved. Private browsing or strict privacy settings often cause this." };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { apps: [], available, loadError: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("bad shape");
    const apps = parsed.map(sanitize).filter((a): a is Application => !!a);
    return { apps, available, loadError: null };
  } catch {
    return { apps: [], available, loadError: "Saved data in this browser could not be read. It has not been changed or deleted." };
  }
}

let state: State = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist(next: Application[]): SaveResult {
  if (state.loadError && state.available && window.localStorage.getItem(KEY)) {
    return { ok: false, error: "Saving is paused because existing saved data could not be read. Nothing was overwritten." };
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
    return { ok: false, error: quota ? "Browser storage is full. Your change was not saved." : "Your browser refused to save this change. It was not saved." };
  }
  state = { ...state, apps: next };
  emit();
  return { ok: true };
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);

function clean(i: ApplicationInput): ApplicationInput {
  return { ...i, companyName: i.companyName.trim(), positionTitle: i.positionTitle.trim(), jobUrl: i.jobUrl.trim(), interviewLocation: i.interviewLocation.trim(), interviewType: i.interviewType.trim() };
}

export const store = {
  create(input: ApplicationInput): SaveResult {
    const now = new Date().toISOString();
    const app: Application = { ...clean(input), id: uid(), createdAt: now, updatedAt: now };
    const r = persist([app, ...state.apps]);
    return r.ok ? { ok: true, app } : r;
  },
  update(id: string, input: ApplicationInput): SaveResult {
    const existing = state.apps.find((a) => a.id === id);
    if (!existing) return { ok: false, error: "This application no longer exists." };
    const app: Application = { ...existing, ...clean(input), updatedAt: new Date().toISOString() };
    const r = persist(state.apps.map((a) => (a.id === id ? app : a)));
    return r.ok ? { ok: true, app } : r;
  },
  remove(id: string): SaveResult {
    if (!state.apps.some((a) => a.id === id)) return { ok: false, error: "This application no longer exists." };
    return persist(state.apps.filter((a) => a.id !== id));
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) { state = load(); emit(); }
  });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
export function useApplication(id: string | undefined) {
  const s = useStore();
  return s.apps.find((a) => a.id === id);
}
