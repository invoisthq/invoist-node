import { InvoistError } from "./errors.ts";
import { type DownloadedFile, type FileInput, toUpload } from "./files.ts";
import { type ClientOptions, HttpClient, type RequestOptions, sleep } from "./http.ts";
import type {
  BatchResult,
  Bill,
  BillDetail,
  BillRecord,
  BillsStats,
  BillsStatsParams,
  BillsSummary,
  BillsSummaryParams,
  Category,
  CreateWebhookEndpointParams,
  DateInput,
  Document,
  DocumentDetail,
  DocumentListItem,
  Extraction,
  ExtractResult,
  HeldEmail,
  ListBillsParams,
  ListDocumentsParams,
  ListReviewQueueParams,
  MonthInput,
  ReviewQueueItem,
  ReviewQueueListItem,
  StatsOverview,
  Usage,
  WebhookEndpointList,
  WebhookEndpointWithSecret,
} from "./types.ts";

/** Options for `extract`. */
export interface ExtractOptions extends RequestOptions {
  /**
   * A key you choose per logical upload. Sending the same key again replays
   * the first answer; sending it with a different file fails with a 422.
   * Identical bytes are recognised without one.
   */
  idempotencyKey?: string | undefined;
}

/** Options for `waitForExtraction`. */
export interface WaitOptions extends RequestOptions {
  /** Give up after this many milliseconds. Default 120 000. */
  timeout?: number | undefined;
  /** Milliseconds between checks. Default 2 000. */
  pollInterval?: number | undefined;
}

/** Options for `extractAndWait`. */
export interface ExtractAndWaitOptions extends WaitOptions {
  /** As for `extract`. */
  idempotencyKey?: string | undefined;
}

const DEFAULT_WAIT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

