// Read-only calls against a real API. Skipped unless INVOIST_API_KEY is set;
// INVOIST_BASE_URL points them elsewhere (default https://api.invoi.st).
//
//   INVOIST_API_KEY=inv_sk_… npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Invoist, InvoistError } from "../src/index.ts";

const apiKey = process.env.INVOIST_API_KEY;
const skip = apiKey ? false : "set INVOIST_API_KEY to run the live tests";

describe("live API (read-only)", { skip }, () => {
  const invoist = new Invoist({ apiKey: apiKey ?? "unused", baseUrl: process.env.INVOIST_BASE_URL || undefined });

  /**
   * A household key can't read documents (`business_feature`, or a missing
   * scope) and a business key can't read bills: try a cheap call of each.
   */
  async function isHousehold(): Promise<boolean> {
    try {
      await invoist.listDocuments({ limit: 1 });
      return false;
    } catch (err) {
      if (!(err instanceof InvoistError && err.isPermissionError)) throw err;
      return invoist.bills.list({ limit: 1 }).then(
        () => true,
        () => false,
      );
    }
  }

  test("reads what the key may read", async () => {
    if (await isHousehold()) {
      const bills = await invoist.bills.list({ limit: 5 });
      assert.ok(Array.isArray(bills));
      const summary = await invoist.bills.summary();
      assert.equal(typeof summary.unpaid, "number");
      const stats = await invoist.bills.stats();
      assert.match(stats.month, /^\d{4}-\d{2}$/);
      assert.ok(Array.isArray(await invoist.heldEmails.list()));
      const firstBill = bills[0];
      if (firstBill) {
        const detail = await invoist.bills.get(firstBill.id);
        assert.equal(detail.document.id, firstBill.id);
      }
      return;
    }
    const documents = await invoist.listDocuments({ limit: 5 });
    assert.ok(Array.isArray(documents));
    const firstDoc = documents[0];
    if (firstDoc) {
      const detail = await invoist.getDocument(firstDoc.id);
      assert.equal(detail.document.id, firstDoc.id);
    }
    for (const call of [
      () => invoist.listCategories(),
      () => invoist.listReviewQueue(),
      () => invoist.getUsage(),
      () => invoist.getStats(),
    ]) {
      // A key may lack some scopes; a 403 is a fine answer, anything else is a failure.
      await call().catch((err: unknown) => {
        if (!(err instanceof InvoistError && err.isPermissionError)) throw err;
      });
    }
  });

  test("a wrong key is an auth error", async () => {
    const bad = new Invoist({ apiKey: "inv_sk_not_a_real_key", baseUrl: invoist.baseUrl, maxRetries: 0 });
    await assert.rejects(bad.getUsage(), (err: unknown) => err instanceof InvoistError && err.isAuthError);
  });
});
