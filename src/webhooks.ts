/**
 * Webhook signature checks, at `@invoist/sdk/webhooks`.
 *
 * Kept apart from the client because it uses `node:crypto` (Node, Bun and
 * Deno all have it): importing the client into a browser or edge bundle
 * stays free of it.
 *
 * @module
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { InvoistError } from "./errors.ts";
import type { WebhookEvent } from "./events.ts";

export { InvoistError } from "./errors.ts";
export {
  DELIVERY_HEADER,
  EVENT_HEADER,
  SIGNATURE_HEADER,
  WEBHOOK_EVENT_TYPES,
  type WebhookEvent,
  WebhookEvents,
  type WebhookEventType,
} from "./events.ts";

/** Options for {@link verifyWebhook}. */
export interface VerifyWebhookOptions {
  /**
   * How old (or how far in the future) a signature may be, in seconds.
   * Default 300. `0` turns the check off, which lets a captured request be
   * replayed forever: keep it on in production.
   */
  tolerance?: number | undefined;
  /** The current time, for tests: a `Date` or Unix seconds. */
  now?: Date | number | undefined;
}

const DEFAULT_TOLERANCE_SECONDS = 300;
const encoder = new TextEncoder();

function fail(code: "invalid_signature" | "signature_too_old" | "invalid_payload", message: string): never {
  throw new InvoistError({ status: 400, code, message });
}

function parseHeader(header: string): { timestamp: string | undefined; signatures: string[] } {
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") {
      if (timestamp !== undefined) fail("invalid_signature", "The signature header has more than one timestamp");
      timestamp = value;
    } else if (key === "v1" && value !== "") {
      signatures.push(value);
    }
  }
  return { timestamp, signatures };
}

/**
 * Checks an incoming webhook's `X-Invoist-Signature` header and returns the
 * event. Throws an {@link InvoistError} with status 400 otherwise, with code
 * `invalid_signature` (missing, malformed or wrong), `signature_too_old`
 * (outside the time window) or `invalid_payload` (correctly signed, but not
 * a JSON event): answer 400 and do nothing with it.
 *
 * `payload` must be the raw request body, exactly as received. Parsing the
 * JSON and serialising it again changes the bytes and the check fails. In
 * Express, use `express.raw({ type: "application/json" })` on this route.
 *
 * ```ts
 * const event = verifyWebhook(req.body, req.get("X-Invoist-Signature"), process.env.INVOIST_WEBHOOK_SECRET!);
 * ```
 *
 * @param payload The raw body: a `Buffer`, `Uint8Array` or string.
 * @param signatureHeader The `X-Invoist-Signature` header.
 * @param secret The endpoint's signing secret (`whsec_…`).
 */
export function verifyWebhook<TData = Record<string, unknown>>(
  payload: string | Uint8Array,
  signatureHeader: string | readonly string[] | null | undefined,
  secret: string,
  options: VerifyWebhookOptions = {},
): WebhookEvent<TData> {
  if (typeof secret !== "string" || secret === "") {
    throw new TypeError("verifyWebhook needs the endpoint's signing secret.");
  }
  const header = typeof signatureHeader === "string" ? signatureHeader : (signatureHeader ?? []).join(",");
  const { timestamp, signatures } = parseHeader(header);
  if (timestamp === undefined) fail("invalid_signature", "The signature header has no timestamp (t=)");
  if (signatures.length === 0) fail("invalid_signature", "The signature header has no signature (v1=)");
  if (!/^\d+$/.test(timestamp)) fail("invalid_signature", "The signature timestamp is not a number");

  const body = typeof payload === "string" ? encoder.encode(payload) : payload;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex"));
  // Compare every candidate, in constant time, so the timing reveals nothing.
  let matched = false;
  for (const signature of signatures) {
    const candidate = Buffer.from(signature);
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) matched = true;
  }
  if (!matched) fail("invalid_signature", "No signature matches the payload");

  // The time only after the signature: a forged request is invalid however old it is.
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  if (tolerance > 0) {
    const now =
      options.now instanceof Date
        ? Math.floor(options.now.getTime() / 1000)
        : (options.now ?? Math.floor(Date.now() / 1000));
    // Either direction: a timestamp far in the future is as suspect as an old one.
    if (Math.abs(now - Number(timestamp)) > tolerance) {
      fail("signature_too_old", `The signature is more than ${tolerance} seconds away from the current time`);
    }
  }

  let event: unknown;
  try {
    event = JSON.parse(new TextDecoder().decode(body));
  } catch {
    fail("invalid_payload", "The payload is correctly signed but isn't JSON");
  }
  if (typeof event !== "object" || event === null || Array.isArray(event)) {
    fail("invalid_payload", "The payload is correctly signed but isn't a JSON event object");
  }
  return event as WebhookEvent<TData>;
}
