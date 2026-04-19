import { Metadata } from 'next';
import { translations } from "@/lib/translations";
import AboutClient from "./AboutClient";

export async function generateMetadata({ params: { lang } }: { params: { lang: string } }): Promise<Metadata> {
    const language = (lang === 'ru' ? 'ru' : 'uz') as 'uz' | 'ru';
    const t = translations[language];
    const baseUrl = 'https://velari.uz';

    const title = `${t.aboutUs.title} | Velari - O'zbekistonda №1 Premium Marketplace`;
    const description = `${t.aboutUs.subtitle}. ${t.aboutUs.mainTitle}. Velari market — O'zbekistonda sifatli elektronika va maishiy texnika do'koni.`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: `${baseUrl}/${lang}/about`,
            siteName: 'Velari',
            type: 'website',
            locale: lang === 'ru' ? 'ru_RU' : 'uz_UZ',
        },
        alternates: {
            canonical: `${baseUrl}/${lang}/about`,
            languages: {
                'uz-UZ': `${baseUrl}/uz/about`,
                'ru-RU': `${baseUrl}/ru/about`,
                'x-default': `${baseUrl}/uz/about`,
            },
        },
    };
}

export default function Page() {
    return <AboutClient />;
}
