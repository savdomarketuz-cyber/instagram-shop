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
