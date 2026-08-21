"""Проверки веб-панели поверх поднятого сервера: python tests/test_web.py

Telegram не дёргается: проверяются авторизация, права, управление аккаунтами
и валидация форм.
"""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import aiohttp  # noqa: E402

from tg_autoreact.accounts_store import load_raw  # noqa: E402
from tg_autoreact.config import DEFAULT_CONFIG, deep_merge  # noqa: E402
from tg_autoreact.web.auth import hash_password, verify_password  # noqa: E402
from tg_autoreact.web.server import WebPanel  # noqa: E402

PASSWORD = "panel-password-123"
HEADERS = {"X-Requested-With": "tg-autoreact"}


class StubRunner:
    """Подменяет Runner: тот же контракт, что использует панель."""

    def __init__(self, accounts_file: Path) -> None:
        self.accounts_file = accounts_file
        self.sync_requests = 0

    def request_sync(self) -> None:
        self.sync_requests += 1

    def snapshot(self) -> dict[str, Any]:
        accounts = load_raw(self.accounts_file)["accounts"]
        return {
            "accounts": [
                {"name": a["name"], "enabled": a.get("enabled", True), "state": "running", "stats": {}}
                for a in accounts
            ],
            "totals": {},
            "reaction": "❤️‍🔥",
            "limits": {"per_account_per_minute": 20, "min_interval_seconds": 1.5},
            "uptime_seconds": 1,
            "reload_seconds": 30,
        }


class Panel:
    """Контекст с поднятой панелью на случайном порту."""

    def __init__(self, tmp: Path, accounts: list[dict[str, Any]] | None = None) -> None:
        self.accounts_file = tmp / "accounts.json"
        self.accounts_file.write_text(json.dumps({"accounts": accounts or []}), encoding="utf-8")
        self.runner = StubRunner(self.accounts_file)
        config = deep_merge(
            DEFAULT_CONFIG,
            {"web": {"enabled": True, "host": "127.0.0.1", "port": 0, "password_hash": hash_password(PASSWORD)}},
        )
        self.panel = WebPanel(config, self.runner)

    async def __aenter__(self) -> "Panel":
        await self.panel.start()
        self.base = f"http://127.0.0.1:{self.panel.bound_port}"
        # unsafe=True — иначе aiohttp выбрасывает куки, выданные по IP-адресу.
        self.session = aiohttp.ClientSession(cookie_jar=aiohttp.CookieJar(unsafe=True))
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.session.close()
        await self.panel.stop()

    async def login(self, password: str = PASSWORD) -> int:
        async with self.session.post(f"{self.base}/api/session", json={"password": password}) as response:
            return response.status

    async def request(self, method: str, path: str, **kwargs: Any) -> tuple[int, dict[str, Any]]:
        headers = {**HEADERS, **kwargs.pop("headers", {})}
        async with self.session.request(method, f"{self.base}{path}", headers=headers, **kwargs) as response:
            try:
                body = await response.json()
            except Exception:  # noqa: BLE001
                body = {"text": await response.text()}
            return response.status, body


def run(coro: Any) -> Any:
    return asyncio.run(coro)


def test_password_hashing() -> None:
    stored = hash_password("s3cret-password")
    assert verify_password("s3cret-password", stored)
    assert not verify_password("wrong", stored)
    assert not verify_password("", "")
    # Пароль в открытом виде тоже поддерживается.
    assert verify_password("plain", "plain")


def test_requires_password_to_start() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            config = deep_merge(DEFAULT_CONFIG, {"web": {"enabled": True, "port": 0}})
            panel = WebPanel(config, StubRunner(Path(tmp) / "accounts.json"))
            try:
                await panel.start()
            except Exception as exc:
                assert "пароль не задан" in str(exc), exc
                return
            finally:
                await panel.stop()
            raise AssertionError("панель без пароля не должна подниматься")

    run(scenario())


def test_auth_required() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            async with Panel(Path(tmp)) as ctx:
                status, body = await ctx.request("GET", "/api/state")
                assert status == 401 and body["auth"] is False

                assert await ctx.login("wrong-password") == 401
                assert await ctx.login() == 200

                status, body = await ctx.request("GET", "/api/state")
                assert status == 200 and body["reaction"] == "❤️‍🔥"

                status, _ = await ctx.request("DELETE", "/api/session")
                assert status == 200
                status, _ = await ctx.request("GET", "/api/state")
                assert status == 401, "после выхода кука не должна работать"

    run(scenario())


def test_login_throttling() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            async with Panel(Path(tmp)) as ctx:
                for _ in range(5):
                    assert await ctx.login("wrong") == 401
                # Шестая попытка отбивается, даже если пароль верный.
                assert await ctx.login() == 429

    run(scenario())


