import { errorFromResponse, InvoistError } from "./errors.ts";
import { type DownloadedFile, filenameFromDisposition } from "./files.ts";
import { VERSION } from "./version.ts";

/** How the client connects. Only `apiKey` is required. */
export interface ClientOptions {
  /** Your API key (`inv_sk_…`), or an OAuth access token (`inv_at_…`). */
  apiKey: string;
  /** Default `https://api.invoi.st`. Trailing slashes are ignored. */
  baseUrl?: string | undefined;
  /** How long one attempt may take, in milliseconds. Default 60 000. */
  timeout?: number | undefined;
  /** How many times to retry a failed request. Default 2, so at most three attempts. 0 turns retries off. */
  maxRetries?: number | undefined;
  /**
   * The `fetch` to send requests with. Defaults to the runtime's own. Pass
   * one to add a proxy, logging, or a fake for tests.
   */
  fetch?: typeof globalThis.fetch | undefined;
}

/** Per-call options, accepted by every method. */
export interface RequestOptions {
  /** Cancels the call. A cancelled call is never retried and rejects with the signal's reason. */
  signal?: AbortSignal | undefined;
  /** Overrides the client's per-attempt timeout for this call, in milliseconds. */
  timeout?: number | undefined;
  /** Overrides the client's `maxRetries` for this call. */
  maxRetries?: number | undefined;
}

/** A query string value. `undefined`, `null` and `""` are left out. */
export type QueryValue = string | number | boolean | null | undefined;

interface Call extends RequestOptions {
  query?: Record<string, QueryValue> | undefined;
  /** A JSON-serialisable value, or a FormData for uploads. */
  body?: unknown;
  headers?: Record<string, string> | undefined;
}

/** Hooks the tests use to make waits instant and jitter predictable. */
export interface Clock {
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  random(): number;
}

export const DEFAULT_BASE_URL = "https://api.invoi.st";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;
/** A longer `Retry-After` than this isn't waited for: the call fails at once instead of hanging. */
const MAX_RETRY_AFTER_SECONDS = 60;

function retryAfterSeconds(header: string | null): number | undefined {
  return header !== null && /^\s*\d+\s*$/.test(header) ? Number(header) : undefined;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("This operation was aborted", "AbortError");
}

/** Waits `ms`, or rejects with the signal's reason as soon as it is aborted. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal ? abortReason(signal) : undefined);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const realClock: Clock = { sleep, random: Math.random };

function runtime(): string {
  const versions = globalThis.process?.versions;
  if (versions?.bun) return `bun ${versions.bun}`;
  const deno = (globalThis as { Deno?: { version?: { deno?: string } } }).Deno;
  if (deno?.version?.deno) return `deno ${deno.version.deno}`;
  if (versions?.node) return `node ${versions.node}`;
  return "unknown runtime";
}

/** `invoist-node/1.0.0 (node 22.12.0)`. */
export const USER_AGENT = `invoist-node/${VERSION} (${runtime()})`;

/**
 * The delay before retry number `attempt` (0 for the first retry): the
 * server's `Retry-After` when it is a whole number of seconds, otherwise
 * (none, or an HTTP date) 500 ms × 2^attempt with ±20% jitter, capped at 8 s.
 */
export function retryDelay(attempt: number, retryAfter: string | null, random: () => number = Math.random): number {
  const seconds = retryAfterSeconds(retryAfter);
  if (seconds !== undefined) return seconds * 1000;
  const jitter = 0.8 + random() * 0.4;
  return Math.round(Math.min(BASE_DELAY_MS * 2 ** attempt * jitter, MAX_DELAY_MS));
}

/**
 * Sends requests: authentication, timeouts, the error envelope, and retries
 * with backoff. Every method on the client goes through here.
 */
