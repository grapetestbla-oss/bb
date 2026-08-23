"""Проверки хранилища заявок: python tests/test_storage.py"""

from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from partner_bot.storage import (  # noqa: E402
    APPROVED,
    PENDING,
    REJECTED,
    Storage,
    submission_block,
)

ANSWERS = {"nickname": "John", "game_id": 1, "subscribers": 12000}


def make_storage(tmp: str) -> Storage:
    return Storage(Path(tmp) / "applications.db")


def test_create_and_get() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = make_storage(tmp)
        app_id = storage.create(user_id=7, username="john", full_name="John", answers=ANSWERS)
        application = storage.get(app_id)
        assert application is not None
        assert application.status == PENDING
        assert application.answers == ANSWERS, "ответы должны пережить сериализацию"
        assert storage.pending_for(7) is not None
        storage.close()


def test_decision_is_applied_once() -> None:
    """Двое модераторов нажали кнопку — решение принимает только первый."""
    with tempfile.TemporaryDirectory() as tmp:
        storage = make_storage(tmp)
        app_id = storage.create(user_id=7, username=None, full_name="J", answers=ANSWERS)

        assert storage.set_decision(app_id, status=APPROVED, decided_by=1) is True
        assert storage.set_decision(app_id, status=REJECTED, decided_by=2) is False

        application = storage.get(app_id)
        assert application is not None
        assert application.status == APPROVED
        assert application.decided_by == 1
        storage.close()


def test_counts_and_pending_list() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = make_storage(tmp)
        first = storage.create(user_id=1, username=None, full_name="a", answers=ANSWERS)
        storage.create(user_id=2, username=None, full_name="b", answers=ANSWERS)
        storage.set_decision(first, status=APPROVED, decided_by=1)

        assert storage.counts() == {PENDING: 1, APPROVED: 1, REJECTED: 0}
        assert [item.user_id for item in storage.list_pending()] == [2]
        storage.close()


def test_unknown_status_rejected() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = make_storage(tmp)
        app_id = storage.create(user_id=1, username=None, full_name="a", answers=ANSWERS)
        try:
            storage.set_decision(app_id, status="whatever", decided_by=1)
        except ValueError:
            storage.close()
            return
        raise AssertionError("ожидалась ValueError")


def test_submission_block_rules() -> None:
    from partner_bot.storage import Application

    now = time.time()

    def application(status: str, decided_ago_hours: float = 0.0) -> Application:
        return Application(
            id=1,
            user_id=1,
            username=None,
            full_name=None,
            answers={},
            status=status,
            reason=None,
            created_at=now - decided_ago_hours * 3600,
            decided_at=now - decided_ago_hours * 3600,
            decided_by=None,
            admin_message_id=None,
        )

    common = {"now": now, "reject_cooldown_hours": 24, "allow_resubmit_after_approve": False}

    # Первая заявка — ничего не мешает.
    assert submission_block(None, **common) is None

    # Открытая заявка блокирует вторую.
    assert submission_block(application(PENDING), **common) is not None

    # Отказ: в течение суток нельзя, после — можно.
    assert submission_block(application(REJECTED, 1), **common) is not None
    assert submission_block(application(REJECTED, 25), **common) is None

    # Одобренную заявку повторно не подают, если это не разрешено явно.
    assert submission_block(application(APPROVED), **common) is not None
    assert submission_block(
        application(APPROVED), now=now, reject_cooldown_hours=24, allow_resubmit_after_approve=True
    ) is None

    # Нулевой кулдаун снимает ограничение по отказу.
    assert submission_block(
        application(REJECTED, 0), now=now, reject_cooldown_hours=0, allow_resubmit_after_approve=False
    ) is None


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} тестов пройдено")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
