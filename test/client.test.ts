import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, test } from "node:test";

import { type Clock, HttpClient, retryDelay, USER_AGENT } from "../src/http.ts";
import {
  Invoist,
  InvoistError,
  type RequestOptions,
  VERSION,
  WEBHOOK_EVENT_TYPES,
  WebhookEvents,
} from "../src/index.ts";
import { fakeFetch, first, json, noContent } from "./helpers.ts";

const DOC_ID = "01a19812-0000-7000-8000-0000000000aa";

const doc = {
  id: DOC_ID,
  source: "api",
  original_filename: "invoice.pdf",
  content_type: "application/pdf",
  byte_size: 3,
  status: "pending",
  created_at: "2026-11-01T10:40:00Z",
  updated_at: "2026-11-01T10:40:00Z",
};

function extraction(status: "pending" | "done" | "failed") {
  return {
    id: "01a19812-0000-7000-8000-0000000000bb",
    document_id: DOC_ID,
    engine: "invoist-extraction-v1",
    status,
    created_at: "2026-11-01T10:40:00Z",
    updated_at: "2026-11-01T10:40:00Z",
  };
}

function client(...replies: Parameters<typeof fakeFetch>) {
  const fake = fakeFetch(...replies);
  return { invoist: new Invoist({ apiKey: "inv_sk_test", baseUrl: "https://api.test/", fetch: fake.fetch }), ...fake };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => assert.fail("expected the call to reject"),
    (err: unknown) => err,
  );
}

describe("construction", () => {
  test("an empty key fails before any request", () => {
    const { fetch, calls } = fakeFetch(json({}));
    assert.throws(() => new Invoist({ apiKey: "", fetch }), /API key is required/);
    assert.throws(() => new Invoist({ apiKey: "   ", fetch }), /API key is required/);
    assert.equal(calls.length, 0);
  });

  test("trailing slashes are trimmed from the base URL", () => {
    const { fetch } = fakeFetch(json({}));
    assert.equal(new Invoist({ apiKey: "k", baseUrl: "https://x.test///", fetch }).baseUrl, "https://x.test");
    assert.equal(new Invoist({ apiKey: "k", fetch }).baseUrl, "https://api.invoi.st");
  });

  test("VERSION matches package.json", async () => {
    const { readFile } = await import("node:fs/promises");
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    assert.equal(VERSION, pkg.version);
  });
});

describe("headers", () => {
  test("auth, accept and user agent on every request", async () => {
    const { invoist, calls } = client(json({ categories: [] }));
    await invoist.listCategories();
    const { headers } = first(calls);
    assert.equal(headers.get("authorization"), "Bearer inv_sk_test");
    assert.equal(headers.get("accept"), "application/json");
    assert.equal(headers.get("user-agent"), USER_AGENT);
    assert.match(USER_AGENT, /^invoist-node\/\d+\.\d+\.\d+ \(node \d+\.\d+\.\d+\)$/);
    assert.equal(USER_AGENT, `invoist-node/${VERSION} (node ${process.versions.node})`);
    assert.equal(headers.get("content-type"), null, "no body, no content type");
  });

  test("JSON bodies are sent as application/json", async () => {
    const { invoist, calls } = client(json({ review_queue_item: {} }));
    await invoist.resolveReviewItem("r1", "dismissed");
    const call = first(calls);
    assert.equal(call.headers.get("content-type"), "application/json");
    assert.deepEqual(await call.request.json(), { status: "dismissed" });
  });
});

