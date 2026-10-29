import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";

test("sidebar presents the approved vertical MediFlow logo without cropping", async () => {
  const renderer = await createDashboardRenderer("/src/layout/Sidebar.tsx", "Sidebar");
  try {
    const markup = renderer.render({
      activeView: "pending",
      onViewChange() {},
      auditPendingCount: 2,
      urgentAlertCount: 0,
    });
    const logo = markup.match(/<img\b[^>]*>/)?.[0];
    assert.ok(logo, "the navigation contains the logo");
    assert.match(logo, /alt="MediFlow"/);
    assert.match(logo, /mediflow-logo\.png/);
    assert.match(logo, /\bobject-contain\b/);
  } finally {
    await renderer.close();
  }
});
