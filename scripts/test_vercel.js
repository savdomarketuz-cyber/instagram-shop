const fetch = require('node-fetch'); // wait I'll use native fetch below

async function testVercel() {
    try {
        console.log("Testing Velari suggest search");
        const res = await fetch('https://velari.uz/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'vgr', suggest: true })
        });
        const text = await res.text();
        console.log(`Suggest Status: ${res.status}`);
        console.log(`Suggest Body:`, text.substring(0, 500));
        
        console.log("\nTesting Velari full search");
        const res2 = await fetch('https://velari.uz/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'vgr' })
        });
        const text2 = await res2.text();
        console.log(`Full Search Status: ${res2.status}`);
        console.log(`Full Search Body:`, text2.substring(0, 500));
        
    } catch(e) {
        console.error("Error pinging Velari:", e.message);
    }
}
testVercel();