describe("query encoding", () => {
  test("booleans are true/false, empties are left out", async () => {
    const { invoist, calls } = client(json({ documents: [] }));
    await invoist.listDocuments({ flagged: true, q: "", limit: 10, offset: 0, status: undefined });
    assert.equal(first(calls).url.search, "?limit=10&offset=0&flagged=true");

    const second = client(json({ bills: [] }));
    await second.invoist.bills.list({ paid: false });
    assert.equal(first(second.calls).url.search, "?paid=false");
  });

  test("flagged is sent only when true", async () => {
    const { invoist, calls } = client(json({ documents: [] }));
    await invoist.listDocuments({ flagged: false });
    assert.equal(first(calls).url.search, "");
  });

  test("no filters, no query string", async () => {
    const { invoist, calls } = client(json({ bills: [] }));
    await invoist.bills.list();
    assert.equal(first(calls).url.search, "");
  });

  test("months and dates accept a string or a Date", async () => {
    const { invoist, calls } = client(json({ bills: [] }), json({}), json({}), json({}));
    await invoist.bills.list({ month: new Date(2026, 0, 31), sender: "Northwind Oy", q: "a&b" });
    await invoist.bills.stats({ month: "2026-02" });
    await invoist.bills.summary({ today: new Date(2026, 10, 1), days: 7 });
    await invoist.bills.summary({ today: "2026-11-02" });
    const [list, stats, summary, summary2] = calls.map((c) => c.url.searchParams);
    assert.equal(list?.get("month"), "2026-01");
    assert.equal(list?.get("sender"), "Northwind Oy");
    assert.equal(list?.get("q"), "a&b");
    assert.equal(stats?.get("month"), "2026-02");
    assert.equal(summary?.get("today"), "2026-11-01");
    assert.equal(summary?.get("days"), "7");
    assert.equal(summary2?.get("today"), "2026-11-02");
  });

  test("ids are escaped into the path", async () => {
    const { invoist, calls } = client(json({ document: doc, review_queue: [] }));
    await invoist.getDocument("a/b c");
    assert.equal(first(calls).url.pathname, "/v1/documents/a%2Fb%20c");
  });
});

