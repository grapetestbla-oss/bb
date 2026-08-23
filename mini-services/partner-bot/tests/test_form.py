"""Проверки анкеты без сети: python tests/test_form.py"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from partner_bot.form import (  # noqa: E402
    ValidationError,
    apply_answer,
    build_questions,
    clean_count,
    clean_game_id,
    clean_nickname,
    clean_text,
    clean_url,
    format_application,
)


def expect_error(func, value: str) -> None:
    try:
        func(value)
    except ValidationError:
        return
    raise AssertionError(f"ожидалась ValidationError для {value!r}")


def test_clean_count() -> None:
    assert clean_count("12000") == 12000
    assert clean_count("12 000") == 12000
    assert clean_count("12.000") == 12000
    assert clean_count("12,000") == 12000
    assert clean_count("12k") == 12000
    assert clean_count("12.5k") == 12500
    assert clean_count("1,2м") == 1_200_000
    assert clean_count("0") == 0
    expect_error(clean_count, "много")
    expect_error(clean_count, "")
    expect_error(clean_count, "999999999999")


def test_clean_url() -> None:
    assert clean_url("https://youtube.com/@ch") == "https://youtube.com/@ch"
    assert clean_url("youtube.com/@ch") == "https://youtube.com/@ch"
    assert clean_url("@durov") == "https://t.me/durov"
    expect_error(clean_url, "просто текст")
    expect_error(clean_url, "не ссылка вовсе")


def test_clean_game_id() -> None:
    assert clean_game_id("123456") == 123456
    assert clean_game_id("#123456") == 123456
    expect_error(clean_game_id, "abc")
    expect_error(clean_game_id, "0")


def test_clean_nickname() -> None:
    assert clean_nickname("John_Doe") == "John_Doe"
    assert clean_nickname("  Иван   Петров ") == "Иван Петров"
    expect_error(clean_nickname, "a")
    expect_error(clean_nickname, "x" * 40)
    expect_error(clean_nickname, "bad<script>")


def test_clean_text_limits() -> None:
    assert clean_text("  много   пробелов  ") == "много пробелов"
    expect_error(lambda v: clean_text(v, max_length=10), "x" * 20)


def test_optional_question_skipped() -> None:
    questions = {q.key: q for q in build_questions(400)}
    comment = questions["comment"]
    assert comment.optional
    assert apply_answer(comment, "-") is None
    assert apply_answer(comment, "нет") is None
    assert apply_answer(comment, "снимаю обзоры") == "снимаю обзоры"

    # Обязательный вопрос прочерк не принимает.
    expect_error(lambda v: apply_answer(questions["nickname"], v), "-")


def test_format_application_escapes_html() -> None:
    text = format_application(
        {
            "nickname": "<b>hax</b>",
            "game_id": 1,
            "platform": "YouTube",
            "channel_url": "https://y.com/@c",
            "subscribers": 12000,
            "average_views": 3500,
        }
    )
    assert "<b>hax</b>" not in text, "ник должен быть экранирован"
    assert "&lt;b&gt;hax&lt;/b&gt;" in text
    assert "12 000" in text, "числа выводятся с разделителем разрядов"


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} тестов пройдено")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
