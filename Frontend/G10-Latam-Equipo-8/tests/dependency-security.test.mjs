import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const minimumPatchedVersions = {
  vite: [8, 3, 3],
  zod: [4, 6, 6],
  undici: [7, 30, 1],
  "source-map-js": [1, 2, 2],
  "@modelcontextprotocol/sdk": [1, 32, 0],
  "body-parser": [2, 4, 0],
};

function atLeast(version, minimum) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const actual = match.slice(1).map(Number);
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] !== minimum[index]) return actual[index] > minimum[index];
  }
  return true;
}

test("the frontend lock does not reintroduce the previously audited high-severity versions", async () => {
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  for (const name of ["vite", "zod", "undici", "source-map-js"]) {
    assert.ok(lock.packages[`node_modules/${name}`], `${name} must remain covered`);
  }
  for (const [location, entry] of Object.entries(lock.packages)) {
    for (const [name, minimum] of Object.entries(minimumPatchedVersions)) {
      if (location.endsWith(`node_modules/${name}`)) {
        assert.ok(atLeast(entry.version, minimum), `${location}@${entry.version} is below ${minimum.join(".")}`);
      }
    }
  }
});
