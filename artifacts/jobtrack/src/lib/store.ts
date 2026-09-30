import { useEffect, useState, useSyncExternalStore } from "react";
import { type Application, type ApplicationInput } from "./domain";

const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/applications`;
const STALE_MS = 30_000;
const LEGACY_KEY = "jobtrack.applications.v1";

export type SaveResult = { ok: true; app?: Application } | { ok: false; error: string };
interface State {
  apps: Application[];
  loading: boolean;
  loadError: string | null;
  loaded: boolean;
}
let state: State = { apps: [], loading: true, loaded: false, loadError: null };
let loadedAt = 0;
let version = 0;
let pendingLoad: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setState = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new Error("Could not reach the database. Check your connection and try again.");
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { error?: string; message?: string };
      detail = body.error || body.message || "";
    } catch { /* response did not contain JSON */ }
    throw new Error(response.status === 404
      ? path ? "This application no longer exists." : "The applications service is unavailable (404). Please try again later."
      : detail || `Request failed (${response.status}). Please try again.`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }

function refresh(force = false): Promise<void> {
  if (pendingLoad) return pendingLoad;
  if (!force && state.loaded && Date.now() - loadedAt < STALE_MS) return Promise.resolve();
  const atStart = version;
  setState({ loading: true, loadError: null });
  pendingLoad = request<Application[]>("")
    .then((apps) => {
      if (!Array.isArray(apps)) throw new Error("The database returned an unexpected response.");
      // Do not replace a mutation's confirmed result with an older in-flight list.
      if (atStart === version) {
        loadedAt = Date.now();
        setState({ apps, loaded: true, loadError: null });
      }
    })
    .catch((e: unknown) => setState({ loadError: message(e) }))
    .finally(() => {
      pendingLoad = null;
      setState({ loading: false });
      if (atStart !== version) void refresh(true);
    });
  return pendingLoad;
}

function clean(i: ApplicationInput): ApplicationInput {
  return { ...i, companyName: i.companyName.trim(), positionTitle: i.positionTitle.trim(), jobUrl: i.jobUrl.trim(), interviewLocation: i.interviewLocation.trim(), interviewType: i.interviewType.trim() };
}

async function mutation<T>(work: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try { return { ok: true, value: await work() }; }
  catch (e) { return { ok: false, error: message(e) }; }
}

export const store = {
  refresh,
  async create(input: ApplicationInput): Promise<SaveResult> {
    const result = await mutation(() => request<Application>("", { method: "POST", body: JSON.stringify(clean(input)) }));
    if (!result.ok) return result;
    version++;
    setState({ apps: [result.value, ...state.apps.filter((a) => a.id !== result.value.id)] });
    return { ok: true, app: result.value };
  },
  async update(id: string, input: ApplicationInput): Promise<SaveResult> {
    const result = await mutation(() => request<Application>(`/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(clean(input)) }));
    if (!result.ok) return result;
    version++;
    setState({ apps: state.apps.some((a) => a.id === id) ? state.apps.map((a) => a.id === id ? result.value : a) : [result.value, ...state.apps] });
    return { ok: true, app: result.value };
  },
  async remove(id: string): Promise<SaveResult> {
    const result = await mutation(() => request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" }));
    if (!result.ok) return result;
    version++;
    setState({ apps: state.apps.filter((a) => a.id !== id) });
    return { ok: true };
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("focus", () => { void refresh(); });
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useStore(): State {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => { void refresh(); }, []);
  return snapshot;
}

export function useApplication(id: string | undefined) {
  const snapshot = useStore();
  const app = snapshot.apps.find((a) => a.id === id);
  const [attempt, setAttempt] = useState(0);
  // A direct URL may point to an entry not in the current list. Confirm with the detail endpoint.
  useEffect(() => {
    if (!id || !snapshot.loaded || app || snapshot.loadError) return;
    let cancelled = false;
    setDetail({ id, loading: true, error: null, notFound: false });
    void request<Application>(`/${encodeURIComponent(id)}`).then((found) => {
      if (cancelled) return;
      setState({ apps: [...state.apps.filter((a) => a.id !== found.id), found] });
      setDetail({ id, loading: false, error: null, notFound: false });
    }).catch((e: unknown) => {
      if (!cancelled) setDetail({ id, loading: false, error: message(e), notFound: e instanceof Error && e.message === "This application no longer exists." });
    });
    return () => { cancelled = true; };
  }, [id, snapshot.loaded, snapshot.loadError, app, attempt]);
  const detail = useSyncExternalStore(detailSubscribe, () => detailState, () => detailState);
  return { app, loading: !snapshot.loaded && !snapshot.loadError || !app && snapshot.loaded && !snapshot.loadError && (detail.id !== id || detail.loading), error: snapshot.loadError || (detail.id === id ? detail.error : null), notFound: detail.id === id && detail.notFound, retry: () => {
    setDetail({ id, loading: false, error: null, notFound: false });
    void refresh(true);
    setAttempt((n) => n + 1);
  } };
}

interface DetailState { id: string | undefined; loading: boolean; error: string | null; notFound: boolean }
let detailState: DetailState = { id: undefined, loading: false, error: null, notFound: false };
const detailListeners = new Set<() => void>();
const setDetail = (d: DetailState) => { detailState = d; detailListeners.forEach((l) => l()); };
const detailSubscribe = (l: () => void) => { detailListeners.add(l); return () => { detailListeners.delete(l); }; };

export function legacyBackup(): string | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (Array.isArray(value) && value.length === 0) return null;
    } catch { /* Preserve unreadable legacy data for backup rather than discarding it. */ }
    return raw;
  } catch { return null; }
}