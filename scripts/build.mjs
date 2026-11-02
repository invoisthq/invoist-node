// Builds the package twice from the same sources: ES modules into dist/esm
// and CommonJS into dist/cjs. A package.json marking dist/cjs as CommonJS
// makes Node and TypeScript read those .js and .d.ts files correctly.
//
// The sources import each other as "./x.ts" (so Node can run the tests
// straight from src). tsc rewrites that to "./x.js" in the JavaScript it
// emits but not in declaration files, so this does it there, for type
// checkers that don't map .ts to .d.ts.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const tsc = join(dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin", "tsc");

function run(args) {
  const result = spawnSync(process.execPath, [tsc, ...args], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync("dist", { recursive: true, force: true });
run(["-p", "tsconfig.build.json"]);
run(["-p", "tsconfig.build.json", "--module", "commonjs", "--moduleResolution", "bundler", "--outDir", "dist/cjs"]);
mkdirSync("dist/cjs", { recursive: true });
writeFileSync("dist/cjs/package.json", `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`);

for (const file of readdirSync("dist", { recursive: true, encoding: "utf8" })) {
  if (!file.endsWith(".d.ts")) continue;
  const path = join("dist", file);
  const source = readFileSync(path, "utf8");
  const rewritten = source.replace(/((?:from|import\()\s*["'])(\.{1,2}\/[^"']+)\.ts(["'])/g, "$1$2.js$3");
  if (rewritten !== source) writeFileSync(path, rewritten);
}
