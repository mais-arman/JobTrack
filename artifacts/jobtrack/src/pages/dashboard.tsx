import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarClock, MapPin, Plus } from "lucide-react";
import { OPPORTUNITY_TYPES, STATUSES, isClosed, statusTone, upcomingInterviews, formatDate, formatTime, relativeDay, todayISO } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { PageHeader, StatusBadge, btn, toneDot } from "@/components/jt";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { apps } = useStore();
  const stats = useMemo(() => {
    const byType = Object.fromEntries(OPPORTUNITY_TYPES.map((t) => [t, 0])) as Record<string, number>;
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const a of apps) { byType[a.opportunityType]++; byStatus[a.status]++; }
    const open = apps.filter((a) => !isClosed(a.status)).length;
    return { byType, byStatus, open, closed: apps.length - open };
  }, [apps]);
  const upcoming = useMemo(() => upcomingInterviews(apps), [apps]);
  const maxType = Math.max(1, ...Object.values(stats.byType));

  return (
    <>
      <PageHeader eyebrow={formatDate(todayISO(), { weekday: "long", month: "long", day: "numeric" })} title={<>{greeting()}.</>}>
        <Link href="/applications/new" className={btn.primary} data-testid="link-add-application"><Plus className="h-4 w-4" /> Add application</Link>
      </PageHeader>

      {apps.length === 0 ? (
        <div className="rise relative overflow-hidden rounded-md border border-border bg-card p-8 sm:p-12" data-testid="empty-dashboard">
          <div className="relative max-w-md">
            <h2 className="text-2xl font-semibold">A clean page to start from.</h2>
            <p className="mt-3 text-muted-foreground">Add the first role you've applied to — or one you're saving for later. Your totals, status counts and upcoming interviews will fill in here as you go.</p>
            <Link href="/applications/new" className={cn(btn.primary, "mt-6")} data-testid="link-add-first">Add your first application <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <section aria-label="Totals" className="rise grid grid-cols-3 overflow-hidden rounded-md border border-border bg-card lg:col-span-2">
            {[
              { label: "Total tracked", value: apps.length, id: "total" },
              { label: "Still open", value: stats.open, id: "open" },
              { label: "Closed", value: stats.closed, id: "closed" },
            ].map((s, i) => (
              <div key={s.id} className={cn("p-5 sm:p-7", i > 0 && "border-l border-border", i === 0 && "bg-accent text-accent-foreground")}>
                <p className={cn("font-mono text-[10px] uppercase tracking-[0.16em] sm:text-[11px]", i === 0 ? "text-accent-foreground/80" : "text-muted-foreground")}>{s.label}</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums sm:text-5xl" data-testid={`text-count-${s.id}`}>{s.value}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="up-h" className="rise rounded-md border border-border bg-card p-5 sm:p-7 lg:row-span-2 lg:col-start-2" style={{ animationDelay: "80ms" }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 id="up-h" className="text-xl font-semibold">Upcoming interviews</h2>
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-xs text-accent-foreground" data-testid="text-count-upcoming">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center" data-testid="empty-upcoming">
                <CalendarClock className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm text-muted-foreground">No interviews on the calendar. When you add a future date to an open application, it shows up here.</p>
              </div>
            ) : (
              <ol className="flex flex-col gap-2">
                {upcoming.map(({ app }) => {
                  const rel = relativeDay(app.interviewDate);
                  return (
                    <li key={app.id}>
                      <Link href={`/applications/${app.id}`} data-testid={`link-upcoming-${app.id}`} className="group flex gap-4 rounded-md p-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-border bg-background py-1.5">
                          <span className="font-mono text-[10px] uppercase text-[hsl(var(--brand-ink))]">{formatDate(app.interviewDate, { month: "short" })}</span>
                          <span className="text-xl font-semibold leading-tight">{formatDate(app.interviewDate, { day: "numeric" })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{app.companyName}</p>
                          <p className="truncate text-sm text-muted-foreground">{app.positionTitle}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            {rel && <span className="font-medium text-[hsl(var(--brand-ink))]">{rel}</span>}
                            {app.interviewTime && <span>{formatTime(app.interviewTime)}</span>}
                            {app.interviewType && <span>· {app.interviewType}</span>}
                            {app.interviewLocation && <span className="inline-flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3 w-3" />{app.interviewLocation}</span>}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 self-center text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="st-h" className="rise rounded-md border border-border bg-card p-5 sm:p-6" style={{ animationDelay: "120ms" }}>
              <h2 id="st-h" className="mb-4 text-lg font-semibold">By status</h2>
              <ul className="flex flex-col">
                {STATUSES.map((s) => {
                  const n = stats.byStatus[s];
                  return (
                    <li key={s}>
                      <Link href={`/applications?status=${encodeURIComponent(s)}`} data-testid={`link-status-${s}`} className={cn("flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring", n === 0 && "text-muted-foreground")}>
                        <span className={cn("h-2 w-2 rounded-full", toneDot[statusTone(s)], n === 0 && "opacity-40")} />
                        <span className="flex-1">{s}</span>
                        <span className="font-mono tabular-nums" data-testid={`text-status-count-${s}`}>{n}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section aria-labelledby="ty-h" className="rise rounded-md border border-border bg-card p-5 sm:p-6" style={{ animationDelay: "160ms" }}>
              <h2 id="ty-h" className="mb-4 text-lg font-semibold">By opportunity type</h2>
              <ul className="flex flex-col gap-3">
                {OPPORTUNITY_TYPES.map((t) => {
                  const n = stats.byType[t];
                  return (
                    <li key={t}>
                      <Link href={`/applications?type=${encodeURIComponent(t)}`} data-testid={`link-type-${t}`} className="block rounded-md px-2 py-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                        <div className={cn("flex justify-between text-sm", n === 0 && "text-muted-foreground")}>
                          <span>{t}</span><span className="font-mono tabular-nums" data-testid={`text-type-count-${t}`}>{n}</span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-muted" aria-hidden>
                          <div className="h-full origin-left rounded-full bg-primary transition-transform duration-500" style={{ transform: `scaleX(${n / maxType})` }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section className="rise lg:col-span-2 rounded-md border border-border bg-card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recently updated</h2>
              <Link href="/applications" className="inline-flex items-center gap-1 text-sm text-primary hover:underline" data-testid="link-view-all">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <ul className="divide-y divide-border">
              {[...apps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link href={`/applications/${a.id}`} className="flex items-center gap-3 py-3 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring rounded" data-testid={`link-recent-${a.id}`}>
                    <span className="min-w-0 flex-1 truncate"><span className="font-medium">{a.companyName}</span> <span className="text-muted-foreground">· {a.positionTitle}</span></span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

