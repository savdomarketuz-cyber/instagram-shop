const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;

async function translateText(text, isName) {
    if (!text || text.trim() === '') return '';
    
    let prompt = `Translate the following Russian product ${isName ? 'name' : 'description'} into natural, fluent Uzbek suitable for a local e-commerce store. 
Important rules:
1. Do not use overly formal or unnatural words like "soch quritgich". Use commonly understood words like "Fen" instead.
2. Keep it accurate and professional but natural for the Uzbek market.
3. Keep HTML tags intact if there are any (like <br/>).
4. Output ONLY the translated text, no additional comments, no quotes around it.

Text to translate:
${text}`;

    const data = JSON.stringify({
        model: "llama-3.1-8b-instant", // fast and capable
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
    });

    const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', d => resData += d);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(resData);
                        resolve(json.choices[0].message.content.trim());
                    } catch(e) { reject(e); }
                } else {
                    reject(new Error(`API Error: ${res.statusCode} ${resData}`));
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// simple sleep function
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    const { data: products } = await supabase.from('products')
        .select('id, name, description')
        .like('image', '%savdomarketimag/products/%');
        
    console.log(`Found ${products.length} new products to translate.`);
    
    let count = 0;
    for (const p of products) {
        try {
            console.log(`Translating [${count+1}/${products.length}] ${p.name.substring(0, 30)}...`);
            
            const name_uz = await translateText(p.name, true);
            let desc_uz = '';
            if (p.description) {
                desc_uz = await translateText(p.description, false);
            }
            
            const { error } = await supabase.from('products')
                .update({ name_uz, description_uz: desc_uz })
                .eq('id', p.id);
                
            if (error) {
                console.error('Update error:', error);
            } else {
                count++;
            }
            
            // tiny sleep to respect rate limits
            await sleep(300);
        } catch(e) {
            console.error('Failed on', p.id, e.message);
        }
    }
    console.log('Successfully translated', count, 'products.');
}
run();