describe("every method hits the right method and path", () => {
  const cases: {
    name: string;
    method: string;
    path: string;
    reply: Response;
    call: (c: Invoist) => Promise<unknown>;
    returns?: unknown;
  }[] = [
    {
      name: "extract",
      method: "POST",
      path: "/v1/extract",
      reply: json({ document: doc, extraction: extraction("pending"), duplicate: false }, 201),
      call: (c) => c.extract({ data: new Uint8Array([1]), filename: "a.pdf" }),
    },
    {
      name: "extractBatch",
      method: "POST",
      path: "/v1/extract/batch",
      reply: json({ results: [], accepted: 0, rejected: 0 }),
      call: (c) => c.extractBatch([{ data: new Uint8Array([1]), filename: "a.pdf" }]),
      returns: { results: [], accepted: 0, rejected: 0 },
    },
    {
      name: "listDocuments",
      method: "GET",
      path: "/v1/documents",
      reply: json({ documents: [doc] }),
      call: (c) => c.listDocuments(),
      returns: [doc],
    },
    {
      name: "getDocument",
      method: "GET",
      path: `/v1/documents/${DOC_ID}`,
      reply: json({ document: doc, review_queue: [] }),
      call: (c) => c.getDocument(DOC_ID),
      returns: { document: doc, review_queue: [] },
    },
    {
      name: "getDocumentFile",
      method: "GET",
      path: `/v1/documents/${DOC_ID}/file`,
      reply: new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "application/pdf" } }),
      call: (c) => c.getDocumentFile(DOC_ID),
    },
    {
      name: "listReviewQueue",
      method: "GET",
      path: "/v1/review-queue",
      reply: json({ review_queue: [{ id: "r1" }] }),
      call: (c) => c.listReviewQueue({ status: "pending" }),
      returns: [{ id: "r1" }],
    },
    {
      name: "resolveReviewItem",
      method: "POST",
      path: "/v1/review-queue/r1/resolve",
      reply: json({ review_queue_item: { id: "r1", status: "resolved" } }),
      call: (c) => c.resolveReviewItem("r1"),
      returns: { id: "r1", status: "resolved" },
    },
    {
      name: "listCategories",
      method: "GET",
      path: "/v1/categories",
      reply: json({ categories: [{ id: "c1" }] }),
      call: (c) => c.listCategories(),
      returns: [{ id: "c1" }],
    },
    {
      name: "getUsage",
      method: "GET",
      path: "/v1/usage",
      reply: json({ total_calls: 1 }),
      call: (c) => c.getUsage(),
      returns: { total_calls: 1 },
    },
    {
      name: "getStats",
      method: "GET",
      path: "/v1/stats/overview",
      reply: json({ documents_total: 1 }),
      call: (c) => c.getStats(),
      returns: { documents_total: 1 },
    },
    {
      name: "listWebhookEndpoints",
      method: "GET",
      path: "/v1/webhook-endpoints",
      reply: json({ endpoints: [], known_events: ["document.created"] }),
      call: (c) => c.listWebhookEndpoints(),
      returns: { endpoints: [], known_events: ["document.created"] },
    },
    {
      name: "createWebhookEndpoint",
      method: "POST",
      path: "/v1/webhook-endpoints",
      reply: json({ endpoint: { id: "w1", secret: "whsec_x" } }, 201),
      call: (c) => c.createWebhookEndpoint({ url: "https://example.test/hook", events: ["extraction.completed"] }),
      returns: { id: "w1", secret: "whsec_x" },
    },
    {
      name: "deleteWebhookEndpoint",
      method: "DELETE",
      path: "/v1/webhook-endpoints/w1",
      reply: noContent(),
      call: (c) => c.deleteWebhookEndpoint("w1"),
      returns: undefined,
    },
    {
      name: "bills.list",
      method: "GET",
      path: "/v1/bills",
      reply: json({ bills: [{ id: "b1" }] }),
      call: (c) => c.bills.list({ paid: false }),
      returns: [{ id: "b1" }],
    },
    {
      name: "bills.get",
      method: "GET",
      path: "/v1/bills/b1",
      reply: json({ document: doc, review_queue: [], bill: {} }),
      call: (c) => c.bills.get("b1"),
      returns: { document: doc, review_queue: [], bill: {} },
    },
    {
      name: "bills.getFile",
      method: "GET",
      path: "/v1/bills/b1/file",
      reply: new Response(new Uint8Array([9]), { headers: { "Content-Type": "image/png" } }),
      call: (c) => c.bills.getFile("b1"),
    },
    {
      name: "bills.summary",
      method: "GET",
      path: "/v1/bills/summary",
      reply: json({ unpaid: 2 }),
      call: (c) => c.bills.summary(),
      returns: { unpaid: 2 },
    },
    {
      name: "bills.stats",
      method: "GET",
      path: "/v1/bills/stats",
      reply: json({ month: "2026-11" }),
      call: (c) => c.bills.stats(),
      returns: { month: "2026-11" },
    },
    {
      name: "bills.markPaid",
      method: "POST",
      path: "/v1/bills/b1/paid",
      reply: json({ bill: { paid_at: "2026-11-01T10:00:00Z", paid_by: "u1", assigned_to: null } }),
      call: (c) => c.bills.markPaid("b1"),
      returns: { paid_at: "2026-11-01T10:00:00Z", paid_by: "u1", assigned_to: null },
    },
    {
      name: "bills.markUnpaid",
      method: "DELETE",
      path: "/v1/bills/b1/paid",
      reply: json({ bill: { paid_at: null, paid_by: null, assigned_to: null } }),
      call: (c) => c.bills.markUnpaid("b1"),
      returns: { paid_at: null, paid_by: null, assigned_to: null },
    },
    {
      name: "heldEmails.list",
      method: "GET",
      path: "/v1/held-emails",
      reply: json({ held_emails: [{ id: "h1" }] }),
      call: (c) => c.heldEmails.list(),
      returns: [{ id: "h1" }],
    },
  ];

  for (const c of cases) {
    test(c.name, async () => {
      const { invoist, calls } = client(c.reply);
      const result = await c.call(invoist);
      assert.equal(calls.length, 1);
      assert.equal(first(calls).method, c.method);
      assert.equal(first(calls).url.origin, "https://api.test");
      assert.equal(first(calls).url.pathname, c.path);
      if ("returns" in c) assert.deepEqual(result, c.returns);
    });
  }

  test("createWebhookEndpoint sends url, events and description", async () => {
    const { invoist, calls } = client(json({ endpoint: { id: "w1", secret: "s" } }, 201));
    await invoist.createWebhookEndpoint({
      url: "https://example.test/hook",
      events: [WebhookEvents.ExtractionCompleted],
      description: "Bookkeeping",
    });
    assert.deepEqual(await first(calls).request.json(), {
      url: "https://example.test/hook",
      events: ["extraction.completed"],
      description: "Bookkeeping",
    });
  });

  test("resolveReviewItem defaults to resolved", async () => {
    const { invoist, calls } = client(json({ review_queue_item: {} }));
    await invoist.resolveReviewItem("r1");
    assert.deepEqual(await first(calls).request.json(), { status: "resolved" });
  });
});

