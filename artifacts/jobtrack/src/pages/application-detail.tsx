import { type ReactNode, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Pencil, Trash2, ExternalLink, CalendarClock, FileQuestion, AlertTriangle } from "lucide-react";
import { type Application, type ApplicationInput, type Status, STATUSES, formatDate, formatTime, isHttpUrl, isClosed, interviewMoment } from "@/lib/domain";
import { store, useApplication } from "@/lib/store";
import { ApplicationForm } from "@/components/application-form";
import { PageHeader, StatusBadge, SourceTag, btn } from "@/components/jt";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function toInput(a: Application): ApplicationInput {
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = a;
  return rest;
}

function Row({ label, children, testid }: { label: string; children: ReactNode; testid: string }) {
  return (
    <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[170px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm" data-testid={testid}>{children}</dd>
    </div>
  );
}
const None = () => <span className="text-muted-foreground/70 italic">Not added</span>;

function Maybe({ value, link }: { value: string; link?: boolean }) {
  if (!value.trim()) return <None />;
  if (link && isHttpUrl(value)) return <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-primary underline-offset-2 hover:underline">{value} <ExternalLink className="h-3 w-3 shrink-0" /></a>;
  return <span className="whitespace-pre-wrap">{value}</span>;
}

export default function ApplicationDetail() {
  const params = useParams<{ id: string }>();
  const app = useApplication(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!app) {
    return (
      <div className="rise mx-auto max-w-md py-16 text-center" data-testid="empty-missing">
        <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">This application isn't here</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or it was saved in a different browser. Records only exist on the device where they were created.</p>
        <Link href="/applications" className={`${btn.primary} mt-6`} data-testid="link-back-list">Back to applications</Link>
      </div>
    );
  }

  const changeStatus = (s: Status) => {
    setActionError(null);
    const r = store.update(app.id, { ...toInput(app), status: s });
    if (r.ok) toast({ title: "Status updated", description: `Now marked ${s}.` });
    else setActionError(r.error);
  };
  const doDelete = () => {
    const name = app.companyName;
    const r = store.remove(app.id);
    setConfirm(false);
    if (r.ok) { toast({ title: "Application deleted", description: `${name} was removed.` }); navigate("/applications"); }
    else setActionError(r.error);
  };

  if (editing) {
    return (
      <>
        <button onClick={() => setEditing(false)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="button-back-detail"><ArrowLeft className="h-4 w-4" /> Back to details</button>
        <PageHeader eyebrow="Editing" title={app.companyName} />
        <ApplicationForm initial={toInput(app)} submitLabel="Save changes" onCancel={() => setEditing(false)}
          onSubmit={(v) => {
            const r = store.update(app.id, v);
            if (r.ok) { toast({ title: "Changes saved" }); setEditing(false); window.scrollTo({ top: 0 }); }
            return r;
          }} />
      </>
    );
  }

  const when = interviewMoment(app);
  const past = when && when.getTime() < Date.now();
  const hasInterview = !!(app.interviewDate || app.interviewTime || app.interviewType || app.interviewLocation || app.interviewNotes);

  return (
    <>
      <Link href="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Applications</Link>
      <PageHeader eyebrow={`${app.opportunityType} · ${app.workMode}`} title={<span data-testid="text-company">{app.companyName}</span>}>
        <button className={btn.ghost} onClick={() => setEditing(true)} data-testid="button-edit"><Pencil className="h-4 w-4" /> Edit</button>
        <button className={btn.danger} onClick={() => setConfirm(true)} data-testid="button-delete"><Trash2 className="h-4 w-4" /> Delete</button>
      </PageHeader>
      <p className="-mt-6 mb-6 text-lg text-muted-foreground" data-testid="text-position">{app.positionTitle}</p>

      {actionError && (
        <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" data-testid="status-action-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Not saved.</strong> {actionError}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="d-role">
            <h2 id="d-role" className="mb-2 text-lg font-semibold">Details</h2>
            <dl>
              <Row label="Company" testid="text-detail-company">{app.companyName}</Row>
              <Row label="Position" testid="text-detail-position">{app.positionTitle}</Row>
              <Row label="Opportunity type" testid="text-detail-type">{app.opportunityType}</Row>
              <Row label="Work mode" testid="text-detail-mode">{app.workMode}</Row>
              <Row label="Application date" testid="text-detail-date">{app.applicationDate ? formatDate(app.applicationDate, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : <None />}</Row>
              <Row label="Status" testid="text-detail-status"><StatusBadge status={app.status} /></Row>
              <Row label="Source" testid="text-detail-source"><SourceTag source={app.source} /></Row>
              <Row label="Job posting" testid="text-detail-url"><Maybe value={app.jobUrl} link /></Row>
            </dl>
          </section>

          <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="d-int" style={{ animationDelay: "60ms" }}>
            <div className="mb-2 flex items-center justify-between">
              <h2 id="d-int" className="text-lg font-semibold">Interview</h2>
              {when && <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${past ? "bg-muted text-muted-foreground" : isClosed(app.status) ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"}`}>{past ? "Past" : isClosed(app.status) ? "Closed" : "Upcoming"}</span>}
            </div>
            {!hasInterview ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground" data-testid="empty-interview">
                <CalendarClock className="h-5 w-5 shrink-0" />
                <span>No interview details yet. <button onClick={() => setEditing(true)} className="text-primary underline-offset-2 hover:underline" data-testid="button-add-interview">Add them</button> when you hear back.</span>
              </div>
            ) : (
              <dl>
                <Row label="Date" testid="text-interview-date">{app.interviewDate ? formatDate(app.interviewDate, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : <None />}</Row>
                <Row label="Time" testid="text-interview-time">{app.interviewTime ? formatTime(app.interviewTime) : <None />}</Row>
                <Row label="Type" testid="text-interview-type"><Maybe value={app.interviewType} /></Row>
                <Row label="Location or link" testid="text-interview-location"><Maybe value={app.interviewLocation} link /></Row>
                <Row label="Notes" testid="text-interview-notes"><Maybe value={app.interviewNotes} /></Row>
              </dl>
            )}
          </section>

          <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" style={{ animationDelay: "100ms" }}>
            <h2 className="mb-3 text-lg font-semibold">Notes</h2>
            <div className="text-sm leading-relaxed" data-testid="text-notes"><Maybe value={app.notes} /></div>
          </section>
        </div>

        <aside className="rise flex flex-col gap-4 lg:sticky lg:top-10 lg:self-start" style={{ animationDelay: "140ms" }}>
          <div className="rounded-2xl border border-border bg-card p-5">
            <label htmlFor="quick-status" className="text-sm font-medium">Quick status update</label>
            <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Saves immediately.</p>
            <select id="quick-status" value={app.status} onChange={(e) => changeStatus(e.target.value as Status)} data-testid="select-quick-status"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/12">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <p className="px-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
            Added {new Date(app.createdAt).toLocaleDateString()}<br />Last updated {new Date(app.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </aside>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>{app.companyName} — {app.positionTitle} will be permanently removed from this browser. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
