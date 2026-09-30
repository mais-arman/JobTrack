import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";

const require = createRequire(import.meta.url);
let { code } = await transform(await readFile(new URL("./gmail-analysis.ts", import.meta.url), "utf8"), { loader: "ts", format: "esm" });
for (const pkg of ["openai", "zod/v4"]) code = code.replace(`"${pkg}"`, JSON.stringify(pathToFileURL(require.resolve(pkg)).href));
const { validateAnalysis } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const message = { id: "synthetic", sender: "Recruiter", subject: "Your application", date: "2026-09-30", snippet: "Thanks for applying." };
const extraction = { companyName: null, position: null, opportunityType: null, status: null, applicationDate: null, interviewDate: null, interviewType: null, interviewLocation: null, interviewNotes: null, jobUrl: null };

test("unknown values stay null; unrelated emails cannot retain extracted fields", () => {
  const relevant = validateAnalysis({ relevant: true, reason: "Application confirmation.", extraction }, message);
  assert.deepEqual(relevant.extraction, extraction);
  const unrelated = validateAnalysis({ relevant: false, reason: "A newsletter.", extraction: { ...extraction, companyName: "Not an application" } }, message);
  assert.deepEqual(unrelated.extraction, extraction);
});

test("invented URLs are removed; literal job URLs are retained", () => {
  const value = { relevant: true, reason: "Recruiter outreach.", extraction: { ...extraction, jobUrl: "https://example.com/jobs/123" } };
  assert.equal(validateAnalysis(value, message).extraction.jobUrl, null);
  assert.equal(validateAnalysis(value, { ...message, snippet: "See https://example.com/jobs/123" }).extraction.jobUrl, value.extraction.jobUrl);
});

test("invalid dates, enums, script URLs, missing fields and unexpected fields are rejected", () => {
  for (const patch of [{ applicationDate: "2026-02-30" }, { status: "Maybe" }, { jobUrl: "javascript:alert(1)" }, { extra: "unsupported" }]) {
    assert.throws(() => validateAnalysis({ relevant: true, reason: "Test", extraction: { ...extraction, ...patch } }, message));
  }
  assert.throws(() => validateAnalysis({ relevant: true, reason: "Test", extraction: {} }, message));
});