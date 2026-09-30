import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

export const gmailEnabled = () => process.env.NODE_ENV === "development" && process.env.REPLIT_DEPLOYMENT !== "1";
const router: IRouter = Router();
const DEFAULT_QUERY = 'newer_than:180d -in:sent -in:drafts {"your application" "application received" "thank you for applying" "job application" interview recruiter "job offer" "application status"}';

class GmailError extends Error {
  constructor(public status: number) { super("Gmail request failed"); }
}

interface GmailMessage { id: string; snippet?: string; internalDate?: string; payload?: { headers?: { name: string; value: string }[] } }
async function readGmail<T = unknown>(path: string): Promise<T> {
  const response = await new ReplitConnectors().proxy("google-mail", `/gmail/v1/users/me/${path}`, { method: "GET" });
  if (!response.ok) throw new GmailError(response.status);
  return await response.json() as T;
}

router.use("/gmail", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!gmailEnabled()) {
    res.status(403).json({ error: "Gmail is available only in the development preview." });
    return;
  }
  next();
});

function fail(res: import("express").Response, error: unknown) {
  const status = error instanceof GmailError ? error.status : 503;
  res.status(status === 401 || status === 403 ? 409 : status === 429 ? 429 : 502).json({
    error: status === 401 || status === 403
      ? "Gmail authorization is unavailable. Reconnect the Gmail integration in Replit, then try Connect Gmail again."
      : status === 429 ? "Gmail is temporarily rate-limited. Please wait a minute and try again."
      : "Could not reach the Gmail connector. Check the Gmail integration in Replit and try again.",
  });
}

// This verifies the existing Replit-managed OAuth grant; it does not create a separate OAuth flow.
router.post("/gmail/connect", async (_req, res) => {
  try {
    await readGmail("profile?fields=emailAddress");
    res.json({ connected: true });
  } catch (error) { fail(res, error); }
});

router.post("/gmail/search", async (req, res) => {
  const query = req.body?.query;
  if (query !== undefined && (typeof query !== "string" || query.length > 500)) {
    res.status(400).json({ error: "Enter a Gmail search of at most 500 characters." });
    return;
  }
  try {
    const params = new URLSearchParams({ q: query?.trim() || DEFAULT_QUERY, maxResults: "20", includeSpamTrash: "false" });
    const list = await readGmail<{ messages?: { id: string }[]; nextPageToken?: string }>(`messages?${params}`);
    const messages = [];
    // Bounded sequential reads avoid flooding the connector and never mark messages read.
    for (const item of list.messages ?? []) {
      const detailParams = new URLSearchParams({ format: "metadata", fields: "id,snippet,internalDate,payload/headers" });
      for (const name of ["From", "Subject", "Date"]) detailParams.append("metadataHeaders", name);
      const message = await readGmail<GmailMessage>(`messages/${encodeURIComponent(item.id)}?${detailParams}`);
      const header = (name: string) => message.payload?.headers?.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value;
      messages.push({
        id: message.id,
        sender: header("From") || "Unknown sender",
        subject: header("Subject") || "(No subject)",
        date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : header("Date") || "",
        snippet: message.snippet || "",
      });
    }
    res.json({ messages, hasMore: Boolean(list.nextPageToken) });
  } catch (error) { fail(res, error); }
});

export default router;