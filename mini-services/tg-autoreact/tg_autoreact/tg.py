"""Обёртки над Telethon: создание клиента, прокси, отправка реакции."""

from __future__ import annotations

import inspect
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from telethon import TelegramClient, errors
from telethon.sessions import StringSession
from telethon.tl.functions.messages import SendReactionRequest
from telethon.tl.types import ReactionEmoji


class FatalAccountError(Exception):
    """Аккаунт невозможно запустить — перезапуски не помогут."""


def _error(name: str) -> type[BaseException]:
    """Достаёт класс ошибки Telethon по имени.

    Набор ошибок меняется от версии к версии, поэтому отсутствующие имена
    подменяем заглушкой — так `except` останется валидным.
    """
    found = getattr(errors, name, None)
    if isinstance(found, type) and issubclass(found, BaseException):
        return found
    return type(name, (Exception,), {})


FloodWaitError = errors.FloodWaitError
ReactionInvalidError = _error("ReactionInvalidError")
ReactionEmptyError = _error("ReactionEmptyError")
ReactionsTooManyError = _error("ReactionsTooManyError")

# Ошибки, после которых чат бессмысленно дёргать ближайшее время.
CHAT_BLOCKING_ERRORS: tuple[type[BaseException], ...] = (
    _error("ChatAdminRequiredError"),
    _error("ChatWriteForbiddenError"),
    _error("ChannelPrivateError"),
    _error("ChatRestrictedError"),
    _error("UserBannedInChannelError"),
    _error("ChatGuestSendForbiddenError"),
    _error("PeerIdInvalidError"),
    _error("ChatSendPlainForbiddenError"),
)

# Ошибки конкретного сообщения — просто пропускаем его.
MESSAGE_ERRORS: tuple[type[BaseException], ...] = (
    _error("MessageIdInvalidError"),
    _error("MsgIdInvalidError"),
    _error("MessageNotModifiedError"),
)

# Ошибки авторизации — воркер поднимать бесполезно.
AUTH_ERRORS: tuple[type[BaseException], ...] = (
    _error("AuthKeyUnregisteredError"),
    _error("AuthKeyDuplicatedError"),
    _error("SessionRevokedError"),
    _error("SessionExpiredError"),
    _error("UserDeactivatedError"),
    _error("UserDeactivatedBanError"),
    _error("UnauthorizedError"),
)

_SEND_REACTION_PARAMS = set(inspect.signature(SendReactionRequest.__init__).parameters)


def parse_proxy_url(value: str | None) -> dict[str, Any] | None:
    """socks5://user:pass@host:1080 -> словарь прокси. ValueError, если не разобрали."""
    if not value or not value.strip():
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme not in ("socks5", "socks4", "http") or not parsed.hostname or not parsed.port:
        raise ValueError("нужен вид socks5://[user:pass@]host:port")
    proxy: dict[str, Any] = {
        "type": parsed.scheme,
        "host": parsed.hostname,
        "port": parsed.port,
    }
    if parsed.username:
        proxy["username"] = parsed.username
        proxy["password"] = parsed.password or ""
    return proxy


def build_proxy(proxy: dict[str, Any] | None) -> Any:
    """Конвертирует конфиг прокси в формат, понятный Telethon (python-socks)."""
    if not proxy:
        return None
    proxy_type = str(proxy.get("type", "socks5")).lower()
    result: dict[str, Any] = {
        "proxy_type": proxy_type,
        "addr": proxy["host"],
        "port": int(proxy["port"]),
        "rdns": bool(proxy.get("rdns", True)),
    }
    if proxy.get("username"):
        result["username"] = proxy["username"]
        result["password"] = proxy.get("password", "")
    return result


def build_client(account: dict[str, Any], runtime: dict[str, Any]) -> TelegramClient:
    """Создаёт (но не подключает) клиента для аккаунта."""
    session_string = account.get("session")
    session_file = account.get("session_file")

    if session_string:
        try:
            session: Any = StringSession(session_string)
        except ValueError as exc:
            raise FatalAccountError(
                f"session-строка не читается ({exc}) — перевыпустите её через "
                "`python -m tg_autoreact.login`"
            ) from exc
    elif session_file:
        path = Path(session_file)
        session = str(path.with_suffix("")) if path.suffix == ".session" else str(path)
    else:
        # Бот-токен: сессию держим в памяти, авторизация каждый раз по токену.
        session = StringSession()

    return TelegramClient(
        session,
        account["api_id"],
        account["api_hash"],
        proxy=build_proxy(account.get("proxy")),
        device_model=account.get("device_model", runtime.get("device_model", "Desktop")),
        system_version=account.get("system_version", runtime.get("system_version", "Linux")),
        app_version=account.get("app_version", runtime.get("app_version", "1.0")),
        connection_retries=5,
        retry_delay=5,
        auto_reconnect=True,
        request_retries=2,
    )


async def send_reaction(
    client: TelegramClient,
    peer: Any,
    msg_id: int,
    emoji: str,
    *,
    big: bool = False,
    add_to_recent: bool = False,
) -> None:
    """Ставит одну реакцию на сообщение."""
    kwargs: dict[str, Any] = {
        "peer": peer,
        "msg_id": msg_id,
        "reaction": [ReactionEmoji(emoticon=emoji)],
    }
    if "big" in _SEND_REACTION_PARAMS:
        kwargs["big"] = big
    if "add_to_recent" in _SEND_REACTION_PARAMS:
        kwargs["add_to_recent"] = add_to_recent
    await client(SendReactionRequest(**kwargs))


def already_reacted(message: Any) -> bool:
    """True, если мы уже ставили реакцию на это сообщение."""
    reactions = getattr(message, "reactions", None)
    results = getattr(reactions, "results", None) or []
    return any(getattr(item, "chosen_order", None) is not None for item in results)
