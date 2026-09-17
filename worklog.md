# FANTASTIQUEBOY SETUPS — магазин сетапов для F1 25 / 2026 Season Pack

## Обзор
Проект переписан с платформы бустинга Brawl Stars на магазин сетапов для F1 25.

## Архитектура
- **Next.js 16 App Router**, серверные компоненты для страниц, клиентские — для форм и панели.
- **Prisma + SQLite**: User, Pilot, Track, Setup, SetupVariant, Pack, PackSetup, TrainingPlan,
  Order, TrainingRequest, Notification, Setting.
- **Авторизация**: собственная сессия в httpOnly-cookie, подписанной HMAC-SHA256 (`src/lib/auth.ts`),
  пароли — bcrypt.
- **Платежи**: `src/lib/payments.ts` — FreeKassa (подпись md5), Platega (API + webhook),
  ручное подтверждение. Ключи хранятся в таблице Setting и редактируются в панели.

## Структура
- `src/app/` — страницы: `/`, `/catalog`, `/setup/[id]`, `/training`, `/login`, `/register`, `/profile`, `/admin`.
- `src/app/api/` — auth, profile, tracks, setups, training-plans, orders, notifications,
  admin (stats/orders/training/users/settings), payments (freekassa/platega), seed.
- `src/components/` — site-header, site-footer, setup-card, setup-values, buy-panel,
  payment-picker, catalog-view, training-view, profile-view, auth-form, `admin/*`.
- `src/lib/` — auth, db, api, settings, payments, orders, f1-data (трассы и параметры сетапа).

## Модель товара
- Товар — трасса от конкретного пилота. Квалификация и гонка не разделяются: разница между ними
  сводится к топливу и режиму мотора. Внутри товара варианты по условиям: сухо и дождь.
- Тайм-триал не продаётся: такие сетапы лежат в открытом доступе.
- Пак — набор сетапов одного пилота; оплата пака открывает все входящие сетапы
  (см. `src/lib/ownership.ts`). Паки бывают по игре (`game: f125 | s2026`) и фулл
  (`game: all`) — обе игры сразу, дешевле связки двух паков по играм.

## Данные
- 26 трасс F1 25 (24 этапа сезона 2025 + Portimão и Paul Ricard) и 8 трасс 2026 Season Pack.
- Сид создаёт только администратора, справочник трасс, пилота-владельца, программы обучения
  и настройки. Сетапы и паки заводятся вручную через панель, поэтому на пустом каталоге
  главная, `/catalog` и `/packs` показывают понятные пустые состояния.
- Ссылки на соцсети хранятся в настройках сайта (`Setting.site.socials`), значения по
  умолчанию — Telegram, YouTube, Twitch, Kick и TikTok Fantastiqueboy.
- 3 программы обучения.
- Администратор: `fantasticqueboy` / `fantasticqueboy` (меняется в профиле).

## Логика доступа к товару
Значения сетапа (`Setup.data`) не отдаются API, пока у пользователя нет оплаченного заказа на этот сетап.
До покупки виден только превью-набор (антикрылья и баланс тормозов).

## Обучение
Покупка обучения = заказ + `TrainingRequest` с анкетой (Telegram/Discord, PC/PS/Xbox,
руль/геймпад/клавиатура, уровень, комментарий). В панель приходит уведомление,
администратор берёт заявку в работу и закрывает её; пользователь получает уведомления о статусе.
