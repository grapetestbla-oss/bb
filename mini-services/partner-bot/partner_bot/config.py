"""Загрузка и валидация конфигурации бота заявок."""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "bot": {
        # Токен от @BotFather. Лучше держать его в переменной окружения
        # PARTNER_BOT_TOKEN — тогда он не лежит в файле на диске.
        "token": "",
        # Чат (обычно приватная группа), куда падают заявки на модерацию.
        "admin_chat_id": 0,
        # Кто вправе принимать решения. Пустой список — любой участник
        # админ-чата; это удобно, но менее строго.
        "admin_user_ids": [],
    },
    "application": {
        # Заявки с меньшей аудиторией отклоняются сразу, без модерации.
        "min_subscribers": 1000,
        # Через сколько часов после отказа можно подать заявку снова.
        "reject_cooldown_hours": 24,
        # Ограничение на длину свободных полей — защита от простыней.
        "max_field_length": 400,
        # Разрешать ли повторную подачу тому, кого уже приняли.
        "allow_resubmit_after_approve": False,
    },
    "storage": {
        "path": "applications.db",
    },
    "logging": {
        "level": "INFO",
        "file": "logs/partner-bot.log",
        "max_bytes": 10 * 1024 * 1024,
        "backup_count": 5,
    },
}


class ConfigError(Exception):
    """Конфигурация непригодна для запуска."""


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Рекурсивно накладывает override на base, не меняя исходные словари."""
    result = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def load_config(path: str | Path) -> dict[str, Any]:
    """Читает config.json поверх умолчаний и проверяет значения."""
    path = Path(path)
    if path.exists():
        try:
            user_config = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ConfigError(f"{path}: не разбирается как JSON — {exc}") from exc
        if not isinstance(user_config, dict):
            raise ConfigError(f"{path}: ожидался объект JSON")
    else:
        user_config = {}

    config = deep_merge(DEFAULT_CONFIG, user_config)

    # Токен из окружения важнее файла: так его удобно не хранить на диске.
    env_token = os.getenv("PARTNER_BOT_TOKEN")
    if env_token:
        config["bot"]["token"] = env_token
    env_admin_chat = os.getenv("PARTNER_BOT_ADMIN_CHAT_ID")
    if env_admin_chat:
        config["bot"]["admin_chat_id"] = env_admin_chat

    validate(config)
    return config


def validate(config: dict[str, Any]) -> None:
    """Проверяет то, из-за чего бот упал бы уже в работе, а не на старте."""
    bot = config["bot"]

    if not str(bot.get("token") or "").strip():
        raise ConfigError(
            "не задан токен бота: положите его в переменную PARTNER_BOT_TOKEN "
            "или в config.json -> bot.token"
        )

    try:
        bot["admin_chat_id"] = int(bot.get("admin_chat_id") or 0)
    except (TypeError, ValueError) as exc:
        raise ConfigError("bot.admin_chat_id должен быть числом") from exc
    if bot["admin_chat_id"] == 0:
        raise ConfigError(
            "не задан bot.admin_chat_id — заявки некуда отправлять. "
            "Добавьте бота в приватную группу и возьмите её id."
        )

    try:
        bot["admin_user_ids"] = [int(x) for x in bot.get("admin_user_ids") or []]
    except (TypeError, ValueError) as exc:
        raise ConfigError("bot.admin_user_ids — список числовых id") from exc

    application = config["application"]
    for key in ("min_subscribers", "reject_cooldown_hours", "max_field_length"):
        try:
            application[key] = int(application.get(key))
        except (TypeError, ValueError) as exc:
            raise ConfigError(f"application.{key} должен быть числом") from exc
        if application[key] < 0:
            raise ConfigError(f"application.{key} не может быть отрицательным")

    if application["max_field_length"] < 16:
        raise ConfigError("application.max_field_length меньше 16 — форму не заполнить")
