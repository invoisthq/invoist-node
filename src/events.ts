/**
 * The event types Invoist sends to webhook endpoints, as constants so a typo
 * is a type error rather than a handler that never runs.
 *
 * ```ts
 * if (event.type === WebhookEvents.ExtractionCompleted) { … }
 * ```
 */
export const WebhookEvents = {
  /** A document arrived (upload, email or storage sync). */
  DocumentCreated: "document.created",
  /** A document was read. The data carries its document id and status. */
  ExtractionCompleted: "extraction.completed",
  /** A document could not be read. */
  ExtractionFailed: "extraction.failed",
  /** Something on a document was flagged for a person to check. */
  ReviewItemCreated: "review_item.created",
  /** A flagged item was resolved or dismissed. */
  ReviewItemResolved: "review_item.resolved",
  /** Someone sent in a document that was asked for. */
  DocumentRequestFulfilled: "document_request.fulfilled",
} as const;

/** One of the event types in {@link WebhookEvents}. */
export type WebhookEventType = (typeof WebhookEvents)[keyof typeof WebhookEvents];

/** Every event type, for example to subscribe an endpoint to all of them explicitly. */
export const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = Object.freeze(Object.values(WebhookEvents));

/**
 * A verified webhook event.
 *
 * `type` is usually a {@link WebhookEventType}, but stays open to a string so
 * an event type added to the API later still reaches your code.
 */
export interface WebhookEvent<TData = Record<string, unknown>> {
  /** Unique per event. Use it to ignore a delivery you have already handled. */
  id: string;
  type: WebhookEventType | (string & {});
  /** When the event happened, RFC 3339 UTC. */
  created_at: string;
  data: TData;
}

/** The header carrying the signature that `verifyWebhook` checks. */
export const SIGNATURE_HEADER = "X-Invoist-Signature";
/** The header carrying the event type. */
export const EVENT_HEADER = "X-Invoist-Event";
/** The header carrying the delivery id. */
export const DELIVERY_HEADER = "X-Invoist-Delivery";
