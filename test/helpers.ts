// A fake transport: a `fetch` that records each request and answers from a
// script, so the client can be tested without a network.
import { readFileSync } from "node:fs";

export interface Recorded {
  method: string;
  url: URL;
  headers: Headers;
  request: Request;
}

export type Reply = Response | Error | ((request: Request) => Response | Promise<Response>);

export interface FakeFetch {
  fetch: typeof globalThis.fetch;
  calls: Recorded[];
}

/** Answers with `replies` in order; the last one repeats. */
export function fakeFetch(...replies: Reply[]): FakeFetch {
  const calls: Recorded[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    calls.push({ method: request.method, url: new URL(request.url), headers: request.headers, request });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply === undefined) throw new Error("fakeFetch has no reply scripted");
    if (reply instanceof Error) throw reply;
    if (typeof reply === "function") return reply(request);
    return reply.clone();
  };
  return { fetch, calls };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function loadVectors<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../testdata/conformance/${name}.json`, import.meta.url), "utf8")) as T;
}

export function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error("expected at least one item");
  return item;
}
