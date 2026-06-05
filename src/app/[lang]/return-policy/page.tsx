import { Metadata } from "next";
import Link from "next/link";
import {
    RotateCcw, ShieldCheck, Banknote, Phone, MapPin, Send,
    AlertTriangle, CheckCircle2, Truck, ChevronLeft, FileText, Clock,
} from "lucide-react";

const SUPPORT = {
    // Qaytarish so'rovi uchun ADMIN bilan bog'lanadi (xabarnoma boti avtomatik, suhbat uchun emas)
    telegram: "@VELARI_UZ_ADMIN",
    telegramUrl: "https://t.me/VELARI_UZ_ADMIN",
    phone: "+998 95 082 11 88",
    phoneLink: "tel:+998950821188",
};

type Lang = "uz" | "ru";

const CONTENT: Record<Lang, any> = {
    ru: {
        badge: "Velari Market",
        title: "Условия возврата и обмена",
        intro: "Мы стремимся обеспечить максимальный комфорт и прозрачность при покупках в интернет-магазине Velari Market. Все процедуры возврата и обмена осуществляются строго в соответствии с Законом Республики Узбекистан «О защите прав потребителей» и Правилами розничной торговли.",
        addressLabel: "Адрес для возврата",
        address: "г. Ташкент, Сергелийский район, ул. М. Замахшари, 4-й проезд, 17А",
        contactTitle: "Контакты для оформления возврата",
        contactSubtitle: "Для инициации процесса возврата или обмена свяжитесь с нашей службой поддержки",
        telegramLabel: "Telegram-поддержка (админ)",
        phoneLabel: "Телефон / Call-центр",
        back: "Назад",
        sections: [
            {
                icon: "return",
                tag: "Без брака",
                title: "Возврат товара надлежащего качества",
                body: "Если товар не подошёл вам по форме, габаритам, фасону, расцветке или размеру, вы имеете право обменять его или вернуть в течение 14 календарных дней со дня покупки (не считая дня покупки).",
                listTitle: "Условия возврата:",
                list: [
                    "Товар не был в употреблении, полностью сохранён его товарный вид.",
                    "Сохранены все потребительские свойства, пломбы, фабричные ярлыки и защитные плёнки.",
                    "Наличие документов, подтверждающих покупку (электронный чек, квитанция или подтверждение заказа в личном кабинете).",
                ],
                note: "Согласно законодательству РУз, предметы личной гигиены (например, триммеры для волос, бритвы) надлежащего качества после вскрытия упаковки и использования возврату и обмену не подлежат. Возврат часов и электронных гаджетов возможен только при полном сохранении товарного вида и заводских пломб.",
                delivery: "Расходы на доставку при возврате товара надлежащего качества оплачивает покупатель.",
                deliveryBy: "buyer",
            },
            {
                icon: "shield",
                tag: "Заводской брак",
                title: "Возврат товара ненадлежащего качества",
                body: "Если вы обнаружили производственный брак, дефект или несоответствие заявленным характеристикам в течение гарантийного срока (или в течение 6 месяцев, если срок не установлен):",
                listTitle: "Ваши права:",
                list: [
                    "Бесплатное устранение недостатков.",
                    "Замена на аналогичный товар.",
                    "Полный возврат уплаченной суммы.",
                ],
                delivery: "Все транспортные расходы и услуги курьерской доставки берёт на себя Velari Market.",
                deliveryBy: "seller",
            },
            {
                icon: "money",
                tag: "1–7 рабочих дней",
                title: "Сроки и способ возврата денежных средств",
                body: "После получения товара на наш склад и проверки его состояния денежные средства возвращаются покупателю в течение от 1 до 7 рабочих дней.",
                list: [
                    "Способ возврата соответствует способу оплаты.",
                    "Если заказ оплачен онлайн (Payme / Click / Uzum) — средства возвращаются на ту же карту, с которой была произведена оплата.",
                ],
            },
        ],
    },
    uz: {
        badge: "Velari Market",
        title: "Qaytarish va almashtirish shartlari",
        intro: "Biz Velari Market internet-do'konida xaridlar qulay va shaffof bo'lishini ta'minlashga intilamiz. Tovarlarni qaytarish va almashtirishning barcha jarayonlari O'zbekiston Respublikasining «Iste'molchilarning huquqlarini himoya qilish to'g'risida»gi Qonuniga muvofiq amalga oshiriladi.",
        addressLabel: "Qaytarish manzili",
        address: "Toshkent shahri, Sergeli tumani, M. Zamaxshariy 4-tor ko'chasi, 17A",
        contactTitle: "Qaytarish uchun aloqa",
        contactSubtitle: "Qaytarish jarayonini boshlash uchun qo'llab-quvvatlash xizmatimizga murojaat qiling",
        telegramLabel: "Telegram qo'llab-quvvatlash (admin)",
        phoneLabel: "Telefon / Call-markaz",
        back: "Orqaga",
        sections: [
            {
                icon: "return",
                tag: "Nuqsonsiz",
                title: "Sifatli tovarni qaytarish",
                body: "Agar sotib olingan tovar o'lchami, rangi yoki modeli bo'yicha sizga mos kelmasa, xarid qilingan kundan boshlab 14 kalendar kuni ichida uni almashtirish yoki qaytarish huquqiga egasiz.",
                listTitle: "Qaytarish shartlari:",
                list: [
                    "Tovar ishlatilmagan va uning tovar ko'rinishi to'liq saqlangan bo'lishi kerak.",
                    "Barcha iste'mol xususiyatlari, plombalari, zavod yorliqlari va himoya plyonkalari joyida bo'lishi shart.",
                    "Xaridni tasdiqlovchi hujjat (elektron chek, kvitansiya yoki shaxsiy kabinetdagi buyurtma tarixi) mavjudligi.",
                ],
                note: "O'zbekiston qonunchiligiga ko'ra, shaxsiy gigiyena buyumlari (masalan, soch va soqol trimmerlari, taroqlar) qadoqlari ochilib ishlatilganidan keyin, agar nuqson bo'lmasa, qaytarib olinmaydi va almashtirilmaydi. Soat va gadjetlarni qaytarish faqat tovar ko'rinishi va zavod plombalari buzilmagan holatda qabul qilinadi.",
                delivery: "Sifatli tovar shunchaki yoqmagani uchun qaytarilganda, kuryerlik va transport xarajatlari xaridor tomonidan qoplanadi.",
                deliveryBy: "buyer",
            },
            {
                icon: "shield",
                tag: "Zavod braki",
                title: "Nuqsonli (brak) tovarni qaytarish",
                body: "Agar kafolat muddati davomida (yoki kafolat belgilanmagan bo'lsa, 6 oy ichida) tovarda zavod braki yoki nuqson aniqlansa:",
                listTitle: "Sizning huquqlaringiz:",
                list: [
                    "Tovarni bepul ta'mirlatish.",
                    "Xuddi shunday sifatli modelga almashtirish.",
                    "To'langan pulni to'liq qaytarib olish.",
                ],
                delivery: "Brak tovarlarni qaytarish yoki almashtirish bilan bog'liq barcha kuryerlik xarajatlari Velari Market tomonidan to'lanadi.",
                deliveryBy: "seller",
            },
            {
                icon: "money",
                tag: "1–7 ish kuni",
                title: "Pulni qaytarish muddati va usuli",
                body: "Tovar omborimizga qaytib kelib, tekshirilgandan so'ng, pul mablag'lari 1 dan 7 ish kuni ichida xaridorga qaytariladi.",
                list: [
                    "Pul xaridor qaysi usulda to'lagan bo'lsa, o'sha usulda qaytariladi.",
                    "Karta orqali onlayn to'langan bo'lsa (Payme / Click / Uzum) — o'sha plastik kartaga qayta o'tkaziladi.",
                ],
            },
        ],
    },
};

