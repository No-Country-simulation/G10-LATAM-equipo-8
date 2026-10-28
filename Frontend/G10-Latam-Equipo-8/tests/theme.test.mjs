import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  readThemePreference,
  saveThemePreference,
  watchTheme,
} from "../src/theme/theme.ts";

function storage(initial) {
  let value = initial;
  return {
    getItem: (key) => { assert.equal(key, "mediflow-theme"); return value; },
    setItem: (key, next) => { assert.equal(key, "mediflow-theme"); value = next; },
    current: () => value,
  };
}

function environment(initialDark = false) {
  const classes = new Set();
  const listeners = new Set();
  const root = {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
  };
  const media = {
    matches: initialDark,
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
    change(dark) {
      this.matches = dark;
      for (const listener of listeners) listener();
    },
  };
  return { root, media, dark: () => classes.has("dark"), listenerCount: () => listeners.size };
}

test("the three theme preferences are remembered", () => {
  for (const preference of ["light", "dark", "system"]) {
    const store = storage(null);
    saveThemePreference(store, preference);
    assert.equal(store.current(), preference);
    assert.equal(readThemePreference(store), preference);
  }
});

test("invalid or inaccessible storage falls back to light without crashing", () => {
  assert.equal(readThemePreference(storage("unknown")), "light");
  assert.equal(readThemePreference(null), "light");
  const unavailable = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.equal(readThemePreference(unavailable), "light");
  assert.doesNotThrow(() => saveThemePreference(unavailable, "dark"));
});

test("system preference follows live device changes and removes its listener", () => {
  const { root, media, dark, listenerCount } = environment(false);
  const stop = watchTheme("system", root, media);
  assert.equal(dark(), false);
  assert.equal(listenerCount(), 1);
  media.change(true);
  assert.equal(dark(), true);
  media.change(false);
  assert.equal(dark(), false);
  stop();
  assert.equal(listenerCount(), 0);
  media.change(true);
  assert.equal(dark(), false);
});

test("explicit light and dark ignore the device preference", () => {
  for (const [preference, expected] of [["light", false], ["dark", true]]) {
    const { root, media, dark, listenerCount } = environment(!expected);
    const stop = watchTheme(preference, root, media);
    assert.equal(dark(), expected);
    assert.equal(listenerCount(), 0);
    media.change(expected);
    assert.equal(dark(), expected);
    stop();
  }
});

test("the initial document selects the correct theme before React loads", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const script = html.match(/<script data-theme-bootstrap>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "the early theme bootstrap is present");
  for (const [saved, deviceDark, expected] of [
    ["light", true, false],
    ["dark", false, true],
    ["system", true, true],
    ["system", false, false],
    ["invalid", true, false],
  ]) {
    const { root, media, dark } = environment(deviceDark);
    runInNewContext(script, {
      document: { documentElement: root },
      localStorage: storage(saved),
      window: { matchMedia: () => media },
    });
    assert.equal(dark(), expected, `${saved} with deviceDark=${deviceDark}`);
  }
  const { root, media, dark } = environment(true);
  runInNewContext(script, {
    document: { documentElement: root },
    localStorage: { getItem() { throw new Error("blocked"); } },
    window: { matchMedia: () => media },
  });
  assert.equal(dark(), false);
});
