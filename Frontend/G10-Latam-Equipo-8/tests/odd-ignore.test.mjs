import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

function git(...args) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
  assert.ifError(result.error);
  return result;
}

test("local ODD notes are ignored while an existing tracked ODD file remains tracked", () => {
  const local = "odd/tasks/local-only-verification.md";
  const ignored = git("check-ignore", "-v", "--", local);
  assert.equal(ignored.status, 0);
  assert.match(ignored.stdout, /^\.gitignore:\d+:\/odd\/\todd\/tasks\/local-only-verification\.md\n$/);
  assert.equal(ignored.stderr, "");

  const existing = "odd/tasks/ai-ingestion-foundation.md";
  const tracked = git("ls-files", "--error-unmatch", "--", existing);
  assert.equal(tracked.status, 0);
  assert.equal(tracked.stdout, `${existing}\n`);
  assert.equal(tracked.stderr, "");
  const trackedIgnore = git("check-ignore", "--", existing);
  assert.equal(trackedIgnore.status, 1);
  assert.equal(trackedIgnore.stdout, "");
  assert.equal(trackedIgnore.stderr, "");
});
