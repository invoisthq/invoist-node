// Checks the built package as a user gets it: both the ES module and the
// CommonJS entry points, through the package's own `exports` map. Runs
// after `npm run build` (the test script builds first).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, test } from "node:test";

const require = createRequire(import.meta.url);

interface Entry {
  Invoist: new (options: { apiKey: string }) => { baseUrl: string };
  InvoistError: new (init: { message: string; status: number; code: string }) => Error;
  VERSION: string;
  default: unknown;
}

describe("built package", () => {
  test("import and require give the same API", async () => {
    const esm = (await import("@invoist/sdk")) as unknown as Entry;
    const cjs = require("@invoist/sdk") as Entry;
    for (const entry of [esm, cjs]) {
      assert.equal(typeof entry.Invoist, "function");
      assert.equal(entry.default, entry.Invoist);
      assert.equal(new entry.Invoist({ apiKey: "k" }).baseUrl, "https://api.invoi.st");
    }
    assert.equal(esm.VERSION, cjs.VERSION);
  });

  test("an error from one build is an instance of the other's class", async () => {
    const esm = (await import("@invoist/sdk")) as unknown as Entry;
    const cjs = require("@invoist/sdk") as Entry;
    assert.notEqual(esm.InvoistError, cjs.InvoistError);
    assert.ok(new cjs.InvoistError({ message: "x", status: 1, code: "c" }) instanceof esm.InvoistError);
    assert.ok(new esm.InvoistError({ message: "x", status: 1, code: "c" }) instanceof cjs.InvoistError);
  });

  test("the webhooks subpath loads both ways", async () => {
    const esm = (await import("@invoist/sdk/webhooks")) as { verifyWebhook: unknown };
    const cjs = require("@invoist/sdk/webhooks") as { verifyWebhook: unknown };
    assert.equal(typeof esm.verifyWebhook, "function");
    assert.equal(typeof cjs.verifyWebhook, "function");
  });

  test("the main entry imports no Node built-ins", async () => {
    const { readFile } = await import("node:fs/promises");
    for (const dir of ["esm", "cjs"]) {
      for (const file of ["index.js", "client.js", "http.js", "files.js", "errors.js", "events.js"]) {
        const source = await readFile(new URL(`../dist/${dir}/${file}`, import.meta.url), "utf8");
        assert.ok(!/(from |require\()"node:/.test(source), `${dir}/${file} must not import a Node built-in`);
      }
    }
  });
});