export class HttpClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly clock: Clock;

  constructor(options: ClientOptions, clock: Clock = realClock) {
    if (typeof options?.apiKey !== "string" || options.apiKey.trim() === "") {
      throw new TypeError(
        "An Invoist API key is required: new Invoist({ apiKey: process.env.INVOIST_API_KEY }). Create one in the dashboard.",
      );
    }
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new TypeError("No fetch is available in this runtime. Pass one as the `fetch` option.");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(0, Math.floor(options.maxRetries ?? DEFAULT_MAX_RETRIES));
    // Called unbound: some runtimes' fetch throws when `this` isn't globalThis.
    this.fetchImpl = (input, init) => fetchImpl(input, init);
    this.clock = clock;
  }

  url(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  /** Sends a request and parses the JSON answer. A 204 or an empty body resolves to `undefined`. */
  async json<T>(method: string, path: string, call: Call = {}): Promise<T> {
    const { response, value: text } = await this.send(method, path, call, "application/json", (r) => r.text());
    if (response.status === 204 || text === "") return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new InvoistError({
        message: `The response to ${method} ${path} was not valid JSON`,
        code: "unexpected_response",
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        body: text,
        cause,
      });
    }
  }

  /** Sends a GET and returns the body as bytes, with its content type and filename. */
  async download(path: string, call: RequestOptions = {}): Promise<DownloadedFile> {
    const { response, value } = await this.send("GET", path, call, "*/*", (r) => r.arrayBuffer());
    return {
      data: new Uint8Array(value),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      filename: filenameFromDisposition(response.headers.get("content-disposition")),
    };
  }

  /**
   * The retry loop. `read` consumes a successful response's body inside the
   * attempt, so a body that stalls or breaks off counts as a timeout or a
   * network failure and is retried like one.
   */
  private async send<T>(
    method: string,
    path: string,
    call: Call,
    accept: string,
    read: (response: Response) => Promise<T>,
  ): Promise<{ response: Response; value: T }> {
    const url = this.url(path, call.query);
    const maxRetries = call.maxRetries === undefined ? this.maxRetries : Math.max(0, Math.floor(call.maxRetries));
    const timeout = call.timeout ?? this.timeout;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: accept,
      "User-Agent": USER_AGENT,
      ...call.headers,
    };
    let body: string | FormData | undefined;
    if (call.body instanceof FormData) {
      // No Content-Type: fetch writes it, with the multipart boundary.
      body = call.body;
    } else if (call.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(call.body);
    }

    for (let attempt = 0; ; attempt++) {
      const caller = call.signal;
      if (caller?.aborted) throw abortReason(caller);

      let error: InvoistError;
      let retryAfter: string | null = null;
      const timeoutSignal = AbortSignal.timeout(timeout);
      const signal = caller ? AbortSignal.any([caller, timeoutSignal]) : timeoutSignal;
      try {
        const init: RequestInit = { method, headers, signal };
        if (body !== undefined) init.body = body;
        const response = await this.fetchImpl(url, init);
        if (response.ok) return { response, value: await read(response) };
        const text = await response.text().catch(() => "");
        error = errorFromResponse(response.status, text, response.headers.get("x-request-id"));
        retryAfter = response.headers.get("retry-after");
      } catch (cause) {
        if (cause instanceof InvoistError) throw cause;
        // The caller cancelled: never retried, and surfaces as their own reason.
        if (caller?.aborted) throw abortReason(caller);
        error = timeoutSignal.aborted
          ? new InvoistError({
              message: `${method} ${path} timed out after ${timeout} ms`,
              code: "timeout",
              status: 0,
              cause,
            })
          : new InvoistError({
              message: `${method} ${path} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
              code: "network_error",
              status: 0,
              cause,
            });
      }

      if (!error.isRetryable || attempt >= maxRetries) throw error;
      // The server asked for a long pause: fail now rather than hang the program.
      if ((retryAfterSeconds(retryAfter) ?? 0) > MAX_RETRY_AFTER_SECONDS) throw error;
      await this.clock.sleep(retryDelay(attempt, retryAfter, this.clock.random), caller);
    }
  }
}
