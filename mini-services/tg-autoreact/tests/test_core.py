"""Быстрые проверки без сети: python tests/test_core.py"""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tg_autoreact.config import (  # noqa: E402
    ConfigError,
    account_fingerprint,
    deep_merge,
    load_accounts,
    load_config,
)
from tg_autoreact.filters import chat_allowed, id_variants  # noqa: E402
from tg_autoreact.ratelimit import ChatCooldown, RateLimiter  # noqa: E402


def test_deep_merge() -> None:
    base = {"a": {"b": 1, "c": 2}, "d": 3}
    merged = deep_merge(base, {"a": {"c": 9}, "e": 4})
    assert merged == {"a": {"b": 1, "c": 9}, "d": 3, "e": 4}
    assert base == {"a": {"b": 1, "c": 2}, "d": 3}, "исходный словарь не должен меняться"


def test_load_config_defaults() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "config.json"
        path.write_text(json.dumps({"limits": {"per_account_per_minute": 5}}), encoding="utf-8")
        config = load_config(path)
        assert config["limits"]["per_account_per_minute"] == 5
        assert config["limits"]["min_interval_seconds"] == 1.5
        assert config["reaction"]["emoji"] == "❤️‍🔥"


def test_config_validation() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "config.json"
        path.write_text(json.dumps({"limits": {"delay_min_seconds": 10, "delay_max_seconds": 1}}), encoding="utf-8")
        try:
            load_config(path)
        except ConfigError:
            return
        raise AssertionError("ожидалась ConfigError")


def test_accounts_loading() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "accounts.json"
        path.write_text(
            json.dumps(
                {
                    "accounts": [
                        {"name": "a1", "api_id": "123", "api_hash": "h", "session": "s"},
                        {"name": "a2", "api_id": 123, "api_hash": "h", "bot_token": "t"},
                    ]
                }
            ),
            encoding="utf-8",
        )
        accounts = load_accounts(path)
        assert [a["name"] for a in accounts] == ["a1", "a2"]
        assert accounts[0]["api_id"] == 123 and accounts[0]["enabled"] is True

        # без сессии и без токена — ошибка
        path.write_text(json.dumps([{"name": "bad", "api_id": 1, "api_hash": "h"}]), encoding="utf-8")
        try:
            load_accounts(path)
        except ConfigError:
            pass
        else:
            raise AssertionError("аккаунт без сессии должен отвергаться")


def test_fingerprint_changes() -> None:
    a = {"name": "x", "session": "1"}
    assert account_fingerprint(a) == account_fingerprint({"session": "1", "name": "x"})
    assert account_fingerprint(a) != account_fingerprint({"name": "x", "session": "2"})


def test_chat_filters() -> None:
    assert id_variants(-1001234567890) >= {-1001234567890, 1234567890}
    filters = {"whitelist_chat_ids": [], "blacklist_chat_ids": [1234567890]}
    assert chat_allowed(-1009999999999, filters) is True
    assert chat_allowed(-1001234567890, filters) is False

    filters = {"whitelist_chat_ids": [-1001234567890], "blacklist_chat_ids": []}
    assert chat_allowed(-1001234567890, filters) is True
    assert chat_allowed(-1009999999999, filters) is False


def test_rate_limiter() -> None:
    async def scenario() -> None:
        limiter = RateLimiter(per_minute=0, min_interval=0.05)
        start = time.monotonic()
        for _ in range(3):
            await limiter.acquire()
        assert time.monotonic() - start >= 0.1, "минимальный интервал не соблюдён"

        limiter.pause(0.2)
        assert limiter.paused_for > 0
        start = time.monotonic()
        await limiter.acquire()
        assert time.monotonic() - start >= 0.19, "пауза FloodWait не соблюдена"

    asyncio.run(scenario())


def test_chat_cooldown() -> None:
    cooldown = ChatCooldown(60.0)
    assert cooldown.allowed(1) is True
    cooldown.mark(1)
    assert cooldown.allowed(1) is False
    assert cooldown.allowed(2) is True
    assert ChatCooldown(0.0).allowed(1) is True


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
