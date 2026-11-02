// Checks the package as npm would publish it: packs it into a temporary
// folder, then runs publint (package.json and exports) and
// Are the Types Wrong (types resolve under Node's ESM and CommonJS rules,
// and for bundlers). Needs `npm run build` first.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
// `npm publish --dry-run` runs this through prepublishOnly with dry-run set
// in the environment, which would stop `npm pack` from writing the tarball.
const env = { ...process.env };
for (const key of Object.keys(env)) if (key.toLowerCase() === "npm_config_dry_run") delete env[key];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const dir = mkdtempSync(join(tmpdir(), "invoist-sdk-pack-"));
try {
  run(npm, ["pack", "--silent", "--pack-destination", dir]);
  const tarball = join(dir, readdirSync(dir).find((f) => f.endsWith(".tgz")) ?? "missing.tgz");
  run(npm, ["exec", "--no", "--", "publint", "run", tarball, "--strict"]);
  // node10 is skipped: it predates package "exports", so no subpath like
  // @invoist/sdk/webhooks can resolve there.
  run(npm, ["exec", "--no", "--", "attw", tarball, "--profile", "node16"]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