describe("uploads", () => {
  test("extract sends one multipart file with the boundary set by fetch", async () => {
    const { invoist, calls } = client(
      json({ document: doc, extraction: extraction("pending"), duplicate: false }, 201),
    );
    const result = await invoist.extract(
      { data: new Uint8Array([37, 80, 68, 70]), filename: "lasku.pdf" },
      { idempotencyKey: "job-42" },
    );
    assert.equal(result.duplicate, false);
    const call = first(calls);
    assert.match(call.headers.get("content-type") ?? "", /^multipart\/form-data; boundary=/);
    assert.equal(call.headers.get("idempotency-key"), "job-42");
    const form = await call.request.formData();
    const file = form.get("file");
    assert.ok(file instanceof File);
    assert.equal(file.name, "lasku.pdf");
    assert.equal(file.type, "application/pdf");
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([37, 80, 68, 70]));
  });

  test("no Idempotency-Key unless given", async () => {
    const { invoist, calls } = client(json({ document: doc, duplicate: true }));
    await invoist.extract(new File([new Uint8Array([1])], "a.png", { type: "image/png" }));
    assert.equal(first(calls).headers.get("idempotency-key"), null);
  });

  test("accepts a File, a Blob, an ArrayBuffer, streams and a path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "invoist-sdk-"));
    const path = join(dir, "scan.jpeg");
    writeFileSync(path, new Uint8Array([4, 5]));
    const bytes = new Uint8Array([4, 5]);
    const inputs = [
      { input: new File([bytes], "f.png", { type: "image/png" }), name: "f.png", type: "image/png" },
      { input: new Blob([bytes], { type: "image/png" }), name: "upload", type: "image/png" },
      { input: { data: bytes.buffer.slice(0), filename: "x.bin" }, name: "x.bin", type: "application/octet-stream" },
      { input: { data: Readable.from([bytes]), filename: "n.pdf" }, name: "n.pdf", type: "application/pdf" },
      { input: { data: new Blob([bytes]).stream(), filename: "w.PNG" }, name: "w.PNG", type: "image/png" },
      { input: { data: bytes, filename: "t", contentType: "image/jpeg" }, name: "t", type: "image/jpeg" },
      { input: path, name: "scan.jpeg", type: "image/jpeg" },
    ];
    for (const { input, name, type } of inputs) {
      const { invoist, calls } = client(json({ document: doc, duplicate: true }));
      await invoist.extract(input);
      const file = (await first(calls).request.formData()).get("file");
      assert.ok(file instanceof File, name);
      assert.equal(file.name, name);
      assert.equal(file.type, type);
      assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes, name);
    }
  });

  test("extractBatch repeats the files field, in order", async () => {
    const { invoist, calls } = client(json({ results: [], accepted: 2, rejected: 0 }));
    await invoist.extractBatch([
      { data: new Uint8Array([1]), filename: "one.pdf" },
      { data: new Uint8Array([2]), filename: "two.png" },
    ]);
    const files = (await first(calls).request.formData()).getAll("files");
    assert.deepEqual(
      files.map((f) => (f instanceof File ? f.name : f)),
      ["one.pdf", "two.png"],
    );
  });

  test("an upload is retried, and a stream is sent again in full", async () => {
    const fake = fakeFetch(
      json({ error: { code: "busy", message: "busy" } }, 503, { "Retry-After": "0" }),
      json({ document: doc, duplicate: true }),
    );
    const invoist = new Invoist({ apiKey: "k", fetch: fake.fetch });
    await invoist.extract({ data: Readable.from([new Uint8Array([7, 8, 9])]), filename: "a.pdf" });
    assert.equal(fake.calls.length, 2);
    for (const call of fake.calls) {
      const file = (await call.request.formData()).get("file");
      assert.ok(file instanceof File);
      assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([7, 8, 9]));
    }
  });
});

