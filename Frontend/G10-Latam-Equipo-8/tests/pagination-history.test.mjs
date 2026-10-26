import assert from "node:assert/strict";
import test from "node:test";
import { resumirPaginacionHistorial } from "../src/components/dashboard/resumenPaginacionHistorial.ts";

test("empty history has no item range or page controls", () => {
  assert.deepEqual(
    resumirPaginacionHistorial({ offset: 0, limit: 20, total: 0 }),
    {
      firstItem: 0,
      lastItem: 0,
      currentPage: 0,
      totalPages: 0,
      previousOffset: null,
      nextOffset: null,
    },
  );
});

test("first, middle, and last pages expose correct ranges and offsets", () => {
  assert.deepEqual(
    resumirPaginacionHistorial({ offset: 0, limit: 20, total: 45 }),
    {
      firstItem: 1,
      lastItem: 20,
      currentPage: 1,
      totalPages: 3,
      previousOffset: null,
      nextOffset: 20,
    },
  );
  assert.deepEqual(
    resumirPaginacionHistorial({ offset: 20, limit: 20, total: 45 }),
    {
      firstItem: 21,
      lastItem: 40,
      currentPage: 2,
      totalPages: 3,
      previousOffset: 0,
      nextOffset: 40,
    },
  );
  assert.deepEqual(
    resumirPaginacionHistorial({ offset: 40, limit: 20, total: 45 }),
    {
      firstItem: 41,
      lastItem: 45,
      currentPage: 3,
      totalPages: 3,
      previousOffset: 20,
      nextOffset: null,
    },
  );
});

test("offset beyond the final page clamps to the last valid range", () => {
  assert.deepEqual(
    resumirPaginacionHistorial({ offset: 100, limit: 20, total: 45 }),
    {
      firstItem: 41,
      lastItem: 45,
      currentPage: 3,
      totalPages: 3,
      previousOffset: 20,
      nextOffset: null,
    },
  );
});
