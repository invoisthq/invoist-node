// Runs the shared vectors in testdata/conformance, which every Invoist SDK
// must pass case by case.
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { errorFromResponse, InvoistError } from "../src/errors.ts";
import { type Clock, HttpClient } from "../src/http.ts";
import { verifyWebhook } from "../src/webhooks.ts";
import { fakeFetch, loadVectors } from "./helpers.ts";

interface WebhookVectors {
  secret: string;
  cases: {
    name: string;
    payload: string;
    header: string;
    now: number;
    tolerance: number;
    expect: { ok: true; type: string } | { ok: false; code: string };
  }[];
}

interface ErrorVectors {
  cases: {
    name: string;
    status: number;
    headers: Record<string, string>;
    body: string;
    expect: {
      code: string;
      message: string;
      request_id: string | null;
      is_auth_error: boolean;
      is_permission_error: boolean;
      is_not_found: boolean;
      is_rate_limited: boolean;
      is_retryable: boolean;
    };
  }[];
}

interface RetryVectors {
  cases: {
    name: string;
    responses: { status: number; retry_after?: string }[];
    expect: { ok: boolean; attempts: number; status?: number; waits_ms?: (number | null)[] };
  }[];
}

describe("conformance: webhooks", () => {
  const vectors = loadVectors<WebhookVectors>("webhooks");
  assert.ok(vectors.cases.length > 0);

  for (const c of vectors.cases) {
    test(c.name, () => {
      const options = { tolerance: c.tolerance, now: c.now };
      const forms: (string | Uint8Array)[] = [c.payload, new TextEncoder().encode(c.payload)];
      for (const payload of forms) {
        if (c.expect.ok) {
          const event = verifyWebhook(payload, c.header, vectors.secret, options);
          assert.equal(event.type, c.expect.type);
          assert.equal(typeof event.id, "string");
          assert.equal(typeof event.created_at, "string");
          assert.equal(typeof event.data, "object");
        } else {
          const code = c.expect.code;
          assert.throws(
            () => verifyWebhook(payload, c.header, vectors.secret, options),
            (err: unknown) => err instanceof InvoistError && err.status === 400 && err.code === code,
          );
        }
      }
    });
  }
});

describe("conformance: errors", () => {
  const vectors = loadVectors<ErrorVectors>("errors");

  for (const c of vectors.cases) {
    test(c.name, async () => {
      // Once straight through the parser, once through the whole client.
      const headers = new Headers(c.headers);
      const parsed = errorFromResponse(c.status, c.body, headers.get("x-request-id"));

      const { fetch } = fakeFetch(
        new Response(c.body === "" ? null : c.body, { status: c.status, headers: c.headers }),
      );
      const http = new HttpClient({ apiKey: "k", fetch, maxRetries: 0 });
      const thrown = await http.json("GET", "/v1/usage").then(
        () => assert.fail("expected an error"),
        (err: unknown) => err,
      );
      assert.ok(thrown instanceof InvoistError);

      for (const err of [parsed, thrown]) {
        assert.equal(err.status, c.status);
        assert.equal(err.code, c.expect.code);
        assert.equal(err.message, c.expect.message);
        assert.equal(err.requestId, c.expect.request_id);
        assert.equal(err.body, c.body === "" ? undefined : c.body);
        assert.equal(err.isAuthError, c.expect.is_auth_error);
        assert.equal(err.isPermissionError, c.expect.is_permission_error);
        assert.equal(err.isNotFound, c.expect.is_not_found);
        assert.equal(err.isRateLimited, c.expect.is_rate_limited);
        assert.equal(err.isRetryable, c.expect.is_retryable);
      }
    });
  }
});

describe("conformance: retries", () => {
  const vectors = loadVectors<RetryVectors>("retries");

  for (const c of vectors.cases) {
    test(c.name, async () => {
      const replies = c.responses.map((r) =>
        r.status === 0
          ? new TypeError("fetch failed")
          : new Response(r.status === 200 ? "{}" : '{"error":{"code":"x","message":"x"}}', {
              status: r.status,
              headers: r.retry_after === undefined ? {} : { "Retry-After": r.retry_after },
            }),
      );
      const { fetch, calls } = fakeFetch(...replies);
      const waits: number[] = [];
      const clock: Clock = {
        sleep: async (ms) => {
          waits.push(ms);
        },
        random: Math.random,
      };
      const http = new HttpClient({ apiKey: "k", fetch, maxRetries: 2 }, clock);

      const outcome = await http.json("GET", "/v1/usage").then(
        () => ({ ok: true as const }),
        (err: unknown) => ({ ok: false as const, err }),
      );

      assert.equal(calls.length, c.expect.attempts, "attempts");
      assert.equal(outcome.ok, c.expect.ok, "ok");
      if (!outcome.ok) {
        assert.ok(outcome.err instanceof InvoistError);
        assert.equal(outcome.err.status, c.expect.status);
      }
      assert.equal(waits.length, c.expect.attempts - 1, "one wait before each retry");
      waits.forEach((ms, attempt) => {
        const expected = c.expect.waits_ms?.[attempt];
        if (typeof expected === "number") {
          assert.equal(ms, expected, `wait ${attempt}`);
        } else {
          const base = 500 * 2 ** attempt;
          assert.ok(ms >= base * 0.8 && ms <= base * 1.2, `wait ${attempt} is ${ms}, expected ${base} ±20%`);
        }
      });
    });
  }
});
