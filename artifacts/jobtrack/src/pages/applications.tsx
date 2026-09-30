import { useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Search, Plus, RotateCcw, CalendarClock, SearchX, Building2, Briefcase, Tag, MapPin, Calendar, Inbox, CircleDot } from "lucide-react";
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
        <div className="rise mb-5 flex flex-col gap-3 rounded-md border border-border bg-card p-2 lg:flex-row lg:items-center" role="search">
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
            <button onClick={reset} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" data-testid="button-reset-filters">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      )}

      {apps.length > 0 && <p className="mb-3 text-sm text-muted-foreground" aria-live="polite" data-testid="text-result-count">
        {active ? `${filtered.length} of ${apps.length} match` : `Showing all ${apps.length}`}
      </p>}

      {apps.length === 0 ? (
        <div className="rise rounded-md border border-dashed border-border bg-card/60 px-6 py-16 text-center" data-testid="empty-applications">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground"><Plus className="h-5 w-5" /></div>
          <h2 className="text-xl font-semibold">Nothing tracked yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Every role you add lands here — searchable and filterable, so nothing slips through.</p>
          <Link href="/applications/new" className={cn(btn.primary, "mt-6")} data-testid="link-add-first">Add an application</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rise rounded-md border border-dashed border-border bg-card/60 px-6 py-14 text-center" data-testid="empty-no-results">
          <SearchX className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">No applications match</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or loosen a filter.</p>
          <button onClick={reset} className={cn(btn.ghost, "mt-5")} data-testid="button-reset-empty"><RotateCcw className="h-4 w-4" /> Reset filters</button>
        </div>
      ) : (
        <div className="rise overflow-x-auto rounded-md border border-border bg-card" data-testid="table-applications">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <caption className="sr-only">Applications</caption>
            <thead>
              <tr className="text-left text-xs font-medium text-muted-foreground">
                {[["Company", Building2], ["Position", Briefcase], ["Type", Tag], ["Work mode", MapPin], ["Applied", Calendar], ["Interview", CalendarClock], ["Source", Inbox], ["Status", CircleDot]].map(([l, I]) => {
                  const Icon = I as typeof Tag;
                  return <th key={l as string} scope="col" className="border-b border-r border-border px-3 py-2.5 font-medium last:border-r-0"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Icon className="h-3.5 w-3.5" aria-hidden />{l as string}</span></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="group transition-colors hover:bg-accent/40 [&>td]:border-b [&>td]:border-r [&>td]:border-border [&>td:last-child]:border-r-0 [&:last-child>td]:border-b-0" data-testid={`row-application-${a.id}`}>
                  <td className="px-3 py-1.5">
                    <Link href={`/applications/${a.id}`} data-testid={`card-application-${a.id}`} className="-mx-1 inline-flex min-h-9 max-w-[200px] items-center rounded px-1 font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                      <span className="truncate">{a.companyName}</span>
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-1.5">{a.positionTitle}</td>
                  <td className="px-3 py-1.5"><span className="inline-block whitespace-nowrap rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs">{a.opportunityType}</span></td>
                  <td className="px-3 py-1.5"><span className="inline-block whitespace-nowrap rounded-sm bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">{a.workMode}</span></td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{formatDate(a.applicationDate)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{a.interviewDate ? <span className="text-[hsl(var(--brand-ink))]">{formatDate(a.interviewDate, { month: "short", day: "numeric" })} {formatTime(a.interviewTime)}</span> : <span className="text-muted-foreground" aria-label="None">—</span>}</td>
                  <td className="px-3 py-1.5"><SourceTag source={a.source} /></td>
                  <td className="px-3 py-1.5"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
