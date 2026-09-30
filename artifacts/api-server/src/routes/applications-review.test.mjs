import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build, transform } from "esbuild";
import { readFile } from "node:fs/promises";
import express from "express";

const require = createRequire(import.meta.url);
const { code: tokenCode } = await transform(await readFile(new URL("../lib/gmail-review-token.ts", import.meta.url), "utf8"), { loader: "ts", format: "esm" });
const { createGmailReviewToken, verifyGmailReviewToken } = await import(`data:text/javascript;base64,${Buffer.from(tokenCode).toString("base64")}`);

test("Gmail review tokens contain only a message hash, are signed, expire and require a secret", () => {
  const previous = process.env.SESSION_SECRET;
  const now = Date.now;
  try {
    process.env.SESSION_SECRET = "test-only-secret";
    const messageId = "message-with-private-identifier";
    const token = createGmailReviewToken(messageId);
    assert.equal(verifyGmailReviewToken(token), createHash("sha256").update(messageId).digest("hex"));
    assert.ok(!token.includes(messageId));
    assert.throws(() => verifyGmailReviewToken(token.replace(/.$/, token.endsWith("0") ? "1" : "0")));
    const expiredAt = Math.floor(Date.now() / 1000) - 86400;
    const payload = `v1.${expiredAt}.${createHash("sha256").update(messageId).digest("hex")}`;
    assert.throws(() => verifyGmailReviewToken(`${payload}.${createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("hex")}`), /expired/);
    Date.now = () => now() - 60_000;
    assert.throws(() => verifyGmailReviewToken(token), /not yet valid/);
    delete process.env.SESSION_SECRET;
    assert.throws(() => createGmailReviewToken(messageId), /SESSION_SECRET/);
  } finally {
    Date.now = now;
    if (previous === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previous;
  }
});

// All route integration rows live in a unique schema, never in the user's application tables.
test("review imports deduplicate concurrently, match manual rows, and release keys on deletion", async (t) => {
  if (!process.env.DATABASE_URL || process.env.REPLIT_DEPLOYMENT === "1") {
    t.skip("Requires a development PostgreSQL database.");
    return;
  }
  const { drizzle } = require(createRequire(new URL("../../../../lib/db/package.json", import.meta.url)).resolve("drizzle-orm/node-postgres"));
  const pg = createRequire(new URL("../../../../lib/db/package.json", import.meta.url))("pg");
  const schema = `review_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
  const secret = process.env.SESSION_SECRET;
  const env = process.env.NODE_ENV;
  const deployment = process.env.REPLIT_DEPLOYMENT;
  let server;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`CREATE TABLE "${schema}".applications (LIKE public.applications INCLUDING ALL)`);
    await admin.query(`CREATE TABLE "${schema}".gmail_review_imports (
      message_key varchar(64) PRIMARY KEY NOT NULL,
      application_id uuid NOT NULL REFERENCES "${schema}".applications(id) ON DELETE CASCADE
    )`);
    globalThis.__gmailReviewTestDb = drizzle(pool);
    // Resolve only the DB module to the isolated connection; use the real route, schemas and SQL.
    const schemaPath = fileURLToPath(new URL("../../../../lib/db/src/schema/applications.ts", import.meta.url));
    const result = await build({
      entryPoints: [fileURLToPath(new URL("./applications.ts", import.meta.url))],
      bundle: true, platform: "node", format: "esm", write: false,
      external: ["express", "drizzle-orm", "drizzle-orm/*"],
      plugins: [{
        name: "isolated-db",
        setup(buildContext) {
          buildContext.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: "isolated-db", namespace: "test" }));
          buildContext.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: `export const db = globalThis.__gmailReviewTestDb; export { applicationsTable, gmailReviewImportsTable } from ${JSON.stringify(schemaPath)};`,
            resolveDir: fileURLToPath(new URL("../../../../lib/db", import.meta.url)),
            loader: "js",
          }));
        },
      }],
    });
    // Bundle workspace TS dependencies but load third-party modules from this package.
    let code = result.outputFiles[0].text;
    for (const pkg of ["express", "drizzle-orm", "drizzle-orm/pg-core"]) {
      if (code.includes(`"${pkg}"`)) code = code.replaceAll(`"${pkg}"`, JSON.stringify(pathToFileURL(require.resolve(pkg)).href));
    }
    const { default: router } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const app = express();
    app.use(express.json(), (req, _res, next) => { req.log = { warn() {} }; next(); }, router);
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    process.env.NODE_ENV = "development";
    delete process.env.REPLIT_DEPLOYMENT;
    process.env.SESSION_SECRET = "test-only-secret";
    const base = `http://127.0.0.1:${server.address().port}/applications`;
    const body = (companyName, positionTitle, source = "Gmail", jobUrl = "") => ({
      companyName, positionTitle, source, jobUrl, opportunityType: "Full-time", workMode: "Remote",
      applicationDate: "2025-01-01", status: "Applied", interviewDate: "", interviewTime: "",
      interviewType: "", interviewLocation: "", interviewNotes: "", notes: "",
    });
    const post = async (data, token) => {
      const res = await fetch(base, { method: "POST", headers: {
        "Content-Type": "application/json", ...(token ? { "X-JobTrack-Gmail-Review": token } : {}),
      }, body: JSON.stringify(data) });
      return { status: res.status, data: await res.json() };
    };
    const firstToken = createGmailReviewToken("concurrent-message");
    const duplicates = await Promise.all(Array.from({ length: 5 }, () => post(body(" Acme  Inc ", "Designer"), firstToken)));
    assert.deepEqual(duplicates.map(result => result.status).sort(), [200, 200, 200, 200, 201]);
    assert.equal(new Set(duplicates.map(result => result.data.id)).size, 1);
    const byName = await post(body("acme inc", "DESIGNER"), createGmailReviewToken("different-message"));
    assert.equal(byName.status, 200);
    assert.equal(byName.data.id, duplicates[0].data.id);
    const manual = await post(body("Manual Co", "Engineer", "Manual", "https://example.com/job"));
    assert.equal(manual.status, 201);
    const byUrl = await post(body("Other Co", "Other role", "Gmail", "https://example.com/job"), createGmailReviewToken("url-message"));
    assert.equal(byUrl.status, 200);
    assert.equal(byUrl.data.id, manual.data.id);
    const repeated = await post(body("No match", "No match"), createGmailReviewToken("url-message"));
    assert.equal(repeated.status, 200);
    assert.equal(repeated.data.id, manual.data.id);
    const forbidden = await post(body("Forbidden", "Role"), "invalid");
    assert.equal(forbidden.status, 400);
    const wrongSource = await post(body("Other", "Role", "Manual"), createGmailReviewToken("wrong-source"));
    assert.equal(wrongSource.status, 400);
    const remove = await fetch(`${base}/${manual.data.id}`, { method: "DELETE" });
    assert.equal(remove.status, 204);
    const readd = await post(body("Brand new", "Role"), createGmailReviewToken("url-message"));
    assert.equal(readd.status, 201);
    const count = await pool.query("SELECT count(*)::integer AS count FROM applications");
    assert.equal(count.rows[0].count, 2);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    delete globalThis.__gmailReviewTestDb;
    if (secret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = secret;
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
    if (deployment === undefined) delete process.env.REPLIT_DEPLOYMENT; else process.env.REPLIT_DEPLOYMENT = deployment;
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});