describe("downloads", () => {
  test("bytes, content type and filename", async () => {
    const { invoist, calls } = client(
      new Response(new Uint8Array([0, 255, 37]), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="Lasku \\"10\\".pdf"' },
      }),
    );
    const file = await invoist.getDocumentFile(DOC_ID);
    assert.deepEqual(file.data, new Uint8Array([0, 255, 37]));
    assert.equal(file.contentType, "application/pdf");
    assert.equal(file.filename, 'Lasku "10".pdf');
    assert.equal(first(calls).headers.get("accept"), "*/*");
  });

  test("no Content-Disposition, no filename", async () => {
    const { invoist } = client(new Response(new Uint8Array([1]), { headers: { "Content-Type": "image/png" } }));
    const file = await invoist.bills.getFile("b1");
    assert.equal(file.filename, null);
    assert.equal(file.contentType, "image/png");
  });

  test("an error on a download is an InvoistError", async () => {
    const { invoist } = client(json({ error: { code: "not_found", message: "bill not found" } }, 404));
    const err = await rejection(invoist.bills.getFile("b1"));
    assert.ok(err instanceof InvoistError);
    assert.equal(err.code, "not_found");
    assert.ok(err.isNotFound);
  });
});

describe("responses", () => {
  test("204 resolves to undefined", async () => {
    const { invoist } = client(noContent());
    assert.equal(await invoist.deleteWebhookEndpoint("w1"), undefined);
  });

  test("unknown response fields are kept, not rejected", async () => {
    const { invoist } = client(json({ categories: [{ id: "c1", brand_new_field: 1 }], also_new: true }));
    assert.deepEqual(await invoist.listCategories(), [{ id: "c1", brand_new_field: 1 }]);
  });

  test("a 200 that isn't JSON is unexpected_response", async () => {
    const { invoist } = client(new Response("<html>", { status: 200 }));
    const err = await rejection(invoist.getUsage());
    assert.ok(err instanceof InvoistError);
    assert.equal(err.code, "unexpected_response");
    assert.equal(err.body, "<html>");
  });

  test("the error envelope becomes an InvoistError with the request id", async () => {
    const { invoist } = client(
      json({ error: { code: "household_feature", message: "for a household" } }, 403, { "X-Request-Id": "req_9" }),
    );
    const err = await rejection(invoist.bills.list());
    assert.ok(err instanceof InvoistError);
    assert.equal(err.status, 403);
    assert.equal(err.code, "household_feature");
    assert.equal(err.message, "for a household");
    assert.equal(err.requestId, "req_9");
    assert.ok(err.isPermissionError);
    assert.ok(!err.isRetryable);
    assert.ok(err instanceof Error);
  });
});

