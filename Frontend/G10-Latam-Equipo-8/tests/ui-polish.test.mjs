import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";
import { compile } from "tailwindcss";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
let dashboardRenderer;

before(async () => {
  dashboardRenderer = await createDashboardRenderer(
    "/src/layout/DashboardLayout.tsx",
    "DashboardLayout",
  );
});

after(async () => {
  await dashboardRenderer?.close();
});

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:tsx?|jsx?|css|html)$/.test(entry.name) ? [path] : [];
  }));
  return groups.flat();
}

async function renderSidebar() {
  const source = await readFile(new URL("../src/layout/Sidebar.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleSource = compiled
    .replace(
      /import logoMediflow from "[^"]+mediflow-logo\.png";/,
      `const logoMediflow = ${JSON.stringify(new URL("../src/assets/mediflow-logo.png", import.meta.url).href)};`,
    )
    .replace(/(["'])@\/components\/ui\/icons\1/g, JSON.stringify(import.meta.resolve("../src/components/ui/icons.ts")))
    .replace(/(["'])@\/types\/navigation\1/g, JSON.stringify(import.meta.resolve("../src/types/navigation.ts")))
    .replace(/(["'])react\/jsx-runtime\1/g, JSON.stringify(import.meta.resolve("react/jsx-runtime")));
  const { Sidebar } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);
  return renderToStaticMarkup(createElement(Sidebar, {
    activeView: "pending",
    onViewChange() {},
    auditPendingCount: 2,
    urgentAlertCount: 0,
  }));
}

test("sidebar gives the approved brand a full-width logo presentation", async () => {
  const markup = await renderSidebar();
  const logo = markup.match(/<img\b[^>]*>/)?.[0];
  assert.ok(logo, "the sidebar exposes its logo image");
  assert.match(logo, /alt="MediFlow"/);
  assert.match(logo, /mediflow-logo\.png/);
  assert.match(logo, /class="h-32 w-full object-contain"/);
  assert.doesNotMatch(logo, /\bstyle=/);
});

test("all application source uses the requested wrapping class instead of the legacy token", async () => {
  const legacy = ["break", "words"].join("-");
  const pattern = new RegExp(`(?<![\\w-])${legacy}(?![\\w-])`);
  const remaining = [];
  let replacements = 0;
  for (const path of await sourceFiles(sourceRoot)) {
    const source = await readFile(path, "utf8");
    if (pattern.test(source)) remaining.push(path.pathname.slice(sourceRoot.pathname.length));
    replacements += source.match(/\bwrap-break-word\b/g)?.length ?? 0;
  }
  assert.deepEqual(remaining, []);
  assert.ok(replacements > 0, "the requested utility is present in application source");
});

test("sidebar keeps all destinations, the active view and distinct count descriptions", async () => {
  const markup = await renderSidebar();
  assert.match(markup, /aria-label="Navegación principal"/);
  assert.equal(markup.match(/<button\b/g)?.length, 4);
  for (const label of ["Cargar documentos", "Pendientes", "Todos los documentos", "Alertas inmediatas"]) {
    assert.ok(markup.includes(label), `${label} remains available`);
  }
  assert.equal(markup.match(/aria-current="page"/g)?.length, 1);
  assert.match(markup, /aria-current="page"[^>]*>[\s\S]*?Pendientes/);
  assert.match(markup, /2 pendientes de auditoría/);
  assert.match(markup, /0 alertas urgentes en la página de historial cargada/);
});

test("All documents shows an accessible global badge, including zero, while unknown remains hidden", () => {
  const base = {
    children: "contenido",
    pageTitle: "Todos los documentos",
    activeView: "all",
    onViewChange() {},
    auditPendingCount: 2,
    urgentAlertCount: 0,
    provenance: "demo",
  };
  const zero = dashboardRenderer.render({ ...base, allDocumentsCount: 0 });
  assert.match(
    zero,
    /<span aria-hidden="true"[^>]*>0<\/span>/,
  );
  assert.match(zero, /<span class="sr-only">0 documentos en total<\/span>/);
  assert.match(zero, /0 alertas urgentes en la página de historial cargada/);

  const populated = dashboardRenderer.render({ ...base, allDocumentsCount: 19 });
  assert.match(
    populated,
    /<span aria-hidden="true"[^>]*>19<\/span>/,
  );
  assert.match(populated, /<span class="sr-only">19 documentos en total<\/span>/);

  const unknown = dashboardRenderer.render(base);
  assert.doesNotMatch(unknown, /documentos en total/);
});

test("installed Tailwind emits the requested wrapping and documented logo utilities", async () => {
  const compiler = await compile("@theme { --spacing: 0.25rem; } @tailwind utilities;");
  const css = compiler.build(["wrap-break-word", "h-32", "w-full", "object-contain"]);
  assert.match(css, /\.wrap-break-word\s*\{\s*overflow-wrap:\s*break-word;/);
  assert.match(css, /\.h-32\s*\{\s*height:/);
  assert.match(css, /\.w-full\s*\{\s*width:\s*100%;/);
  assert.match(css, /\.object-contain\s*\{\s*object-fit:\s*contain;/);
});
