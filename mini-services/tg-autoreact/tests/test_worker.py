"""Проверки логики реакций на подставном клиенте: python tests/test_worker.py"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from telethon.errors import FloodWaitError  # noqa: E402
from telethon.errors.rpcerrorlist import (  # noqa: E402
    ChatAdminRequiredError,
    MessageIdInvalidError,
    ReactionInvalidError,
)

from tg_autoreact.config import DEFAULT_CONFIG, deep_merge  # noqa: E402
from tg_autoreact.worker import AccountWorker, Job  # noqa: E402

ACCOUNT = {
    "name": "test",
    "enabled": True,
    "api_id": 1,
    "api_hash": "hash",
    "session": "stub",
}

# Задержки и лимиты в тестах не нужны.
CONFIG = deep_merge(
    DEFAULT_CONFIG,
    {
        "limits": {
            "delay_min_seconds": 0,
            "delay_max_seconds": 0,
            "min_interval_seconds": 0,
            "per_account_per_minute": 0,
        },
        "runtime": {"chat_error_cooldown_seconds": 60},
    },
)


class StubClient:
    """Подставной клиент: отдаёт заранее заданные ошибки на каждый вызов."""

    def __init__(self, script: list[BaseException | None]) -> None:
        self.script = list(script)
        self.calls: list[str] = []

    async def __call__(self, request):  # noqa: ANN001
        emoji = request.reaction[0].emoticon
        self.calls.append(emoji)
        outcome = self.script.pop(0) if self.script else None
        if outcome is not None:
            raise outcome


def make_worker() -> AccountWorker:
    return AccountWorker(account=ACCOUNT, config=CONFIG)


def test_reaction_success() -> None:
    async def scenario() -> None:
        worker = make_worker()
        client = StubClient([None])
        await worker._react(client, Job(chat_id=-100123, msg_id=7, peer=-100123))
        assert worker.stats.reacted == 1
        assert client.calls == ["❤️‍🔥"], client.calls

    asyncio.run(scenario())


def test_fallback_emoji_is_cached() -> None:
    async def scenario() -> None:
        worker = make_worker()
        # Основная реакция запрещена, вторая тоже, третья проходит.
        client = StubClient([ReactionInvalidError(request=None), ReactionInvalidError(request=None), None])
        await worker._react(client, Job(chat_id=-100123, msg_id=7, peer=-100123))
        assert worker.stats.reacted == 1
        assert client.calls[-1] == "🔥", client.calls
        assert worker._chat_emoji[-100123] == "🔥"

        # Второе сообщение в этом же чате сразу идёт рабочим эмодзи.
        client.calls.clear()
        await worker._react(client, Job(chat_id=-100123, msg_id=8, peer=-100123))
        assert client.calls == ["🔥"], client.calls

    asyncio.run(scenario())


def test_chat_blocked_when_no_emoji_accepted() -> None:
    async def scenario() -> None:
        worker = make_worker()
        client = StubClient([ReactionInvalidError(request=None)] * 4)
        await worker._react(client, Job(chat_id=-100777, msg_id=1, peer=-100777))
        assert worker.stats.reacted == 0
        assert worker._chat_blocked(-100777) is True

        # Пока чат в бане, запросов не делаем вообще.
        client.calls.clear()
        await worker._react(client, Job(chat_id=-100777, msg_id=2, peer=-100777))
        assert client.calls == []

    asyncio.run(scenario())


def test_access_error_blocks_chat() -> None:
    async def scenario() -> None:
        worker = make_worker()
        client = StubClient([ChatAdminRequiredError(request=None)])
        await worker._react(client, Job(chat_id=-100555, msg_id=1, peer=-100555))
        assert worker._chat_blocked(-100555) is True
        assert len(client.calls) == 1, "после отказа в доступе перебирать эмодзи бессмысленно"

    asyncio.run(scenario())


def test_message_error_is_skipped() -> None:
    async def scenario() -> None:
        worker = make_worker()
        client = StubClient([MessageIdInvalidError(request=None)])
        await worker._react(client, Job(chat_id=-1, msg_id=1, peer=-1))
        assert worker.stats.skipped == 1
        assert worker.stats.failed == 0
        assert worker._chat_blocked(-1) is False

    asyncio.run(scenario())


def test_flood_wait_pauses_and_requeues() -> None:
    async def scenario() -> None:
        worker = make_worker()
        client = StubClient([FloodWaitError(request=None, capture=30)])
        await worker._react(client, Job(chat_id=-100123, msg_id=5, peer=-100123))
        assert worker.stats.flood_waits == 1
        assert worker.limiter.paused_for > 25
        assert worker.queue.qsize() == 1, "сообщение должно вернуться в очередь"
        assert worker.queue.get_nowait().attempt == 1

    asyncio.run(scenario())


def test_long_flood_wait_drops_message() -> None:
    async def scenario() -> None:
        worker = make_worker()
        client = StubClient([FloodWaitError(request=None, capture=3600)])
        await worker._react(client, Job(chat_id=-100123, msg_id=5, peer=-100123))
        assert worker.queue.qsize() == 0
        assert worker.stats.dropped == 1

    asyncio.run(scenario())


def test_queue_overflow_is_counted() -> None:
    async def scenario() -> None:
        worker = AccountWorker(account=ACCOUNT, config=deep_merge(CONFIG, {"limits": {"max_queue_size": 2}}))
        for i in range(5):
            worker._enqueue(Job(chat_id=1, msg_id=i, peer=1))
        assert worker.queue.qsize() == 2
        assert worker.stats.dropped == 3

    asyncio.run(scenario())


def test_overrides_apply_per_account() -> None:
    account = {**ACCOUNT, "overrides": {"reaction": {"emoji": "👍"}, "limits": {"per_account_per_minute": 3}}}
    worker = AccountWorker(account=account, config=CONFIG)
    assert worker.settings["reaction"]["emoji"] == "👍"
    assert worker.settings["limits"]["per_account_per_minute"] == 3
    # Глобальный конфиг при этом не портится.
    assert CONFIG["reaction"]["emoji"] == "❤️‍🔥"


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    failed = 0
    for test in tests:
        try:
            test()
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {test.__name__}: {type(exc).__name__}: {exc}")
        else:
            print(f"ok   {test.__name__}")
    print(f"\n{len(tests) - failed}/{len(tests)} проверок пройдено")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
