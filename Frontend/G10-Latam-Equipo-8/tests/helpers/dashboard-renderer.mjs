import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const frontendRoot = fileURLToPath(new URL("../..", import.meta.url));

// Test-owned excluded state only; never read the application's environment files.
export async function createDashboardRenderer(
  modulePath,
  exportName,
  runtimeParent = path.join(frontendRoot, ".frontend-adjustments-verification.local"),
) {
  await mkdir(runtimeParent, { recursive: true });
  const runtimeDirectory = await mkdtemp(path.join(runtimeParent, "dashboard-render-"));
  let server;
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    try {
      await server?.close();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }
  try {
    server = await createServer({
      appType: "custom",
      cacheDir: path.join(runtimeDirectory, "vite-cache"),
      clearScreen: false,
      configFile: false,
      envDir: runtimeDirectory,
      logLevel: "silent",
      optimizeDeps: { include: [], noDiscovery: true },
      plugins: [react()],
      resolve: { alias: { "@": path.join(frontendRoot, "src") } },
      root: frontendRoot,
      server: { hmr: false, middlewareMode: true, watch: null },
    });
    const module = await server.ssrLoadModule(modulePath);
    const { ThemeProvider } = await server.ssrLoadModule("/src/theme/ThemeProvider.tsx");
    const Component = module[exportName];
    if (typeof Component !== "function") throw new Error("Requested dashboard component is unavailable");
    return {
      render: (props) => renderToStaticMarkup(createElement(ThemeProvider, null, createElement(Component, props))),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
