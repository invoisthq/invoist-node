// Generated from the Invoist OpenAPI spec by openapi-typescript.
// Do not edit by hand: run `npm run generate`.

export interface paths {
    "/v1/extract": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a document for extraction
         * @description Accepts a PDF, PNG, or JPEG up to 20 MB as multipart form data.
         *
         *     Returns immediately with `extraction.status` set to `pending`:
         *     reading the document happens in the background. Poll
         *     `GET /v1/documents/{id}` or handle the `extraction.completed`
         *     webhook rather than blocking on this call.
         *
         *     Uploading a file this workspace has already extracted returns the
         *     existing document with `200` and `duplicate: true`, instead of
         *     creating a second record and charging for a second extraction. That
         *     makes retrying a request whose response you never received safe: the
         *     same bytes always resolve to the same document.
         *
         *     A test-mode key (create one in the dashboard under API keys) skips
         *     all of the above: it returns `extraction.status: "done"` immediately,
         *     with a fixed fixture result, no vision call, and no usage charged.
         *     Sandbox documents never appear in a live key's or the dashboard's
         *     `GET /v1/documents` or `GET /v1/review-queue`, and a live key can
         *     never fetch one by id — the isolation runs both directions.
         *
         *     An `Idempotency-Key` header covers the case duplicate-detection
         *     doesn't: retrying with logically-the-same-but-byte-different content
         *     (a re-encoded export, a file read from disk again). The first
         *     request with a given key is billed and processed normally; every
         *     later request with the same key gets that exact response replayed
         *     (`Idempotency-Replayed: true`), no new document, no new charge.
         *     Reusing a key with different file bytes is rejected with `422`
         *     rather than silently answering with a stale result. Keys expire
         *     after 24 hours.
         */
        post: operations["extractDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/extract/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit up to 10 documents in one call
         * @description Multipart form data, one or more files under the field name
         *     `files` (repeat the field for each one), up to 10 files per
         *     request. Each file goes through exactly the same pipeline as
         *     `POST /v1/extract` — the same duplicate detection, the same sandbox
         *     handling for a test-mode key, a `document.created` webhook per new
         *     document — so this behaves like N calls to the single endpoint in
         *     one round trip.
         *
         *     Always answers `200`. One bad file does not fail the batch: each
         *     entry in `results` carries its own outcome, in the same order the
         *     files were sent, and `accepted`/`rejected` sum to the number of
         *     files submitted. `Idempotency-Key` is not supported here — it names
         *     one logical request, and a batch is several at once.
         */
        post: operations["extractDocumentBatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List documents */
        get: operations["listDocuments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/documents/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch a document with its extraction
         * @description The `extraction` field is absent until an extraction row exists, and
         *     carries `status: "pending"` until reading finishes. Poll this endpoint
         *     to await a result.
         */
        get: operations["getDocument"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/documents/{id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Download the original file
         * @description Streams the bytes exactly as uploaded, with the stored content type.
         */
        get: operations["getDocumentFile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/review-queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List review-queue items
         * @description Items the engine flagged for a human to check. Reasons cover both
         *     extraction quality (low confidence, totals that did not reconcile)
         *     and risk (changed bank details, an amount outside a vendor's usual
         *     range, a suspected duplicate, or a rule the workspace configured).
         */
        get: operations["listReviewQueue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/review-queue/{id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resolve or dismiss a review item */
        post: operations["resolveReviewQueueItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List spend categories
         * @description The categories documents are sorted into. Every workspace starts with a seeded set.
         */
        get: operations["listCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Usage for the current billing period */
        get: operations["getUsage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/stats/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Workspace statistics */
        get: operations["getStatsOverview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/webhook-endpoints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List webhook endpoints */
        get: operations["listWebhookEndpoints"];
        put?: never;
        /**
         * Register a webhook endpoint
         * @description Subscribes a URL to signed events. This is the REST-hook subscribe used by Zapier, Make and n8n. The response is the only time the signing secret is ever returned.
         */
        post: operations["createWebhookEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/webhook-endpoints/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Remove a webhook endpoint
         * @description The REST-hook unsubscribe. Deliveries to it stop immediately.
         */
        delete: operations["deleteWebhookEndpoint"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/bills": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the household's bills
         * @description Every bill the household has added, as the app lists them. A reminder
         *     or collection letter linked to a bill is folded into that bill's row
         *     (see `letter`) rather than listed on its own; a search lists them too.
         *     Unpaid bills come soonest-due first.
         */
        get: operations["listBills"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/bills/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * What there is to pay
         * @description How many bills are unpaid and overdue, and what falls due in the next `days` days, per currency.
         */
        get: operations["getBillsSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/bills/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A month at a glance
         * @description The month's totals (billed and paid, per currency), the twelve months
         *     up to it, the five biggest senders, and every sender with a count.
         *     A reminder counts at its newest amount as part of its bill; receipts,
         *     payment confirmations and credit notes are not counted.
         */
        get: operations["getBillsStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/bills/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Everything about one bill
         * @description The bill with everything read from it, its open warnings, the
         *     household's record (paid, by whom, who pays), and its letters.
         */
        get: operations["getBill"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/bills/{id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Download the original bill
         * @description Streams the bytes exactly as added, with the stored content type.
         */
        get: operations["getBillFile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/bills/{id}/paid": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark a bill as paid
         * @description Records the bill, and its letters, as paid by the person who created
         *     the key. Needs `bills:write`, which a household grants only when it
         *     allows its key or assistant to mark bills paid.
         */
        post: operations["markBillPaid"];
        /** Mark a bill as not paid */
        delete: operations["unmarkBillPaid"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/held-emails": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Emails waiting for approval
         * @description Bills forwarded to the household's address that wait for a person to
         *     approve their sender, or for a plan. Read-only: approving a sender is
         *     done in the app.
         */
        get: operations["listHeldEmails"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ErrorDetail: {
            /**
             * @description A stable machine-readable identifier. Branch on this, not the message.
             * @example invalid_body
             * @example unauthenticated
             * @example forbidden
             * @example not_found
             * @example upload_too_large
             */
            code: string;
            /** @description Human-readable explanation. Wording may change; do not parse it. */
            message: string;
        };
        Error: {
            error: components["schemas"]["ErrorDetail"];
        };
        /** @description One file's outcome from POST /v1/extract/batch. A rejected file carries `error` and omits the document fields; an accepted one carries the document fields and omits `error`. */
        BatchResultItem: {
            filename: string;
            /** Format: uuid */
            document_id?: string;
            /** Format: uuid */
            extraction_id?: string;
            status?: components["schemas"]["DocumentStatus"];
            /** @description True when this file's bytes were already extracted in this workspace. */
            duplicate?: boolean;
            /** @description Present only when this file was rejected. */
            error?: components["schemas"]["ErrorDetail"];
        };
        /** @enum {string} */
        DocumentStatus: "pending" | "processing" | "done" | "failed";
        /**
         * @description How the document arrived.
         * @enum {string}
         */
        DocumentSource: "api" | "dashboard" | "email" | "storage" | "sandbox";
        Document: {
            /** Format: uuid */
            id: string;
            source: components["schemas"]["DocumentSource"];
            original_filename: string;
            /** @example application/pdf */
            content_type: string;
            /** Format: int64 */
            byte_size: number;
            status: components["schemas"]["DocumentStatus"];
            approval?: components["schemas"]["DocumentApproval"];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** @description Sign-off state. Separate from `status`, which tracks extraction: this is a person's judgement, that is the machine's progress. Always "draft" unless the workspace has an approval mode switched on. */
        DocumentApproval: {
            /** @enum {string} */
            state: "draft" | "ready" | "approved" | "changes_requested";
            /** Format: uuid */
            submitted_by?: string | null;
            /** @description Captured at the time, so it survives the person leaving. */
            submitted_by_name?: string | null;
            /** Format: date-time */
            submitted_at?: string | null;
            /** Format: uuid */
            approved_by?: string | null;
            approved_by_name?: string | null;
            /** Format: date-time */
            approved_at?: string | null;
        };
        /** @description A document plus a flat summary of its latest extraction. */
        DocumentListItem: {
            /** Format: uuid */
            id: string;
            source: components["schemas"]["DocumentSource"];
            original_filename: string;
            content_type: string;
            /** Format: int64 */
            byte_size: number;
            status: components["schemas"]["DocumentStatus"];
            vendor_name?: string | null;
            invoice_number?: string | null;
            reference_number?: string | null;
            /** Format: int64 */
            total_cents?: number | null;
            /** @description The workspace's reporting currency, when one is configured. Null when conversion is off, or when this invoice's currency had no published rate for its date. The invoice's own currency and total_cents remain authoritative. */
            base_currency?: string | null;
            /**
             * Format: int64
             * @description total_cents converted into base_currency, for reporting only.
             */
            base_total_cents?: number | null;
            /** @description Reporting-currency units per one unit of the invoice currency, as a decimal string so the exact stored value round-trips. */
            fx_rate?: string | null;
            /**
             * Format: date
             * @description The date of the published rates used, which is the invoice date or the most recent publication before it.
             */
            fx_rate_date?: string | null;
            /** @description Who published the rate, e.g. "ecb". */
            fx_source?: string | null;
            currency?: string | null;
            /** Format: uuid */
            category_id?: string | null;
            category_name?: string | null;
            /** @description Count of unresolved review items. */
            pending_review: number;
            /** @description True when pending_review is above zero. */
            flagged: boolean;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** @enum {string} */
        ExtractionStatus: "pending" | "done" | "failed";
        Extraction: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            document_id: string;
            /** @example invoist-extraction-v1 */
            engine: string;
            status: components["schemas"]["ExtractionStatus"];
            /**
             * @description What the document is. Null when the reader could not tell, and on documents read before this field existed; treat null as an ordinary invoice.
             * @enum {string|null}
             */
            document_kind?: "invoice" | "reminder" | "debt_collection" | "credit_note" | "receipt" | "payment_confirmation" | null;
            invoice_number?: string | null;
            /**
             * Format: date
             * @description Absent when not printed on the document.
             */
            invoice_date?: string;
            /**
             * Format: date
             * @description Absent when not printed on the document.
             */
            due_date?: string;
            po_number?: string | null;
            /** @description The payment or bank reference, distinct from the invoice number. */
            reference_number?: string | null;
            vendor_name?: string | null;
            vendor_address?: string | null;
            customer_name?: string | null;
            /** @description ISO 4217 code, e.g. EUR. */
            currency?: string | null;
            /** Format: int64 */
            subtotal_cents?: number | null;
            /** Format: int64 */
            tax_cents?: number | null;
            /** Format: int64 */
            total_cents?: number | null;
            /** @description The workspace's reporting currency, when one is configured. Null when conversion is off, or when this invoice's currency had no published rate for its date. */
            base_currency?: string | null;
            /**
             * Format: int64
             * @description total_cents converted into base_currency, for reporting only.
             */
            base_total_cents?: number | null;
            /** @description Reporting-currency units per one unit of the invoice currency, as a decimal string. */
            fx_rate?: string | null;
            /**
             * Format: date
             * @description The date of the published rates used.
             */
            fx_rate_date?: string | null;
            /** @description Who published the rate, e.g. "ecb". */
            fx_source?: string | null;
            /** @description Per-field confidence between 0 and 1, keyed by field name. */
            confidence?: {
                [key: string]: number;
            } | null;
            line_items?: components["schemas"]["LineItem"][] | null;
            /** @description Optional commercial extras (payment terms, tax IDs, IBAN, shipping). On a reminder, collection letter or credit note it also carries original_invoice_number, original_invoice_date, original_creditor, original_amount_cents, fees_cents and interest_cents: the earlier invoice it is about and what was added. */
            details?: {
                [key: string]: unknown;
            } | null;
            /**
             * @description Heuristic observations worth a second look. Never a determination
             *     that a document is fraudulent.
             */
            fraud_indicators?: components["schemas"]["FraudIndicator"][] | null;
            /** @description Facts read from the file's own EXIF or PDF metadata, never inferred. */
            file_metadata?: {
                [key: string]: unknown;
            } | null;
            /** @description Workspace-declared custom fields, filled during extraction. */
            custom?: components["schemas"]["CustomValue"][];
            /** @description Coordinate-pinned findings on the first page image. */
            discoveries?: components["schemas"]["Discovery"][];
            quality?: components["schemas"]["Quality"];
            /** Format: uuid */
            category_id?: string | null;
            /**
             * @description Who chose the category.
             * @enum {string|null}
             */
            category_source?: "model" | "user" | "memory" | null;
            /** @description True when this skipped the review queue because the vendor had a clean track record. */
            auto_approved?: boolean;
            error_message?: string | null;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
            /**
             * Format: date-time
             * @description When a person last corrected these fields by hand. Absent if the extraction has never been edited, so its presence is how you tell a human-reviewed record from a purely automatic one.
             */
            edited_at?: string;
        };
        /** @description Progress of the background run that produces an extraction. Reading a document is queued work, so this reports how that work is going: whether it is waiting, running, finished, or has given up. */
        ExtractionJob: {
            /**
             * @description `queued` is waiting for a worker, which includes waiting out the backoff between attempts. `failed` means every attempt was used or the failure was one that retrying cannot fix.
             * @enum {string}
             */
            status: "queued" | "running" | "succeeded" | "failed";
            /** @description Attempts made so far, including the one currently running. */
            attempt_count: number;
            /** @description Attempts allowed before the run is abandoned. Deliberately small, since every attempt is a real extraction. */
            max_attempts: number;
            /** @description True when the run has stopped and can be started again. Retrying is a fresh run and is billed as one. */
            retryable: boolean;
            /**
             * Format: date-time
             * @description When the next attempt is due. Present only while a retry is genuinely still coming, so its absence on a queued job means the job has not started yet rather than that it is stalled.
             */
            next_attempt_at?: string;
        };
        LineItem: {
            description: string;
            quantity: number;
            unit?: string | null;
            sku?: string | null;
            /**
             * Format: int64
             * @description Unit price in whole cents. Null when the price is not an exact number of cents, which happens on utility and fuel invoices priced per unit below one cent. Read unit_price_micros for those.
             */
            unit_price_cents?: number | null;
            /**
             * Format: int64
             * @description Unit price in millionths of one currency unit, exact for sub-cent prices. 8.72 cents per kWh is 87200. Set whenever a unit price is printed, including when unit_price_cents is also set.
             */
            unit_price_micros?: number | null;
            /** Format: int64 */
            line_total_cents?: number | null;
            /** Format: int64 */
            tax_cents?: number | null;
            /** Format: int64 */
            discount_cents?: number | null;
        };
        FraudIndicator: {
            /**
             * @description Model-reported signals are one of `math_mismatch`,
             *     `font_inconsistency`, `implausible_dates`, `round_total`,
             *     `vendor_details_off`, `possible_edit`. Engine-reported signals
             *     add `vendor_bank_change` and `vendor_amount_anomaly`.
             */
            signal: string;
            /** @enum {string} */
            severity: "low" | "medium" | "high";
            description: string;
            /**
             * @description `model` when read off the page; `engine` when derived from workspace history.
             * @enum {string}
             */
            source: "model" | "engine";
            /** @description 1-based page number when the finding has a location. */
            page?: number | null;
            box?: components["schemas"]["RegionBox"];
        };
        /** @description A rectangle on the page image, normalized 0 to 1, origin top-left. */
        RegionBox: {
            x: number;
            y: number;
            w: number;
            h: number;
        } | null;
        WebhookEndpoint: {
            /** Format: uuid */
            id: string;
            url: string;
            description: string;
            /** @description Subscribed event types; ["*"] means everything. */
            events: string[];
            enabled: boolean;
            consecutive_failures: number;
            /** Format: date-time */
            last_delivery_at?: string | null;
            last_status?: number | null;
            /**
             * Format: date-time
             * @description Set when repeated failures paused this endpoint automatically.
             */
            auto_disabled_at?: string | null;
            /** Format: date-time */
            created_at: string;
        };
        WebhookEndpointWithSecret: components["schemas"]["WebhookEndpoint"] & {
            /** @description HMAC key for X-Invoist-Signature. Returned only here and on rotation, never readable again. */
            secret: string;
        };
        Discovery: {
            /** @description 1-based page this pin belongs to. Absent or 0 means page 1, which is how discoveries extracted before multi-page support are stored. */
            page?: number;
            /** @description Normalized 0 to 1 across that page's image. */
            x: number;
            /** @description Normalized 0 to 1 down that page's image. */
            y: number;
            label: string;
        };
        CustomValue: {
            key: string;
            label: string;
            value?: string | null;
            confidence?: number | null;
        };
        Quality: {
            /** @description 0 to 1, where 1 is crisp and fully legible. */
            readability: number;
            issues: ("blurry" | "cropped" | "low_contrast" | "rotated" | "handwritten" | "partial")[];
        } | null;
        /** @enum {string} */
        ReviewStatus: "pending" | "resolved" | "dismissed";
        /**
         * @description Why the item was flagged.
         * @enum {string}
         */
        ReviewReason: "low_confidence" | "total_mismatch" | "poor_quality" | "duplicate" | "unusual_vendor" | "bank_details_changed" | "amount_anomaly" | "amount_over_limit" | "missing_po_number";
        ReviewQueueItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            document_id: string;
            /** Format: uuid */
            extraction_id: string;
            reason: components["schemas"]["ReviewReason"];
            status: components["schemas"]["ReviewStatus"];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            resolved_at?: string;
        };
        /** @description A review item plus a summary of the document it belongs to. */
        ReviewQueueListItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            document_id: string;
            /** Format: uuid */
            extraction_id: string;
            reason: components["schemas"]["ReviewReason"];
            status: components["schemas"]["ReviewStatus"];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            resolved_at?: string;
            original_filename: string;
            content_type: string;
            document_status: components["schemas"]["DocumentStatus"];
            vendor_name?: string | null;
            invoice_number?: string | null;
            reference_number?: string | null;
            /** Format: int64 */
            total_cents?: number | null;
            currency?: string | null;
        };
        Category: {
            /** Format: uuid */
            id: string;
            name: string;
            /** @description Part of the set seeded with the workspace. */
            is_default: boolean;
            /** Format: date-time */
            created_at: string;
        };
        Usage: {
            /** Format: date-time */
            period_start: string;
            total_calls: number;
            total_documents: number;
            /** Format: int64 */
            total_cost_cents: number;
            by_day: {
                /** Format: date */
                day?: string;
                calls?: number;
                documents?: number;
            }[];
        };
        StatsOverview: {
            documents_this_month: number;
            documents_total: number;
            pending_review_count: number;
            /** Format: date-time */
            period_start: string;
            /** @enum {string} */
            plan: "starter" | "growth" | "scale";
            /** @description Monthly allowance for the plan. Absent for plans without a fixed allowance. */
            documents_included?: number;
        };
        /** @description The household's own record on a bill. */
        BillRecord: {
            /**
             * Format: date-time
             * @description When it was marked paid.
             */
            paid_at: string | null;
            /**
             * Format: uuid
             * @description Who marked it paid.
             */
            paid_by: string | null;
            /**
             * Format: uuid
             * @description Who is meant to pay it.
             */
            assigned_to: string | null;
        };
        /**
         * @description What a document is. Null is an ordinary invoice.
         * @enum {string|null}
         */
        BillKind: "invoice" | "reminder" | "debt_collection" | "credit_note" | "receipt" | "payment_confirmation" | null;
        /** @description The bill a letter or receipt is linked to, and how. */
        BillRelated: {
            /** Format: uuid */
            document_id: string | null;
            /** @description `matched` or `confirmed` when linked, `suggested` when Invoist only thinks so, empty when unlinked. */
            link: string;
        };
        /** @description The newest reminder or collection letter about a bill, which says what is owed now. */
        BillLetter: {
            /** Format: uuid */
            document_id: string;
            /** @enum {string} */
            kind: "reminder" | "debt_collection";
            /** Format: int64 */
            total_cents?: number | null;
            currency?: string | null;
            /** Format: date */
            due_date?: string | null;
            /**
             * Format: int64
             * @description Fees and interest added on top of the original.
             */
            added_cents?: number | null;
            /** @description How many letters came for this bill. */
            count: number;
        };
        /** @description One bill in a household's list. */
        Bill: components["schemas"]["DocumentListItem"] & {
            /** Format: date */
            due_date?: string | null;
            bill: components["schemas"]["BillRecord"];
            kind: components["schemas"]["BillKind"];
            related: components["schemas"]["BillRelated"];
            letter: components["schemas"]["BillLetter"] | null;
            /**
             * Format: uuid
             * @description A receipt or payment confirmation found for this bill.
             */
            proof_document_id?: string | null;
            /** @description The domain whose logo stands for the sender, when Invoist shows one: never on a bill with an open warning, never for a domain that imitates another the household knows. */
            logo: string | null;
        };
        /** @description One document of a bill's chain (the bill and its letters). */
        BillChainMember: {
            /** Format: uuid */
            document_id: string;
            kind: components["schemas"]["BillKind"];
            link?: string | null;
            status: components["schemas"]["DocumentStatus"];
            original_filename: string;
            vendor_name?: string | null;
            invoice_number?: string | null;
            reference_number?: string | null;
            currency?: string | null;
            /** Format: int64 */
            total_cents?: number | null;
            /** Format: date */
            date: string;
            /** Format: date */
            due_date?: string | null;
            /** Format: date-time */
            paid_at?: string | null;
            /** Format: int64 */
            fees_cents?: number | null;
            /** Format: int64 */
            interest_cents?: number | null;
            /** Format: int64 */
            original_amount_cents?: number | null;
            original_creditor?: string | null;
            vendor_iban?: string | null;
            vendor_bic?: string | null;
            payment_account?: string | null;
            warnings?: {
                /** Format: uuid */
                id: string;
                reason: components["schemas"]["ReviewReason"];
            }[];
        };
        /** @description One bill with everything read from it. */
        BillDetail: {
            document: components["schemas"]["Document"];
            extraction?: components["schemas"]["Extraction"];
            extraction_job?: components["schemas"]["ExtractionJob"];
            /** @description The bill's warnings; open ones have status `pending`. */
            review_queue: components["schemas"]["ReviewQueueItem"][];
            period_locked?: boolean;
            bill: components["schemas"]["BillRecord"];
            related?: components["schemas"]["BillRelated"];
            /** @description The bill and its letters, when it has any. */
            chain?: {
                /** Format: uuid */
                root_id: string;
                members: components["schemas"]["BillChainMember"][];
            };
            suggested_bill?: components["schemas"]["BillChainMember"];
            suggested_letters?: components["schemas"]["BillChainMember"][];
            logo?: string | null;
        };
        BillsDue: {
            currency: string;
            count: number;
            /** Format: int64 */
            total_cents: number;
        };
        BillsSummary: {
            /** @description Bills not marked paid. */
            unpaid: number;
            /** @description Unpaid bills past their due date. */
            overdue: number;
            /** @description Per currency, the unpaid bills due by today plus `days`, overdue ones included. */
            due_soon: components["schemas"]["BillsDue"][];
            days: number;
            /** Format: date */
            today: string;
        };
        BillsStats: {
            /** @description `YYYY-MM` */
            month: string;
            totals: {
                currency: string;
                count: number;
                paid_count: number;
                /** Format: int64 */
                total_cents: number;
                /** Format: int64 */
                paid_cents: number;
            }[];
            /** @description Up to twelve months ending with `month`, per currency; months with no bills are absent. */
            trend: {
                month: string;
                currency: string;
                count: number;
                /** Format: int64 */
                total_cents: number;
            }[];
            top_senders: {
                name: string;
                currency?: string;
                count: number;
                /** Format: int64 */
                total_cents?: number;
                logo?: string | null;
            }[];
            /** @description Everyone who has sent the household bills, most bills first. */
            senders: {
                name: string;
                count: number;
            }[];
        };
        HeldEmailFile: {
            /** Format: uuid */
            id: string;
            filename: string;
            content_type: string;
            /** Format: int64 */
            size_bytes: number;
        };
        /** @description An email forwarded to the household that waits for approval. */
        HeldEmail: {
            /** Format: uuid */
            id: string;
            from_email: string;
            subject: string;
            status: string;
            reason?: string | null;
            attachments?: number;
            documents?: number;
            /** Format: date-time */
            created_at: string;
            /**
             * @description Why it waits. The sender reasons wait for a person; the plan reasons clear by themselves.
             * @enum {string|null}
             */
            hold_reason?: "new_sender" | "unverified_sender" | "no_plan" | "quota_used" | null;
            /**
             * Format: date-time
             * @description When it is deleted if nobody acts.
             */
            held_until?: string | null;
            /** Format: date-time */
            resolved_at?: string | null;
            bounced?: boolean;
            /** @description The household member whose forwarding rule passed it on. */
            forwarded_by?: string | null;
            /** @description Who wrote it first, when forwarded by hand. */
            original_from?: string | null;
            /** @description A known domain this sender's imitates. */
            lookalike_of?: string | null;
            /**
             * @description What the mail server found about the From address.
             * @enum {string}
             */
            sender: "verified" | "failed" | "unknown";
            files: components["schemas"]["HeldEmailFile"][];
            logo?: string | null;
        };
    };
    responses: {
        /** @description The request was malformed. */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Missing, malformed, or revoked API key. */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The key is valid but lacks the scope this endpoint requires. */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description No such resource in this workspace. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Too many requests. Check the `Retry-After` header. */
        RateLimited: {
            headers: {
                /** @description Seconds to wait before retrying. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        DocumentId: string;
        /** @description The webhook endpoint's id. */
        WebhookEndpointId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    extractDocument: {
        parameters: {
            query?: never;
            header?: {
                /** @description A key you generate per logical request. Reusing it with the same file replays the first response; reusing it with a different file is rejected with 422. */
                "Idempotency-Key"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description The invoice file. PDF, PNG, or JPEG, under 20 MB.
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description These exact bytes were already extracted in this workspace. The existing document is returned and nothing new was created or billed. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        document: components["schemas"]["Document"];
                        extraction?: components["schemas"]["Extraction"];
                        /** @constant */
                        duplicate: true;
                    };
                };
            };
            /** @description Document accepted and queued for extraction. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        document: components["schemas"]["Document"];
                        extraction: components["schemas"]["Extraction"];
                        /**
                         * @description Always false here. Present so callers can branch on one field rather than on the status code.
                         * @constant
                         */
                        duplicate: false;
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            /** @description The file is larger than 20 MB. */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unsupported file type. Use PDF, PNG, or JPEG. */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description The Idempotency-Key header was already used with a different file. Generate a new key for a genuinely different request. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["RateLimited"];
            /** @description File storage is not configured on this deployment. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    extractDocumentBatch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** @description One to ten invoice files. PDF, PNG, or JPEG, each under 20 MB. */
                    files: string[];
                };
            };
        };
        responses: {
            /** @description Every file's individual outcome. The request itself always succeeds if it reached this far. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        results: components["schemas"]["BatchResultItem"][];
                        /** @description How many files were accepted and queued. */
                        accepted: number;
                        /** @description How many files failed validation or could not be stored. */
                        rejected: number;
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
            /** @description File storage is not configured on this deployment. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listDocuments: {
        parameters: {
            query?: {
                /** @description Maximum rows to return. Defaults to 50, capped at 200. */
                limit?: number;
                offset?: number;
                /** @description Filter by document status. */
                status?: components["schemas"]["DocumentStatus"];
                /** @description Only documents with pending review items. Pass `1` or `true`. */
                flagged?: string;
                /** @description Case-insensitive match on filename, vendor, invoice number, or reference. */
                q?: string;
                /** @description A category id, or the literal `none` for uncategorized only. */
                category?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of documents. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        documents: components["schemas"]["DocumentListItem"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    getDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The document, its extraction, and any review items. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        document: components["schemas"]["Document"];
                        extraction?: components["schemas"]["Extraction"];
                        extraction_job?: components["schemas"]["ExtractionJob"];
                        review_queue: components["schemas"]["ReviewQueueItem"][];
                        /** @description Whether this document's month is closed. A locked document can be read and exported but not edited, categorized, deleted, or re-run until the month is reopened. */
                        period_locked?: boolean;
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    getDocumentFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The original file. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/pdf": string;
                    "image/png": string;
                    "image/jpeg": string;
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    listReviewQueue: {
        parameters: {
            query?: {
                /** @description Filter by item status. Omit for all. */
                status?: components["schemas"]["ReviewStatus"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Matching review items, with a summary of their document. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        review_queue: components["schemas"]["ReviewQueueListItem"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    resolveReviewQueueItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": {
                    /**
                     * @description Defaults to `resolved` when omitted.
                     * @enum {string}
                     */
                    status?: "resolved" | "dismissed";
                };
            };
        };
        responses: {
            /** @description The updated item. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        review_queue_item: components["schemas"]["ReviewQueueItem"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    listCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workspace's categories. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        categories: components["schemas"]["Category"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    getUsage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Usage totals and a per-day breakdown. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Usage"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    getStatsOverview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Document counts, pending review count, and plan allowance. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatsOverview"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    listWebhookEndpoints: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Every registered endpoint, plus the event catalogue. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        endpoints: components["schemas"]["WebhookEndpoint"][];
                        known_events: string[];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    createWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description HTTP or HTTPS receiver. */
                    url: string;
                    description?: string;
                    /** @description Event types, or ["*"] for everything. Defaults to everything. */
                    events?: string[];
                };
            };
        };
        responses: {
            /** @description The endpoint, including its one-time signing secret. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        endpoint: components["schemas"]["WebhookEndpointWithSecret"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    deleteWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The webhook endpoint's id. */
                id: components["parameters"]["WebhookEndpointId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Removed. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    listBills: {
        parameters: {
            query?: {
                /** @description `true` for bills marked paid, `false` for bills still to pay; omit for both. */
                paid?: boolean;
                /** @description Only the bills of this month (`YYYY-MM`), by due date, or the bill's own date when it has none. */
                month?: string;
                /** @description Only this sender's bills, matched without regard to case or spacing. */
                sender?: string;
                /** @description Case-insensitive match on filename, sender, bill number, or reference. Searches every month. */
                q?: string;
                /** @description Maximum rows to return. Defaults to 50, capped at 200. */
                limit?: number;
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of bills. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        bills: components["schemas"]["Bill"][];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    getBillsSummary: {
        parameters: {
            query?: {
                /** @description The household's own date (`YYYY-MM-DD`), within two days of the server's. Defaults to the server's. */
                today?: string;
                /** @description How far ahead "due soon" reaches. Defaults to 30. */
                days?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The summary. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BillsSummary"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    getBillsStats: {
        parameters: {
            query?: {
                /** @description The month (`YYYY-MM`). Defaults to the current one. */
                month?: string;
                /** @description Narrow the totals and the trend to one sender. */
                sender?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The month. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BillsStats"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    getBill: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The bill. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BillDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    getBillFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The original file. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/pdf": string;
                    "image/png": string;
                    "image/jpeg": string;
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    markBillPaid: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The household's record after the change. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        bill: components["schemas"]["BillRecord"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    unmarkBillPaid: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The household's record after the change. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        bill: components["schemas"]["BillRecord"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    listHeldEmails: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The waiting emails, oldest first. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        held_emails: components["schemas"]["HeldEmail"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
}
