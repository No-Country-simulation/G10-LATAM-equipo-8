import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { z } from "zod";
import { defineConfig } from "@neon/config";
import { parseEnv } from "@neon/env";

function patchedVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major === 4 && (minor > 6 || (minor === 6 && patch >= 6));
}

test("root Zod installation and lock exclude GHSA-mrhx-c7xc-m3w5 versions", async () => {
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  const installed = JSON.parse(await readFile(new URL("../node_modules/zod/package.json", import.meta.url), "utf8"));
  const lockedVersion = lock.packages["node_modules/zod"].version;
  assert.ok(patchedVersion(lockedVersion), `vulnerable or incompatible locked Zod: ${lockedVersion}`);
  assert.equal(installed.version, lockedVersion);
});

test("Zod still accepts valid collections and rejects invalid or oversized synthetic input", () => {
  const schema = z.array(z.object({ name: z.string() })).max(2);
  const valid = [{ name: "Synthetic" }];
  assert.deepEqual(schema.parse(valid), valid);
  const invalid = [{ name: 42 }];
  const rejected = schema.safeParse(invalid);
  assert.equal(rejected.success, false);
  assert.deepEqual(rejected.error.issues.map(({ code, path }) => ({ code, path })), [
    { code: "invalid_type", path: [0, "name"] },
  ]);
  assert.deepEqual(invalid, [{ name: 42 }]);
  const oversized = Array.from({ length: 3 }, () => ({ name: "Synthetic" }));
  const limited = schema.safeParse(oversized);
  assert.equal(limited.success, false);
  assert.equal(limited.error.issues[0].code, "too_big");
  assert.equal(oversized.length, 3);
});

test("Neon root dependencies load their public APIs with the patched Zod", () => {
  assert.equal(typeof defineConfig, "function");
  assert.equal(typeof parseEnv, "function");
});
