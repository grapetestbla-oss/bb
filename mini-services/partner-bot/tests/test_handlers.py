"""Проводка бота без сети: python tests/test_handlers.py

Регистрация обработчиков и сборка клавиатур выполняются на импорте и в setup(),
поэтому тест ловит опечатки в API aiogram до первого запуска.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from partner_bot.config import ConfigError, deep_merge, load_config  # noqa: E402
from partner_bot.storage import Storage  # noqa: E402

CONFIG = {
    "bot": {"token": "123:ABC", "admin_chat_id": -1001234567890, "admin_user_ids": [42]},
    "application": {
        "min_subscribers": 1000,
        "reject_cooldown_hours": 24,
        "max_field_length": 400,
        "allow_resubmit_after_approve": False,
    },
}


def test_router_builds() -> None:
    from partner_bot.handlers import setup

    with tempfile.TemporaryDirectory() as tmp:
        storage = Storage(Path(tmp) / "db.sqlite")
        router = setup(deep_merge(CONFIG, {}), storage)
        handlers = len(router.message.handlers) + len(router.callback_query.handlers)
        assert handlers >= 10, f"обработчиков зарегистрировано подозрительно мало: {handlers}"
        storage.close()


def test_keyboards_build() -> None:
    from partner_bot.form import build_questions
    from partner_bot.handlers import _choices_keyboard, _decision_keyboard

    markup = _decision_keyboard(7)
    payloads = [button.callback_data for row in markup.inline_keyboard for button in row]
    assert any("approve" in item and "7" in item for item in payloads), payloads
    assert any("reject" in item and "7" in item for item in payloads), payloads

    platform = next(q for q in build_questions(400) if q.key == "platform")
    keyboard = _choices_keyboard(platform)
    labels = [button.text for row in keyboard.keyboard for button in row]
    assert "YouTube" in labels and "Telegram" in labels, labels


def test_config_requires_token_and_chat() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "config.json"

        path.write_text('{"bot": {"admin_chat_id": -100}}', encoding="utf-8")
        try:
            load_config(path)
            raise AssertionError("ожидалась ConfigError: нет токена")
        except ConfigError as exc:
            assert "токен" in str(exc)

        path.write_text('{"bot": {"token": "t"}}', encoding="utf-8")
        try:
            load_config(path)
            raise AssertionError("ожидалась ConfigError: нет admin_chat_id")
        except ConfigError as exc:
            assert "admin_chat_id" in str(exc)


def test_env_token_wins_over_file() -> None:
    import os

    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "config.json"
        path.write_text('{"bot": {"token": "from-file", "admin_chat_id": -100}}', encoding="utf-8")
        os.environ["PARTNER_BOT_TOKEN"] = "from-env"
        try:
            assert load_config(path)["bot"]["token"] == "from-env"
        finally:
            del os.environ["PARTNER_BOT_TOKEN"]


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} тестов пройдено")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
