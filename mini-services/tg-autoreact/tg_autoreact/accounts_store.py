"""Единая точка чтения и записи accounts.json.

Файлом пользуются одновременно CLI-логин и веб-панель, поэтому все изменения
идут через блокировку файла и атомарную запись.
"""

from __future__ import annotations

import fcntl
import json
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator

from .config import ConfigError, normalize_account

SECRET_FIELDS = ("session", "api_hash", "bot_token", "proxy")


@contextmanager
def _locked(path: Path) -> Iterator[None]:
    """Межпроцессная блокировка на время read-modify-write."""
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(path.suffix + ".lock")
    fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def load_raw(path: Path) -> dict[str, Any]:
    """Читает файл как есть; поддерживает и {"accounts": [...]}, и просто [...]."""
    if not path.exists():
        return {"accounts": []}
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as exc:
        raise ConfigError(f"некорректный JSON в {path}: {exc}")
    if isinstance(data, list):
        return {"accounts": data}
    if not isinstance(data, dict):
        raise ConfigError(f"ожидался JSON-объект или список в {path}")
    data.setdefault("accounts", [])
    return data


def save_raw(path: Path, data: dict[str, Any]) -> None:
    """Атомарная запись с правами 0600 — внутри лежат живые сессии."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def _mutate(path: Path, change: Callable[[list[dict[str, Any]]], Any]) -> Any:
    with _locked(path):
        data = load_raw(path)
        accounts = data["accounts"]
        result = change(accounts)
        save_raw(path, data)
        return result


def upsert_account(path: Path, entry: dict[str, Any]) -> None:
    """Добавляет аккаунт или обновляет существующий с тем же именем."""
    normalize_account(entry)

    def change(accounts: list[dict[str, Any]]) -> None:
        for index, existing in enumerate(accounts):
            if existing.get("name") == entry["name"]:
                accounts[index] = {**existing, **entry}
                return
        accounts.append(entry)

    _mutate(path, change)


def set_enabled(path: Path, name: str, enabled: bool) -> bool:
    def change(accounts: list[dict[str, Any]]) -> bool:
        for account in accounts:
            if account.get("name") == name:
                account["enabled"] = enabled
                return True
        return False

    return bool(_mutate(path, change))


def remove_account(path: Path, name: str) -> bool:
    def change(accounts: list[dict[str, Any]]) -> bool:
        for index, account in enumerate(accounts):
            if account.get("name") == name:
                del accounts[index]
                return True
        return False

    return bool(_mutate(path, change))


def name_taken(path: Path, name: str) -> bool:
    return any(a.get("name") == name for a in load_raw(path)["accounts"])


def public_view(entry: dict[str, Any]) -> dict[str, Any]:
    """Безопасное представление аккаунта: без сессии, хеша и токена."""
    proxy = entry.get("proxy") or None
    return {
        "name": entry.get("name"),
        "enabled": bool(entry.get("enabled", True)),
        "api_id": entry.get("api_id"),
        "kind": "bot" if entry.get("bot_token") else "user",
        "has_session": bool(entry.get("session") or entry.get("session_file")),
        "proxy": f"{proxy.get('type', 'socks5')}://{proxy.get('host')}:{proxy.get('port')}" if proxy else None,
        "overrides": entry.get("overrides") or {},
    }