def test_csrf_header_required() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            accounts = [{"name": "a1", "api_id": 1, "api_hash": "h", "session": "s"}]
            async with Panel(Path(tmp), accounts) as ctx:
                await ctx.login()
                status, _ = await ctx.request(
                    "POST",
                    "/api/accounts/a1/enabled",
                    json={"enabled": False},
                    headers={"X-Requested-With": ""},
                )
                assert status == 403, "запрос без заголовка должен отвергаться"

    run(scenario())


def test_toggle_and_delete_account() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            accounts = [{"name": "a1", "api_id": 1, "api_hash": "h", "session": "s"}]
            async with Panel(Path(tmp), accounts) as ctx:
                await ctx.login()

                status, _ = await ctx.request("POST", "/api/accounts/a1/enabled", json={"enabled": False})
                assert status == 200
                assert load_raw(ctx.accounts_file)["accounts"][0]["enabled"] is False
                assert ctx.runner.sync_requests == 1, "панель должна будить супервизор"

                status, _ = await ctx.request("POST", "/api/accounts/nope/enabled", json={"enabled": True})
                assert status == 404

                status, _ = await ctx.request("DELETE", "/api/accounts/a1")
                assert status == 200
                assert load_raw(ctx.accounts_file)["accounts"] == []

    run(scenario())


def test_login_validation() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            async with Panel(Path(tmp)) as ctx:
                await ctx.login()
                base = {
                    "name": "acc1",
                    "api_id": "123456",
                    "api_hash": "0123456789abcdef0123456789abcdef",
                    "phone": "+79990000000",
                }

                cases = [
                    ({**base, "name": "плохое имя"}, "Имя аккаунта"),
                    ({**base, "api_id": "abc"}, "api_id"),
                    ({**base, "api_hash": "short"}, "api_hash"),
                    ({**base, "phone": "12"}, "Телефон"),
                    ({**base, "proxy": "1.2.3.4"}, "Прокси"),
                    ({k: v for k, v in base.items() if k != "phone"}, "phone"),
                ]
                for payload, expected in cases:
                    status, body = await ctx.request("POST", "/api/login/start", json=payload)
                    assert status == 400, (payload, status, body)
                    assert expected in body["error"], (expected, body["error"])

    run(scenario())


def test_duplicate_name_rejected() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            accounts = [{"name": "acc1", "api_id": 1, "api_hash": "h", "session": "s"}]
            async with Panel(Path(tmp), accounts) as ctx:
                await ctx.login()
                status, body = await ctx.request(
                    "POST",
                    "/api/login/start",
                    json={
                        "name": "acc1",
                        "api_id": "123456",
                        "api_hash": "0123456789abcdef0123456789abcdef",
                        "phone": "+79990000000",
                    },
                )
                assert status == 400 and "уже есть" in body["error"]

    run(scenario())


def test_stale_login_id_is_reported() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            async with Panel(Path(tmp)) as ctx:
                await ctx.login()
                status, body = await ctx.request("POST", "/api/login/code", json={"login_id": "nope", "code": "111"})
                assert status == 400 and "начните заново" in body["error"]

    run(scenario())


def test_index_and_static_are_public() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            async with Panel(Path(tmp)) as ctx:
                async with ctx.session.get(f"{ctx.base}/") as response:
                    assert response.status == 200
                    assert "tg-autoreact" in await response.text()
                async with ctx.session.get(f"{ctx.base}/static/app.js") as response:
                    assert response.status == 200

    run(scenario())


def test_secrets_never_leave_server() -> None:
    async def scenario() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            accounts = [
                {
                    "name": "a1",
                    "api_id": 1,
                    "api_hash": "SECRET_HASH",
                    "session": "SECRET_SESSION",
                    "bot_token": "SECRET_TOKEN",
                }
            ]
            async with Panel(Path(tmp), accounts) as ctx:
                await ctx.login()
                # Панель отдаёт снимок от Runner; проверяем сам фильтр секретов.
                from tg_autoreact.accounts_store import public_view

                view = json.dumps(public_view(accounts[0]), ensure_ascii=False)
                for secret in ("SECRET_HASH", "SECRET_SESSION", "SECRET_TOKEN"):
                    assert secret not in view, f"{secret} утёк в ответ панели"

                status, body = await ctx.request("GET", "/api/state")
                assert status == 200
                assert "SECRET_SESSION" not in json.dumps(body, ensure_ascii=False)

    run(scenario())


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    failed = 0
    for test in tests:
        try:
            test()
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {test.__name__}: {type(exc).__name__}: {exc}")
        else:
            print(f"ok   {test.__name__}")
    print(f"\n{len(tests) - failed}/{len(tests)} проверок пройдено")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
