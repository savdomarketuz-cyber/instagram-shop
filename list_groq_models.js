require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;

async function listModels() {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        console.log('--- Barcha Groq Modellar ---');
        console.log(data.data.map(m => m.id));
    } catch (err) {
        console.error('Error fetching models:', err);
    }
}

listModels();
