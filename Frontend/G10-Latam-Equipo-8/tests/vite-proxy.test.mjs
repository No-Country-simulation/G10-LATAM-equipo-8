import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createServer, loadConfigFromFile } from "vite";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteConfigPath = path.join(frontendRoot, "vite.config.ts");

test("development proxy forwards the API prefix unchanged to the local backend", async () => {
  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    viteConfigPath,
  );
  assert.ok(loaded, "Vite should load the frontend configuration");

  const proxy = loaded.config.server?.proxy?.["/api/v1"];
  assert.ok(proxy, "Vite must proxy /api/v1 requests to the local backend");
  assert.equal(proxy.target, "http://127.0.0.1:8002");
  assert.equal(proxy.changeOrigin, true);
  assert.equal(proxy.rewrite, undefined, "the backend path prefix must be preserved");
});

test("development service defaults to the relative API prefix when the URL is unset", async (t) => {
  const scratch = await mkdtemp(path.join(tmpdir(), "mediflow-vite-test-"));
  let server;
  const originalFetch = globalThis.fetch;
  const calls = [];

  try {
    server = await createServer({
      configFile: viteConfigPath,
      root: frontendRoot,
      mode: "development",
      envDir: scratch,
      envPrefix: [],
      cacheDir: path.join(scratch, "vite-cache"),
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { middlewareMode: true },
    });
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return {
        ok: true,
        json: async () => ({ items: [], total: 0, offset: 0, limit: 20 }),
      };
    };

    const { triajeService } = await server.ssrLoadModule(
      "/src/services/triajeService.ts",
    );
    await triajeService.getTriajes({ offset: 0, limit: 20 });
    assert.deepEqual(
      calls,
      [{ url: "/api/v1/triajes?offset=0&limit=20", method: "GET" }],
      "development mode without VITE_API_URL must use the relative API instead of the demo mock",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (server) await server.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
