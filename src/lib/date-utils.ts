// Ombor `dbs_config` (cutoffHour/deliveryDays/offDays/holidays) ni date-utils kutadigan
// formatga ({cutoff, days, offDays, holidays}) o'tkazadi.
export const normalizeDbsConfig = (dbs: any) => ({
    cutoff: Number(dbs?.cutoffHour ?? 16),
    days: Number(dbs?.deliveryDays ?? 1),
    offDays: Array.isArray(dbs?.offDays) ? dbs.offDays : [],
    holidays: Array.isArray(dbs?.holidays) ? dbs.holidays : [],
});

// Mahsulot kartochkasi uchun qisqa yetkazish matni:
// "Bugun yetkaziladi" / "Ertaga yetkaziladi" / "Indinga yetkaziladi" / "3-iyunda yetkaziladi"
export const getDeliveryCardText = (language: string, dbs: any): string => {
    const s = normalizeDbsConfig(dbs);
    const now = new Date();
    let daysToAdd = now.getHours() >= s.cutoff ? s.days + 1 : s.days;
    const d = new Date();
    d.setDate(now.getDate() + daysToAdd);

    const isOff = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return s.offDays.includes(date.getDay()) || s.holidays.includes(`${y}-${m}-${dd}`);
    };
    let i = 0;
    while (isOff(d) && i < 30) { d.setDate(d.getDate() + 1); i++; }

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const target = new Date(d); target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - start.getTime()) / 86400000);

    if (language === "ru") {
        if (diff <= 0) return "Доставим сегодня";
        if (diff === 1) return "Доставим завтра";
        if (diff === 2) return "Доставим послезавтра";
        const monthsRu = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
        return `Доставим ${d.getDate()} ${monthsRu[d.getMonth()]}`;
    }
    if (diff <= 0) return "Bugun yetkaziladi";
    if (diff === 1) return "Ertaga yetkaziladi";
    if (diff === 2) return "Indinga yetkaziladi";
    const monthsUz = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
    return `${d.getDate()}-${monthsUz[d.getMonth()]}da yetkaziladi`;
};

export const getDeliveryDateText = (language: string, deliverySettings: any) => {
    const now = new Date();
    const currentHour = now.getHours();
    let daysToAdd = currentHour >= (deliverySettings?.cutoff || 16) ? (deliverySettings?.days || 1) + 1 : (deliverySettings?.days || 1);
    const deliveryDate = new Date();
    deliveryDate.setDate(now.getDate() + daysToAdd);
    
    const isOff = (date: Date) => {
        const dayNum = date.getDay();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        return (deliverySettings?.offDays || []).includes(dayNum) || (deliverySettings?.holidays || []).includes(dateStr);
    };

    let iterations = 0;
    while (isOff(deliveryDate) && iterations < 30) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        iterations++;
    }

    const months = language === 'uz' 
        ? ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"] 
        : ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    
    const dayName = deliveryDate.getDate();
    const monthName = months[deliveryDate.getMonth()];
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfDelivery = new Date(deliveryDate);
    startOfDelivery.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((startOfDelivery.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return language === 'uz' ? "Bugun" : "Сегодня";
    if (diffDays === 1) return language === 'uz' ? `Ertaga, ${dayName}-${monthName}` : `Завтра, ${dayName}-${monthName}`;
    if (diffDays === 2) return language === 'uz' ? `Indinga, ${dayName}-${monthName}` : `Послезавтра, ${dayName}-${monthName}`;
    return `${dayName}-${monthName}`;
};