const ICONS: Record<string, any> = { return: RotateCcw, shield: ShieldCheck, money: Banknote };

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
    const lang = (params.lang === "ru" ? "ru" : "uz") as Lang;
    const baseUrl = "https://velari.uz";
    const title = lang === "ru"
        ? "Условия возврата и обмена товаров — Velari Market"
        : "Tovarlarni qaytarish va almashtirish shartlari — Velari Market";
    const description = lang === "ru"
        ? "Официальная политика возврата Velari Market: возврат в течение 14 дней, заводской брак, сроки возврата денег 1–7 дней. Согласно Закону РУз о защите прав потребителей."
        : "Velari Market rasmiy qaytarish siyosati: 14 kun ichida qaytarish, zavod braki, pulni 1–7 ish kunida qaytarish. O'zbekiston iste'molchi huquqlari qonuniga muvofiq.";

    return {
        title,
        description,
        openGraph: { title, description, url: `${baseUrl}/${lang}/return-policy`, siteName: "Velari", type: "website", locale: lang === "ru" ? "ru_RU" : "uz_UZ" },
        alternates: {
            canonical: `${baseUrl}/${lang}/return-policy`,
            languages: {
                "uz-UZ": `${baseUrl}/uz/return-policy`,
                "ru-RU": `${baseUrl}/ru/return-policy`,
                "x-default": `${baseUrl}/uz/return-policy`,
            },
        },
        robots: { index: true, follow: true },
    };
}

