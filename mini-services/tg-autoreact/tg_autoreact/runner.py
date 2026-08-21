"""Супервизор: держит по воркеру на аккаунт и подхватывает новые аккаунты на лету."""

from __future__ import annotations

import asyncio
import logging
import signal
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .accounts_store import load_raw, public_view
from .config import ConfigError, account_fingerprint, load_accounts
from .tg import FatalAccountError
from .worker import AccountWorker, Stats

log = logging.getLogger("runner")


@dataclass
class ManagedAccount:
    spec: dict[str, Any]
    fingerprint: str
    stop_event: asyncio.Event
    task: asyncio.Task[None]
    stats: Stats = field(default_factory=Stats)
    fatal: bool = False


class Runner:
    def __init__(self, config: dict[str, Any], base_dir: Path) -> None:
        self.config = config
        self.base_dir = base_dir
        self.runtime = config["runtime"]

        accounts_file = Path(self.runtime["accounts_file"])
        if not accounts_file.is_absolute():
            accounts_file = base_dir / accounts_file
        self.accounts_file = accounts_file

        self.managed: dict[str, ManagedAccount] = {}
        self.shutdown = asyncio.Event()
        # Будильник главного цикла: срабатывает на остановку и на запрос
        # немедленной пересинхронизации (например, из веб-панели).
        self._wake = asyncio.Event()
        self._accounts_mtime: float | None = None
        self._warned_empty = False
        self._started_at = time.time()
        self.panel: Any = None

    # --- основной цикл ---------------------------------------------------

    async def run(self) -> None:
        self._install_signal_handlers()
        log.info("старт; файл аккаунтов: %s", self.accounts_file)

        reload_interval = float(self.runtime["accounts_reload_seconds"])
        stats_interval = float(self.runtime["stats_interval_seconds"])
        stats_task = asyncio.create_task(self._stats_loop(stats_interval), name="stats")
        await self._start_panel()

        try:
            while not self.shutdown.is_set():
                try:
                    await self._sync_accounts()
                except ConfigError as exc:
                    log.error("accounts.json не прочитан: %s", exc)
                self._wake.clear()
                try:
                    await asyncio.wait_for(self._wake.wait(), timeout=reload_interval)
                except asyncio.TimeoutError:
                    pass
        finally:
            stats_task.cancel()
            if self.panel is not None:
                await self.panel.stop()
            await self._stop_all()
            log.info("остановлено")

    async def _start_panel(self) -> None:
        """Поднимает веб-панель, если она включена в конфиге."""
        if not self.config.get("web", {}).get("enabled"):
            return
        from .web.server import WebPanel

        panel = WebPanel(self.config, self)
        try:
            await panel.start()
        except ConfigError as exc:
            log.error("веб-панель не запущена: %s", exc)
            return
        except OSError as exc:
            log.error("веб-панель не запущена: %s", exc)
            return
        self.panel = panel

    def request_sync(self) -> None:
        """Просит главный цикл пересинхронизировать аккаунты прямо сейчас."""
        self._wake.set()

    def _install_signal_handlers(self) -> None:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, self._request_shutdown)
            except (NotImplementedError, RuntimeError):
                pass

    def _request_shutdown(self) -> None:
        self.shutdown.set()
        self._wake.set()

    # --- синхронизация состава аккаунтов ---------------------------------

    async def _sync_accounts(self) -> None:
        """Перечитывает accounts.json и приводит набор воркеров в соответствие."""
        try:
            mtime = self.accounts_file.stat().st_mtime
        except FileNotFoundError:
            mtime = None
        if mtime == self._accounts_mtime and self.managed:
            return
        self._accounts_mtime = mtime

        accounts = load_accounts(self.accounts_file)
        enabled = {a["name"]: a for a in accounts if a.get("enabled", True)}

        stopped: list[asyncio.Task[None]] = []
        for name in list(self.managed):
            managed = self.managed[name]
            spec = enabled.get(name)
            if spec is None:
                log.info("аккаунт %s удалён/выключен — останавливаю", name)
                stopped.append(self._stop_account(name))
            elif account_fingerprint(spec) != managed.fingerprint:
                log.info("настройки аккаунта %s изменились — перезапускаю", name)
                stopped.append(self._stop_account(name))

        # Дожидаемся отключения старых клиентов, чтобы не держать две сессии сразу.
        tasks = [t for t in stopped if t is not None]
        if tasks:
            await asyncio.wait(tasks, timeout=15)

        for name, spec in enabled.items():
            if name not in self.managed:
                self._start_account(spec)

        if not self.managed:
            if not self._warned_empty:
                log.warning("нет ни одного активного аккаунта в %s", self.accounts_file)
                self._warned_empty = True
        else:
            self._warned_empty = False

    def _start_account(self, spec: dict[str, Any]) -> None:
        name = spec["name"]
        stop_event = asyncio.Event()
        stats = Stats()
        task = asyncio.create_task(self._supervise(spec, stop_event, stats), name=f"acc:{name}")
        self.managed[name] = ManagedAccount(
            spec=spec,
            fingerprint=account_fingerprint(spec),
            stop_event=stop_event,
            task=task,
            stats=stats,
        )
        log.info("аккаунт %s запущен", name)

    def _stop_account(self, name: str) -> asyncio.Task[None] | None:
        managed = self.managed.pop(name, None)
        if managed is None:
            return None
        managed.stop_event.set()
        managed.task.cancel()
        return managed.task

    async def _stop_all(self) -> None:
        for name in list(self.managed):
            self.managed[name].stop_event.set()
        tasks = [m.task for m in self.managed.values()]
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.managed.clear()

    # --- перезапуск воркера с backoff ------------------------------------

    async def _supervise(self, spec: dict[str, Any], stop_event: asyncio.Event, stats: Stats) -> None:
        name = spec["name"]
        backoff_plan = [float(x) for x in self.runtime["restart_backoff_seconds"]]
        attempt = 0

        while not stop_event.is_set() and not self.shutdown.is_set():
            worker = AccountWorker(account=spec, config=self.config, stats=stats)
            try:
                await worker.run(stop_event)
                attempt = 0
                if stop_event.is_set() or self.shutdown.is_set():
                    return
                log.warning("аккаунт %s: соединение закрыто, переподключаюсь", name)
            except asyncio.CancelledError:
                return
            except FatalAccountError as exc:
                log.error("аккаунт %s отключён: %s", name, exc)
                managed = self.managed.get(name)
                if managed is not None:
                    managed.fatal = True
                return
            except Exception as exc:
                log.error("аккаунт %s упал: %s: %s", name, type(exc).__name__, exc)
                log.debug("трассировка аккаунта %s", name, exc_info=True)

            delay = backoff_plan[min(attempt, len(backoff_plan) - 1)]
            attempt += 1
            log.info("аккаунт %s: следующая попытка через %.0fs", name, delay)
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=delay)
                return
            except asyncio.TimeoutError:
                continue

    # --- периодическая статистика ----------------------------------------

    async def _stats_loop(self, interval: float) -> None:
        if interval <= 0:
            return
        while True:
            await asyncio.sleep(interval)
            if not self.managed:
                continue
            total = Stats()
            for name, managed in self.managed.items():
                stats = managed.stats
                total.reacted += stats.reacted
                total.skipped += stats.skipped
                total.dropped += stats.dropped
                total.failed += stats.failed
                total.flood_waits += stats.flood_waits
                total.flood_seconds += stats.flood_seconds
                total.blocked_chats += stats.blocked_chats
                state = "FATAL" if managed.fatal else "ok"
                log.info("[%s] %s | %s", name, state, stats.summary())
            log.info("[ИТОГО %d акк.] %s", len(self.managed), total.summary())

    # --- состояние для веб-панели -----------------------------------------

    def snapshot(self) -> dict[str, Any]:
        """Аккаунты из файла + живое состояние воркеров, без секретов."""
        try:
            entries = load_raw(self.accounts_file)["accounts"]
        except ConfigError as exc:
            entries = []
            log.warning("снимок состояния: %s", exc)

        accounts: list[dict[str, Any]] = []
        totals = Stats()
        for entry in entries:
            view = public_view(entry)
            managed = self.managed.get(view["name"])
            if not view["enabled"]:
                state = "disabled"
            elif managed is None:
                state = "starting"
            elif managed.fatal:
                state = "fatal"
            else:
                state = "running"

            stats = managed.stats if managed else Stats()
            view["state"] = state
            view["stats"] = asdict(stats)
            accounts.append(view)

            totals.reacted += stats.reacted
            totals.skipped += stats.skipped
            totals.dropped += stats.dropped
            totals.failed += stats.failed
            totals.flood_waits += stats.flood_waits
            totals.flood_seconds += stats.flood_seconds
            totals.blocked_chats += stats.blocked_chats

        return {
            "accounts": accounts,
            "totals": asdict(totals),
            "reaction": self.config["reaction"]["emoji"],
            "limits": {
                "per_account_per_minute": self.config["limits"]["per_account_per_minute"],
                "min_interval_seconds": self.config["limits"]["min_interval_seconds"],
            },
            "uptime_seconds": int(time.time() - self._started_at),
            "reload_seconds": self.runtime["accounts_reload_seconds"],
        }
