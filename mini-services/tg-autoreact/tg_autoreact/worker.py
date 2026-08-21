"""Воркер одного Telegram-аккаунта: слушает сообщения и ставит реакции."""

from __future__ import annotations

import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any

from telethon import events, errors

from .config import deep_merge
from .filters import chat_allowed, message_allowed, sender_allowed
from .ratelimit import ChatCooldown, RateLimiter
from .tg import (
    AUTH_ERRORS,
    CHAT_BLOCKING_ERRORS,
    MESSAGE_ERRORS,
    FatalAccountError,
    FloodWaitError,
    ReactionEmptyError,
    ReactionInvalidError,
    ReactionsTooManyError,
    already_reacted,
    build_client,
    send_reaction,
)

REACTION_REJECTED_ERRORS = (ReactionInvalidError, ReactionEmptyError, ReactionsTooManyError)


@dataclass
class Stats:
    reacted: int = 0
    skipped: int = 0
    dropped: int = 0
    failed: int = 0
    flood_waits: int = 0
    flood_seconds: float = 0.0
    blocked_chats: int = 0

    def summary(self) -> str:
        return (
            f"реакций={self.reacted} пропущено={self.skipped} "
            f"потеряно_очередью={self.dropped} ошибок={self.failed} "
            f"floodwait={self.flood_waits} ({self.flood_seconds:.0f}s) "
            f"чатов_в_бане={self.blocked_chats}"
        )


@dataclass
class Job:
    chat_id: int
    msg_id: int
    peer: Any
    attempt: int = 0