export default function ReturnPolicyPage({ params }: { params: { lang: string } }) {
    const lang = (params.lang === "ru" ? "ru" : "uz") as Lang;
    const c = CONTENT[lang];

    return (
        <div className="bg-[#FAFAF6] min-h-screen pb-24 px-4 md:px-6">
            <div className="max-w-3xl mx-auto pt-8 md:pt-12">
                {/* Back */}
                <Link href={`/${lang}`} className="inline-flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-6 hover:text-black transition-colors">
                    <ChevronLeft size={16} /> {c.back}
                </Link>

                {/* Hero */}
                <div className="rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden mb-8" style={{ background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)" }}>
                    <div className="absolute -bottom-12 -right-12 opacity-10">
                        <RotateCcw size={200} />
                    </div>
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                            <FileText size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{c.badge}</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-[0.95] mb-5">{c.title}</h1>
                        <p className="text-sm md:text-base text-white/80 leading-relaxed font-medium max-w-2xl">{c.intro}</p>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-6">
                    {c.sections.map((s: any, i: number) => {
                        const Icon = ICONS[s.icon] || RotateCcw;
                        return (
                            <section key={i} className="bg-white rounded-[36px] p-7 md:p-9 border border-gray-100 shadow-sm">
                                <div className="flex items-start gap-4 mb-5">
                                    <div className="shrink-0 w-12 h-12 bg-[#EAF3EC] rounded-2xl flex items-center justify-center">
                                        <Icon className="text-[#2D6E3E]" size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#2D6E3E] bg-[#EAF3EC] px-2.5 py-1 rounded-full">{s.tag}</span>
                                            <span className="text-[10px] font-black text-gray-300">0{i + 1}</span>
                                        </div>
                                        <h2 className="text-lg md:text-xl font-black italic tracking-tighter uppercase leading-tight">{s.title}</h2>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 leading-relaxed font-medium mb-5">{s.body}</p>

                                {s.listTitle && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{s.listTitle}</p>
                                )}
                                <ul className="space-y-2.5 mb-5">
                                    {s.list.map((item: string, j: number) => (
                                        <li key={j} className="flex items-start gap-3">
                                            <CheckCircle2 className="text-[#2D6E3E] shrink-0 mt-0.5" size={17} />
                                            <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                {s.note && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <p className="text-[12px] text-amber-800 leading-relaxed font-medium">{s.note}</p>
                                    </div>
                                )}

                                {s.delivery && (
                                    <div className={`flex items-center gap-3 rounded-2xl p-4 ${s.deliveryBy === "seller" ? "bg-[#EAF3EC]" : "bg-gray-50"}`}>
                                        <Truck className={s.deliveryBy === "seller" ? "text-[#2D6E3E] shrink-0" : "text-gray-400 shrink-0"} size={18} />
                                        <p className={`text-[12px] leading-relaxed font-bold ${s.deliveryBy === "seller" ? "text-[#2D6E3E]" : "text-gray-500"}`}>{s.delivery}</p>
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                {/* Contacts */}
                <section className="bg-black text-white rounded-[36px] p-8 md:p-10 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Phone size={16} className="text-[#4CAF71]" />
                        <h2 className="text-xl font-black italic tracking-tighter uppercase">{c.contactTitle}</h2>
                    </div>
                    <p className="text-xs text-gray-400 font-medium mb-7 max-w-lg">{c.contactSubtitle}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href={SUPPORT.telegramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-2xl p-5 transition-colors group">
                            <div className="w-11 h-11 bg-[#229ED9] rounded-2xl flex items-center justify-center shrink-0">
                                <Send size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{c.telegramLabel}</p>
                                <p className="text-sm font-black truncate group-hover:text-[#4CAF71] transition-colors">{SUPPORT.telegram}</p>
                            </div>
                        </a>

                        <a href={SUPPORT.phoneLink} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-2xl p-5 transition-colors group">
                            <div className="w-11 h-11 bg-[#2D6E3E] rounded-2xl flex items-center justify-center shrink-0">
                                <Phone size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{c.phoneLabel}</p>
                                <p className="text-sm font-black truncate group-hover:text-[#4CAF71] transition-colors">{SUPPORT.phone}</p>
                            </div>
                        </a>
                    </div>

                    <div className="flex items-start gap-4 bg-white/5 rounded-2xl p-5 mt-3">
                        <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                            <MapPin size={20} className="text-[#4CAF71]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{c.addressLabel}</p>
                            <p className="text-sm font-bold leading-snug">{c.address}</p>
                        </div>
                    </div>
                </section>

                {/* Legal footer */}
                <div className="flex items-center justify-center gap-2 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] mt-8">
                    <ShieldCheck size={14} />
                    <span>{lang === "ru" ? "Защита прав потребителей РУз" : "O'zbekiston iste'molchi huquqlari himoyasi"}</span>
                </div>
            </div>
        </div>
    );
}
