import Link from "next/link";
import { ArrowRight, Check, Clock, FileText, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HeroNavbar } from "@/components/kp/hero-navbar";
import { HeroSection } from "@/components/kp/hero-section";
import { ProposalContent } from "@/components/kp/proposal-content";
import { getCurrentAccount } from "@/lib/kp/account";
import { renderTemplateProposal } from "@/lib/kp/generator/template";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/kp/plans";

const STEPS = [
  {
    icon: FileText,
    title: "Заполняете бриф",
    text: "Кто клиент, какая задача, что входит в работу, срок и бюджет. Одна форма, две минуты.",
  },
  {
    icon: Sparkles,
    title: "Получаете готовое КП",
    text: "Задача, решение, состав работ, этапы, таблица стоимости с вариантами и следующий шаг.",
  },
  {
    icon: Clock,
    title: "Правите и отправляете",
    text: "Текст можно отредактировать, сохранить, скачать в Markdown или распечатать в PDF.",
  },
];

const FAQ = [
  {
    question: "Откуда берётся текст предложения?",
    answer:
      "КП собирается из вашего брифа: задача клиента, состав работ, сроки и бюджет попадают в готовую структуру с таблицами. Если подключён ключ Anthropic, текст дополнительно пишет модель Claude — иначе работает встроенный сборщик, и результат вы получите в любом случае.",
  },
  {
    question: "Можно ли править готовое КП?",
    answer:
      "Да. Текст открыт для редактирования в формате Markdown: заголовки, списки и таблицы сохранятся при экспорте. На тарифах Pro и Business можно ещё и пересобрать текст заново по тому же брифу.",
  },
  {
    question: "В каком виде отправлять предложение клиенту?",
    answer:
      "Скопировать текст, скачать файл .md или распечатать в PDF прямо из браузера — вёрстка для печати уже настроена: интерфейс скрывается, остаётся чистый документ.",
  },
  {
    question: "Что будет, когда закончится лимит?",
    answer:
      "Генерация новых КП остановится до начала следующего расчётного периода, а все созданные предложения останутся доступны. Тариф можно сменить в любой момент, отмена — в один клик, доступ сохраняется до конца оплаченного периода.",
  },
];

const EXAMPLE_PROPOSAL = renderTemplateProposal({
  companyName: "Студия Ромашка",
  companyAbout: "Веб-студия полного цикла, 6 лет на рынке",
  clientName: "ООО «Василёк»",
  clientTask:
    "Сайт не принимает заявки с телефонов, конверсия упала вдвое. Нужен новый каталог и корзина.",
  services: [
    "Аудит текущего сайта",
    "Дизайн каталога и корзины",
    "Вёрстка и интеграция с 1С",
  ],
  advantages: [
    "Фиксируем смету в договоре",
    "Передаём проект с документацией",
  ],
  budget: 350000,
  timeline: "8 недель",
  contacts: "Иван Петров, +7 900 000-00-00",
  tone: "expert",
});

export default async function KpLandingPage() {
  const account = await getCurrentAccount();
  const primaryHref = account ? "/kp/app/new" : "/kp/login?mode=register";

  return (
    <div className="bg-[#000000] font-instrument-sans text-white">
      <HeroNavbar account={account} />
      <HeroSection primaryHref={primaryHref} />

      <section id="how" className="scroll-mt-24 border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-instrument-serif text-3xl leading-[1.1] sm:text-[40px]">
            Три шага от брифа до отправленного КП
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-white/20"
              >
                <step.icon className="h-6 w-6 text-[#b4c0ff]" />
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-[1.65] text-white/60">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="example"
        className="scroll-mt-24 border-t border-white/5 px-6 py-24"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="font-instrument-serif text-3xl leading-[1.1] sm:text-[40px]">
            Так выглядит результат
          </h2>
          <p className="mt-3 max-w-xl text-white/60">
            Ниже — настоящее КП, собранное из брифа веб-студии. Ничего не
            дорисовано: именно это вы увидите после нажатия кнопки.
          </p>

          <div className="relative mt-12">
            <div className="max-h-[560px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
              <ProposalContent content={EXAMPLE_PROPOSAL} />
            </div>
            {/* Затемнение снизу: показываем, что документ длиннее превью. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 rounded-b-2xl bg-gradient-to-t from-[#000000] to-transparent" />
          </div>

          <div className="mt-8">
            <Link
              href={primaryHref}
              className="group inline-flex items-center gap-4 rounded-full bg-white py-2 pl-6 pr-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <span className="text-lg font-medium text-[#0a0400]">
                Собрать своё КП
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3054ff] transition-colors group-hover:bg-[#2040e0]">
                <ArrowRight className="h-5 w-5 text-white" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="scroll-mt-24 border-t border-white/5 px-6 py-24"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="font-instrument-serif text-3xl leading-[1.1] sm:text-[40px]">
            Тарифы
          </h2>
          <p className="mt-3 text-white/60">
            Помесячно, без договора и минимального срока. Отменить можно в один клик.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const highlighted = plan.id === "pro";

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-colors ${
                    highlighted
                      ? "border-[#3054ff] bg-[#3054ff]/[0.07] shadow-[0_0_40px_rgba(48,84,255,0.15)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {highlighted && (
                      <span className="rounded-full bg-[#3054ff] px-3 py-1 text-xs font-semibold">
                        Популярный
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white/60">{plan.tagline}</p>

                  <p className="mt-6 text-4xl font-semibold tracking-tight">
                    {plan.price === 0 ? "0 ₽" : formatPrice(plan.price)}
                    <span className="text-base font-normal text-white/50">
                      {" "}
                      / мес
                    </span>
                  </p>

                  <ul className="mt-6 flex-1 space-y-2 text-sm text-white/70">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#b4c0ff]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={
                      account
                        ? "/kp/app/billing"
                        : `/kp/login?mode=register&plan=${plan.id}`
                    }
                    className={`mt-8 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-transform hover:scale-105 ${
                      highlighted
                        ? "bg-white text-black"
                        : "border border-white/20 text-white hover:bg-white/5"
                    }`}
                  >
                    {plan.paid ? "Подключить" : "Начать бесплатно"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-instrument-serif text-3xl leading-[1.1] sm:text-[40px]">
            Вопросы
          </h2>

          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((item) => (
              <AccordionItem
                key={item.question}
                value={item.question}
                className="border-white/10"
              >
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-[1.65] text-white/60">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 text-sm text-white/40">
          <span>KPGen — генератор коммерческих предложений</span>
          <Link href="/kp/login" className="transition-colors hover:text-white">
            Войти
          </Link>
        </div>
      </footer>
    </div>
  );
}
