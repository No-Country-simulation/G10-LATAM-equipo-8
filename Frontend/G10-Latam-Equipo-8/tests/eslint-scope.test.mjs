import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const eslintCli = path.join(frontendRoot, "node_modules/eslint/bin/eslint.js");
const fixture = "const lintScopeFixture = 1;\n";

function lintStdin(filename) {
  return spawnSync(
    process.execPath,
    [
      eslintCli,
      "--stdin",
      "--stdin-filename",
      filename,
      "--format",
      "json",
      "--no-warn-ignored",
    ],
    { cwd: frontendRoot, encoding: "utf8", input: fixture },
  );
}

test("ESLint ignores recovered files without writing fixture data", () => {
  const result = lintStdin("recovery/__lint_scope_fixture__.ts");

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "[]\n");
  assert.equal(result.stderr, "");
});

test("ESLint still reports unused variables in active source files", () => {
  const result = lintStdin("src/__lint_scope_fixture__.ts");

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const reports = JSON.parse(result.stdout);
  assert.equal(reports.length, 1);
  assert.equal(
    reports[0].filePath,
    path.join(frontendRoot, "src/__lint_scope_fixture__.ts"),
  );
  assert.deepEqual(
    reports[0].messages.map(({ ruleId, severity, message, line, column }) => ({
      ruleId,
      severity,
      message,
      line,
      column,
    })),
    [
      {
        ruleId: "@typescript-eslint/no-unused-vars",
        severity: 2,
        message: "'lintScopeFixture' is assigned a value but never used.",
        line: 1,
        column: 7,
      },
    ],
  );
  assert.equal(reports[0].errorCount, 1);
});
