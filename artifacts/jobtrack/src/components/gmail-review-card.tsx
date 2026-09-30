import { useState } from "react";
import { Link } from "wouter";
import { btn } from "./jt";
import { store } from "@/lib/store";
import {
  OPPORTUNITY_TYPES, STATUSES, WORK_MODES, validate,
  type ApplicationInput, type FieldErrors, type OpportunityType, type Status, type WorkMode,
} from "@/lib/domain";

export type Message = { id: string; sender: string; subject: string; date: string; snippet: string };
export type Extraction = {
  companyName: string | null; position: string | null; opportunityType: string | null; status: string | null;
  applicationDate: string | null; interviewDate: string | null; interviewType: string | null;
  interviewLocation: string | null; interviewNotes: string | null; jobUrl: string | null;
};
export type Analysis = { relevant: boolean; reason: string; extraction: Extraction; reviewToken: string | null };

const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/gmail/analyze`;
const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/25 aria-[invalid=true]:border-destructive";

type Draft = {
  companyName: string; positionTitle: string; opportunityType: string; workMode: string; status: string;
  applicationDate: string; interviewDate: string; interviewType: string; interviewLocation: string;
  interviewNotes: string; jobUrl: string;
};

function toDraft(x: Extraction): Draft {
  const s = (v: string | null) => (typeof v === "string" ? v : "");
  return {
    companyName: s(x.companyName), positionTitle: s(x.position),
    opportunityType: OPPORTUNITY_TYPES.includes(x.opportunityType as OpportunityType) ? s(x.opportunityType) : "",
    workMode: "",
    status: STATUSES.includes(x.status as Status) ? s(x.status) : "",
    applicationDate: s(x.applicationDate), interviewDate: s(x.interviewDate), interviewType: s(x.interviewType),
    interviewLocation: s(x.interviewLocation), interviewNotes: s(x.interviewNotes), jobUrl: s(x.jobUrl),
  };
}

export function GmailReviewCard({ message, onIgnore }: { message: Message; onIgnore: () => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expired, setExpired] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function analyze() {
    setAnalyzing(true); setAnalyzeError("");
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { id: message.id, sender: message.sender, subject: message.subject, date: message.date, snippet: message.snippet } }),
      });
      let data: unknown = null;
      try { data = await res.json(); } catch { /* non-JSON */ }
      if (!res.ok) throw new Error((data as { error?: string } | null)?.error || `Analysis failed (${res.status}). Please try again.`);
      const a = data as Analysis;
      if (!a || typeof a.relevant !== "boolean" || !a.extraction) throw new Error("Analysis returned an unexpected response.");
      setAnalysis(a); setDraft(toDraft(a.extraction)); setErrors({}); setSaveError(""); setExpired(false);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Could not analyze this email.");
    } finally { setAnalyzing(false); }
  }

  async function add() {
    if (!draft || !analysis?.reviewToken || saving || savedId) return;
    const input: ApplicationInput = {
      companyName: draft.companyName, positionTitle: draft.positionTitle,
      opportunityType: draft.opportunityType as OpportunityType, workMode: draft.workMode as WorkMode,
      status: draft.status as Status, applicationDate: draft.applicationDate,
      interviewDate: draft.interviewDate, interviewTime: "", interviewType: draft.interviewType,
      interviewLocation: draft.interviewLocation, interviewNotes: draft.interviewNotes,
      jobUrl: draft.jobUrl, notes: "", source: "Gmail",
    };
    const errs = validate(input);
    setErrors(errs);
    if (Object.keys(errs).length) { setSaveError("Complete the highlighted fields before adding."); return; }
    setSaving(true); setSaveError(""); setExpired(false);
    const r = await store.create(input, analysis.reviewToken);
    setSaving(false);
    if (r.ok) setSavedId(r.app?.id ?? "");
    else if (/expir|review token|reanaly/i.test(r.error)) { setExpired(true); setSaveError("This review has expired. Analyze the email again to continue."); }
    else setSaveError(r.error);
  }

  const set = (k: keyof Draft, v: string) => setDraft(d => (d ? { ...d, [k]: v } : d));
  const field = (k: keyof Draft, label: string, required: boolean, node: (p: { id: string; "aria-invalid": boolean }) => React.ReactNode) => {
    const id = `gm-${message.id}-${k}`;
    const err = errors[k as keyof FieldErrors];
    const missing = required && draft && !draft[k];
    return <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-baseline justify-between text-xs font-medium">
        <span>{label}{required && <span className="text-destructive"> *</span>}</span>
        {missing && <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--brand-ink))]">Missing</span>}
      </label>
      {node({ id, "aria-invalid": !!err })}
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
    </div>;
  };
  const text = (k: keyof Draft, label: string, required = false, type = "text") =>
    field(k, label, required, p => <input {...p} type={type} className={inputCls} value={draft?.[k] ?? ""} disabled={!!savedId} onChange={e => set(k, e.target.value)} />);
  const select = (k: keyof Draft, label: string, opts: readonly string[]) =>
    field(k, label, true, p => <select {...p} className={inputCls} value={draft?.[k] ?? ""} disabled={!!savedId} onChange={e => set(k, e.target.value)}>
      <option value="">Choose…</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>);

  return (
    <li className="py-3 break-words">
      <p className="text-sm font-semibold">{message.subject}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message.sender} · {message.date && !Number.isNaN(Date.parse(message.date)) ? new Date(message.date).toLocaleString() : "Date unavailable"}</p>
      <p className="mt-2 text-sm text-muted-foreground">{message.snippet || "No preview available."}</p>

      {!analysis && <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className={btn.ghost} disabled={analyzing} onClick={() => void analyze()}>{analyzing ? "Analyzing…" : analyzeError ? "Retry analysis" : "Analyze email"}</button>
        <button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={onIgnore}>Ignore</button>
        <span className="text-xs text-muted-foreground">Sends only the sender, subject, date and preview snippet to OpenAI. The full email body is never sent.</span>
      </div>}
      {analyzing && analysis && <p role="status" className="mt-2 text-xs">Analyzing…</p>}
      {analyzeError && <p role="alert" className="mt-2 text-sm text-destructive">{analyzeError}</p>}

      {analysis && !analysis.relevant && <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-sm font-semibold">Not job-related</p>
        {analysis.reason && <p className="mt-1 text-sm text-muted-foreground">{analysis.reason}</p>}
        <button className={`${btn.ghost} mt-3`} onClick={onIgnore}>Ignore</button>
      </div>}

      {analysis?.relevant && draft && <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Review before adding</p>
        {analysis.reason && <p className="mt-1 text-xs text-muted-foreground">{analysis.reason}</p>}
        <p className="mt-1 text-xs text-muted-foreground">Fields marked Missing were not found in the email. Nothing is saved until you add it.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {text("companyName", "Company", true)}
          {text("positionTitle", "Position", true)}
          {select("opportunityType", "Opportunity type", OPPORTUNITY_TYPES)}
          {select("workMode", "Work mode", WORK_MODES)}
          {select("status", "Status", STATUSES)}
          {text("applicationDate", "Application date", true, "date")}
          {text("interviewDate", "Interview date", false, "date")}
          {text("interviewType", "Interview type")}
          {text("interviewLocation", "Interview location")}
          {text("jobUrl", "Job URL")}
          <div className="sm:col-span-2">{field("interviewNotes", "Interview notes", false, p => <textarea {...p} rows={2} className={inputCls} value={draft.interviewNotes} disabled={!!savedId} onChange={e => set("interviewNotes", e.target.value)} />)}</div>
        </div>
        {saveError && <p role="alert" className="mt-3 text-sm text-destructive">{saveError}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {savedId !== null ? <p role="status" className="text-sm font-medium">
            Saved to JobTrack. {savedId && <Link href={`/applications/${encodeURIComponent(savedId)}`} className="underline underline-offset-2">View application</Link>}
          </p> : <>
            {!expired && <button className={btn.primary} disabled={saving || !analysis.reviewToken} onClick={() => void add()}>{saving ? "Adding…" : "Add to JobTrack"}</button>}
            {(expired || !analysis.reviewToken) && <button className={btn.ghost} disabled={analyzing} onClick={() => void analyze()}>{analyzing ? "Analyzing…" : "Analyze again"}</button>}
            <button className={btn.ghost} disabled={saving} onClick={onIgnore}>Ignore</button>
          </>}
        </div>
      </div>}
    </li>
  );
}
