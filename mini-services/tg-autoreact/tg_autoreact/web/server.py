"""HTTP-панель: добавление и управление аккаунтами прямо из браузера."""

from __future__ import annotations

import asyncio
import logging
import os
import re
from pathlib import Path
from typing import Any, Awaitable, Callable

from aiohttp import web

from ..accounts_store import (
    load_raw,
    name_taken,
    public_view,
    remove_account,
    set_enabled,
    upsert_account,
)
from ..config import ConfigError
from ..tg import parse_proxy_url
from .auth import COOKIE_NAME, LoginThrottle, SessionStore, verify_password
from .tglogin import LoginError, LoginManager

log = logging.getLogger("web")

STATIC_DIR = Path(__file__).resolve().parent / "static"
NAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{1,40}$")
PHONE_RE = re.compile(r"^\+?\d{7,15}$")
API_HASH_RE = re.compile(r"^[A-Fa-f0-9]{32}$")

Handler = Callable[[web.Request], Awaitable[web.StreamResponse]]


class ApiError(Exception):
    """Ошибка с человеческим текстом — уходит в панель как JSON."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status


def _require(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if value is None or str(value).strip() == "":
        raise ApiError(f"Не заполнено поле «{key}»")
    return str(value).strip()


def _validate_new_account(data: dict[str, Any]) -> dict[str, Any]:
    name = _require(data, "name")
    if not NAME_RE.match(name):
        raise ApiError("Имя аккаунта: латиница, цифры, точка, дефис, подчёркивание (до 40 символов)")

    raw_api_id = _require(data, "api_id")
    try:
        api_id = int(raw_api_id)
    except ValueError:
        raise ApiError("api_id должен быть числом")
    if api_id <= 0:
        raise ApiError("api_id должен быть положительным числом")

    api_hash = _require(data, "api_hash")
    if not API_HASH_RE.match(api_hash):
        raise ApiError("api_hash — это 32 шестнадцатеричных символа")

    try:
        proxy = parse_proxy_url(data.get("proxy"))
    except ValueError as exc:
        raise ApiError(f"Прокси: {exc}")

    return {"name": name, "api_id": api_id, "api_hash": api_hash, "proxy": proxy}


class WebPanel:
    """Поднимает aiohttp-сервер в том же процессе и цикле, что и воркеры."""

    def __init__(self, config: dict[str, Any], runner: Any) -> None:
        self.config = config
        self.runner = runner
        self.settings = config.get("web", {})

        password = os.getenv("TG_AUTOREACT_WEB_PASSWORD") or self.settings.get("password") or ""
        self.password_hash = self.settings.get("password_hash") or password
        self.sessions = SessionStore(ttl=float(self.settings.get("session_ttl_seconds", 86_400)))
        self.throttle = LoginThrottle()
        self.logins = LoginManager(ttl_seconds=float(self.settings.get("login_ttl_seconds", 600)))
        self.secure_cookie = bool(self.settings.get("secure_cookie", False))

        self._runner: web.AppRunner | None = None
        self._cleanup_task: asyncio.Task[None] | None = None

    # --- запуск и остановка ---------------------------------------------

    async def start(self) -> None:
        if not self.password_hash:
            raise ConfigError(
                "веб-панель включена, но пароль не задан: заполните web.password_hash "
                "(`python -m tg_autoreact.webpass`) или переменную TG_AUTOREACT_WEB_PASSWORD"
            )

        app = web.Application(middlewares=[self._error_middleware, self._auth_middleware])
        self._add_routes(app)

        self._runner = web.AppRunner(app, access_log=None)
        await self._runner.setup()
        host = self.settings.get("host", "127.0.0.1")
        port = int(self.settings.get("port", 8088))
        site = web.TCPSite(self._runner, host, port)
        await site.start()

        self._cleanup_task = asyncio.create_task(self._cleanup_loop(), name="web-cleanup")
        log.info("веб-панель слушает http://%s:%s", host, port)
        if host not in ("127.0.0.1", "localhost", "::1"):
            log.warning(
                "панель доступна извне (%s) — обязательно закройте её HTTPS-прокси или фаерволом",
                host,
            )

    @property
    def bound_port(self) -> int | None:
        """Реально занятый порт (актуально, когда в конфиге указан 0)."""
        if self._runner is None:
            return None
        for socket_address in self._runner.addresses:
            if isinstance(socket_address, tuple) and len(socket_address) >= 2:
                return int(socket_address[1])
        return None

    async def stop(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
        await self.logins.shutdown()
        if self._runner:
            await self._runner.cleanup()
            self._runner = None

    async def _cleanup_loop(self) -> None:
        while True:
            await asyncio.sleep(60)
            try:
                await self.logins.cleanup()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("ошибка очистки сессий входа")

    # --- маршруты --------------------------------------------------------

    def _add_routes(self, app: web.Application) -> None:
        app.router.add_get("/", self.index)
        app.router.add_get("/api/state", self.state)
        app.router.add_post("/api/session", self.login)
        app.router.add_delete("/api/session", self.logout)
        app.router.add_post("/api/login/start", self.login_start)
        app.router.add_post("/api/login/code", self.login_code)
        app.router.add_post("/api/login/password", self.login_password)
        app.router.add_post("/api/login/cancel", self.login_cancel)
        app.router.add_post("/api/accounts/bot", self.add_bot)
        app.router.add_post("/api/accounts/{name}/enabled", self.toggle_account)
        app.router.add_delete("/api/accounts/{name}", self.delete_account)
        app.router.add_static("/static", STATIC_DIR)

    async def index(self, request: web.Request) -> web.StreamResponse:
        return web.FileResponse(STATIC_DIR / "index.html")

    # --- middleware ------------------------------------------------------

    @web.middleware
    async def _error_middleware(self, request: web.Request, handler: Handler) -> web.StreamResponse:
        try:
            return await handler(request)
        except ApiError as exc:
            return web.json_response({"error": exc.message}, status=exc.status_code)
        except LoginError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        except ConfigError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        except web.HTTPException:
            raise
        except Exception:
            log.exception("ошибка обработчика %s %s", request.method, request.path)
            return web.json_response({"error": "Внутренняя ошибка, смотрите логи сервиса"}, status=500)

    @web.middleware
    async def _auth_middleware(self, request: web.Request, handler: Handler) -> web.StreamResponse:
        path = request.path
        public = path == "/" or path.startswith("/static") or (path == "/api/session" and request.method == "POST")
        if not public:
            if not self.sessions.valid(request.cookies.get(COOKIE_NAME)):
                return web.json_response({"error": "Требуется вход", "auth": False}, status=401)
            # Защита от CSRF: браузер не поставит этот заголовок в кросс-сайтовой форме.
            if request.method != "GET" and request.headers.get("X-Requested-With") != "tg-autoreact":
                return web.json_response({"error": "Некорректный запрос"}, status=403)
        return await handler(request)

    # --- вход в панель ---------------------------------------------------

    async def login(self, request: web.Request) -> web.StreamResponse:
        ip = request.remote or "?"
        blocked = self.throttle.blocked_for(ip)
        if blocked > 0:
            raise ApiError(f"Слишком много попыток, подождите {int(blocked)} с", status=429)

        data = await _json_body(request)
        if not verify_password(str(data.get("password", "")), self.password_hash):
            self.throttle.register_failure(ip)
            log.warning("неудачная попытка входа в панель с %s", ip)
            raise ApiError("Неверный пароль", status=401)

        self.throttle.reset(ip)
        token = self.sessions.create()
        response = web.json_response({"ok": True})
        response.set_cookie(
            COOKIE_NAME,
            token,
            httponly=True,
            samesite="Strict",
            secure=self.secure_cookie,
            max_age=int(self.sessions.ttl),
            path="/",
        )
        log.info("вход в панель с %s", ip)
        return response

    async def logout(self, request: web.Request) -> web.StreamResponse:
        self.sessions.drop(request.cookies.get(COOKIE_NAME))
        response = web.json_response({"ok": True})
        response.del_cookie(COOKIE_NAME, path="/")
        return response

    # --- состояние -------------------------------------------------------

    async def state(self, request: web.Request) -> web.StreamResponse:
        return web.json_response(self.runner.snapshot())

    # --- добавление аккаунта ---------------------------------------------

    async def login_start(self, request: web.Request) -> web.StreamResponse:
        data = await _json_body(request)
        fields = _validate_new_account(data)

        phone = _require(data, "phone").replace(" ", "").replace("-", "")
        if not PHONE_RE.match(phone):
            raise ApiError("Телефон в формате +79990000000")
        if name_taken(self.runner.accounts_file, fields["name"]) and not data.get("replace"):
            raise ApiError(f"Аккаунт с именем «{fields['name']}» уже есть")

        pending = await self.logins.start(
            name=fields["name"],
            api_id=fields["api_id"],
            api_hash=fields["api_hash"],
            phone=phone,
            proxy=fields["proxy"],
        )
        return web.json_response({"login_id": pending.id, "state": "code"})

    async def login_code(self, request: web.Request) -> web.StreamResponse:
        data = await _json_body(request)
        login_id = _require(data, "login_id")
        code = _require(data, "code").strip()

        state, result = await self.logins.submit_code(login_id, code)
        if state == "password" or result is None:
            return web.json_response({"state": "password"})
        return self._store_account(result)

    async def login_password(self, request: web.Request) -> web.StreamResponse:
        data = await _json_body(request)
        login_id = _require(data, "login_id")
        password = _require(data, "password")
        result = await self.logins.submit_password(login_id, password)
        return self._store_account(result)

    async def login_cancel(self, request: web.Request) -> web.StreamResponse:
        data = await _json_body(request)
        await self.logins.cancel(str(data.get("login_id", "")))
        return web.json_response({"ok": True})

    def _store_account(self, result: dict[str, Any]) -> web.StreamResponse:
        """Записывает готовый аккаунт в accounts.json и будит супервизор."""
        entry: dict[str, Any] = {
            "name": result["name"],
            "enabled": True,
            "api_id": result["api_id"],
            "api_hash": result["api_hash"],
            "session": result["session"],
        }
        if result.get("proxy"):
            entry["proxy"] = result["proxy"]

        upsert_account(self.runner.accounts_file, entry)
        self.runner.request_sync()
        log.info("аккаунт %s добавлен через панель", entry["name"])
        return web.json_response({"state": "done", "name": entry["name"]})

    async def add_bot(self, request: web.Request) -> web.StreamResponse:
        data = await _json_body(request)
        fields = _validate_new_account(data)
        bot_token = _require(data, "bot_token")
        if name_taken(self.runner.accounts_file, fields["name"]):
            raise ApiError(f"Аккаунт с именем «{fields['name']}» уже есть")

        session = await self.logins.login_bot(
            api_id=fields["api_id"],
            api_hash=fields["api_hash"],
            bot_token=bot_token,
            proxy=fields["proxy"],
        )
        entry: dict[str, Any] = {
            "name": fields["name"],
            "enabled": True,
            "api_id": fields["api_id"],
            "api_hash": fields["api_hash"],
            "bot_token": bot_token,
            "session": session,
        }
        if fields["proxy"]:
            entry["proxy"] = fields["proxy"]

        upsert_account(self.runner.accounts_file, entry)
        self.runner.request_sync()
        log.info("бот %s добавлен через панель", entry["name"])
        return web.json_response({"state": "done", "name": entry["name"]})

    # --- управление существующими ----------------------------------------

    async def toggle_account(self, request: web.Request) -> web.StreamResponse:
        name = request.match_info["name"]
        data = await _json_body(request)
        enabled = bool(data.get("enabled"))
        if not set_enabled(self.runner.accounts_file, name, enabled):
            raise ApiError("Аккаунт не найден", status=404)
        self.runner.request_sync()
        log.info("аккаунт %s %s через панель", name, "включён" if enabled else "выключен")
        return web.json_response({"ok": True})

    async def delete_account(self, request: web.Request) -> web.StreamResponse:
        name = request.match_info["name"]
        if not remove_account(self.runner.accounts_file, name):
            raise ApiError("Аккаунт не найден", status=404)
        self.runner.request_sync()
        log.info("аккаунт %s удалён через панель", name)
        return web.json_response({"ok": True})


async def _json_body(request: web.Request) -> dict[str, Any]:
    try:
        data = await request.json()
    except Exception:
        raise ApiError("Ожидался JSON")
    if not isinstance(data, dict):
        raise ApiError("Ожидался JSON-объект")
    return data


def accounts_public(accounts_file: Path) -> list[dict[str, Any]]:
    """Список аккаунтов из файла без секретов."""
    return [public_view(a) for a in load_raw(accounts_file)["accounts"]]