@dataclass
class AccountWorker:
    """Живёт ровно одно подключение аккаунта; перезапускает его супервизор."""

    account: dict[str, Any]
    config: dict[str, Any]
    stats: Stats = field(default_factory=Stats)

    def __post_init__(self) -> None:
        self.name: str = self.account["name"]
        # Персональные настройки аккаунта перекрывают глобальные.
        self.settings = deep_merge(self.config, self.account.get("overrides") or {})
        self.log = logging.getLogger(f"acc.{self.name}")

        limits = self.settings["limits"]
        self.limiter = RateLimiter(
            per_minute=float(limits["per_account_per_minute"]),
            min_interval=float(limits["min_interval_seconds"]),
        )
        self.cooldown = ChatCooldown(float(limits["per_chat_cooldown_seconds"]))
        self.queue: asyncio.Queue[Job] = asyncio.Queue(maxsize=int(limits["max_queue_size"]))

        self._chat_emoji: dict[int, str] = {}
        self._chat_blocked_until: dict[int, float] = {}
        self._seen: set[tuple[int, int]] = set()
        self._seen_order: list[tuple[int, int]] = []
        self._last_drop_log = 0.0

    # --- жизненный цикл -------------------------------------------------

    async def run(self, stop_event: asyncio.Event) -> None:
        client = build_client(self.account, self.settings["runtime"])
        tasks: list[asyncio.Task[Any]] = []
        try:
            await client.connect()
            await self._authorize(client)

            me = await client.get_me()
            self.log.info(
                "подключён как %s (id=%s)",
                getattr(me, "username", None) or getattr(me, "first_name", "?"),
                getattr(me, "id", "?"),
            )

            client.add_event_handler(self._on_new_message, events.NewMessage())

            tasks.append(asyncio.create_task(self._consume(client), name=f"consume:{self.name}"))
            if self.settings["backfill"].get("enabled"):
                tasks.append(asyncio.create_task(self._backfill(client), name=f"backfill:{self.name}"))

            stop_task = asyncio.create_task(stop_event.wait(), name=f"stop:{self.name}")
            waiters = [stop_task, asyncio.ensure_future(client.disconnected), *tasks]
            done, _ = await asyncio.wait(waiters, return_when=asyncio.FIRST_COMPLETED)

            tasks.append(stop_task)
            # Пробрасываем исключение воркера наверх, чтобы супервизор перезапустил.
            for task in done:
                if task is not stop_task and not task.cancelled() and task.exception():
                    raise task.exception()  # type: ignore[misc]
        finally:
            for task in tasks:
                task.cancel()
            for task in tasks:
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
            try:
                await client.disconnect()
            except Exception:
                pass

    async def _authorize(self, client: Any) -> None:
        bot_token = self.account.get("bot_token")
        try:
            authorized = await client.is_user_authorized()
            if not authorized:
                if not bot_token:
                    raise FatalAccountError(
                        "сессия недействительна — перевыпустите её через "
                        "`python -m tg_autoreact.login`"
                    )
                await client.sign_in(bot_token=bot_token)
        except AUTH_ERRORS as exc:
            raise FatalAccountError(f"авторизация отклонена: {type(exc).__name__}") from exc

    # --- приём сообщений ------------------------------------------------

    async def _on_new_message(self, event: Any) -> None:
        try:
            if not message_allowed(event, self.settings["filters"]):
                self.stats.skipped += 1
                return
            if not await sender_allowed(event, self.settings["filters"]):
                self.stats.skipped += 1
                return

            key = (event.chat_id, event.message.id)
            if key in self._seen:
                return
            self._remember(key)

            try:
                peer = await event.get_input_chat()
            except Exception:
                peer = event.chat_id

            self._enqueue(Job(chat_id=event.chat_id, msg_id=event.message.id, peer=peer))
        except Exception:
            self.log.exception("ошибка обработчика нового сообщения")

    def _remember(self, key: tuple[int, int]) -> None:
        self._seen.add(key)
        self._seen_order.append(key)
        if len(self._seen_order) > 20_000:
            for old in self._seen_order[:10_000]:
                self._seen.discard(old)
            self._seen_order = self._seen_order[10_000:]

    def _enqueue(self, job: Job) -> None:
        try:
            self.queue.put_nowait(job)
        except asyncio.QueueFull:
            self.stats.dropped += 1
            now = time.monotonic()
            if now - self._last_drop_log > 60:
                self._last_drop_log = now
                self.log.warning(
                    "очередь переполнена (%d), сообщения отбрасываются — "
                    "лимиты ниже, чем поток сообщений",
                    self.queue.maxsize,
                )

    # --- обработка очереди ----------------------------------------------

    async def _consume(self, client: Any) -> None:
        while True:
            job = await self.queue.get()
            try:
                await self._react(client, job)
            except FatalAccountError:
                raise
            except asyncio.CancelledError:
                raise
            except Exception:
                self.stats.failed += 1
                self.log.exception("необработанная ошибка при реакции")
            finally:
                self.queue.task_done()

    async def _react(self, client: Any, job: Job) -> None:
        if self._chat_blocked(job.chat_id):
            self.stats.skipped += 1
            return
        if not self.cooldown.allowed(job.chat_id):
            self.stats.skipped += 1
            return

        limits = self.settings["limits"]
        delay = random.uniform(float(limits["delay_min_seconds"]), float(limits["delay_max_seconds"]))
        if delay > 0:
            await asyncio.sleep(delay)

        await self.limiter.acquire()

        reaction = self.settings["reaction"]
        preferred = self._chat_emoji.get(job.chat_id, reaction["emoji"])
        candidates = [preferred] + [e for e in reaction["fallback_emojis"] if e != preferred]

        for emoji in candidates:
            try:
                await send_reaction(
                    client,
                    job.peer,
                    job.msg_id,
                    emoji,
                    big=bool(reaction.get("big")),
                    add_to_recent=bool(reaction.get("add_to_recent")),
                )
            except REACTION_REJECTED_ERRORS:
                # Чат не разрешает этот эмодзи — пробуем следующий.
                continue
            except FloodWaitError as exc:
                self._handle_flood(job, exc)
                return
            except AUTH_ERRORS as exc:
                raise FatalAccountError(f"сессия умерла: {type(exc).__name__}") from exc
            except CHAT_BLOCKING_ERRORS as exc:
                self._block_chat(job.chat_id, f"нет доступа: {type(exc).__name__}")
                return
            except MESSAGE_ERRORS:
                self.stats.skipped += 1
                return
            except (errors.RPCError, ValueError, TypeError) as exc:
                self.stats.failed += 1
                self.log.warning("chat=%s msg=%s: %s", job.chat_id, job.msg_id, exc)
                return
            else:
                self.stats.reacted += 1
                self.cooldown.mark(job.chat_id)
                if emoji != preferred:
                    self._chat_emoji[job.chat_id] = emoji
                    self.log.info("chat=%s: основная реакция недоступна, ставлю %s", job.chat_id, emoji)
                return

        self._block_chat(job.chat_id, "ни одна из реакций не принимается")

    def _handle_flood(self, job: Job, exc: Any) -> None:
        seconds = float(getattr(exc, "seconds", 60))
        self.stats.flood_waits += 1
        self.stats.flood_seconds += seconds
        self.limiter.pause(seconds + random.uniform(1.0, 5.0))
        self.log.warning("FloodWait %.0fs (chat=%s) — пауза аккаунта", seconds, job.chat_id)

        max_retry = float(self.settings["limits"]["max_flood_wait_retry_seconds"])
        if seconds <= max_retry and job.attempt < 1:
            job.attempt += 1
            self._enqueue(job)
        else:
            self.stats.dropped += 1

    # --- бан чатов ------------------------------------------------------

    def _chat_blocked(self, chat_id: int) -> bool:
        until = self._chat_blocked_until.get(chat_id)
        if until is None:
            return False
        if time.monotonic() >= until:
            del self._chat_blocked_until[chat_id]
            self.stats.blocked_chats = len(self._chat_blocked_until)
            return False
        return True

    def _block_chat(self, chat_id: int, reason: str) -> None:
        seconds = float(self.settings["runtime"]["chat_error_cooldown_seconds"])
        self._chat_blocked_until[chat_id] = time.monotonic() + seconds
        self.stats.blocked_chats = len(self._chat_blocked_until)
        self.stats.skipped += 1
        self.log.info("chat=%s отключён на %.0f мин: %s", chat_id, seconds / 60, reason)

    # --- разовый проход по истории --------------------------------------

    async def _backfill(self, client: Any) -> None:
        backfill = self.settings["backfill"]
        per_dialog = int(backfill.get("messages_per_dialog", 0))
        if per_dialog <= 0:
            return

        self.log.info("backfill: обрабатываю до %d сообщений в диалоге", per_dialog)
        filters = self.settings["filters"]
        queued = 0
        try:
            async for dialog in client.iter_dialogs(limit=int(backfill.get("dialogs_limit", 50)) or None):
                if not chat_allowed(dialog.id, filters):
                    continue
                async for message in client.iter_messages(dialog.input_entity, limit=per_dialog):
                    if getattr(message, "action", None) and filters.get("skip_service_messages", True):
                        continue
                    if filters.get("skip_outgoing", True) and getattr(message, "out", False):
                        continue
                    if already_reacted(message):
                        continue
                    key = (dialog.id, message.id)
                    if key in self._seen:
                        continue
                    self._remember(key)
                    self._enqueue(Job(chat_id=dialog.id, msg_id=message.id, peer=dialog.input_entity))
                    queued += 1
        except asyncio.CancelledError:
            raise
        except Exception:
            self.log.exception("backfill прерван ошибкой")
        self.log.info("backfill: поставлено в очередь %d сообщений", queued)
