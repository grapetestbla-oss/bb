"""Диалог бота: анкета для пользователя и модерация для админов."""

from __future__ import annotations

import logging
from html import escape
from time import time
from typing import Any

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.filters.callback_data import CallbackData
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardMarkup,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

from .form import Question, ValidationError, apply_answer, build_questions, format_application
from .storage import APPROVED, REJECTED, Application, Storage, submission_block

log = logging.getLogger(__name__)
router = Router()

WELCOME = (
    "Привет! Здесь принимаются заявки на статус <b>медиа-партнёра</b>.\n\n"
    "Заполните короткую анкету — модераторы рассмотрят её и вернутся с ответом.\n"
    "Прервать заполнение можно командой /cancel."
)


class Apply(StatesGroup):
    """Пользователь заполняет анкету."""

    filling = State()
    confirming = State()


class Moderation(StatesGroup):
    """Модератор пишет причину отказа."""

    reason = State()


class Decide(CallbackData, prefix="decide"):
    action: str
    application_id: int


def _apply_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="📝 Подать заявку", callback_data="apply:start")
    return builder.as_markup()


def _confirm_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Отправить", callback_data="apply:submit")
    builder.button(text="✏️ Заново", callback_data="apply:restart")
    builder.button(text="❌ Отмена", callback_data="apply:cancel")
    builder.adjust(1)
    return builder.as_markup()


def _decision_keyboard(application_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Принять", callback_data=Decide(action="approve", application_id=application_id))
    builder.button(text="❌ Отклонить", callback_data=Decide(action="reject", application_id=application_id))
    return builder.as_markup()


def _choices_keyboard(question: Question) -> ReplyKeyboardMarkup | ReplyKeyboardRemove:
    if not question.choices:
        return ReplyKeyboardRemove()
    builder = ReplyKeyboardBuilder()
    for choice in question.choices:
        builder.button(text=choice)
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)


def _question_text(question: Question, index: int, total: int) -> str:
    text = f"<b>Шаг {index + 1} из {total}.</b> {escape(question.prompt)}"
    if question.hint:
        text += f"\n<i>{escape(question.hint)}</i>"
    return text


def _applicant_link(application: Application) -> str:
    name = escape(application.full_name or str(application.user_id))
    if application.username:
        return f'<a href="https://t.me/{application.username}">{name}</a> (@{escape(application.username)})'
    return f'<a href="tg://user?id={application.user_id}">{name}</a>'


