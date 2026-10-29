"""Recover a stale uploaded object after DB finalization failed; never delete objects."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.infrastructure.bootstrap import create_app
from app.infrastructure.settings import Settings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("document_id")
    parser.add_argument("--release-for-retry-after-stopping-server", action="store_true")
    args = parser.parse_args()
    app = create_app(Settings(repository_mode="postgres", storage_mode="neon"))
    if args.release_for_retry_after_stopping_server:
        app.state.repository.release_stale(args.document_id)
        result = "FAILED: retry with identical content"
    else:
        result = app.state.repository.reconcile(app.state.storage, args.document_id)
    print(f"Reconciliation: {result}")


if __name__ == "__main__":
    main()
