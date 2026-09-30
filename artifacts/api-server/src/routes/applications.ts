import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, applicationsTable, type ApplicationRow } from "@workspace/db";
import {
  CreateApplicationBody,
  CreateApplicationResponse,
  DeleteApplicationParams,
  GetApplicationParams,
  GetApplicationResponse,
  ListApplicationsResponse,
  UpdateApplicationBody,
  UpdateApplicationParams,
  UpdateApplicationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
type Input = ReturnType<typeof CreateApplicationBody.parse>;
const editableFields = new Set([
  "companyName", "positionTitle", "opportunityType", "workMode", "applicationDate",
  "status", "interviewDate", "interviewTime", "interviewType", "interviewLocation",
  "interviewNotes", "jobUrl", "notes", "source",
]);

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname;
  } catch {
    return false;
  }
}

function parseInput(body: unknown): { data: Input } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Expected an application object." };
  if (Object.keys(body).some((key) => !editableFields.has(key))) return { error: "Request contains unknown or server-owned fields." };
  const parsed = CreateApplicationBody.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "Body"}: ${issue.message}` };
  }
  const data = parsed.data;
  if (!data.companyName.trim() || !data.positionTitle.trim()) return { error: "Company name and position title must not be blank." };
  if (!validDate(data.applicationDate)) return { error: "Application date must be a valid YYYY-MM-DD date." };
  if (data.interviewDate && !validDate(data.interviewDate)) return { error: "Interview date must be a valid YYYY-MM-DD date." };
  if (data.interviewTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.interviewTime)) return { error: "Interview time must be HH:MM." };
  if (data.interviewTime && !data.interviewDate) return { error: "Interview date is required when interview time is set." };
  if (data.jobUrl.trim() && !validHttpUrl(data.jobUrl.trim())) return { error: "Job URL must begin with http:// or https://." };
  const location = data.interviewLocation.trim();
  if (/^[a-z]+:\/\//i.test(location) && !validHttpUrl(location)) return { error: "Interview location URL must begin with http:// or https://." };
  return { data };
}

function values(input: Input) {
  return {
    companyName: input.companyName.trim(),
    position: input.positionTitle.trim(),
    opportunityType: input.opportunityType,
    workMode: input.workMode,
    applicationDate: input.applicationDate,
    status: input.status,
    interviewDate: input.interviewDate || null,
    interviewTime: input.interviewTime,
    interviewType: input.interviewType.trim(),
    interviewLocation: input.interviewLocation.trim(),
    interviewNotes: input.interviewNotes,
    jobUrl: input.jobUrl.trim(),
    notes: input.notes,
    source: input.source,
  };
}

function entity(row: ApplicationRow) {
  const { position, createdAt, updatedAt, interviewDate, ...rest } = row;
  return {
    ...rest,
    positionTitle: position,
    interviewDate: interviewDate ?? "",
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

router.get("/applications", async (_req, res): Promise<void> => {
  const rows = await db.select().from(applicationsTable).orderBy(desc(applicationsTable.createdAt), desc(applicationsTable.id));
  res.json(ListApplicationsResponse.parse(rows.map(entity)));
});

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = parseInput(req.body);
  if ("error" in parsed) {
    req.log.warn({ validationError: parsed.error }, "Invalid application input");
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [row] = await db.insert(applicationsTable).values(values(parsed.data)).returning();
  res.status(201).json(CreateApplicationResponse.parse(entity(row)));
});

router.get("/applications/:id", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid application ID." });
    return;
  }
  const [row] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Application not found." });
    return;
  }
  res.json(GetApplicationResponse.parse(entity(row)));
});

router.put("/applications/:id", async (req, res): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid application ID." });
    return;
  }
  // PUT replaces the full editable representation; partial bodies are invalid.
  const body = UpdateApplicationBody.safeParse(req.body);
  const parsed = parseInput(req.body);
  if (!body.success || "error" in parsed) {
    const error = "error" in parsed ? parsed.error : "Invalid application input.";
    req.log.warn({ validationError: error }, "Invalid application input");
    res.status(400).json({ error });
    return;
  }
  const [row] = await db.update(applicationsTable)
    .set({ ...values(parsed.data), updatedAt: new Date() })
    .where(eq(applicationsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Application not found." });
    return;
  }
  res.json(UpdateApplicationResponse.parse(entity(row)));
});

router.delete("/applications/:id", async (req, res): Promise<void> => {
  const params = DeleteApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid application ID." });
    return;
  }
  const [row] = await db.delete(applicationsTable).where(eq(applicationsTable.id, params.data.id)).returning({ id: applicationsTable.id });
  if (!row) {
    res.status(404).json({ error: "Application not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;