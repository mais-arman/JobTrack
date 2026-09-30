import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { AnalyzeGmailBody } from "@workspace/api-zod";
import { analyzeEmail } from "../lib/gmail-analysis";
import { createGmailReviewToken } from "../lib/gmail-review-token";
import { gmailEnabled } from "./gmail";

const router: IRouter = Router();
let inFlight = 0;

router.post("/gmail/analyze", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  if (!gmailEnabled()) {
    res.status(403).json({ error: "Gmail analysis is available only in the development preview." });
    return;
  }
  const input = AnalyzeGmailBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Invalid email preview. Please search Gmail again and retry." });
    return;
  }
  if (inFlight >= 2) {
    res.status(429).json({ error: "Two emails are already being analyzed. Please wait and try again." });
    return;
  }
  inFlight++;
  try {
    const result = await analyzeEmail(input.data.message);
    res.json({ ...result, reviewToken: result.relevant ? createGmailReviewToken(input.data.message.id) : null });
  } catch (error) {
    // Do not log provider errors or response bodies: they may contain email text.
    const rateLimited = error instanceof OpenAI.APIError && error.status === 429;
    const unavailable = error instanceof OpenAI.APIConnectionError || error instanceof Error && error.message === "AI_NOT_CONFIGURED";
    res.status(rateLimited ? 429 : unavailable ? 503 : 502).json({
      error: rateLimited ? "The AI service is busy. Please wait a minute and retry."
        : unavailable ? "The AI service is unavailable. Your email and applications have not been changed. Please retry."
        : "The AI service could not produce a valid analysis. Nothing was saved. Please retry.",
    });
  } finally { inFlight--; }
});

export default router;