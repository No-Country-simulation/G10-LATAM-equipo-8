export interface DocumentCollectionsPollingEnvironment {
  setTimeout: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
  isVisible: () => boolean;
  subscribeVisibility: (listener: () => void) => () => void;
}

const POLL_INTERVAL_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;

function browserEnvironment(): DocumentCollectionsPollingEnvironment {
  return {
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: (handle) => globalThis.clearTimeout(handle),
    isVisible: () =>
      typeof document === "undefined" || document.visibilityState === "visible",
    subscribeVisibility(listener) {
      if (typeof document === "undefined") return () => {};
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
  };
}

export function startDocumentCollectionsPolling(
  refreshCollections: () => Promise<void>,
  environment: DocumentCollectionsPollingEnvironment = browserEnvironment(),
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let catchUpRequested = false;
  let consecutiveFailures = 0;

  function clearTimer() {
    if (timer === null) return;
    environment.clearTimeout(timer);
    timer = null;
  }

  function schedule(delay: number) {
    if (!active || !environment.isVisible()) return;
    clearTimer();
    timer = environment.setTimeout(() => {
      timer = null;
      void runCycle();
    }, delay);
  }

  async function runCycle() {
    if (!active || !environment.isVisible()) return;
    if (inFlight) {
      catchUpRequested = true;
      return;
    }

    inFlight = true;
    let failed = false;
    try {
      await refreshCollections();
    } catch {
      failed = true;
    } finally {
      inFlight = false;
      if (failed) consecutiveFailures += 1;
      else consecutiveFailures = 0;
      if (active && environment.isVisible()) {
        if (catchUpRequested) {
          catchUpRequested = false;
          schedule(0);
        } else {
          const retryDelay = Math.min(
            POLL_INTERVAL_MS * 2 ** consecutiveFailures,
            MAX_RETRY_DELAY_MS,
          );
          schedule(failed ? retryDelay : POLL_INTERVAL_MS);
        }
      }
    }
  }

  const unsubscribeVisibility = environment.subscribeVisibility(() => {
    if (!active) return;
    if (!environment.isVisible()) {
      clearTimer();
      return;
    }
    if (inFlight) {
      catchUpRequested = true;
      return;
    }
    catchUpRequested = false;
    schedule(0);
  });

  if (environment.isVisible()) schedule(POLL_INTERVAL_MS);

  return () => {
    if (!active) return;
    active = false;
    clearTimer();
    unsubscribeVisibility();
  };
}
