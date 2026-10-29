import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));

test("dashboard rendering works when its test runtime parent does not exist", async () => {
  const temporaryRoot = await mkdtemp(path.join(frontendRoot, ".dashboard-renderer-test-"));
  const runtimeParent = path.join(temporaryRoot, "missing-parent");
  let renderer;
  try {
    renderer = await createDashboardRenderer(
      "/src/layout/DashboardLayout.tsx",
      "DashboardLayout",
      runtimeParent,
    );
    const markup = renderer.render({
      children: "Contenido sintético",
      pageTitle: "Pendientes",
      activeView: "pending",
      onViewChange() {},
      auditPendingCount: 0,
      urgentAlertCount: 0,
      provenance: "demo",
    });
    assert.match(markup, /aria-label="Pendientes"/);
    assert.match(markup, /Contenido sintético/);
  } finally {
    await renderer?.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
