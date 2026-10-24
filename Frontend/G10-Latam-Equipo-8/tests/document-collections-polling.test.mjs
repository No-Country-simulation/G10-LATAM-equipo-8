import assert from "node:assert/strict";
import test from "node:test";
import { startDocumentCollectionsPolling } from "../src/hooks/documentCollectionsPolling.ts";

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function fakeClock() {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    get now() {
      return now;
    },
    get pendingCount() {
      return timers.size;
    },
    async advanceBy(duration) {
      const target = now + duration;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.due <= target)
          .sort(([leftId, left], [rightId, right]) => left.due - right.due || leftId - rightId)[0];
        if (!due) break;
        const [id, timer] = due;
        timers.delete(id);
        now = timer.due;
        timer.callback();
        await flushMicrotasks();
      }
      now = target;
      await flushMicrotasks();
    },
  };
}

function fakeVisibility(initiallyVisible = true) {
  let visible = initiallyVisible;
  const listeners = new Set();
  return {
    isVisible: () => visible,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setVisible(next) {
      if (visible === next) return;
      visible = next;
      for (const listener of [...listeners]) listener();
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function environment(clock, visibility = fakeVisibility()) {
  return {
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    isVisible: visibility.isVisible,
    subscribeVisibility: visibility.subscribe,
  };
}

test("polling begins after five visible seconds and repeats after successful reads", async () => {
  const clock = fakeClock();
  const visibility = fakeVisibility();
  const calls = [];
  const stop = startDocumentCollectionsPolling(
    async () => calls.push(clock.now),
    environment(clock, visibility),
  );

  await clock.advanceBy(4999);
  assert.deepEqual(calls, []);
  await clock.advanceBy(1);
  assert.deepEqual(calls, [5000]);
  await clock.advanceBy(4999);
  assert.deepEqual(calls, [5000]);
  await clock.advanceBy(1);
  assert.deepEqual(calls, [5000, 10000]);
  stop();
});

test("a slow periodic read cannot overlap another polling cycle", async () => {
  const clock = fakeClock();
  const pendingReads = [];
  let activeReads = 0;
  let maxActiveReads = 0;
  const stop = startDocumentCollectionsPolling(() => {
    const read = deferred();
    pendingReads.push(read);
    activeReads += 1;
    maxActiveReads = Math.max(maxActiveReads, activeReads);
    return read.promise.finally(() => {
      activeReads -= 1;
    });
  }, environment(clock));

  await clock.advanceBy(5000);
  assert.equal(pendingReads.length, 1);
  await clock.advanceBy(20000);
  assert.equal(pendingReads.length, 1);
  assert.equal(maxActiveReads, 1);

  pendingReads[0].resolve();
  await flushMicrotasks();
  await clock.advanceBy(4999);
  assert.equal(pendingReads.length, 1);
  await clock.advanceBy(1);
  assert.equal(pendingReads.length, 2);
  assert.equal(maxActiveReads, 1);
  stop();
  pendingReads[1].resolve();
  await flushMicrotasks();
});

test("hidden tabs pause reads and visibility return triggers one catch-up read", async () => {
  const clock = fakeClock();
  const visibility = fakeVisibility();
  const pendingReads = [];
  const stop = startDocumentCollectionsPolling(() => {
    const read = deferred();
    pendingReads.push(read);
    return read.promise;
  }, environment(clock, visibility));

  await clock.advanceBy(2000);
  visibility.setVisible(false);
  await clock.advanceBy(20000);
  assert.equal(pendingReads.length, 0);
  visibility.setVisible(true);
  await clock.advanceBy(0);
  assert.equal(pendingReads.length, 1);
  visibility.setVisible(false);
  await clock.advanceBy(10000);
  assert.equal(pendingReads.length, 1);
  visibility.setVisible(true);
  await clock.advanceBy(0);
  assert.equal(pendingReads.length, 1);
  pendingReads[0].resolve();
  await flushMicrotasks();
  await clock.advanceBy(0);
  assert.equal(pendingReads.length, 2);
  stop();
  pendingReads[1].resolve();
  await flushMicrotasks();
});

test("setup-cleanup-setup removes old timers and listeners and ignores a late read completion", async () => {
  const clock = fakeClock();
  const visibility = fakeVisibility();
  const pendingReads = [];
  const refresh = () => {
    const read = deferred();
    pendingReads.push(read);
    return read.promise;
  };
  const firstStop = startDocumentCollectionsPolling(refresh, environment(clock, visibility));
  assert.equal(clock.pendingCount, 1);
  assert.equal(visibility.listenerCount, 1);
  firstStop();
  assert.equal(clock.pendingCount, 0);
  assert.equal(visibility.listenerCount, 0);

  const secondStop = startDocumentCollectionsPolling(refresh, environment(clock, visibility));
  assert.equal(clock.pendingCount, 1);
  assert.equal(visibility.listenerCount, 1);
  await clock.advanceBy(5000);
  assert.equal(pendingReads.length, 1);
  secondStop();
  assert.equal(clock.pendingCount, 0);
  assert.equal(visibility.listenerCount, 0);
  pendingReads[0].resolve();
  await flushMicrotasks();
  await clock.advanceBy(60000);
  assert.equal(pendingReads.length, 1);
});

test("failed reads are caught, retried with exponential spacing, and capped", async () => {
  const clock = fakeClock();
  const attemptTimes = [];
  const stop = startDocumentCollectionsPolling(() => {
    attemptTimes.push(clock.now);
    return Promise.reject(new Error("synthetic read failure"));
  }, environment(clock));

  await clock.advanceBy(5000);
  assert.deepEqual(attemptTimes, [5000]);
  await clock.advanceBy(9999);
  assert.deepEqual(attemptTimes, [5000]);
  await clock.advanceBy(1);
  assert.deepEqual(attemptTimes, [5000, 15000]);
  await clock.advanceBy(19999);
  assert.deepEqual(attemptTimes, [5000, 15000]);
  await clock.advanceBy(1);
  assert.deepEqual(attemptTimes, [5000, 15000, 35000]);
  await clock.advanceBy(39999);
  assert.deepEqual(attemptTimes, [5000, 15000, 35000]);
  await clock.advanceBy(1);
  assert.deepEqual(attemptTimes, [5000, 15000, 35000, 75000]);
  await clock.advanceBy(59999);
  assert.equal(attemptTimes.length, 4);
  await clock.advanceBy(1);
  assert.deepEqual(attemptTimes, [5000, 15000, 35000, 75000, 135000]);
  await clock.advanceBy(59999);
  assert.equal(attemptTimes.length, 5);
  await clock.advanceBy(1);
  assert.deepEqual(attemptTimes, [5000, 15000, 35000, 75000, 135000, 195000]);
  stop();
});
