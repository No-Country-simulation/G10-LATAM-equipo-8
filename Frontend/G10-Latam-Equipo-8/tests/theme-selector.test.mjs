import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";

test("the theme selector exposes three labelled, mutually exclusive radio choices", async () => {
  const renderer = await createDashboardRenderer("/src/components/theme/ThemeSelector.tsx", "ThemeSelector");
  try {
    for (const selected of ["light", "dark", "system"]) {
      const markup = renderer.render({ theme: selected, onThemeChange() {} });
      assert.match(markup, /Tema de apariencia/);
      for (const label of ["Claro", "Oscuro", "Sistema"]) assert.match(markup, new RegExp(label));
      const choices = [...markup.matchAll(/<input\b[^>]*>/g)].map(([input]) => input);
      assert.equal(choices.length, 3);
      for (const choice of choices) {
        assert.match(choice, /type="radio"/);
        assert.match(choice, /name="theme"/);
        const expected = choice.includes(`value="${selected}"`);
        assert.equal(/\bchecked=""/.test(choice), expected, choice);
      }
    }
  } finally {
    await renderer.close();
  }
});
