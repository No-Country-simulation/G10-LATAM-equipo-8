import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));

test("frontend Docker build supplies the canonical review fixture through a restricted named context", async () => {
  const compose = await readFile(path.join(frontendRoot, "compose.yaml"), "utf8");
  const dockerfile = await readFile(path.join(frontendRoot, "deploy/frontend.Dockerfile"), "utf8");

  assert.match(compose, /additional_contexts:\s*\n\s+reviewfixtures: \.\.\/\.\.\/docs\/examples\/frontend-review/);
  assert.match(dockerfile, /^COPY --from=reviewfixtures historial\.json \/docs\/examples\/frontend-review\/historial\.json$/m);
  assert.ok(dockerfile.indexOf("COPY --from=reviewfixtures") < dockerfile.indexOf("RUN VITE_API_URL=/api/v1 npm run build"));

  const ignore = await readFile(path.resolve(frontendRoot, "../../docs/examples/frontend-review/.dockerignore"), "utf8");
  assert.equal(ignore, "**\n!historial.json\n");
});