function id(value: string): string {
  if (typeof value !== "string" || value === "") throw new TypeError("An id is required.");
  return encodeURIComponent(value);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatMonth(month: MonthInput | undefined): string | undefined {
  if (month instanceof Date) return `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
  return month;
}

function formatDate(date: DateInput | undefined): string | undefined {
  if (date instanceof Date) return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return date;
}

/** The HTTP-level options of a call, without the method's own fields. */
function only(options: RequestOptions): RequestOptions {
  return { signal: options.signal, timeout: options.timeout, maxRetries: options.maxRetries };
}

/**
 * A household's bills (Invoist Personal). Needs a household's key or an
 * assistant's token, with `bills:read` (and `bills:write` to mark bills paid).
 */
export class Bills {
  readonly #http: HttpClient;

  /** Reached through `invoist.bills` / `invoist.heldEmails` rather than made directly. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The household's bills, unpaid ones soonest-due first. A reminder is folded into its bill's row. */
  async list(params: ListBillsParams = {}, options: RequestOptions = {}): Promise<Bill[]> {
    const res = await this.#http.json<{ bills: Bill[] }>("GET", "/v1/bills", {
      ...options,
      query: {
        paid: params.paid,
        month: formatMonth(params.month),
        sender: params.sender,
        q: params.q,
        limit: params.limit,
        offset: params.offset,
      },
    });
    return res.bills;
  }

  /** One bill with everything read from it, its warnings, the household's record, and its letters. */
  get(billId: string, options: RequestOptions = {}): Promise<BillDetail> {
    return this.#http.json<BillDetail>("GET", `/v1/bills/${id(billId)}`, options);
  }

  /** The original file, exactly as it was added. */
  getFile(billId: string, options: RequestOptions = {}): Promise<DownloadedFile> {
    return this.#http.download(`/v1/bills/${id(billId)}/file`, options);
  }

  /** How many bills are unpaid and overdue, and what falls due soon, per currency. */
  summary(params: BillsSummaryParams = {}, options: RequestOptions = {}): Promise<BillsSummary> {
    return this.#http.json<BillsSummary>("GET", "/v1/bills/summary", {
      ...options,
      query: { today: formatDate(params.today), days: params.days },
    });
  }

  /** A month at a glance: totals, the twelve months up to it, and the biggest senders. */
  stats(params: BillsStatsParams = {}, options: RequestOptions = {}): Promise<BillsStats> {
    return this.#http.json<BillsStats>("GET", "/v1/bills/stats", {
      ...options,
      query: { month: formatMonth(params.month), sender: params.sender },
    });
  }

  /** Marks a bill and its letters paid, by the person who made the key. Needs `bills:write`. */
  async markPaid(billId: string, options: RequestOptions = {}): Promise<BillRecord> {
    const res = await this.#http.json<{ bill: BillRecord }>("POST", `/v1/bills/${id(billId)}/paid`, options);
    return res.bill;
  }

  /** Marks a bill not paid again. Needs `bills:write`. */
  async markUnpaid(billId: string, options: RequestOptions = {}): Promise<BillRecord> {
    const res = await this.#http.json<{ bill: BillRecord }>("DELETE", `/v1/bills/${id(billId)}/paid`, options);
    return res.bill;
  }
}

/** Emails forwarded to a household that wait for someone to approve the sender. */
export class HeldEmails {
  readonly #http: HttpClient;

  /** Reached through `invoist.bills` / `invoist.heldEmails` rather than made directly. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The waiting emails, oldest first. Approving a sender is done in the app. */
  async list(options: RequestOptions = {}): Promise<HeldEmail[]> {
    const res = await this.#http.json<{ held_emails: HeldEmail[] }>("GET", "/v1/held-emails", options);
    return res.held_emails;
  }
}

/**
 * The Invoist API client.
 *
 * ```ts
 * import { Invoist } from "@invoist/sdk";
 *
 * const invoist = new Invoist({ apiKey: process.env.INVOIST_API_KEY! });
 * const { document, extraction } = await invoist.extractAndWait("invoice.pdf");
 * ```
 *
 * Failed calls reject with an {@link InvoistError}. Requests that may
 * succeed on a second try (no response, 429, 5xx) are retried first.
 */
export class Invoist {
  /** A household's bills. */
  readonly bills: Bills;
  /** A household's emails waiting for approval. */
  readonly heldEmails: HeldEmails;

  readonly #http: HttpClient;

  /** Fails at once, before any request, when `apiKey` is missing or empty. */
  constructor(options: ClientOptions) {
    this.#http = new HttpClient(options);
    this.bills = new Bills(this.#http);
    this.heldEmails = new HeldEmails(this.#http);
  }

  /** The API address this client talks to, without a trailing slash. */
  get baseUrl(): string {
    return this.#http.baseUrl;
  }

  // Business workspaces

  /**
   * Uploads a PDF, PNG or JPEG (under 20 MB) for reading. Resolves as soon as
   * it is accepted, usually with the extraction still `pending`: reading
   * happens in the background. Then use {@link waitForExtraction} or the
   * `extraction.completed` webhook.
   *
   * Uploading bytes this workspace already has returns that document with
   * `duplicate: true`, nothing new is created or charged, which also makes
   * retrying safe.
   */
  async extract(file: FileInput, options: ExtractOptions = {}): Promise<ExtractResult> {
    const { blob, filename } = await toUpload(file);
    const form = new FormData();
    form.append("file", blob, filename);
    return this.#http.json<ExtractResult>("POST", "/v1/extract", {
      ...only(options),
      body: form,
      headers: options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : undefined,
    });
  }

  /**
   * Uploads up to ten files in one call. One bad file doesn't fail the rest:
   * `results` has an entry per file, in order, each with either the document
   * fields or an `error`.
   */
  async extractBatch(files: readonly FileInput[], options: RequestOptions = {}): Promise<BatchResult> {
    const form = new FormData();
    for (const file of files) {
      const { blob, filename } = await toUpload(file);
      form.append("files", blob, filename);
    }
    return this.#http.json<BatchResult>("POST", "/v1/extract/batch", { ...only(options), body: form });
  }

  /** Documents, newest first. */
  async listDocuments(params: ListDocumentsParams = {}, options: RequestOptions = {}): Promise<DocumentListItem[]> {
    const res = await this.#http.json<{ documents: DocumentListItem[] }>("GET", "/v1/documents", {
      ...options,
      query: {
        limit: params.limit,
        offset: params.offset,
        status: params.status,
        // Only when true: the API reads flagged=false as no filter at all.
        flagged: params.flagged === true ? true : undefined,
        q: params.q,
        category: params.category,
      },
    });
    return res.documents;
  }

  /** A document with its extraction (absent until reading starts) and its review items. */
  getDocument(documentId: string, options: RequestOptions = {}): Promise<DocumentDetail> {
    return this.#http.json<DocumentDetail>("GET", `/v1/documents/${id(documentId)}`, options);
  }

  /** The original file, exactly as uploaded. */
  getDocumentFile(documentId: string, options: RequestOptions = {}): Promise<DownloadedFile> {
    return this.#http.download(`/v1/documents/${id(documentId)}/file`, options);
  }

  /**
   * Checks the document every `pollInterval` until its extraction is no
   * longer `pending`, and returns it.
   *
   * Resolves on `failed` too: a document that couldn't be read is an answer
   * (see `extraction.error_message`), not an error. Rejects with code
   * `extraction_timeout` after `timeout`.
   */
  async waitForExtraction(documentId: string, options: WaitOptions = {}): Promise<Extraction> {
    const timeout = options.timeout ?? DEFAULT_WAIT_TIMEOUT_MS;
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
    const deadline = Date.now() + timeout;
    const request: RequestOptions = { signal: options.signal, maxRetries: options.maxRetries };

    for (;;) {
      const { extraction } = await this.getDocument(documentId, request);
      if (extraction && extraction.status !== "pending") return extraction;
      const left = deadline - Date.now();
      if (left <= 0) {
        throw new InvoistError({
          message: `The extraction of document ${documentId} did not finish within ${timeout} ms`,
          code: "extraction_timeout",
          status: 0,
        });
      }
      await sleep(Math.min(pollInterval, left), options.signal);
    }
  }

  /** Uploads a file and waits for it to be read: {@link extract} then {@link waitForExtraction}. */
  async extractAndWait(
    file: FileInput,
    options: ExtractAndWaitOptions = {},
  ): Promise<{ document: Document; extraction: Extraction }> {
    const { document, extraction } = await this.extract(file, {
      signal: options.signal,
      maxRetries: options.maxRetries,
      idempotencyKey: options.idempotencyKey,
    });
    // A test-mode key, or a duplicate, may already be finished.
    if (extraction && extraction.status !== "pending") return { document, extraction };
    return { document, extraction: await this.waitForExtraction(document.id, options) };
  }

  /** Items flagged for a person to check, with a summary of their document. */
  async listReviewQueue(
    params: ListReviewQueueParams = {},
    options: RequestOptions = {},
  ): Promise<ReviewQueueListItem[]> {
    const res = await this.#http.json<{ review_queue: ReviewQueueListItem[] }>("GET", "/v1/review-queue", {
      ...options,
      query: { status: params.status },
    });
    return res.review_queue;
  }

  /** Closes a review item as `resolved` (the default) or `dismissed`. */
  async resolveReviewItem(
    itemId: string,
    status: "resolved" | "dismissed" = "resolved",
    options: RequestOptions = {},
  ): Promise<ReviewQueueItem> {
    const res = await this.#http.json<{ review_queue_item: ReviewQueueItem }>(
      "POST",
      `/v1/review-queue/${id(itemId)}/resolve`,
      { ...options, body: { status } },
    );
    return res.review_queue_item;
  }

  /** The workspace's spend categories. */
  async listCategories(options: RequestOptions = {}): Promise<Category[]> {
    const res = await this.#http.json<{ categories: Category[] }>("GET", "/v1/categories", options);
    return res.categories;
  }

  /** Calls and documents in the current billing period, with a per-day breakdown. */
  getUsage(options: RequestOptions = {}): Promise<Usage> {
    return this.#http.json<Usage>("GET", "/v1/usage", options);
  }

  /** Document counts, open review items and the plan's allowance. */
  getStats(options: RequestOptions = {}): Promise<StatsOverview> {
    return this.#http.json<StatsOverview>("GET", "/v1/stats/overview", options);
  }

  /** The workspace's webhook endpoints, and every event type there is (`known_events`). */
  listWebhookEndpoints(options: RequestOptions = {}): Promise<WebhookEndpointList> {
    return this.#http.json<WebhookEndpointList>("GET", "/v1/webhook-endpoints", options);
  }

  /**
   * Subscribes a URL to signed events. The answer holds the signing
   * `secret`, and this is the only time you will see it: store it now.
   */
  async createWebhookEndpoint(
    params: CreateWebhookEndpointParams,
    options: RequestOptions = {},
  ): Promise<WebhookEndpointWithSecret> {
    const res = await this.#http.json<{ endpoint: WebhookEndpointWithSecret }>("POST", "/v1/webhook-endpoints", {
      ...options,
      body: params,
    });
    return res.endpoint;
  }

  /** Removes a webhook endpoint. Deliveries to it stop at once. */
  async deleteWebhookEndpoint(endpointId: string, options: RequestOptions = {}): Promise<void> {
    await this.#http.json<undefined>("DELETE", `/v1/webhook-endpoints/${id(endpointId)}`, options);
  }
}
