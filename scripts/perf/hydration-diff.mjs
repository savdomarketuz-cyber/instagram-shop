// Hydration farqini topish: server HTML'dagi matn tugunlari va JS'siz brauzer DOM'i JS bilan bir xil holatga
// kelishini solishtiradi. Chrome'da sahifa ikki marta ochiladi: JS o'chiq (server HTML) va JS yoqiq
// (hydration'dan keyin); ko'rinadigan matn qatorlari farqi chiqariladi.
//
//   node scripts/perf/hydration-diff.mjs --url https://velari.uz/uz [--mobile]

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const args = process.argv.slice(2);
const URL_ = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'https://velari.uz/uz';
const MOBILE = args.includes('--mobile');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function textOf(js) {
    const port = 9334 + (js ? 1 : 0);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'velari-hyd-'));
    const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
    try {
        let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); } }
        const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r));
        let id = 0; const pend = new Map(); const errs = [];
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); }
            if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300)); };
        const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
        await send('Runtime.enable', {}, s);
        if (MOBILE) await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, s);
        else await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, s);
        if (!js) await send('Emulation.setScriptExecutionDisabled', { value: true }, s);
        await send('Page.enable', {}, s);
        await send('Page.navigate', { url: URL_ }, s);
        await sleep(js ? 12000 : 6000);
        const r = await send('Runtime.evaluate', { expression: `(() => { const m = document.querySelector('main') || document.body; return m.innerText; })()`, returnByValue: true }, s);
        ws.close();
        return { text: r.result.value || '', errs };
    } finally { chrome.kill(); await sleep(500); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }
}

const server = await textOf(false);
const client = await textOf(true);
const a = server.text.split('\n').map(x => x.trim()).filter(Boolean);
const b = client.text.split('\n').map(x => x.trim()).filter(Boolean);
const setB = new Set(b), setA = new Set(a);
console.log(`server qatorlar: ${a.length}, client qatorlar: ${b.length}`);
console.log('\nFAQAT SERVER HTML\'da:'); a.filter(x => !setB.has(x)).slice(0, 40).forEach(x => console.log('  - ' + x.slice(0, 120)));
console.log('\nFAQAT CLIENT DOM\'da:'); b.filter(x => !setA.has(x)).slice(0, 40).forEach(x => console.log('  + ' + x.slice(0, 120)));
if (client.errs.length) { console.log('\nConsole errors:'); client.errs.slice(0, 5).forEach(e => console.log('  ! ' + e)); }
