// A brand shared by every copy of this module. When an app loads both the
// ES module and the CommonJS build of the SDK, `instanceof InvoistError`
// still works across the two.
const BRAND: unique symbol = Symbol.for("@invoist/sdk/InvoistError");

/** What an {@link InvoistError} is made from. */
export interface InvoistErrorInit {
  message: string;
  status: number;
  code: string;
  requestId?: string | null | undefined;
  body?: string | undefined;
  cause?: unknown;
}

/**
 * Every failed call rejects with an `InvoistError`.
 *
 * Branch on `code`, which is stable, never on `message`, whose wording can
 * change. Quote `requestId` when you contact support.
 */
export class InvoistError extends Error {
  /** HTTP status, or `0` when no response arrived (a network failure or a timeout). */
  readonly status: number;
  /**
   * A stable machine-readable code: the API's own (`invalid_api_key`,
   * `not_found`, …), or one of the SDK's: `unexpected_response`,
   * `network_error`, `timeout`, `extraction_timeout`, `invalid_signature`,
   * `signature_too_old`, `invalid_payload`.
   */
  readonly code: string;
  /** The `X-Request-Id` response header, worth quoting to support. */
  readonly requestId: string | null;
  /** The raw response body, when there was one. */
  readonly body: string | undefined;

  declare readonly [BRAND]: true;

  constructor(init: InvoistErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = "InvoistError";
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId ?? null;
    this.body = init.body;
    Object.defineProperty(this, BRAND, { value: true });
  }

  static override [Symbol.hasInstance](value: unknown): boolean {
    return typeof value === "object" && value !== null && BRAND in value;
  }

  /** 401: the key is missing, malformed, expired or revoked. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /** 403: the key is valid but may not do this (a missing scope, or the wrong kind of account). */
  get isPermissionError(): boolean {
    return this.status === 403;
  }

  /** 404: no such thing, or not in this workspace or household. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** 429: too many requests. The SDK already waited and retried before giving up. */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * Whether sending the same request again could succeed: no response at
   * all, a 429, or a server error (500 and up). Other 4xx errors would only
   * fail again.
   */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Turns an error response into an {@link InvoistError}. The API answers
 * `{"error":{"code","message"}}`; anything else (a proxy's HTML page, an
 * empty body) becomes `unexpected_response`.
 */
export function errorFromResponse(status: number, body: string, requestId: string | null): InvoistError {
  const fallback = `Request failed with status ${status}`;
  let code = "unexpected_response";
  let message = fallback;
  try {
    const parsed: unknown = body ? JSON.parse(body) : undefined;
    const envelope = isRecord(parsed) ? parsed.error : undefined;
    if (isRecord(envelope)) {
      if (typeof envelope.code === "string" && envelope.code !== "") code = envelope.code;
      if (typeof envelope.message === "string" && envelope.message !== "") message = envelope.message;
    }
  } catch {
    // Not JSON: keep the fallback.
  }
  return new InvoistError({ status, code, message, requestId, body: body === "" ? undefined : body });
}
