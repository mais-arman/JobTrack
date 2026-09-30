export const OPPORTUNITY_TYPES = ["Full-time", "Part-time", "Internship", "Training", "Train-to-Hire", "Freelance"] as const;
export const WORK_MODES = ["On-site", "Remote", "Hybrid"] as const;
export const STATUSES = [
  "Saved", "Applied", "Under Review", "Assessment", "Interview", "Technical Interview",
  "Final Interview", "Offer", "Accepted", "Rejected", "Withdrawn",
] as const;
export const SOURCES = ["Manual", "Gmail"] as const;
export const CLOSED_STATUSES: readonly Status[] = ["Accepted", "Rejected", "Withdrawn"];

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type Status = (typeof STATUSES)[number];
export type Source = (typeof SOURCES)[number];

export interface Application {
  id: string;
  companyName: string;
  positionTitle: string;
  opportunityType: OpportunityType;
  workMode: WorkMode;
  applicationDate: string; // YYYY-MM-DD (local, date-only)
  status: Status;
  interviewDate: string; // "" or YYYY-MM-DD
  interviewTime: string; // "" or HH:MM
  interviewType: string;
  interviewLocation: string;
  interviewNotes: string;
  jobUrl: string;
  notes: string;
  source: Source;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationInput = Omit<Application, "id" | "createdAt" | "updatedAt">;

export const isClosed = (s: Status) => CLOSED_STATUSES.includes(s);

export type Tone = "neutral" | "progress" | "interview" | "offer" | "closed-good" | "closed-bad";
export function statusTone(s: Status): Tone {
  switch (s) {
    case "Saved": return "neutral";
    case "Applied": case "Under Review": case "Assessment": return "progress";
    case "Interview": case "Technical Interview": case "Final Interview": return "interview";
    case "Offer": return "offer";
    case "Accepted": return "closed-good";
    default: return "closed-bad";
  }
}

// ---------- dates (local, never via UTC parsing) ----------
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseLocalDate(s: string): Date | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
  return d;
}
export const isValidDate = (s: string) => parseLocalDate(s) !== null;
export const isValidTime = (s: string) => TIME_RE.test(s);

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(s: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  const d = parseLocalDate(s);
  return d ? d.toLocaleDateString(undefined, opts) : "—";
}
export function formatTime(t: string) {
  if (!isValidTime(t)) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function interviewMoment(a: Application): Date | null {
  const d = parseLocalDate(a.interviewDate);
  if (!d) return null;
  if (isValidTime(a.interviewTime)) {
    const [h, m] = a.interviewTime.split(":").map(Number);
    d.setHours(h, m);
  } else d.setHours(23, 59, 59); // date-only: counts as upcoming for the whole day
  return d;
}

export function upcomingInterviews(apps: Application[], now = new Date()) {
  return apps
    .filter((a) => !isClosed(a.status))
    .map((a) => ({ app: a, at: interviewMoment(a) }))
    .filter((x): x is { app: Application; at: Date } => !!x.at && x.at.getTime() >= now.getTime())
    .sort((x, y) => x.at.getTime() - y.at.getTime());
}

export function relativeDay(s: string): string {
  const d = parseLocalDate(s);
  if (!d) return "";
  const t = parseLocalDate(todayISO())!;
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return "";
}

export function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname;
  } catch { return false; }
}

// ---------- validation ----------
export type FieldErrors = Partial<Record<keyof ApplicationInput, string>>;
export function validate(input: ApplicationInput): FieldErrors {
  const e: FieldErrors = {};
  if (!input.companyName.trim()) e.companyName = "Company name is required.";
  if (!input.positionTitle.trim()) e.positionTitle = "Position title is required.";
  if (!OPPORTUNITY_TYPES.includes(input.opportunityType)) e.opportunityType = "Choose an opportunity type.";
  if (!WORK_MODES.includes(input.workMode)) e.workMode = "Choose a work mode.";
  if (!STATUSES.includes(input.status)) e.status = "Choose a status.";
  if (!SOURCES.includes(input.source)) e.source = "Choose a source.";
  if (!input.applicationDate) e.applicationDate = "Application date is required.";
  else if (!isValidDate(input.applicationDate)) e.applicationDate = "Enter a valid date.";
  if (input.interviewDate && !isValidDate(input.interviewDate)) e.interviewDate = "Enter a valid date.";
  if (input.interviewTime && !isValidTime(input.interviewTime)) e.interviewTime = "Enter a valid time.";
  if (input.interviewTime && !input.interviewDate) e.interviewDate = "Add a date for this interview time.";
  if (input.jobUrl.trim() && !isHttpUrl(input.jobUrl.trim())) e.jobUrl = "Use a full link starting with http:// or https://";
  const loc = input.interviewLocation.trim();
  if (/^[a-z]+:\/\//i.test(loc) && !isHttpUrl(loc)) e.interviewLocation = "Links must start with http:// or https://";
  return e;
}

export function emptyInput(): ApplicationInput {
  return {
    companyName: "", positionTitle: "", opportunityType: "Full-time", workMode: "On-site",
    applicationDate: todayISO(), status: "Applied", interviewDate: "", interviewTime: "",
    interviewType: "", interviewLocation: "", interviewNotes: "", jobUrl: "", notes: "", source: "Manual",
  };
}

function str(v: unknown) { return typeof v === "string" ? v : ""; }
/** Coerce unknown stored data to a valid Application, or null if unusable. */
export function sanitize(raw: unknown): Application | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!str(r.id) || !str(r.companyName) || !str(r.positionTitle)) return null;
  const pick = <T extends string>(list: readonly T[], v: unknown, d: T) => (list.includes(v as T) ? (v as T) : d);
  return {
    id: str(r.id), companyName: str(r.companyName), positionTitle: str(r.positionTitle),
    opportunityType: pick(OPPORTUNITY_TYPES, r.opportunityType, "Full-time"),
    workMode: pick(WORK_MODES, r.workMode, "On-site"),
    applicationDate: isValidDate(str(r.applicationDate)) ? str(r.applicationDate) : "",
    status: pick(STATUSES, r.status, "Applied"),
    interviewDate: isValidDate(str(r.interviewDate)) ? str(r.interviewDate) : "",
    interviewTime: isValidTime(str(r.interviewTime)) ? str(r.interviewTime) : "",
    interviewType: str(r.interviewType), interviewLocation: str(r.interviewLocation),
    interviewNotes: str(r.interviewNotes), jobUrl: str(r.jobUrl), notes: str(r.notes),
    source: pick(SOURCES, r.source, "Manual"),
    createdAt: str(r.createdAt) || new Date().toISOString(), updatedAt: str(r.updatedAt) || new Date().toISOString(),
  };
}
