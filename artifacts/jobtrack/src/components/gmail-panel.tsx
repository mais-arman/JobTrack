import { useState } from "react";
import { Mail } from "lucide-react";
import { btn } from "./jt";
import { GmailReviewCard, type Message } from "./gmail-review-card";
const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/gmail`;

export function GmailPanel() {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ messages: Message[]; hasMore: boolean } | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  async function run(action: "connect" | "search") {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${API}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "search" ? { query } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gmail is unavailable. Please try again.");
      if (action === "connect") setConnected(true);
      else { setIgnored(new Set()); setResult(data); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to Gmail.");
    } finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="gmail-title" className="mb-6 rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="gmail-title" className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" /> Gmail <span className="text-xs font-normal text-muted-foreground">Development preview only</span></h2>
        {!connected && <button className={btn.primary} disabled={busy} onClick={() => void run("connect")}>Connect Gmail</button>}
        {connected && <span className="text-xs text-muted-foreground">Connected · Read-only</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Uses the workspace’s existing Replit Gmail connection, not a separate account per visitor. Anyone with preview access can check this mailbox. Emails are never changed. Applications are saved only when you choose Add to JobTrack.</p>
      {connected && <form className="mt-4 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void run("search"); }}>
        <label className="flex-1 min-w-0 text-sm">Optional Gmail search
          <input className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" value={query} maxLength={500} onChange={e => setQuery(e.target.value)} placeholder="Leave blank to find job-related emails from the last 180 days" />
        </label>
        <button className={`${btn.primary} self-end`} disabled={busy} type="submit">Check Gmail</button>
      </form>}
      {busy && <p role="status" className="mt-3 text-sm">Checking Gmail…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {result && <div className="mt-4" aria-live="polite">
        <p className="text-sm text-muted-foreground">{result.messages.length === 0 ? "No matching emails found. Try a different search." : `${result.messages.length} potentially relevant emails. Keyword matches are not confirmed applications.${result.hasMore ? " Showing the first 20 matches; narrow your search to see others." : ""}`}</p>
        <ul className="mt-3 divide-y divide-border">
          {result.messages.filter(m => !ignored.has(m.id)).map(message => <GmailReviewCard key={message.id} message={message} onIgnore={() => setIgnored(prev => new Set(prev).add(message.id))} />)}
        </ul>
      </div>}
    </section>
  );
}