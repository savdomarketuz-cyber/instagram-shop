const fetch = require('node-fetch'); // fallback if fetch is not global

async function test() {
    try {
        console.log("Testing suggest endpoint for 'vgr'");
        const res = await fetch('http://localhost:3000/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'vgr', suggest: true })
        });
        const data = await res.json();
        console.log("Suggest response:", data);

        console.log("Testing full search endpoint for 'vgr'");
        const res2 = await fetch('http://localhost:3000/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'vgr' })
        });
        const data2 = await res2.json();
        console.log("Full search response:", data2.results ? data2.results.length : data2);
    } catch(e) {
        console.error("HTTP error:", e);
    }
}
test();
