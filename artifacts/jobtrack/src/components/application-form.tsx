import { type ReactNode, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  type ApplicationInput, type FieldErrors, OPPORTUNITY_TYPES, WORK_MODES, STATUSES, SOURCES, validate,
} from "@/lib/domain";
import type { SaveResult } from "@/lib/store";
import { btn } from "./jt";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-shadow focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/25 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/10";

function Field({ id, label, hint, error, optional, children, className }: { id: string; label: string; hint?: string; error?: string; optional?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium">
        {label}
        {optional && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Optional</span>}
      </label>
      {children}
      {error ? <p id={`${id}-err`} className="text-xs text-destructive" role="alert">{error}</p> : hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-border pt-6 sm:grid-cols-[160px_1fr]">
      <legend className="contents">
        <span className="flex gap-3 sm:flex-col sm:gap-1">
          <span className="font-mono text-xs text-[hsl(var(--brand-ink))]">{n}</span>
          <span className="text-base font-semibold">{title}</span>
        </span>
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ApplicationForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial: ApplicationInput; submitLabel: string; onSubmit: (v: ApplicationInput) => Promise<SaveResult>; onCancel: () => void;
}) {
  const [v, setV] = useState<ApplicationInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof ApplicationInput>(k: K, val: ApplicationInput[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const a11y = (k: keyof ApplicationInput) => ({
    id: k, name: k, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined, "data-testid": `input-${k}`,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSaveError(null);
    const errs = validate(v);
    setErrors(errs);
    const first = Object.keys(errs).find((k) => errs[k as keyof FieldErrors]);
    if (first) { formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus(); return; }
    setBusy(true);
    try {
      const r = await onSubmit(v);
      if (!r.ok) setSaveError(r.error);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your change could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const hasInterview = !!(v.interviewDate || v.interviewTime || v.interviewType || v.interviewLocation || v.interviewNotes);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="rise flex flex-col gap-8" data-testid="form-application">
      <Section n="01" title="The role">
        <Field id="companyName" label="Company name" error={errors.companyName}>
          <input {...a11y("companyName")} className={inputCls} value={v.companyName} onChange={(e) => set("companyName", e.target.value)} autoComplete="organization" placeholder="e.g. Halden & Rowe" />
        </Field>
        <Field id="positionTitle" label="Position title" error={errors.positionTitle}>
          <input {...a11y("positionTitle")} className={inputCls} value={v.positionTitle} onChange={(e) => set("positionTitle", e.target.value)} placeholder="e.g. Junior Product Designer" />
        </Field>
        <Field id="opportunityType" label="Opportunity type" error={errors.opportunityType}>
          <select {...a11y("opportunityType")} className={inputCls} value={v.opportunityType} onChange={(e) => set("opportunityType", e.target.value as ApplicationInput["opportunityType"])}>
            {OPPORTUNITY_TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field id="workMode" label="Work mode" error={errors.workMode}>
          <select {...a11y("workMode")} className={inputCls} value={v.workMode} onChange={(e) => set("workMode", e.target.value as ApplicationInput["workMode"])}>
            {WORK_MODES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field id="jobUrl" label="Job posting link" optional error={errors.jobUrl} className="sm:col-span-2">
          <input {...a11y("jobUrl")} type="url" inputMode="url" className={inputCls} value={v.jobUrl} onChange={(e) => set("jobUrl", e.target.value)} placeholder="https://" />
        </Field>
      </Section>

      <Section n="02" title="Where it stands">
        <Field id="applicationDate" label="Application date" error={errors.applicationDate}>
          <input {...a11y("applicationDate")} type="date" className={inputCls} value={v.applicationDate} onChange={(e) => set("applicationDate", e.target.value)} />
        </Field>
        <Field id="status" label="Status" error={errors.status}>
          <select {...a11y("status")} className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as ApplicationInput["status"])}>
            {STATUSES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field id="source" label="Source" hint="A label for where you found it. JobTrack doesn't connect to Gmail." error={errors.source} className="sm:col-span-2">
          <select {...a11y("source")} className={inputCls} value={v.source} onChange={(e) => set("source", e.target.value as ApplicationInput["source"])}>
            {SOURCES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </Section>

      <Section n="03" title="Interview">
        {!hasInterview && <p className="text-sm text-muted-foreground sm:col-span-2">Nothing scheduled yet? Leave these blank and come back later.</p>}
        <Field id="interviewDate" label="Date" optional error={errors.interviewDate}>
          <input {...a11y("interviewDate")} type="date" className={inputCls} value={v.interviewDate} onChange={(e) => set("interviewDate", e.target.value)} />
        </Field>
        <Field id="interviewTime" label="Time" optional error={errors.interviewTime}>
          <input {...a11y("interviewTime")} type="time" className={inputCls} value={v.interviewTime} onChange={(e) => set("interviewTime", e.target.value)} />
        </Field>
        <Field id="interviewType" label="Type" optional error={errors.interviewType}>
          <input {...a11y("interviewType")} list="interview-types" className={inputCls} value={v.interviewType} onChange={(e) => set("interviewType", e.target.value)} placeholder="Phone screen, video, panel..." />
          <datalist id="interview-types">
            {["Phone screen", "Video call", "In person", "Technical", "Panel", "Take-home review"].map((t) => <option key={t} value={t} />)}
          </datalist>
        </Field>
        <Field id="interviewLocation" label="Location or meeting link" optional error={errors.interviewLocation}>
          <input {...a11y("interviewLocation")} className={inputCls} value={v.interviewLocation} onChange={(e) => set("interviewLocation", e.target.value)} placeholder="Address or https:// link" />
        </Field>
        <Field id="interviewNotes" label="Interview notes" optional error={errors.interviewNotes} className="sm:col-span-2">
          <textarea {...a11y("interviewNotes")} rows={3} className={inputCls} value={v.interviewNotes} onChange={(e) => set("interviewNotes", e.target.value)} placeholder="Who you're meeting, what to prepare..." />
        </Field>
      </Section>

      <Section n="04" title="Notes">
        <Field id="notes" label="Notes" optional error={errors.notes} className="sm:col-span-2">
          <textarea {...a11y("notes")} rows={5} className={inputCls} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Salary range, contacts, why this one caught your eye..." />
        </Field>
      </Section>

      {saveError && (
        <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" data-testid="status-save-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p><strong className="font-semibold">Not saved.</strong> {saveError}</p>
        </div>
      )}

      <div className="sticky bottom-16 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:bottom-0 sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <button type="button" className={btn.ghost} onClick={onCancel} disabled={busy} data-testid="button-cancel">Cancel</button>
        <button type="submit" className={btn.primary} disabled={busy} data-testid="button-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}
