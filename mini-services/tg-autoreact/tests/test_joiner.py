"""Проверки вступления в чаты без сети: python tests/test_joiner.py"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from telethon import errors  # noqa: E402

from tg_autoreact.joiner import (  # noqa: E402
    ALREADY_IN,
    FAILED,
    JOINED,
    STOPPED,
    TOO_SMALL,
    join_all,
    normalize_target,
    parse_targets,
    should_join,
)


class FakeEntity:
    def __init__(self, members: int | None) -> None:
        self.participants_count = members


class FakeClient:
    """Минимальный двойник Telethon: отдаёт сущности и считает вступления."""

    def __init__(self, entities: dict[str, FakeEntity], *, flood_seconds: int = 0) -> None:
        self.entities = entities
        self.flood_seconds = flood_seconds
        self.joined: list[object] = []

    async def get_entity(self, name: str) -> FakeEntity:
        if name not in self.entities:
            raise ValueError(f"нет такого чата: {name}")
        return self.entities[name]

    async def __call__(self, request: object) -> None:
        if self.flood_seconds:
            raise errors.FloodWaitError(request=None, capture=self.flood_seconds)
        self.joined.append(request)


def expect_error(value: str) -> None:
    try:
        normalize_target(value)
    except ValueError:
        return
    raise AssertionError(f"ожидалась ValueError для {value!r}")


def test_normalize_target_forms() -> None:
    assert normalize_target("@durovchat").kind == "public"
    assert normalize_target("@durovchat").value == "durovchat"
    assert normalize_target("durovchat").value == "durovchat"
    assert normalize_target("t.me/durovchat").value == "durovchat"
    assert normalize_target("https://t.me/durovchat").value == "durovchat"
    # Ссылка на сообщение — берём только имя чата.
    assert normalize_target("https://t.me/durovchat/12345").value == "durovchat"

    invite = normalize_target("https://t.me/+AbCdEf123")
    assert invite.kind == "invite" and invite.value == "AbCdEf123"
    legacy = normalize_target("https://t.me/joinchat/AbCdEf123")
    assert legacy.kind == "invite" and legacy.value == "AbCdEf123"

    expect_error("")
    expect_error("abc")                       # слишком короткий юзернейм
    expect_error("https://example.com/chat")  # чужой домен
    expect_error("@плохой ник")               # недопустимые символы


def test_parse_targets_dedup_and_problems() -> None:
    targets, problems = parse_targets(
        [
            "# список чатов",
            "@chatone",
            "https://t.me/chatone",   # тот же чат другой записью
            "",
            "https://example.com/x",  # мусор
            "@chattwo",
        ]
    )
    assert [t.value for t in targets] == ["chatone", "chattwo"], "дубликат должен схлопнуться"
    assert len(problems) == 1 and "example.com" in problems[0]


def test_should_join_threshold() -> None:
    assert should_join(1000, 1000) is True
    assert should_join(999, 1000) is False
    assert should_join(5000, 1000) is True
    # Размер неизвестен — не вступаем, раз порог задан.
    assert should_join(None, 1000) is False
    # Порог снят — вступаем в любой.
    assert should_join(None, 0) is True


def test_join_all_filters_by_size() -> None:
    client = FakeClient({"bigchat": FakeEntity(5000), "smallchat": FakeEntity(200)})
    targets, _ = parse_targets(["@bigchat", "@smallchat"])

    outcomes = asyncio.run(
        join_all(client, targets, min_members=1000, max_joins=10, delay_min=0, delay_max=0)
    )
    statuses = {o.target.value: o.status for o in outcomes}
    assert statuses == {"bigchat": JOINED, "smallchat": TOO_SMALL}, statuses
    assert len(client.joined) == 1, "вступить должны были ровно один раз"


def test_join_all_respects_max_joins() -> None:
    names = [f"chat{i}" for i in range(5)]
    client = FakeClient({name: FakeEntity(5000) for name in names})
    targets, _ = parse_targets([f"@{name}" for name in names])

    outcomes = asyncio.run(
        join_all(client, targets, min_members=1000, max_joins=2, delay_min=0, delay_max=0)
    )
    assert len(client.joined) == 2, "предел вступлений за проход не соблюдён"
    assert sum(1 for o in outcomes if o.status == JOINED) == 2


def test_join_all_dry_run_does_not_join() -> None:
    client = FakeClient({"chatone": FakeEntity(5000)})
    targets, _ = parse_targets(["@chatone"])

    outcomes = asyncio.run(
        join_all(client, targets, min_members=1000, max_joins=10, delay_min=0, delay_max=0, dry_run=True)
    )
    assert outcomes[0].status == JOINED
    assert client.joined == [], "в режиме проверки вступлений быть не должно"


def test_long_flood_wait_stops_the_run() -> None:
    """Длинный FloodWait прерывает проход, а не пережидается."""
    names = ["chatone", "chattwo", "chatthree"]
    client = FakeClient({name: FakeEntity(5000) for name in names}, flood_seconds=3600)
    targets, _ = parse_targets([f"@{name}" for name in names])

    outcomes = asyncio.run(
        join_all(
            client,
            targets,
            min_members=1000,
            max_joins=10,
            delay_min=0,
            delay_max=0,
            max_flood_wait=300,
        )
    )
    assert outcomes[-1].status == STOPPED, outcomes
    assert len(outcomes) == 1, "после остановки остальные цели не трогаем"
    assert client.joined == []


def test_unknown_chat_is_reported_not_fatal() -> None:
    client = FakeClient({"chatone": FakeEntity(5000)})
    targets, _ = parse_targets(["@missingchat", "@chatone"])

    outcomes = asyncio.run(
        join_all(client, targets, min_members=1000, max_joins=10, delay_min=0, delay_max=0)
    )
    statuses = {o.target.value: o.status for o in outcomes}
    assert statuses["missingchat"] == FAILED
    assert statuses["chatone"] == JOINED, "битая запись не должна ронять весь проход"


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} тестов пройдено")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
