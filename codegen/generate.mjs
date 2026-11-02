// Writes src/generated/schema.ts from the Invoist OpenAPI spec.
//
// The spec is testdata/openapi.yaml, or the file named by $INVOIST_OPENAPI.
// Run from the SDK folder: `npm run generate`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const specPath = resolve(process.env.INVOIST_OPENAPI || "testdata/openapi.yaml");
const outPath = resolve("src/generated/schema.ts");

const ast = await openapiTS(readFileSync(specPath, "utf8"));
const header = [
  "// Generated from the Invoist OpenAPI spec by openapi-typescript.",
  "// Do not edit by hand: run `npm run generate`.",
  "",
  "",
].join("\n");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header + astToString(ast));
console.log(`wrote ${outPath} from ${specPath}`);
