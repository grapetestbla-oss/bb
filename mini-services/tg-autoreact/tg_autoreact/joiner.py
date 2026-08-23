"""Вступление в чаты из заданного списка с фильтром по размеру аудитории.

Список чатов задаёт владелец аккаунта — сервис ничего не ищет сам и никуда не
вступает по своей инициативе. Перед вступлением проверяется число участников,
чтобы не заходить в мелкие чаты.

Разбор ссылок и решение «вступать/пропустить» вынесены в чистые функции —
их проверяют тесты без сети.
"""

from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass
from typing import Any, Iterable
from urllib.parse import urlparse

log = logging.getLogger(__name__)

# Статусы обработки одной цели.
JOINED = "joined"
ALREADY_IN = "already_in"
TOO_SMALL = "too_small"
FAILED = "failed"
STOPPED = "stopped"

_USERNAME_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_")


@dataclass(frozen=True)
class Target:
    """Цель вступления: публичный юзернейм либо приватная инвайт-ссылка."""

    raw: str
    kind: str  # "public" или "invite"
    value: str  # username без @ или хеш приглашения


@dataclass(frozen=True)
class JoinOutcome:
    """Что произошло с одной целью."""

    target: Target
    status: str
    members: int | None = None
    detail: str = ""


def normalize_target(raw: str) -> Target:
    """Приводит запись к Target. ValueError, если разобрать не вышло.

    Понимает @name, name, t.me/name, https://t.me/name, приватные ссылки
    вида t.me/+hash и t.me/joinchat/hash.
    """
    text = (raw or "").strip()
    if not text:
        raise ValueError("пустая строка")

    # Комментарии в файле списка.
    if text.startswith("#"):
        raise ValueError("комментарий")

    if "://" in text or text.lower().startswith("t.me/"):
        parsed = urlparse(text if "://" in text else f"https://{text}")
        if parsed.netloc.lower() not in ("t.me", "telegram.me", "www.t.me"):
            raise ValueError(f"не похоже на ссылку Telegram: {raw}")
        path = parsed.path.strip("/")
        if not path:
            raise ValueError(f"в ссылке нет адреса чата: {raw}")

        if path.startswith("+"):
            return Target(raw=raw, kind="invite", value=path[1:])
        if path.lower().startswith("joinchat/"):
            return Target(raw=raw, kind="invite", value=path.split("/", 1)[1])
        # Ссылка на сообщение (t.me/name/123) — берём только имя чата.
        name = path.split("/", 1)[0]
        return Target(raw=raw, kind="public", value=_check_username(name, raw))

    if text.startswith("+"):
        return Target(raw=raw, kind="invite", value=text[1:])

    return Target(raw=raw, kind="public", value=_check_username(text.lstrip("@"), raw))


def _check_username(name: str, raw: str) -> str:
    if not name or not set(name) <= _USERNAME_CHARS:
        raise ValueError(f"недопустимый юзернейм: {raw}")
    if len(name) < 4:
        raise ValueError(f"слишком короткий юзернейм: {raw}")
    return name


def parse_targets(lines: Iterable[str]) -> tuple[list[Target], list[str]]:
    """Разбирает список целей, отделяя пригодные от битых.

    Дубликаты убираются: один и тот же чат в списке дважды — не повод
    дёргать Telegram дважды.
    """
    targets: list[Target] = []
    problems: list[str] = []
    seen: set[tuple[str, str]] = set()

    for line in lines:
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        try:
            target = normalize_target(text)
        except ValueError as exc:
            problems.append(f"{text}: {exc}")
            continue
        key = (target.kind, target.value.lower())
        if key in seen:
            continue
        seen.add(key)
        targets.append(target)

    return targets, problems


def should_join(members: int | None, min_members: int) -> bool:
    """Проходит ли чат по нижней границе аудитории.

    Неизвестное число участников считаем непройденным порогом: лучше
    пропустить, чем вступить не глядя.
    """
    if min_members <= 0:
        return True
    if members is None:
        return False
    return members >= min_members


