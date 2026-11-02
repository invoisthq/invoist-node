# Invoist for TypeScript and JavaScript

The official client for the [Invoist API](https://invoi.st/docs). Send it an
invoice, a receipt or a bill as a PDF or a photo, and get back what's on it as
structured data: the sender, the amounts, the due date, every line.

- Works in Node.js 22 and later, Bun and Deno, as an ES module or with `require`.
- Fully typed. The types are generated from the API's OpenAPI spec.
- No dependencies. It uses the runtime's own `fetch`.

```sh
npm install @invoist/sdk
```

## For a business

```ts
import { Invoist } from "@invoist/sdk";

const invoist = new Invoist({ apiKey: process.env.INVOIST_API_KEY! });
const { document, extraction } = await invoist.extractAndWait("invoices/acme-1042.pdf");
console.log(extraction.vendor_name, extraction.total_cents, extraction.currency);
```

Create an API key in the dashboard under **Integrations**. Amounts are always
whole minor units (`total_cents: 12950` is 129.50), never a float. Dates are
`YYYY-MM-DD` strings.

## For a household

With [Invoist Personal](https://invoi.st), a household's bills are under
`invoist.bills`:

```ts
import { Invoist } from "@invoist/sdk";

const invoist = new Invoist({ apiKey: process.env.INVOIST_API_KEY! });
const unpaid = await invoist.bills.list({ paid: false });
for (const bill of unpaid) console.log(bill.vendor_name, bill.total_cents, bill.currency, bill.due_date);
```

Create the key in the app under **Settings → AI assistants**. It can read the
household's bills, and mark them paid only if you allow that when you make it.

## Uploading documents

`extract` accepts a PDF, PNG or JPEG under 20 MB, in whatever form you have it:

```ts
await invoist.extract("scan.jpg");                                   // a path (Node, Bun, Deno)
await invoist.extract(fileFromAnInput);                               // a File or Blob
await invoist.extract({ data: buffer, filename: "invoice.pdf" });     // bytes
await invoist.extract({ data: fs.createReadStream(p), filename: "invoice.pdf" }); // a stream
```

Reading a document takes a few seconds and happens in the background, so
`extract` answers at once with the extraction still `pending`. Then either:

- **wait for it**, which suits scripts and short jobs:

  ```ts
  const extraction = await invoist.waitForExtraction(document.id);
  ```

  It checks every 2 seconds and gives up after 2 minutes (`{ pollInterval, timeout }`
  in milliseconds change that). `extractAndWait` does both steps in one call.

- or **get a webhook** when it's done (below), which suits production.

A document that couldn't be read is an answer, not an error: `waitForExtraction`
resolves with `status: "failed"` and an `error_message`.

```ts
if (extraction.status === "failed") console.warn("Could not read it:", extraction.error_message);
```

Sending the same bytes twice is safe and free: you get the first document back
with `duplicate: true`. If a retry might send slightly different bytes (the
file exported again), pass an `idempotencyKey`, and the second call replays the
first one's answer:

```ts
await invoist.extract(file, { idempotencyKey: `order-${orderId}` });
```

Up to ten files at once: `await invoist.extractBatch([a, b, c])`. One bad file
doesn't fail the others; each entry in `results` has its own outcome.

## Everything else

```ts
// A business workspace
await invoist.listDocuments({ flagged: true, limit: 50 });  // newest first
await invoist.getDocument(id);                              // document, extraction, review items
await invoist.getDocumentFile(id);                          // { data, contentType, filename }
await invoist.listReviewQueue({ status: "pending" });       // things worth a second look
await invoist.resolveReviewItem(itemId, "dismissed");       // or "resolved", the default
await invoist.listCategories();
await invoist.getUsage();
await invoist.getStats();
await invoist.listWebhookEndpoints();
await invoist.createWebhookEndpoint({ url: "https://example.com/hooks/invoist", description: "Bookkeeping" });
await invoist.deleteWebhookEndpoint(endpointId);

// A household
await invoist.bills.list({ month: "2026-11", sender: "Northwind" });  // month also takes a Date
await invoist.bills.get(billId);                                  // with its letters and warnings
await invoist.bills.getFile(billId);
await invoist.bills.summary();                                    // unpaid, overdue, due soon
await invoist.bills.stats({ month: new Date() });                 // a month at a glance
await invoist.bills.markPaid(billId);                             // needs bills:write
await invoist.bills.markUnpaid(billId);
await invoist.heldEmails.list();                                  // emails waiting for approval
```

Every method takes, as its last argument, `{ signal, timeout, maxRetries }` for
that one call:

```ts
await invoist.listDocuments({}, { signal: AbortSignal.timeout(5_000) });
```

## Errors

Every failed call rejects with an `InvoistError`:

```ts
import { InvoistError } from "@invoist/sdk";

try {
  await invoist.getDocument(id);
} catch (err) {
  if (err instanceof InvoistError && err.isNotFound) return null;
  throw err;
}
```

| Field | What it is |
|---|---|
| `status` | The HTTP status, or `0` when no response arrived |
| `code` | A stable code such as `invalid_api_key`, `insufficient_scope` or `not_found`. Branch on this. |
| `message` | A sentence for people. Its wording can change, so don't branch on it. |
| `requestId` | The `X-Request-Id` header. Quote it when you contact support. |
| `body` | The raw response body, when there was one |

And yes-or-no checks: `isAuthError` (401), `isPermissionError` (403),
`isNotFound` (404), `isRateLimited` (429) and `isRetryable`.

The SDK adds a few codes of its own: `network_error` (no response arrived),
`timeout`, `unexpected_response` (the answer wasn't the API's JSON, for example
a proxy's error page), and `extraction_timeout` from `waitForExtraction`.

Calling a household route with a business key fails with `household_feature`
(403), and a business route with a household key with `business_feature`.

## Retries and timeouts

A request that might succeed on a second try is retried twice before the call
fails: when no response arrived, on 429 (too many requests), and on any 5xx.
Other errors, like a 400 or a 404, are never retried. Between tries the SDK
waits as long as the server's `Retry-After` header says, or else 0.5 s, then
1 s (each ±20%, at most 8 s). If the server asks for a pause longer than 60
seconds, the SDK doesn't wait: the call fails at once with that error, so your
program never hangs.

Uploads are retried too. That's safe: the same bytes always come back as the
same document. A cancelled call (through your `signal`) is never retried.

```ts
const invoist = new Invoist({
  apiKey: process.env.INVOIST_API_KEY!,
  maxRetries: 4,   // default 2; 0 turns retries off
  timeout: 30_000, // per attempt, in milliseconds; default 60 000
});
```

To route requests through a proxy, log them, or fake them in tests, pass your
own `fetch`: `new Invoist({ apiKey, fetch: myFetch })`.

## Webhooks

Invoist can call your server when something happens, for example when a
document has been read. Each request is signed. Check the signature before you
trust it, with `verifyWebhook` from `@invoist/sdk/webhooks`:

```ts
import express from "express";
import { verifyWebhook, WebhookEvents } from "@invoist/sdk/webhooks";

const app = express();

// express.raw, not express.json: the check needs the body exactly as it was sent.
app.post("/hooks/invoist", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  try {
    event = verifyWebhook(req.body, req.get("X-Invoist-Signature"), process.env.INVOIST_WEBHOOK_SECRET!);
  } catch {
    return res.sendStatus(400);
  }

  res.sendStatus(200); // answer first; a slow answer is retried

  if (event.type === WebhookEvents.ExtractionCompleted) {
    // event.data.document_id is ready: fetch it with invoist.getDocument
  }
});
```

**Pass the raw body.** Parsing the JSON and turning it back into text changes
the bytes, and the signature no longer matches. In Express that means
`express.raw()` on this route. In Next.js and other `Request`-based frameworks,
use `await request.text()`. In Fastify, add a content type parser that keeps
the body as a `Buffer`.

You get the secret (`whsec_…`) once, when you create the endpoint, in the
dashboard or with `createWebhookEndpoint`.

`verifyWebhook` throws an `InvoistError` with status 400 and one of these
codes: `invalid_signature` (the signature is missing or wrong),
`signature_too_old` (it is more than 5 minutes from now, either way, which
stops someone replaying a request they captured), or `invalid_payload` (the
signature is right but the body isn't a JSON event). `verifyWebhook(body, header, secret, { tolerance: 600 })`
changes the window, in seconds.

Event types, also in `WebhookEvents`: `document.created`,
`extraction.completed`, `extraction.failed`, `review_item.created`,
`review_item.resolved` and `document_request.fulfilled`. The
`X-Invoist-Event` header carries the type, and `X-Invoist-Delivery` a delivery
id.

`@invoist/sdk/webhooks` uses `node:crypto`, which Node, Bun and Deno have. The
main `@invoist/sdk` entry doesn't, so it bundles cleanly for browsers and edge
runtimes.

## Links

- [API documentation](https://invoi.st/docs)
- [Changelog](CHANGELOG.md)
- [Reporting a security issue](SECURITY.md)

MIT licensed.
