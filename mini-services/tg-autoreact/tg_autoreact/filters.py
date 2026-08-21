"""Фильтрация сообщений: какие чаты и какие сообщения нас интересуют."""

from __future__ import annotations

from typing import Any


def id_variants(chat_id: int) -> set[int]:
    """Все формы записи id чата: -1001234567890, 1001234567890, 1234567890."""
    variants = {chat_id, abs(chat_id)}
    digits = str(abs(chat_id))
    if digits.startswith("100") and len(digits) > 3:
        raw = int(digits[3:])
        variants.update({raw, -raw})
    return variants


def chat_allowed(chat_id: int | None, filters: dict[str, Any]) -> bool:
    """Проверяет чат по белому и чёрному спискам."""
    if chat_id is None:
        return False
    variants = id_variants(chat_id)

    whitelist = {int(x) for x in filters.get("whitelist_chat_ids") or []}
    if whitelist and not (variants & whitelist):
        return False

    blacklist = {int(x) for x in filters.get("blacklist_chat_ids") or []}
    return not (variants & blacklist)


def message_allowed(event: Any, filters: dict[str, Any]) -> bool:
    """Синхронные проверки сообщения (без обращений к сети)."""
    message = event.message

    if filters.get("skip_outgoing", True) and getattr(message, "out", False):
        return False

    if filters.get("skip_service_messages", True) and getattr(message, "action", None):
        return False

    # Супергруппа — это тоже канал, поэтому группы проверяем первыми.
    if event.is_group:
        if not filters.get("groups", True):
            return False
    elif event.is_channel:
        if not filters.get("channels", True):
            return False
    elif event.is_private:
        if not filters.get("private", True):
            return False

    return chat_allowed(event.chat_id, filters)


async def sender_allowed(event: Any, filters: dict[str, Any]) -> bool:
    """Отдельная проверка на ботов — требует получения отправителя."""
    if filters.get("bots", True):
        return True
    try:
        sender = await event.get_sender()
    except Exception:
        return True
    return not getattr(sender, "bot", False)
