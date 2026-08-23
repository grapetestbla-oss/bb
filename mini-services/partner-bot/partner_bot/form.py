"""Анкета медиа-партнёра: вопросы, проверка и нормализация ответов.

Модуль намеренно не знает ни про aiogram, ни про базу — это чистые функции,
которые легко проверить тестами без сети.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable

# Пропустить необязательный вопрос можно любым из этих ответов.
SKIP_TOKENS = {"-", "нет", "no", "skip", "пропустить"}

_URL_RE = re.compile(r"^https?://[^\s/$.?#][^\s]*$", re.IGNORECASE)
_NICK_RE = re.compile(r"^[A-Za-zА-Яа-яЁё0-9_. -]{2,32}$")
# Разделители разрядов, которые люди пишут руками: 12 000, 12.000, 12,000, 12k.
_THOUSAND_SUFFIX = {"k": 1_000, "к": 1_000, "m": 1_000_000, "м": 1_000_000}


class ValidationError(Exception):
    """Ответ не подошёл — текст исключения показывается пользователю."""


@dataclass(frozen=True)
class Question:
    """Один шаг анкеты."""

    key: str
    prompt: str
    clean: Callable[[str], Any]
    hint: str = ""
    optional: bool = False
    choices: tuple[str, ...] = ()


def clean_text(value: str, *, max_length: int = 400, min_length: int = 2) -> str:
    """Схлопывает пробелы и проверяет длину."""
    text = " ".join(value.split())
    if len(text) < min_length:
        raise ValidationError(f"Слишком коротко — нужно хотя бы {min_length} символа.")
    if len(text) > max_length:
        raise ValidationError(f"Слишком длинно — уложитесь в {max_length} символов.")
    return text


def clean_nickname(value: str) -> str:
    """Ник в игре: буквы, цифры и разделители, 2–32 символа."""
    text = " ".join(value.split())
    if not _NICK_RE.match(text):
        raise ValidationError(
            "Ник должен быть длиной 2–32 символа и состоять из букв, цифр, "
            "пробела, точки, дефиса или подчёркивания."
        )
    return text


def clean_game_id(value: str) -> int:
    """ID аккаунта в игре — целое положительное число."""
    text = value.strip().lstrip("#")
    if not text.isdigit():
        raise ValidationError("ID — это число, например 123456. Посмотрите его в игре.")
    number = int(text)
    if number <= 0:
        raise ValidationError("ID должен быть больше нуля.")
    return number


def clean_url(value: str) -> str:
    """Ссылка на площадку. Домен без схемы дополняем https://."""
    text = value.strip()
    if text.startswith("@") and len(text) > 1:
        text = f"https://t.me/{text[1:]}"
    elif not text.lower().startswith(("http://", "https://")) and "." in text:
        text = f"https://{text}"
    if not _URL_RE.match(text) or " " in text:
        raise ValidationError(
            "Нужна ссылка целиком, например https://youtube.com/@channel "
            "или @username для Telegram."
        )
    return text


def clean_count(value: str) -> int:
    """Число подписчиков или просмотров: 12000, 12 000, 12.5k, 1,2м."""
    text = value.strip().lower().replace(" ", "").replace(" ", "")

    multiplier = 1
    if text and text[-1] in _THOUSAND_SUFFIX:
        multiplier = _THOUSAND_SUFFIX[text[-1]]
        text = text[:-1]

    # При суффиксе точка и запятая — дробная часть (12.5k), иначе разделитель
    # разрядов (12.000), который надо просто выбросить.
    if multiplier > 1:
        text = text.replace(",", ".")
    else:
        text = text.replace(",", "").replace(".", "")

    try:
        number = float(text)
    except ValueError as exc:
        raise ValidationError("Нужно число, например 12000 или 12.5k.") from exc

    result = int(number * multiplier)
    if result < 0:
        raise ValidationError("Число не может быть отрицательным.")
    if result > 1_000_000_000:
        raise ValidationError("Похоже на опечатку — уточните число.")
    return result


def build_questions(max_field_length: int) -> tuple[Question, ...]:
    """Собирает анкету; длина свободных полей берётся из конфигурации."""

    def free_text(value: str) -> str:
        return clean_text(value, max_length=max_field_length)

    return (
        Question(
            key="nickname",
            prompt="Ваш ник в игре?",
            clean=clean_nickname,
            hint="Например: John_Doe",
        ),
        Question(
            key="game_id",
            prompt="Ваш игровой ID?",
            clean=clean_game_id,
            hint="Только цифры, например 123456",
        ),
        Question(
            key="platform",
            prompt="На какой площадке вы ведёте контент?",
            clean=lambda value: clean_text(value, max_length=32),
            choices=("YouTube", "Twitch", "TikTok", "Telegram", "Другое"),
        ),
        Question(
            key="channel_url",
            prompt="Ссылка на ваш канал?",
            clean=clean_url,
            hint="Например: https://youtube.com/@channel",
        ),
        Question(
            key="subscribers",
            prompt="Сколько у вас подписчиков?",
            clean=clean_count,
            hint="Например: 12000 или 12.5k",
        ),
        Question(
            key="average_views",
            prompt="Сколько в среднем просмотров набирает ролик?",
            clean=clean_count,
            hint="Например: 3500",
        ),
        Question(
            key="comment",
            prompt="Что хотите добавить о себе? Необязательно — отправьте «-», чтобы пропустить.",
            clean=free_text,
            optional=True,
        ),
    )


def apply_answer(question: Question, raw: str) -> Any:
    """Обрабатывает ответ на вопрос с учётом того, можно ли его пропустить."""
    if question.optional and raw.strip().lower() in SKIP_TOKENS:
        return None
    return question.clean(raw)


def format_application(answers: dict[str, Any]) -> str:
    """Человекочитаемая карточка заявки (HTML для Telegram)."""
    from html import escape

    lines = [
        f"<b>Ник:</b> {escape(str(answers.get('nickname', '—')))}",
        f"<b>ID:</b> {escape(str(answers.get('game_id', '—')))}",
        f"<b>Площадка:</b> {escape(str(answers.get('platform', '—')))}",
        f"<b>Канал:</b> {escape(str(answers.get('channel_url', '—')))}",
        f"<b>Подписчиков:</b> {answers.get('subscribers', 0):,}".replace(",", " "),
        f"<b>Просмотров в среднем:</b> {answers.get('average_views', 0):,}".replace(",", " "),
    ]
    comment = answers.get("comment")
    if comment:
        lines.append(f"<b>О себе:</b> {escape(str(comment))}")
    return "\n".join(lines)
