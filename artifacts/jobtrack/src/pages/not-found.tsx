import { Link } from "wouter";
import { btn } from "@/components/jt";

export default function NotFound() {
  return (
    <div className="rise mx-auto max-w-md py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[hsl(14_55%_45%)]">404</p>
      <h1 className="mt-3 text-3xl font-semibold">This page wandered off</h1>
      <p className="mt-2 text-sm text-muted-foreground">The address doesn't match anything in JobTrack.</p>
      <Link href="/" className={`${btn.primary} mt-6`} data-testid="link-home-404">Go to overview</Link>
    </div>
  );
}
