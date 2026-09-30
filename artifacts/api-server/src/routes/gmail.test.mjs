import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";
import express from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const require = createRequire(import.meta.url);
let { code } = await transform(await readFile(new URL("./gmail.ts", import.meta.url), "utf8"), { loader: "ts", format: "esm" });
for (const pkg of ["express", "@replit/connectors-sdk"]) code = code.replace(`"${pkg}"`, JSON.stringify(pathToFileURL(require.resolve(pkg)).href));
const { default: router } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("Gmail is read-only, handles results/errors, and rejects production requests", async () => {
  const original = ReplitConnectors.prototype.proxy;
  const env = process.env.NODE_ENV;
  const deployment = process.env.REPLIT_DEPLOYMENT;
  const calls = [];
  let fail = false;
  ReplitConnectors.prototype.proxy = async (_provider, path, options) => {
    calls.push({ path, method: options.method });
    if (fail) return new Response("{}", { status: 401 });
    const data = path.includes("messages?") ? { messages: [{ id: "test-id" }], nextPageToken: "more" }
      : path.includes("messages/") ? { id: "test-id", snippet: "Thanks for applying.", internalDate: "1700000000000", payload: { headers: [{ name: "From", value: "Recruiter" }, { name: "Subject", value: "Application received" }] } }
      : {};
    return Response.json(data);
  };
  const app = express();
  app.use(express.json(), router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const request = path => fetch(`http://127.0.0.1:${server.address().port}/gmail/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  try {
    process.env.NODE_ENV = "development";
    delete process.env.REPLIT_DEPLOYMENT;
    assert.equal((await request("connect")).status, 200);
    const response = await request("search");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const result = await response.json();
    assert.equal(result.messages[0].sender, "Recruiter");
    assert.equal(result.messages[0].subject, "Application received");
    assert.equal(result.messages[0].snippet, "Thanks for applying.");
    assert.equal(result.hasMore, true);
    assert.ok(calls.every(call => call.method === "GET"));
    fail = true;
    assert.equal((await request("search")).status, 409);
    const count = calls.length;
    process.env.NODE_ENV = "production";
    assert.equal((await request("search")).status, 403);
    process.env.NODE_ENV = "development";
    process.env.REPLIT_DEPLOYMENT = "1";
    assert.equal((await request("connect")).status, 403);
    assert.equal(calls.length, count);
  } finally {
    ReplitConnectors.prototype.proxy = original;
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
    if (deployment === undefined) delete process.env.REPLIT_DEPLOYMENT; else process.env.REPLIT_DEPLOYMENT = deployment;
    server.close();
  }
});