describe("retries", () => {
  function http(fetch: typeof globalThis.fetch, waits: number[], options: { maxRetries?: number } = {}): HttpClient {
    const clock: Clock = {
      sleep: async (ms) => {
        waits.push(ms);
      },
      random: () => 0.5,
    };
    return new HttpClient({ apiKey: "k", fetch, ...options }, clock);
  }

  test("backoff is 500 ms × 2^attempt with ±20% jitter, capped at 8 s", () => {
    assert.equal(
      retryDelay(0, null, () => 0.5),
      500,
    );
    assert.equal(
      retryDelay(1, null, () => 0.5),
      1000,
    );
    assert.equal(
      retryDelay(0, null, () => 0),
      400,
    );
    assert.equal(
      retryDelay(0, null, () => 1),
      600,
    );
    assert.equal(
      retryDelay(3, null, () => 0.5),
      4000,
    );
    assert.equal(
      retryDelay(4, null, () => 1),
      8000,
    );
    assert.equal(
      retryDelay(10, null, () => 0.5),
      8000,
    );
  });

  test("Retry-After in whole seconds wins; anything else falls back to backoff", () => {
    assert.equal(
      retryDelay(0, "3", () => 0.5),
      3000,
    );
    assert.equal(
      retryDelay(1, "0", () => 0.5),
      0,
    );
    assert.equal(
      retryDelay(0, "1.5", () => 0.5),
      500,
    );
    assert.equal(
      retryDelay(0, "Wed, 21 Oct 2026 07:28:00 GMT", () => 0.5),
      500,
    );
  });

  test("a Retry-After above 60 s fails at once; 60 s is still waited for", async () => {
    const tooLong = fakeFetch(
      json({ error: { code: "rate_limited", message: "slow down" } }, 429, { "Retry-After": "61" }),
    );
    const waits: number[] = [];
    const err = await rejection(http(tooLong.fetch, waits).json("GET", "/v1/usage"));
    assert.ok(err instanceof InvoistError);
    assert.equal(err.code, "rate_limited");
    assert.equal(tooLong.calls.length, 1);
    assert.deepEqual(waits, []);

    const sixty = fakeFetch(json({}, 429, { "Retry-After": "60" }), json({}));
    const waited: number[] = [];
    await http(sixty.fetch, waited).json("GET", "/v1/usage");
    assert.deepEqual(waited, [60_000]);
  });

  test("maxRetries 0 makes one attempt", async () => {
    const { fetch, calls } = fakeFetch(json({}, 500));
    const waits: number[] = [];
    await rejection(http(fetch, waits, { maxRetries: 0 }).json("GET", "/v1/usage"));
    assert.equal(calls.length, 1);
    assert.deepEqual(waits, []);
  });

  test("maxRetries can be raised", async () => {
    const { fetch, calls } = fakeFetch(json({}, 500));
    const waits: number[] = [];
    await rejection(http(fetch, waits, { maxRetries: 5 }).json("GET", "/v1/usage"));
    assert.equal(calls.length, 6);
    assert.deepEqual(waits, [500, 1000, 2000, 4000, 8000]);
  });

  test("per-call maxRetries overrides the client's", async () => {
    const { fetch, calls } = fakeFetch(json({}, 500));
    await rejection(http(fetch, []).json("GET", "/v1/usage", { maxRetries: 0 }));
    assert.equal(calls.length, 1);
  });

  test("a network failure is status 0, network_error, after retrying", async () => {
    const { fetch, calls } = fakeFetch(new TypeError("fetch failed"));
    const err = await rejection(http(fetch, []).json("GET", "/v1/usage"));
    assert.equal(calls.length, 3);
    assert.ok(err instanceof InvoistError);
    assert.equal(err.status, 0);
    assert.equal(err.code, "network_error");
    assert.ok(err.isRetryable);
    assert.ok(err.cause instanceof TypeError);
  });

  test("the client retries through the public API too", async () => {
    const { invoist, calls } = client(json({}, 429, { "Retry-After": "0" }), json({ categories: [] }));
    assert.deepEqual(await invoist.listCategories(), []);
    assert.equal(calls.length, 2);
  });
});

describe("timeouts and cancellation", () => {
  const hang: typeof globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });

  test("a timeout is status 0, code timeout", async () => {
    let attempts = 0;
    const fetch: typeof globalThis.fetch = (input, init) => {
      attempts++;
      return hang(input, init);
    };
    const invoist = new Invoist({ apiKey: "k", fetch, timeout: 20, maxRetries: 1 });
    const err = await rejection(invoist.getUsage());
    assert.ok(err instanceof InvoistError);
    assert.equal(err.status, 0);
    assert.equal(err.code, "timeout");
    assert.equal(attempts, 2, "a timeout is retried");
  });

  test("per-call timeout overrides the client's", async () => {
    const invoist = new Invoist({ apiKey: "k", fetch: hang, maxRetries: 0 });
    const err = await rejection(invoist.getUsage({ timeout: 10 }));
    assert.ok(err instanceof InvoistError);
    assert.equal(err.code, "timeout");
  });

  test("cancelling rejects with the signal's reason and is never retried", async () => {
    let attempts = 0;
    const fetch: typeof globalThis.fetch = (input, init) => {
      attempts++;
      return hang(input, init);
    };
    const invoist = new Invoist({ apiKey: "k", fetch });
    const controller = new AbortController();
    const reason = new Error("user gave up");
    const pending = invoist.getUsage({ signal: controller.signal });
    setTimeout(() => controller.abort(reason), 5);
    assert.equal(await rejection(pending), reason);
    assert.equal(attempts, 1);
  });

  test("an already aborted signal sends nothing", async () => {
    const { invoist, calls } = client(json({}));
    const err = await rejection(invoist.getUsage({ signal: AbortSignal.abort() }));
    assert.ok(err instanceof DOMException);
    assert.equal(err.name, "AbortError");
    assert.equal(calls.length, 0);
  });

  test("cancelling during the wait before a retry stops it", async () => {
    const { fetch, calls } = fakeFetch(json({}, 503, { "Retry-After": "30" }));
    const invoist = new Invoist({ apiKey: "k", fetch });
    const controller = new AbortController();
    const pending = invoist.getUsage({ signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    const err = await rejection(pending);
    assert.ok(err instanceof DOMException);
    assert.equal(calls.length, 1);
  });
});

