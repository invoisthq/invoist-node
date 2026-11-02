/**
 * The official client for the Invoist API.
 *
 * ```ts
 * import { Invoist } from "@invoist/sdk";
 * const invoist = new Invoist({ apiKey: process.env.INVOIST_API_KEY! });
 * ```
 *
 * Webhook verification is at `@invoist/sdk/webhooks`.
 *
 * @module
 */
import { Invoist } from "./client.ts";

export {
  Bills,
  type ExtractAndWaitOptions,
  type ExtractOptions,
  HeldEmails,
  Invoist,
  type WaitOptions,
} from "./client.ts";
export { InvoistError, type InvoistErrorInit } from "./errors.ts";
export {
  DELIVERY_HEADER,
  EVENT_HEADER,
  SIGNATURE_HEADER,
  WEBHOOK_EVENT_TYPES,
  type WebhookEvent,
  WebhookEvents,
  type WebhookEventType,
} from "./events.ts";
export type { DownloadedFile, FileData, FileInput } from "./files.ts";
export { type ClientOptions, DEFAULT_BASE_URL, type QueryValue, type RequestOptions, USER_AGENT } from "./http.ts";
export type * from "./types.ts";
export { VERSION } from "./version.ts";

export default Invoist;
