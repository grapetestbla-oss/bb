"""Хранилище заявок на SQLite.

Операции короткие (один индексированный запрос), поэтому методы синхронные —
так проще и читать, и тестировать. Соединение защищено блокировкой, потому что
aiogram может обрабатывать апдейты из разных потоков.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PENDING = "pending"
APPROVED = "approved"
REJECTED = "rejected"

SCHEMA = """
CREATE TABLE IF NOT EXISTS applications (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL,
    username          TEXT,
    full_name         TEXT,
    payload           TEXT    NOT NULL,
    status            TEXT    NOT NULL,
    reason            TEXT,
    created_at        REAL    NOT NULL,
    decided_at        REAL,
    decided_by        INTEGER,
    admin_message_id  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_applications_user   ON applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status, created_at DESC);
"""


@dataclass(frozen=True)
class Application:
    """Заявка в том виде, в каком её отдаёт хранилище."""

    id: int
    user_id: int
    username: str | None
    full_name: str | None
    answers: dict[str, Any]
    status: str
    reason: str | None
    created_at: float
    decided_at: float | None
    decided_by: int | None
    admin_message_id: int | None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Application":
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            username=row["username"],
            full_name=row["full_name"],
            answers=json.loads(row["payload"]),
            status=row["status"],
            reason=row["reason"],
            created_at=row["created_at"],
            decided_at=row["decided_at"],
            decided_by=row["decided_by"],
            admin_message_id=row["admin_message_id"],
        )


class Storage:
    """Заявки и решения по ним."""

    def __init__(self, path: str | Path) -> None:
        self._path = Path(path)
        if self._path.parent != Path(""):
            self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.executescript(SCHEMA)
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def create(
        self,
        *,
        user_id: int,
        username: str | None,
        full_name: str | None,
        answers: dict[str, Any],
    ) -> int:
        """Записывает новую заявку в статусе pending и возвращает её номер."""
        with self._lock:
            cursor = self._conn.execute(
                "INSERT INTO applications "
                "(user_id, username, full_name, payload, status, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    user_id,
                    username,
                    full_name,
                    json.dumps(answers, ensure_ascii=False),
                    PENDING,
                    time.time(),
                ),
            )
            self._conn.commit()
            return int(cursor.lastrowid)

    def get(self, application_id: int) -> Application | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM applications WHERE id = ?", (application_id,)
            ).fetchone()
        return Application.from_row(row) if row else None

    def pending_for(self, user_id: int) -> Application | None:
        """Незакрытая заявка пользователя, если она есть."""
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM applications WHERE user_id = ? AND status = ? "
                "ORDER BY created_at DESC LIMIT 1",
                (user_id, PENDING),
            ).fetchone()
        return Application.from_row(row) if row else None

    def latest_for(self, user_id: int) -> Application | None:
        """Последняя заявка пользователя в любом статусе."""
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM applications WHERE user_id = ? "
                "ORDER BY created_at DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        return Application.from_row(row) if row else None

    def list_pending(self, limit: int = 20) -> list[Application]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM applications WHERE status = ? ORDER BY created_at LIMIT ?",
                (PENDING, limit),
            ).fetchall()
        return [Application.from_row(row) for row in rows]

    def set_decision(
        self, application_id: int, *, status: str, decided_by: int, reason: str | None = None
    ) -> bool:
        """Проставляет решение. False — заявку уже закрыл кто-то другой."""
        if status not in (APPROVED, REJECTED):
            raise ValueError(f"неизвестный статус: {status}")
        with self._lock:
            cursor = self._conn.execute(
                "UPDATE applications SET status = ?, reason = ?, decided_at = ?, decided_by = ? "
                "WHERE id = ? AND status = ?",
                (status, reason, time.time(), decided_by, application_id, PENDING),
            )
            self._conn.commit()
            return cursor.rowcount > 0

    def set_admin_message(self, application_id: int, message_id: int) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE applications SET admin_message_id = ? WHERE id = ?",
                (message_id, application_id),
            )
            self._conn.commit()

    def counts(self) -> dict[str, int]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT status, COUNT(*) AS n FROM applications GROUP BY status"
            ).fetchall()
        result = {PENDING: 0, APPROVED: 0, REJECTED: 0}
        for row in rows:
            result[row["status"]] = row["n"]
        return result


def submission_block(
    application: Application | None,
    *,
    now: float,
    reject_cooldown_hours: int,
    allow_resubmit_after_approve: bool,
) -> str | None:
    """Причина, по которой подавать заявку сейчас нельзя, или None.

    Вынесено из класса, чтобы правило можно было проверить без базы.
    """
    if application is None:
        return None

    if application.status == PENDING:
        return "У вас уже есть заявка на рассмотрении. Дождитесь ответа."

    if application.status == APPROVED and not allow_resubmit_after_approve:
        return "Ваша заявка уже одобрена — повторно подавать не нужно."

    if application.status == REJECTED and reject_cooldown_hours > 0:
        decided_at = application.decided_at or application.created_at
        elapsed_hours = (now - decided_at) / 3600.0
        left = reject_cooldown_hours - elapsed_hours
        if left > 0:
            hours = max(1, int(left + 0.999))
            return f"Заявку отклонили недавно. Следующую можно подать через {hours} ч."

    return None
