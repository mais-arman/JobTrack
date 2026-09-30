import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, ListChecks, Plus, HardDrive, AlertTriangle, X, Mail, PenLine } from "lucide-react";
import { type Status, type Source, statusTone, type Tone } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[hsl(40_20%_90%)] text-[hsl(200_12%_32%)] ring-[hsl(40_15%_80%)]",
  progress: "bg-[hsl(200_50%_93%)] text-[hsl(205_55%_28%)] ring-[hsl(200_40%_82%)]",
  interview: "bg-[hsl(38_85%_90%)] text-[hsl(28_70%_30%)] ring-[hsl(38_60%_76%)]",
  offer: "bg-[hsl(158_40%_89%)] text-[hsl(160_50%_22%)] ring-[hsl(158_30%_74%)]",
  "closed-good": "bg-[hsl(186_52%_26%)] text-[hsl(40_40%_97%)] ring-transparent",
  "closed-bad": "bg-transparent text-[hsl(200_8%_45%)] ring-[hsl(40_12%_78%)] line-through decoration-1",
};
export const toneDot: Record<Tone, string> = {
  neutral: "bg-[hsl(40_12%_62%)]", progress: "bg-[hsl(205_55%_45%)]", interview: "bg-[hsl(32_85%_52%)]",
  offer: "bg-[hsl(160_45%_38%)]", "closed-good": "bg-[hsl(186_52%_26%)]", "closed-bad": "bg-[hsl(200_6%_68%)]",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span data-testid="status-badge" className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", toneClass[statusTone(status)], className)}>
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
    <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" data-testid="status-storage-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{loadError}</p>
    </div>
  );
}

function LocalNote() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem("jobtrack.noteDismissed") !== "1"; } catch { return true; } });
  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring rounded" data-testid="button-show-storage-note">
      <HardDrive className="h-3.5 w-3.5" /> Saved on this device only
    </button>
  );
  return (
    <div className="relative rounded-xl border border-dashed border-[hsl(38_20%_78%)] bg-card/60 p-3 pr-8 text-xs leading-relaxed text-muted-foreground" data-testid="text-storage-note">
      <HardDrive className="mb-1.5 h-4 w-4 text-primary" aria-hidden />
      Your records live only in this browser on this device. They won't sync elsewhere, and clearing site data will erase them.
      <button aria-label="Hide storage note" onClick={() => { setOpen(false); try { localStorage.setItem("jobtrack.noteDismissed", "1"); } catch { /* ignore */ } }} className="absolute right-2 top-2 rounded p-0.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
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
          <span className="font-serif text-xl font-semibold tracking-tight">JobTrack</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} aria-current={active(href) ? "page" : undefined}
              className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active(href) ? "bg-card text-foreground shadow-[0_1px_0_hsl(38_20%_82%)] ring-1 ring-sidebar-border" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-foreground")}>
              <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", active(href) && "text-primary")} /> {label}
            </Link>
          ))}
        </nav>
        <Link href="/applications/new" data-testid="link-nav-add" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Plus className="h-4 w-4" /> Add application
        </Link>
        <div className="mt-auto"><LocalNote /></div>
      </aside>

      {/* mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-mobile"><Mark /><span className="font-serif text-lg font-semibold">JobTrack</span></Link>
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
            className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", active(href) ? "text-primary" : "text-muted-foreground")}>
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Mark() {
  return (
    <span aria-hidden className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
      <span className="font-serif text-base font-semibold leading-none">J</span>
      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[hsl(14_65%_55%)] ring-2 ring-sidebar" />
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(14_55%_45%)]">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-8px_hsl(186_52%_20%/.6)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  ghost: "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  danger: "inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-card px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
};
