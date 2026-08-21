"""Пошаговый вход в Telegram для веб-панели: телефон → код → пароль 2FA."""

from __future__ import annotations

import asyncio
import logging
import secrets
import time
from dataclasses import dataclass, field
from typing import Any

from telethon import TelegramClient
from telethon.errors import FloodWaitError, SessionPasswordNeededError
from telethon.sessions import StringSession

from ..tg import build_proxy

log = logging.getLogger("web.login")

# Ошибки Telegram, для которых у нас есть человеческий текст.
ERROR_TEXTS = {
    "PhoneNumberInvalidError": "Неверный формат номера телефона",
    "PhoneNumberBannedError": "Этот номер заблокирован в Telegram",
    "PhoneNumberFloodError": "Слишком много попыток входа с этого номера, подождите",
    "PhoneCodeInvalidError": "Неверный код",
    "PhoneCodeExpiredError": "Код истёк, запросите новый",
    "PhoneCodeEmptyError": "Код не введён",
    "PasswordHashInvalidError": "Неверный пароль двухфакторной аутентификации",
    "ApiIdInvalidError": "Неверная пара api_id / api_hash",
    "AuthRestartError": "Telegram попросил начать вход заново",
    "SessionPasswordNeededError": "Нужен пароль двухфакторной аутентификации",
}


class LoginError(Exception):
    """Ошибка, которую можно показать пользователю панели."""


def humanize(exc: BaseException) -> str:
    if isinstance(exc, FloodWaitError):
        return f"Telegram просит подождать {exc.seconds} с перед следующей попыткой"
    return ERROR_TEXTS.get(type(exc).__name__, f"{type(exc).__name__}: {exc}")


@dataclass
class PendingLogin:
    id: str
    name: str
    api_id: int
    api_hash: str
    phone: str
    proxy: dict[str, Any] | None
    client: TelegramClient
    phone_code_hash: str = ""
    state: str = "code"  # code | password
    expires_at: float = 0.0
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class LoginManager:
    """Держит незавершённые входы: между вводом телефона и кода клиент живой."""

    def __init__(self, ttl_seconds: float = 600.0) -> None:
        self.ttl = ttl_seconds
        self._pending: dict[str, PendingLogin] = {}

    # --- шаг 1: телефон -------------------------------------------------

    async def start(
        self,
        *,
        name: str,
        api_id: int,
        api_hash: str,
        phone: str,
        proxy: dict[str, Any] | None = None,
    ) -> PendingLogin:
        client = TelegramClient(
            StringSession(),
            api_id,
            api_hash,
            proxy=build_proxy(proxy),
            device_model="Desktop",
            system_version="Linux",
            app_version="1.0",
        )
        try:
            await client.connect()
            sent = await client.send_code_request(phone)
        except Exception as exc:
            await _safe_disconnect(client)
            raise LoginError(humanize(exc)) from exc

        pending = PendingLogin(
            id=secrets.token_urlsafe(16),
            name=name,
            api_id=api_id,
            api_hash=api_hash,
            phone=phone,
            proxy=proxy,
            client=client,
            phone_code_hash=sent.phone_code_hash,
            expires_at=time.time() + self.ttl,
        )
        self._pending[pending.id] = pending
        log.info("запрошен код для %s (аккаунт %s)", _mask_phone(phone), name)
        return pending

    # --- шаг 2: код -----------------------------------------------------

    async def submit_code(self, login_id: str, code: str) -> tuple[str, dict[str, Any] | None]:
        """Возвращает ("done", данные аккаунта) либо ("password", None)."""
        pending = self._get(login_id)
        async with pending.lock:
            try:
                await pending.client.sign_in(
                    phone=pending.phone,
                    code=code,
                    phone_code_hash=pending.phone_code_hash,
                )
            except SessionPasswordNeededError:
                pending.state = "password"
                return "password", None
            except Exception as exc:
                raise LoginError(humanize(exc)) from exc
            return "done", await self._finish(pending)

    # --- шаг 3: пароль 2FA ----------------------------------------------

    async def submit_password(self, login_id: str, password: str) -> dict[str, Any]:
        pending = self._get(login_id)
        async with pending.lock:
            try:
                await pending.client.sign_in(password=password)
            except Exception as exc:
                raise LoginError(humanize(exc)) from exc
            return await self._finish(pending)

    # --- вход по токену бота (без шагов) --------------------------------

    async def login_bot(self, *, api_id: int, api_hash: str, bot_token: str, proxy: dict[str, Any] | None) -> str:
        client = TelegramClient(
            StringSession(),
            api_id,
            api_hash,
            proxy=build_proxy(proxy),
        )
        try:
            await client.connect()
            await client.sign_in(bot_token=bot_token)
            return client.session.save()
        except Exception as exc:
            raise LoginError(humanize(exc)) from exc
        finally:
            await _safe_disconnect(client)

    # --- служебное ------------------------------------------------------

    async def _finish(self, pending: PendingLogin) -> dict[str, Any]:
        """Готовая запись аккаунта: сессия плюс всё, что вводили на первом шаге."""
        session = pending.client.session.save()
        self._pending.pop(pending.id, None)
        await _safe_disconnect(pending.client)
        log.info("вход выполнен: аккаунт %s", pending.name)
        return {
            "name": pending.name,
            "api_id": pending.api_id,
            "api_hash": pending.api_hash,
            "proxy": pending.proxy,
            "session": session,
        }

    def _get(self, login_id: str) -> PendingLogin:
        pending = self._pending.get(login_id)
        if pending is None:
            raise LoginError("Сессия входа не найдена или истекла — начните заново")
        if pending.expires_at < time.time():
            self._pending.pop(login_id, None)
            raise LoginError("Сессия входа истекла — начните заново")
        return pending

    async def cancel(self, login_id: str) -> None:
        pending = self._pending.pop(login_id, None)
        if pending is not None:
            await _safe_disconnect(pending.client)

    async def cleanup(self) -> None:
        """Выкидывает протухшие незавершённые входы."""
        now = time.time()
        for login_id in [i for i, p in self._pending.items() if p.expires_at < now]:
            log.info("сессия входа %s истекла", login_id[:6])
            await self.cancel(login_id)

    async def shutdown(self) -> None:
        for login_id in list(self._pending):
            await self.cancel(login_id)


async def _safe_disconnect(client: TelegramClient) -> None:
    try:
        await client.disconnect()
    except Exception:  # noqa: BLE001
        pass


def _mask_phone(phone: str) -> str:
    return phone[:-4] + "****" if len(phone) > 4 else "****"
