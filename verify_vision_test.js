require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;
const TEST_IMG = path.join('C:', 'Users', 'abduv', 'Desktop', 'TOASTER SKY BLUE', '9053447643.webp');

async function testVision() {
    console.log('--- Vision AI Testi boshlandi ---');
    console.log('Analiz qilinayotgan rasm:', TEST_IMG);

    if (!fs.existsSync(TEST_IMG)) {
        console.error('Xatolik: Fayl topilmadi!');
        return;
    }

    const base64Image = fs.readFileSync(TEST_IMG).toString('base64');

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: "Ushbu rasmdagi mahsulotni tahlil qiling. Mahsulot nomi, rangi, va u haqidagi SEO uchun tavsif yozing. JAVOB FAQAT JSON BO'LSIN: { \"name_uz\": \"...\", \"description_uz\": \"...\", \"seo_alt_text\": \"...\" }" },
                            { type: 'image_url', image_url: { url: `data:image/webp;base64,${base64Image}` } }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            }),
        });

        const data = await response.json();
        console.log('--- Raw API Response ---\n', JSON.stringify(data, null, 2));
        const content = data.choices?.[0]?.message?.content;
        console.log('\n--- AI Natijasi ---\n');
        console.log(content ? JSON.parse(content) : 'Tahlil amalga oshmadi');
        console.log('\n--- Test yakunlandi ---');
    } catch (err) {
        console.error('AI bilan bog\'lanishda xatolik:', err);
    }
}

testVision();
