# Changelog

All notable changes to `@invoist/sdk`. The version is shared by every
official Invoist SDK.

## 1.0.1 - 2026-11-02

- No change to the API or to how the library behaves.
- The repository now holds its own copy of the API's OpenAPI spec in
  `testdata/openapi.yaml`. The models are generated from it, and the tests
  that compare the models with the spec run in this repository too.
- Test data uses made-up company names.

## 1.0.0 - 2026-11-01

The first stable release.

- Every API method: documents, batch uploads, the review queue, categories,
  usage, stats and webhook endpoints for business workspaces; `bills` and
  `heldEmails` for households.
- `waitForExtraction` and `extractAndWait`, which return a failed reading as
  an answer rather than throwing.
- Uploads from a path, a `File` or `Blob`, bytes, or a stream.
  Downloads return `{ data, contentType, filename }`.
- One error type, `InvoistError`, with `status`, `code`, `message`,
  `requestId`, `body` and the `isAuthError`, `isPermissionError`,
  `isNotFound`, `isRateLimited` and `isRetryable` checks. `instanceof`
  works even when both the ES module and CommonJS builds are loaded.
- Retries on no response, 429 and 5xx, honouring `Retry-After`, otherwise
  backing off from 500 ms with jitter, capped at 8 s. A `Retry-After` above
  60 s fails the call at once instead of waiting.
  `timeout` and `maxRetries` per client or per call, and `AbortSignal`
  cancellation on every method.
- `verifyWebhook` at `@invoist/sdk/webhooks`: accepts any matching `v1`
  signature during secret rotation, rejects timestamps too far in the past
  or the future, and reports a correctly signed body that isn't JSON as
  `invalid_payload`. Event type constants in `WebhookEvents`.
- Types generated from the OpenAPI spec.
- ES module and CommonJS builds. Node.js 22 or later.
