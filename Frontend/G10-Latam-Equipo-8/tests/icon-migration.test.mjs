import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = new URL(
        `${entry.name}${entry.isDirectory() ? "/" : ""}`,
        directory,
      );
      if (entry.isDirectory()) return listSourceFiles(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat();
}

function assertAttribute(markup, name, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(markup, new RegExp(`\\b${name}="${escaped}"`));
}

async function loadSpinner() {
  const sourcePath = new URL("../src/components/ui/spinner.tsx", import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleSource = compiled
    .replace(/(["'])cn\1/g, JSON.stringify(import.meta.resolve("cn")))
    .replace(
      /(["'])\.\/icons\1/g,
      JSON.stringify(new URL("../src/components/ui/icons.ts", import.meta.url).href),
    )
    .replace(
      /(["'])react\/jsx-runtime\1/g,
      JSON.stringify(import.meta.resolve("react/jsx-runtime")),
    );

  return import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`
  );
}

test("active frontend source contains no Lucide imports", async () => {
  const files = await listSourceFiles(sourceRoot);
  const lucideImports = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/\b(?:from\s*|import\s*)["']lucide-react["']/.test(source)) {
      lucideImports.push(file.pathname);
    }
  }

  assert.deepEqual(lucideImports, []);
});

test("mapped ReIcon aliases render Outline SVGs and forward SVG props", async () => {
  const aliases = {
    ClipboardList: "ClipboardList",
    FilePlus2: "FilePlus",
    Files: "Files",
    TriangleAlert: "AlertTriangle",
    Menu: "Menu",
    X: "Xmark",
    XIcon: "Xmark",
    Loader2Icon: "Loader",
    CheckCircle2: "CheckCircle",
  };
  const adapter = await import("../src/components/ui/icons.ts");

  for (const [alias, publicName] of Object.entries(aliases)) {
    const Component = adapter[alias];
    const published = await import(`reicon-react/icons/${publicName}`);

    assert.ok(Component, `${alias} is exported by the adapter`);
    assert.equal(Component, published.default, `${alias} maps to ${publicName}`);

    const defaultMarkup = renderToStaticMarkup(createElement(Component));
    const outlineMarkup = renderToStaticMarkup(
      createElement(Component, { weight: "Outline" }),
    );
    assert.equal(defaultMarkup, outlineMarkup, `${alias} defaults to Outline`);
    assert.match(defaultMarkup, /^<svg\b/);
    assert.match(defaultMarkup, /<(?:path|line|polyline|circle|rect)\b/);

    const forwardedMarkup = renderToStaticMarkup(
      createElement(Component, {
        size: 20,
        className: "migration-probe",
        role: "img",
        "aria-label": `Icon ${alias}`,
        "aria-hidden": "true",
        "data-icon-probe": alias,
      }),
    );
    assertAttribute(forwardedMarkup, "width", 20);
    assertAttribute(forwardedMarkup, "height", 20);
    assertAttribute(forwardedMarkup, "class", "reicon migration-probe");
    assertAttribute(forwardedMarkup, "role", "img");
    assertAttribute(forwardedMarkup, "aria-label", `Icon ${alias}`);
    assertAttribute(forwardedMarkup, "aria-hidden", "true");
    assertAttribute(forwardedMarkup, "data-icon-probe", alias);
  }
});

test("Spinner preserves its accessible loading SVG and caller attributes", async () => {
  const { Spinner } = await loadSpinner();
  const markup = renderToStaticMarkup(
    createElement(Spinner, {
      className: "consumer-spinner",
      "data-testid": "spinner-probe",
      "aria-live": "polite",
    }),
  );

  assert.match(markup, /^<svg\b/);
  assert.match(markup, /<(?:path|line|polyline|circle|rect)\b/);
  assertAttribute(markup, "data-slot", "spinner");
  assertAttribute(markup, "role", "status");
  assertAttribute(markup, "aria-label", "Loading");
  assertAttribute(markup, "aria-live", "polite");
  assertAttribute(markup, "data-testid", "spinner-probe");
  assertAttribute(markup, "class", "reicon size-4 animate-spin consumer-spinner");
  assert.doesNotMatch(markup, /\baria-hidden=/);
});
