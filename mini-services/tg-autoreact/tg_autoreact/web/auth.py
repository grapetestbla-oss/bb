"""Пароль панели, куки-сессии и защита от перебора."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
from dataclasses import dataclass, field

PBKDF2_ITERATIONS = 240_000
COOKIE_NAME = "tgar_session"


def hash_password(password: str, *, iterations: int = PBKDF2_ITERATIONS) -> str:
    """pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>"""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return "pbkdf2_sha256${}${}${}".format(
        iterations,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, stored: str) -> bool:
    """Проверяет пароль против хеша или, если это не хеш, против самого пароля."""
    if not stored:
        return False
    if not stored.startswith("pbkdf2_sha256$"):
        # Пароль в открытом виде — так тоже можно, но в README не рекомендуется.
        return hmac.compare_digest(password, stored)
    try:
        _, iterations, salt_b64, hash_b64 = stored.split("$", 3)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            base64.b64decode(salt_b64),
            int(iterations),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, base64.b64decode(hash_b64))


@dataclass
class SessionStore:
    """Токены сессий панели живут только в памяти процесса."""

    ttl: float = 86_400.0
    _tokens: dict[str, float] = field(default_factory=dict)

    def create(self) -> str:
        self._purge()
        token = secrets.token_urlsafe(32)
        self._tokens[token] = time.time() + self.ttl
        return token

    def valid(self, token: str | None) -> bool:
        if not token:
            return False
        expires = self._tokens.get(token)
        if expires is None:
            return False
        if expires < time.time():
            self._tokens.pop(token, None)
            return False
        return True

    def drop(self, token: str | None) -> None:
        if token:
            self._tokens.pop(token, None)

    def clear(self) -> None:
        self._tokens.clear()

    def _purge(self) -> None:
        now = time.time()
        for token in [t for t, exp in self._tokens.items() if exp < now]:
            del self._tokens[token]


@dataclass
class LoginThrottle:
    """Простое ограничение попыток входа по IP."""

    max_attempts: int = 5
    window: float = 300.0
    _attempts: dict[str, list[float]] = field(default_factory=dict)

    def blocked_for(self, ip: str) -> float:
        attempts = self._recent(ip)
        if len(attempts) < self.max_attempts:
            return 0.0
        return max(0.0, attempts[0] + self.window - time.time())

    def register_failure(self, ip: str) -> None:
        self._attempts.setdefault(ip, []).append(time.time())

    def reset(self, ip: str) -> None:
        self._attempts.pop(ip, None)

    def _recent(self, ip: str) -> list[float]:
        cutoff = time.time() - self.window
        attempts = [t for t in self._attempts.get(ip, []) if t > cutoff]
        if attempts:
            self._attempts[ip] = attempts
        else:
            self._attempts.pop(ip, None)
        return attempts
