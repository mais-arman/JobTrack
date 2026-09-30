import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, ListChecks, Plus, Database, AlertTriangle, X, Mail, PenLine } from "lucide-react";
import { type Status, type Source, statusTone, type Tone } from "@/lib/domain";
import { store, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[hsl(220_14%_95%)] text-[hsl(220_10%_30%)] ring-[hsl(220_12%_85%)]",
  progress: "bg-[hsl(212_70%_95%)] text-[hsl(214_60%_32%)] ring-[hsl(212_55%_84%)]",
  interview: "bg-[hsl(48_100%_90%)] text-[hsl(38_80%_25%)] ring-[hsl(46_85%_70%)]",
  offer: "bg-[hsl(145_50%_92%)] text-[hsl(148_55%_24%)] ring-[hsl(145_40%_78%)]",
  "closed-good": "bg-[hsl(148_55%_28%)] text-white ring-transparent",
  "closed-bad": "bg-transparent text-[hsl(220_8%_42%)] ring-[hsl(220_10%_82%)] line-through decoration-1",
};
export const toneDot: Record<Tone, string> = {
  neutral: "bg-[hsl(220_8%_60%)]", progress: "bg-[hsl(214_60%_50%)]", interview: "bg-[hsl(45_95%_48%)]",
  offer: "bg-[hsl(148_50%_40%)]", "closed-good": "bg-[hsl(148_55%_28%)]", "closed-bad": "bg-[hsl(220_6%_72%)]",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span data-testid="status-badge" className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", toneClass[statusTone(status)], className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", statusTone(status) === "closed-good" ? "bg-white" : toneDot[statusTone(status)])} />
      {status}
    </span>
  );
}

export function SourceTag({ source }: { source: Source }) {
  const Icon = source === "Gmail" ? Mail : PenLine;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground" data-testid="text-source">
      <Icon className="h-3 w-3" aria-hidden /> {source}
    </span>
  );
}

export function StorageBanner() {
  const { loadError } = useStore();
  if (!loadError) return null;
  return (
    <div role="alert" className="mb-6 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" data-testid="status-storage-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{loadError} <button onClick={() => { void store.refresh(true); }} className="font-semibold underline" data-testid="button-retry-applications">Try again</button></p>
    </div>
  );
}

function LocalNote() {
  const [open, setOpen] = useState(true);
  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring rounded" data-testid="button-show-storage-note">
      <Database className="h-3.5 w-3.5" /> Saved in shared database
    </button>
  );
  return (
    <div className="relative rounded-md border border-border bg-card p-3 pr-8 text-xs leading-relaxed text-muted-foreground" data-testid="text-storage-note">
      <Database className="mb-1.5 h-4 w-4 text-[hsl(var(--brand-ink))]" aria-hidden />
      Applications are saved in a shared database, not only on this device. There is no sign-in: anyone with access to this app can view and change these records. Avoid sensitive details.
      <button aria-label="Hide storage note" onClick={() => setOpen(false)} className="absolute right-2 top-2 rounded p-0.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/applications", label: "Applications", icon: ListChecks },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const active = (h: string) => (h === "/" ? loc === "/" : loc.startsWith(h) && loc !== "/applications/new");
  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[232px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <aside className="hidden md:flex sticky top-0 h-[100dvh] flex-col gap-8 border-r border-sidebar-border bg-sidebar px-5 py-7">
        <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring" data-testid="link-home">
          <Mark />
          <span className="text-lg font-bold tracking-tight">JobTrack</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} aria-current={active(href) ? "page" : undefined}
              className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active(href) ? "bg-accent font-medium text-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-foreground")}>
              <Icon className={cn("h-4 w-4", active(href) && "text-[hsl(var(--brand-ink))]")} /> {label}
            </Link>
          ))}
        </nav>
        <Link href="/applications/new" data-testid="link-nav-add" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Plus className="h-4 w-4" /> Add application
        </Link>
        <div className="mt-auto"><LocalNote /></div>
      </aside>

      {/* mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-mobile"><Mark /><span className="text-lg font-bold tracking-tight">JobTrack</span></Link>
        <Link href="/applications/new" aria-label="Add application" data-testid="link-add-mobile" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Plus className="h-4 w-4" /></Link>
      </header>

      <main id="main" className="min-w-0 px-4 pb-28 pt-6 sm:px-8 md:pb-16 md:pt-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <StorageBanner />
          {children}
          <div className="mt-12 md:hidden"><LocalNote /></div>
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav aria-label="Main" className="md:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} data-testid={`link-mobile-${label.toLowerCase()}`}
            className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", active(href) ? "font-semibold text-foreground" : "text-muted-foreground")}>
            <span className={cn("grid h-7 w-12 place-items-center rounded-full", active(href) && "bg-accent text-accent-foreground")}>
            <Icon className="h-5 w-5" /></span> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Mark() {
  return (
    <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
      <span className="text-base font-bold leading-none">J</span>
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="rise mb-8 flex flex-col gap-4 text-foreground sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--brand-ink))]">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(222_30%_8%)] sm:text-[2rem]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  ghost: "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  danger: "inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-card px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
};
