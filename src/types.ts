// Names for the API's shapes. Each one points into the types generated from
// openapi.yaml, so a change to the API shows up here as a type error rather
// than as a surprise at run time.
import type { components, operations } from "./generated/schema.ts";

type S = components["schemas"];
type JsonBody<R> = R extends { content: { "application/json": infer B } } ? B : never;
type Ok<Op extends keyof operations, Code extends keyof operations[Op]["responses"]> = JsonBody<
  operations[Op]["responses"][Code]
>;

// Business workspaces
export type Document = S["Document"];
export type DocumentApproval = S["DocumentApproval"];
export type DocumentListItem = S["DocumentListItem"];
export type DocumentSource = S["DocumentSource"];
export type DocumentStatus = S["DocumentStatus"];
export type Extraction = S["Extraction"];
export type ExtractionJob = S["ExtractionJob"];
export type ExtractionStatus = S["ExtractionStatus"];
export type LineItem = S["LineItem"];
export type FraudIndicator = S["FraudIndicator"];
export type Discovery = S["Discovery"];
export type CustomValue = S["CustomValue"];
export type Quality = S["Quality"];
export type RegionBox = S["RegionBox"];
export type Category = S["Category"];
export type ReviewQueueItem = S["ReviewQueueItem"];
export type ReviewQueueListItem = S["ReviewQueueListItem"];
export type ReviewReason = S["ReviewReason"];
export type ReviewStatus = S["ReviewStatus"];
export type Usage = S["Usage"];
export type StatsOverview = S["StatsOverview"];
export type BatchResultItem = S["BatchResultItem"];
export type ErrorDetail = S["ErrorDetail"];
export type WebhookEndpoint = S["WebhookEndpoint"];
export type WebhookEndpointWithSecret = S["WebhookEndpointWithSecret"];

/** What `extract` returns: a new document (`duplicate: false`) or the one these bytes already made (`duplicate: true`). */
export type ExtractResult = Ok<"extractDocument", 200> | Ok<"extractDocument", 201>;
/** What `extractBatch` returns: one result per file, in order. */
export type BatchResult = Ok<"extractDocumentBatch", 200>;
/** A document with its extraction, the job reading it, and its review items. */
export type DocumentDetail = Ok<"getDocument", 200>;
/** What `listWebhookEndpoints` returns: the endpoints, and every event type there is. */
export type WebhookEndpointList = Ok<"listWebhookEndpoints", 200>;
/** What `createWebhookEndpoint` takes. Omit `events` to subscribe to everything. */
export type CreateWebhookEndpointParams = NonNullable<
  operations["createWebhookEndpoint"]["requestBody"]
>["content"]["application/json"];

/** Filters for `listDocuments`. */
export interface ListDocumentsParams {
  /** At most this many, 1 to 200. Default 50. */
  limit?: number | undefined;
  offset?: number | undefined;
  status?: DocumentStatus | undefined;
  /** `true` for only documents with review items still open. `false` is the same as leaving it out. */
  flagged?: boolean | undefined;
  /** Matches the filename, vendor, invoice number or reference, ignoring case. */
  q?: string | undefined;
  /** A category id, or `"none"` for documents without one. */
  category?: string | undefined;
}

/** Filters for `listReviewQueue`. */
export interface ListReviewQueueParams {
  /** Omit for every status. */
  status?: ReviewStatus | undefined;
}

// Households
export type Bill = S["Bill"];
export type BillDetail = S["BillDetail"];
export type BillRecord = S["BillRecord"];
export type BillKind = S["BillKind"];
export type BillRelated = S["BillRelated"];
export type BillLetter = S["BillLetter"];
export type BillChainMember = S["BillChainMember"];
export type BillsDue = S["BillsDue"];
export type BillsSummary = S["BillsSummary"];
export type BillsStats = S["BillsStats"];
export type HeldEmail = S["HeldEmail"];
export type HeldEmailFile = S["HeldEmailFile"];

/** A month, as `YYYY-MM` or a `Date` (its local year and month are used). */
export type MonthInput = string | Date;
/** A day, as `YYYY-MM-DD` or a `Date` (its local date is used). */
export type DateInput = string | Date;

/** Filters for `bills.list`. */
export interface ListBillsParams {
  /** `true` for bills marked paid, `false` for bills still to pay. Omit for both. */
  paid?: boolean | undefined;
  /** Only this month's bills, by due date (or the bill's own date when it has none). */
  month?: MonthInput | undefined;
  /** Only this sender's bills, matched ignoring case and spacing. */
  sender?: string | undefined;
  /** Matches the filename, sender, bill number or reference, in every month. */
  q?: string | undefined;
  /** At most this many, 1 to 200. Default 50. */
  limit?: number | undefined;
  offset?: number | undefined;
}

/** Options for `bills.summary`. */
export interface BillsSummaryParams {
  /** The household's own today, within two days of the server's. Defaults to the server's. */
  today?: DateInput | undefined;
  /** How far ahead "due soon" reaches, 1 to 366. Default 30. */
  days?: number | undefined;
}

/** Options for `bills.stats`. */
export interface BillsStatsParams {
  /** Default: the current month. */
  month?: MonthInput | undefined;
  /** Narrow the totals and the trend to one sender. */
  sender?: string | undefined;
}
