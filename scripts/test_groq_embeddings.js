require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;

async function testGroqEmbeddings() {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'nomic-embed-text-v1.5',
                input: 'Toster UAKEEN qizil rangli'
            })
        });

        const data = await response.json();
        console.log('--- Groq Embedding Test (Nomic) ---');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testGroqEmbeddings();
