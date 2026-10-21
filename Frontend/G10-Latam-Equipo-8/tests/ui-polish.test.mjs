import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);

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
      /import logoMediflow from "[^"]+mediflow-logo\.jpg";/,
      `const logoMediflow = ${JSON.stringify(new URL("../src/assets/mediflow-logo.jpg", import.meta.url).href)};`,
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

test("sidebar gives the existing brand a larger full-width logo presentation", async () => {
  const markup = await renderSidebar();
  const logo = markup.match(/<img\b[^>]*>/)?.[0];
  assert.ok(logo, "the sidebar exposes its logo image");
  assert.match(logo, /alt="MediFlow"/);
  assert.match(logo, /mediflow-logo\.jpg/);
  assert.match(logo, /class="h-32 w-full object-cover"/);
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

test("installed Tailwind emits the requested wrapping and documented logo utilities", async () => {
  const compiler = await compile("@theme { --spacing: 0.25rem; } @tailwind utilities;");
  const css = compiler.build(["wrap-break-word", "h-32", "w-full", "object-cover"]);
  assert.match(css, /\.wrap-break-word\s*\{\s*overflow-wrap:\s*break-word;/);
  assert.match(css, /\.h-32\s*\{\s*height:/);
  assert.match(css, /\.w-full\s*\{\s*width:\s*100%;/);
  assert.match(css, /\.object-cover\s*\{\s*object-fit:\s*cover;/);
});
