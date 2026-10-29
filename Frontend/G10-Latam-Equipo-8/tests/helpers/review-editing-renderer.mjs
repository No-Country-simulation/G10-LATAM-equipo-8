import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const frontendRoot = fileURLToPath(new URL("../..", import.meta.url));

export async function createReviewFieldsRenderer() {
  const scratchDirectory = await mkdtemp(
    path.join(tmpdir(), "mediflow-review-fields-"),
  );
  let server;
  let closed = false;

  async function close() {
    if (closed) return;
    closed = true;
    try {
      await server?.close();
    } finally {
      await rm(scratchDirectory, { force: true, recursive: true });
    }
  }

  try {
    server = await createServer({
      appType: "custom",
      cacheDir: path.join(scratchDirectory, "vite-cache"),
      clearScreen: false,
      configFile: false,
      envDir: scratchDirectory,
      logLevel: "silent",
      optimizeDeps: { include: [], noDiscovery: true },
      plugins: [react()],
      root: frontendRoot,
      server: { hmr: false, middlewareMode: true, watch: null },
    });
    const { ReviewDocumentFields } = await server.ssrLoadModule(
      "/src/components/dashboard/ReviewDocumentFields.tsx",
    );

    return {
      render(props) {
        return renderToStaticMarkup(
          createElement(ReviewDocumentFields, props),
        );
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
