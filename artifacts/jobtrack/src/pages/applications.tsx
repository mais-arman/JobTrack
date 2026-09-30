import { useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Search, Plus, RotateCcw, CalendarClock, SearchX, ChevronRight } from "lucide-react";
import { OPPORTUNITY_TYPES, WORK_MODES, STATUSES, formatDate, formatTime } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { PageHeader, StatusBadge, SourceTag, btn } from "@/components/jt";
import { cn } from "@/lib/utils";

const selCls = "rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/12";

export default function Applications() {
  const { apps } = useStore();
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const mode = params.get("mode") ?? "";
  const status = params.get("status") ?? "";

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(search);
    if (v) p.set(k, v); else p.delete(k);
    const s = p.toString();
    navigate(`/applications${s ? `?${s}` : ""}`, { replace: true });
  };
  const reset = () => navigate("/applications", { replace: true });
  const active = !!(q || type || mode || status);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return apps
      .filter((a) => (!needle || `${a.companyName} ${a.positionTitle} ${a.notes}`.toLowerCase().includes(needle))
        && (!type || a.opportunityType === type) && (!mode || a.workMode === mode) && (!status || a.status === status))
      .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate) || b.updatedAt.localeCompare(a.updatedAt));
  }, [apps, q, type, mode, status]);

  return (
    <>
      <PageHeader eyebrow={`${apps.length} tracked`} title="Applications">
        <Link href="/applications/new" className={btn.primary} data-testid="link-add-application"><Plus className="h-4 w-4" /> Add application</Link>
      </PageHeader>

      {apps.length > 0 && (
        <div className="rise mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 lg:flex-row lg:items-center" role="search">
          <label className="relative flex-1">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input type="search" value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="Search company, role or notes" data-testid="input-search"
              className="w-full rounded-lg border border-transparent bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/12" />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
            <label className="sr-only" htmlFor="f-type">Opportunity type</label>
            <select id="f-type" className={selCls} value={type} onChange={(e) => setParam("type", e.target.value)} data-testid="select-filter-type">
              <option value="">All types</option>{OPPORTUNITY_TYPES.map((o) => <option key={o}>{o}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-mode">Work mode</label>
            <select id="f-mode" className={selCls} value={mode} onChange={(e) => setParam("mode", e.target.value)} data-testid="select-filter-mode">
              <option value="">All work modes</option>{WORK_MODES.map((o) => <option key={o}>{o}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-status">Status</label>
            <select id="f-status" className={selCls} value={status} onChange={(e) => setParam("status", e.target.value)} data-testid="select-filter-status">
              <option value="">All statuses</option>{STATUSES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          {active && (
            <button onClick={reset} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[hsl(14_55%_40%)] hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" data-testid="button-reset-filters">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      )}

      {apps.length > 0 && <p className="mb-3 text-sm text-muted-foreground" aria-live="polite" data-testid="text-result-count">
        {active ? `${filtered.length} of ${apps.length} match` : `Showing all ${apps.length}`}
      </p>}

      {apps.length === 0 ? (
        <div className="rise rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center" data-testid="empty-applications">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground"><Plus className="h-5 w-5" /></div>
          <h2 className="text-xl font-semibold">Nothing tracked yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Every role you add lands here — searchable and filterable, so nothing slips through.</p>
          <Link href="/applications/new" className={cn(btn.primary, "mt-6")} data-testid="link-add-first">Add an application</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rise rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center" data-testid="empty-no-results">
          <SearchX className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">No applications match</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or loosen a filter.</p>
          <button onClick={reset} className={cn(btn.ghost, "mt-5")} data-testid="button-reset-empty"><RotateCcw className="h-4 w-4" /> Reset filters</button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((a, i) => (
            <li key={a.id} className="rise" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <Link href={`/applications/${a.id}`} data-testid={`card-application-${a.id}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-px hover:border-[hsl(186_30%_70%)] hover:shadow-[0_8px_20px_-14px_hsl(186_40%_20%/.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[1fr_auto_auto] sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.companyName}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.positionTitle}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{a.opportunityType}</span><span aria-hidden>·</span><span>{a.workMode}</span><span aria-hidden>·</span>
                    <span>Applied {formatDate(a.applicationDate)}</span>
                    {a.interviewDate && <span className="inline-flex items-center gap-1 text-[hsl(28_70%_35%)]"><CalendarClock className="h-3 w-3" />{formatDate(a.interviewDate, { month: "short", day: "numeric" })} {formatTime(a.interviewTime)}</span>}
                    <SourceTag source={a.source} />
                  </p>
                </div>
                <StatusBadge status={a.status} />
                <ChevronRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