describe("waitForExtraction", () => {
  const fast: RequestOptions & { pollInterval: number } = { pollInterval: 1 };

  test("polls until done", async () => {
    const { invoist, calls } = client(
      json({ document: doc, review_queue: [] }),
      json({ document: doc, extraction: extraction("pending"), review_queue: [] }),
      json({ document: doc, extraction: extraction("done"), review_queue: [] }),
    );
    const result = await invoist.waitForExtraction(DOC_ID, fast);
    assert.equal(result.status, "done");
    assert.equal(calls.length, 3);
    assert.ok(calls.every((c) => c.url.pathname === `/v1/documents/${DOC_ID}`));
  });

  test("a failed reading is returned, not thrown", async () => {
    const { invoist } = client(json({ document: doc, extraction: extraction("failed"), review_queue: [] }));
    const result = await invoist.waitForExtraction(DOC_ID, fast);
    assert.equal(result.status, "failed");
  });

  test("gives up with extraction_timeout", async () => {
    const { invoist, calls } = client(json({ document: doc, extraction: extraction("pending"), review_queue: [] }));
    const err = await rejection(invoist.waitForExtraction(DOC_ID, { timeout: 30, pollInterval: 5 }));
    assert.ok(err instanceof InvoistError);
    assert.equal(err.status, 0);
    assert.equal(err.code, "extraction_timeout");
    assert.ok(calls.length >= 2);
  });

  test("can be cancelled while waiting", async () => {
    const { invoist } = client(json({ document: doc, extraction: extraction("pending"), review_queue: [] }));
    const controller = new AbortController();
    const pending = invoist.waitForExtraction(DOC_ID, { pollInterval: 10_000, signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    assert.ok((await rejection(pending)) instanceof DOMException);
  });

  test("extractAndWait uploads and then polls", async () => {
    const { invoist, calls } = client(
      json({ document: doc, extraction: extraction("pending"), duplicate: false }, 201),
      json({ document: doc, extraction: extraction("done"), review_queue: [] }),
    );
    const { document, extraction: result } = await invoist.extractAndWait(
      { data: new Uint8Array([1]), filename: "a.pdf" },
      fast,
    );
    assert.equal(document.id, DOC_ID);
    assert.equal(result.status, "done");
    assert.deepEqual(
      calls.map((c) => `${c.method} ${c.url.pathname}`),
      ["POST /v1/extract", `GET /v1/documents/${DOC_ID}`],
    );
  });

  test("extractAndWait doesn't poll when the answer is already final", async () => {
    const { invoist, calls } = client(json({ document: doc, extraction: extraction("done"), duplicate: false }, 201));
    const { extraction: result } = await invoist.extractAndWait({ data: new Uint8Array([1]), filename: "a.pdf" });
    assert.equal(result.status, "done");
    assert.equal(calls.length, 1);
  });
});

describe("errors", () => {
  test("instanceof works across separately loaded copies", () => {
    const err = new InvoistError({ message: "x", status: 500, code: "internal_error" });
    assert.ok(err instanceof InvoistError);
    assert.ok(err instanceof Error);
    assert.ok(!(new Error("x") instanceof InvoistError));
    assert.equal(err.name, "InvoistError");
  });
});

describe("webhook event constants", () => {
  test("every event type the API sends", () => {
    assert.deepEqual([...WEBHOOK_EVENT_TYPES].sort(), [
      "document.created",
      "document_request.fulfilled",
      "extraction.completed",
      "extraction.failed",
      "review_item.created",
      "review_item.resolved",
    ]);
  });
});
