"""Replay Thomas's live runs of 2026-10-06 against the live API and count the runs that keep the
journey: the top pick said, one cleanser suggested right after the cream, the tutorials for both,
the hair question next, nothing else suggested, and the record's rows filled.

Run from backend/: uv run python -m scripts.replay_journey [runs per script, default 5]
"""

import logging
import sys
from collections.abc import Callable

import structlog
from fastapi.testclient import TestClient

from app.catalogue.store import Catalogue
from app.main import create_app
from app.settings import Settings
from tests.golden.live import Turn, converse
from tests.golden.test_conversations import (
    THOMAS_RUN_1,
    THOMAS_RUN_2,
    assert_record_filled,
    assert_routine_completed,
    assert_top_pick_said,
)


def _check(name: str, test: Callable[[], None]) -> str | None:
    try:
        test()
    except AssertionError as failure:
        return f"{name}: {str(failure)[:300]}"
    return None


def _replay(client: TestClient, catalogue: Catalogue, lines: list[str]) -> list[str]:
    turns: list[Turn] = converse(client, [("en", line) for line in lines])
    checks = {
        "top pick": lambda: assert_top_pick_said(turns),
        "routine": lambda: assert_routine_completed(turns, catalogue),
        "record": lambda: assert_record_filled(turns),
    }
    for turn in turns:
        print(f"    > {turn.text}\n      {turn.reply()[:160]}")
    return [failure for name, test in checks.items() if (failure := _check(name, test))]


def main() -> None:
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(logging.WARNING))
    catalogue = Catalogue.load(Settings().catalogue_path)
    kept = 0
    with TestClient(create_app()) as client:
        for script, lines in (("run_1", THOMAS_RUN_1), ("run_2", THOMAS_RUN_2)):
            for run in range(runs):
                print(f"{script} #{run + 1}")
                failures = _replay(client, catalogue, lines)
                kept += not failures
                print("  kept" if not failures else "  broke\n  " + "\n  ".join(failures))
    print(f"\n{kept} of {2 * runs} runs kept the journey")


if __name__ == "__main__":
    main()