def setup(config: dict[str, Any], storage: Storage) -> Router:
    """Складывает конфигурацию и хранилище в замыкания обработчиков."""
    app_config = config["application"]
    admin_chat_id: int = config["bot"]["admin_chat_id"]
    admin_user_ids: set[int] = set(config["bot"]["admin_user_ids"])
    questions = build_questions(app_config["max_field_length"])

    def is_admin(user_id: int, chat_id: int) -> bool:
        # Пустой список — доверяем всем, кто состоит в админ-чате.
        if admin_user_ids:
            return user_id in admin_user_ids
        return chat_id == admin_chat_id

    async def ask(message: Message, state: FSMContext, index: int) -> None:
        question = questions[index]
        await state.update_data(step=index)
        await message.answer(
            _question_text(question, index, len(questions)),
            reply_markup=_choices_keyboard(question),
        )

    async def show_preview(message: Message, state: FSMContext) -> None:
        data = await state.get_data()
        await state.set_state(Apply.confirming)
        await message.answer(
            "Проверьте заявку перед отправкой:\n\n" + format_application(data["answers"]),
            reply_markup=_confirm_keyboard(),
        )

    @router.message(CommandStart())
    async def on_start(message: Message, state: FSMContext) -> None:
        await state.clear()
        await message.answer(WELCOME, reply_markup=_apply_keyboard())

    @router.message(Command("cancel"))
    async def on_cancel(message: Message, state: FSMContext) -> None:
        if await state.get_state() is None:
            await message.answer("Нечего отменять.", reply_markup=ReplyKeyboardRemove())
            return
        await state.clear()
        await message.answer("Заполнение отменено.", reply_markup=ReplyKeyboardRemove())

    @router.callback_query(F.data == "apply:start")
    async def on_apply(callback: CallbackQuery, state: FSMContext) -> None:
        await callback.answer()
        if not isinstance(callback.message, Message):
            return

        block = submission_block(
            storage.latest_for(callback.from_user.id),
            now=time(),
            reject_cooldown_hours=app_config["reject_cooldown_hours"],
            allow_resubmit_after_approve=app_config["allow_resubmit_after_approve"],
        )
        if block:
            await callback.message.answer(block)
            return

        await state.set_state(Apply.filling)
        await state.update_data(answers={})
        await ask(callback.message, state, 0)

    @router.message(Apply.filling)
    async def on_answer(message: Message, state: FSMContext) -> None:
        data = await state.get_data()
        index = int(data.get("step", 0))
        question = questions[index]

        try:
            value = apply_answer(question, message.text or "")
        except ValidationError as exc:
            await message.answer(f"⚠️ {exc}\n\nПопробуйте ещё раз.")
            return

        answers = dict(data.get("answers", {}))
        answers[question.key] = value
        await state.update_data(answers=answers)

        # Порог аудитории проверяем сразу, чтобы не гонять человека по анкете зря.
        minimum = app_config["min_subscribers"]
        if question.key == "subscribers" and minimum > 0 and int(value) < minimum:
            await state.clear()
            storage.create(
                user_id=message.from_user.id,
                username=message.from_user.username,
                full_name=message.from_user.full_name,
                answers=answers,
            )
            latest = storage.latest_for(message.from_user.id)
            if latest:
                storage.set_decision(
                    latest.id, status=REJECTED, decided_by=0, reason="аудитория ниже порога"
                )
            await message.answer(
                f"Сейчас статус выдаётся от <b>{minimum:,}</b> подписчиков — "
                "у вас пока меньше.\n\nПриходите, когда аудитория подрастёт!".replace(",", " "),
                reply_markup=ReplyKeyboardRemove(),
            )
            return

        if index + 1 < len(questions):
            await ask(message, state, index + 1)
        else:
            await show_preview(message, state)

    @router.callback_query(Apply.confirming, F.data == "apply:restart")
    async def on_restart(callback: CallbackQuery, state: FSMContext) -> None:
        await callback.answer()
        if not isinstance(callback.message, Message):
            return
        await state.set_state(Apply.filling)
        await state.update_data(answers={})
        await ask(callback.message, state, 0)

    @router.callback_query(Apply.confirming, F.data == "apply:cancel")
    async def on_confirm_cancel(callback: CallbackQuery, state: FSMContext) -> None:
        await callback.answer()
        await state.clear()
        if isinstance(callback.message, Message):
            await callback.message.answer("Заявка не отправлена.", reply_markup=ReplyKeyboardRemove())

    @router.callback_query(Apply.confirming, F.data == "apply:submit")
    async def on_submit(callback: CallbackQuery, state: FSMContext, bot: Bot) -> None:
        await callback.answer()
        if not isinstance(callback.message, Message):
            return

        data = await state.get_data()
        await state.clear()

        application_id = storage.create(
            user_id=callback.from_user.id,
            username=callback.from_user.username,
            full_name=callback.from_user.full_name,
            answers=data["answers"],
        )
        application = storage.get(application_id)
        assert application is not None

        await callback.message.answer(
            f"Заявка <b>№{application_id}</b> отправлена на рассмотрение. "
            "Ответ придёт сюда же.",
            reply_markup=ReplyKeyboardRemove(),
        )

        try:
            sent = await bot.send_message(
                admin_chat_id,
                f"🆕 <b>Заявка №{application_id}</b>\n"
                f"От: {_applicant_link(application)}\n\n"
                + format_application(application.answers),
                reply_markup=_decision_keyboard(application_id),
                disable_web_page_preview=True,
            )
            storage.set_admin_message(application_id, sent.message_id)
        except Exception:
            # Заявка уже сохранена, поэтому её не потеряем — увидят через /pending.
            log.exception("не удалось отправить заявку %s в админ-чат", application_id)

    @router.callback_query(Decide.filter())
    async def on_decision(
        callback: CallbackQuery, callback_data: Decide, state: FSMContext, bot: Bot
    ) -> None:
        chat_id = callback.message.chat.id if isinstance(callback.message, Message) else 0
        if not is_admin(callback.from_user.id, chat_id):
            await callback.answer("Недостаточно прав.", show_alert=True)
            return

        application = storage.get(callback_data.application_id)
        if application is None:
            await callback.answer("Заявка не найдена.", show_alert=True)
            return

        if callback_data.action == "reject":
            await callback.answer()
            await state.set_state(Moderation.reason)
            await state.update_data(application_id=application.id)
            if isinstance(callback.message, Message):
                await callback.message.reply(
                    f"Причина отказа по заявке №{application.id}? "
                    "Отправьте текст или «-», чтобы отказать без пояснения."
                )
            return

        if not storage.set_decision(application.id, status=APPROVED, decided_by=callback.from_user.id):
            await callback.answer("Заявку уже закрыли.", show_alert=True)
            return

        await callback.answer("Принято")
        await _finish(bot, callback, application, APPROVED, None)

    @router.message(Moderation.reason)
    async def on_reason(message: Message, state: FSMContext, bot: Bot) -> None:
        if not is_admin(message.from_user.id, message.chat.id):
            return

        data = await state.get_data()
        await state.clear()
        application = storage.get(int(data["application_id"]))
        if application is None:
            await message.reply("Заявка не найдена.")
            return

        text = (message.text or "").strip()
        reason = None if text in ("-", "") else text

        if not storage.set_decision(
            application.id, status=REJECTED, decided_by=message.from_user.id, reason=reason
        ):
            await message.reply("Заявку уже закрыли.")
            return

        await _notify_applicant(bot, application, REJECTED, reason)
        await message.reply(f"Заявка №{application.id} отклонена.")

    async def _finish(
        bot: Bot, callback: CallbackQuery, application: Application, status: str, reason: str | None
    ) -> None:
        if isinstance(callback.message, Message):
            mark = "✅ Принята" if status == APPROVED else "❌ Отклонена"
            try:
                await callback.message.edit_text(
                    f"{callback.message.html_text}\n\n<b>{mark}</b> "
                    f"(@{escape(callback.from_user.username or str(callback.from_user.id))})",
                    disable_web_page_preview=True,
                )
            except Exception:
                log.debug("не удалось отредактировать карточку заявки", exc_info=True)
        await _notify_applicant(bot, application, status, reason)

    async def _notify_applicant(
        bot: Bot, application: Application, status: str, reason: str | None
    ) -> None:
        if status == APPROVED:
            text = (
                f"🎉 Заявка <b>№{application.id}</b> одобрена — добро пожаловать "
                "в число медиа-партнёров!"
            )
        else:
            text = f"К сожалению, заявка <b>№{application.id}</b> отклонена."
            if reason:
                text += f"\n\n<b>Причина:</b> {escape(reason)}"
        try:
            await bot.send_message(application.user_id, text)
        except Exception:
            # Пользователь мог заблокировать бота — это не повод падать.
            log.info("не доставили решение по заявке %s", application.id, exc_info=True)

    @router.message(Command("pending"))
    async def on_pending(message: Message) -> None:
        if not is_admin(message.from_user.id, message.chat.id):
            return
        applications = storage.list_pending()
        if not applications:
            await message.answer("Открытых заявок нет.")
            return
        lines = [
            f"№{item.id} — {escape(item.full_name or str(item.user_id))}, "
            f"{item.answers.get('subscribers', 0)} подписчиков"
            for item in applications
        ]
        await message.answer("<b>Открытые заявки</b>\n" + "\n".join(lines))

    @router.message(Command("stats"))
    async def on_stats(message: Message) -> None:
        if not is_admin(message.from_user.id, message.chat.id):
            return
        counts = storage.counts()
        await message.answer(
            "<b>Заявки</b>\n"
            f"На рассмотрении: {counts['pending']}\n"
            f"Одобрено: {counts['approved']}\n"
            f"Отклонено: {counts['rejected']}"
        )

    return router