async def _members_of(client: Any, entity: Any) -> int | None:
    """Число участников; None, если Telegram его не отдал."""
    count = getattr(entity, "participants_count", None)
    if isinstance(count, int):
        return count

    try:
        from telethon.tl.functions.channels import GetFullChannelRequest

        full = await client(GetFullChannelRequest(entity))
        count = getattr(full.full_chat, "participants_count", None)
        return count if isinstance(count, int) else None
    except Exception:
        log.debug("не удалось узнать число участников", exc_info=True)
        return None


async def inspect_target(client: Any, target: Target) -> tuple[Any | None, int | None, bool]:
    """Возвращает (сущность, число участников, уже_состоим).

    Для приватной ссылки размер узнаётся без вступления — через проверку
    приглашения.
    """
    if target.kind == "invite":
        from telethon.tl.functions.messages import CheckChatInviteRequest
        from telethon.tl.types import ChatInviteAlready

        invite = await client(CheckChatInviteRequest(target.value))
        if isinstance(invite, ChatInviteAlready):
            return invite.chat, await _members_of(client, invite.chat), True
        return None, getattr(invite, "participants_count", None), False

    entity = await client.get_entity(target.value)
    return entity, await _members_of(client, entity), False


async def join_target(client: Any, target: Target, entity: Any) -> None:
    """Собственно вступление."""
    if target.kind == "invite":
        from telethon.tl.functions.messages import ImportChatInviteRequest

        await client(ImportChatInviteRequest(target.value))
        return

    from telethon.tl.functions.channels import JoinChannelRequest

    await client(JoinChannelRequest(entity))


async def join_all(
    client: Any,
    targets: list[Target],
    *,
    min_members: int = 1000,
    max_joins: int = 10,
    delay_min: float = 30.0,
    delay_max: float = 90.0,
    max_flood_wait: float = 300.0,
    dry_run: bool = False,
) -> list[JoinOutcome]:
    """Проходит по списку и вступает в подходящие чаты.

    Между вступлениями выдерживается случайная пауза, а FloodWait либо
    пережидается, либо (если он длиннее max_flood_wait) останавливает проход —
    продолжать после долгого флуда значит напрашиваться на блокировку.
    """
    from telethon import errors

    outcomes: list[JoinOutcome] = []
    joined = 0

    for target in targets:
        if joined >= max_joins > 0:
            log.info("достигнут предел вступлений за проход (%s)", max_joins)
            break

        try:
            entity, members, already = await inspect_target(client, target)
        except errors.FloodWaitError as exc:
            if exc.seconds > max_flood_wait:
                outcomes.append(
                    JoinOutcome(target, STOPPED, None, f"FloodWait {exc.seconds}s — проход прерван")
                )
                break
            log.info("FloodWait %s c, ждём", exc.seconds)
            await asyncio.sleep(exc.seconds + 1)
            continue
        except Exception as exc:
            outcomes.append(JoinOutcome(target, FAILED, None, f"{type(exc).__name__}: {exc}"))
            continue

        if already:
            outcomes.append(JoinOutcome(target, ALREADY_IN, members))
            continue

        if not should_join(members, min_members):
            shown = members if members is not None else "неизвестно"
            outcomes.append(
                JoinOutcome(target, TOO_SMALL, members, f"участников: {shown}, нужно {min_members}+")
            )
            continue

        if dry_run:
            outcomes.append(JoinOutcome(target, JOINED, members, "dry-run, не вступали"))
            joined += 1
            continue

        try:
            await join_target(client, target, entity)
        except errors.FloodWaitError as exc:
            if exc.seconds > max_flood_wait:
                outcomes.append(
                    JoinOutcome(target, STOPPED, members, f"FloodWait {exc.seconds}s — проход прерван")
                )
                break
            log.info("FloodWait %s c, ждём", exc.seconds)
            await asyncio.sleep(exc.seconds + 1)
            continue
        except Exception as exc:
            outcomes.append(JoinOutcome(target, FAILED, members, f"{type(exc).__name__}: {exc}"))
            continue

        outcomes.append(JoinOutcome(target, JOINED, members))
        joined += 1

        if joined < max_joins and delay_max > 0:
            await asyncio.sleep(random.uniform(delay_min, delay_max))

    return outcomes
