// Compile-time checks, run by `npm run typecheck` (not a test file).
//
// The SDK's filter objects are written by hand so their docs read well; this
// fails to compile when they drift from the spec's query parameters, in
// either direction (a parameter the SDK lacks, or one the spec dropped).
import type { operations } from "../src/generated/schema.ts";
import type {
  BillsStatsParams,
  BillsSummaryParams,
  ListBillsParams,
  ListDocumentsParams,
  ListReviewQueueParams,
} from "../src/index.ts";

type Query<Op extends keyof operations> = operations[Op]["parameters"] extends { query?: infer Q }
  ? NonNullable<Q>
  : never;
type SameKeys<A, B> = [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] extends [never, never] ? true : false;
type Assert<T extends true> = T;

export type QueryParamsMatchTheSpec = [
  Assert<SameKeys<ListDocumentsParams, Query<"listDocuments">>>,
  Assert<SameKeys<ListReviewQueueParams, Query<"listReviewQueue">>>,
  Assert<SameKeys<ListBillsParams, Query<"listBills">>>,
  Assert<SameKeys<BillsSummaryParams, Query<"getBillsSummary">>>,
  Assert<SameKeys<BillsStatsParams, Query<"getBillsStats">>>,
];
