// Birinchi yuklanish o'lchovi (TASK P): headless Chrome + DevTools protokoli, qo'shimcha kutubxonasiz.
// Har ishga tushirish — yangi bo'sh profil (kesh yo'q).
//
//   node scripts/perf/measure.mjs --url https://velari.uz/uz --runs 3                (kompyuter 1440x900)
//   node scripts/perf/measure.mjs --url https://velari.uz/uz --runs 3 --mobile       (390x844, CPU 4x, 4G)
//   ... --block mc.yandex.ru --block connect.facebook.net                            (so'rovlarni bloklash)
//   ... --patch "clickmap:true=>clickmap:false"                                        (JS'ni yo'lda o'zgartirish, A/B)
//   ... --out scripts/perf/results-before.json
//   CHROME=/path/to/chrome   (standart: Program Files\Google\Chrome)
//
// Chiqadi: eng uzun long task (ms), TBT (FCP dan keyingi long task'larning 50 ms dan ortig'i),
// FCP, LCP + LCP elementi, yuklangan bayt (host bo'yicha), long task'lar ro'yxati (atributsiya bilan).

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const URL_ = opt('--url', 'https://velari.uz/uz');
const RUNS = Number(opt('--runs', '3'));
const MOBILE = args.includes('--mobile');
const OUT = opt('--out', null);
const BLOCK = args.flatMap((a, i) => (a === '--block' ? [args[i + 1]] : []));
// A/B: sayt JS chunk'larida matnni "yo'lda" almashtirish, masalan --patch "clickmap:true=>clickmap:false"
const PROFILE = args.includes('--profile'); // CPU profil: eng ko'p vaqt olgan funksiyalar (self time)
const PATCHES = args.flatMap((a, i) => (a === '--patch' ? [args[i + 1].split('=>')] : []));
const SETTLE_MS = Number(opt('--settle', '12000')); // load'dan keyin kutish (lazy skriptlar ham ishlasin)
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

const OBSERVER = `
(() => {
  const P = window.__perf = { lt: [], lcp: null, lcpEl: null, lcpUrl: null, fcp: null };
  try {
    new PerformanceObserver(l => l.getEntries().forEach(e => P.lt.push({ start: Math.round(e.startTime), dur: Math.round(e.duration),
      attr: (e.attribution || []).map(a => a.containerSrc || a.containerName || a.name).filter(Boolean).join(',') })))
      .observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(l => { const e = l.getEntries().pop(); if (!e) return; P.lcp = Math.round(e.startTime);
      P.lcpUrl = e.url || null; const el = e.element; P.lcpEl = el ? (el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '')) : null; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.name === 'first-contentful-paint') P.fcp = Math.round(e.startTime); }))
      .observe({ type: 'paint', buffered: true });
  } catch (e) {}
})();`;

async function cdpConnect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    const listeners = [];
    ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
        else listeners.forEach(l => l(msg));
    };
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
    return { ws, send, on: (fn) => listeners.push(fn) };
}

async function runOnce(n) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'velari-perf-'));
    const chrome = spawn(CHROME, [
        '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
        '--disable-component-update', '--disable-sync', '--mute-audio', 'about:blank',
    ], { stdio: 'ignore' });
    try {
        let ver;
        for (let i = 0; i < 50; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch { await sleep(200); } }
        const c = await cdpConnect(ver.webSocketDebuggerUrl);
        const { targetId } = await c.send('Target.createTarget', { url: 'about:blank' });
        const { sessionId: s } = await c.send('Target.attachToTarget', { targetId, flatten: true });
        const S = (m, p) => c.send(m, p, s);

        const bytes = {}; let loaded = false; let patched = 0; const errors = [];
        c.on(async msg => {
            if (msg.sessionId !== s) return;
            if (msg.method === 'Fetch.requestPaused') {
                const { requestId, responseStatusCode, responseHeaders } = msg.params;
                try {
                    const body = await S('Fetch.getResponseBody', { requestId });
                    let text = body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body;
                    let changed = false;
                    for (const [from, to] of PATCHES) if (text.includes(from)) { text = text.split(from).join(to); changed = true; }
                    if (changed) {
                        patched++;
                        await S('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200,
                            responseHeaders: (responseHeaders || []).filter(h => !/^content-(length|encoding)$/i.test(h.name)),
                            body: Buffer.from(text, 'utf8').toString('base64') });
                    } else await S('Fetch.continueResponse', { requestId });
                } catch { try { await S('Fetch.continueRequest', { requestId }); } catch {} }
                return;
            }
            if (msg.method === 'Network.responseReceived') bytes[msg.params.requestId] = { url: msg.params.response.url, len: 0 };
            if (msg.method === 'Network.loadingFinished' && bytes[msg.params.requestId]) bytes[msg.params.requestId].len = msg.params.encodedDataLength;
            if (msg.method === 'Page.loadEventFired') loaded = true;
            if (msg.method === 'Runtime.exceptionThrown') errors.push((msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text || '').split(String.fromCharCode(10))[0].slice(0, 160));
        });
        await S('Page.enable'); await S('Network.enable'); await S('Runtime.enable');
        await S('Network.setCacheDisabled', { cacheDisabled: true });
        if (BLOCK.length) await S('Network.setBlockedURLs', { urls: BLOCK.map(b => `*${b}*`) });
        if (PATCHES.length) await S('Fetch.enable', { patterns: [{ urlPattern: '*/_next/static/chunks/*.js', requestStage: 'Response' }] });
        if (MOBILE) {
            await S('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
            await S('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36' });
            await S('Emulation.setCPUThrottlingRate', { rate: 4 });
            // Lighthouse mobil: 150 ms RTT, 1.6 Mbit/s ↓, 750 Kbit/s ↑
            await S('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
        } else {
            await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        }
        await S('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER });
        if (PROFILE) { await S('Profiler.enable'); await S('Profiler.setSamplingInterval', { interval: 500 }); await S('Profiler.start'); }
        const t0 = Date.now();
        await S('Page.navigate', { url: URL_ });
        while (!loaded && Date.now() - t0 < 90000) await sleep(100);
        const loadMs = Date.now() - t0;
        await sleep(SETTLE_MS);
        if (PROFILE) {
            const { profile } = await S('Profiler.stop');
            const dt = new Map(); // node id -> vaqt (ms)
            const deltas = profile.timeDeltas || [];
            (profile.samples || []).forEach((id, i) => dt.set(id, (dt.get(id) || 0) + (deltas[i] || 0) / 1000));
            const agg = {};
            for (const n of profile.nodes) {
                const t = dt.get(n.id) || 0; if (!t) continue;
                const cf = n.callFrame; const key = `${cf.functionName || '(anon)'} @ ${(cf.url || '').replace(/^https?:\/\//, '').slice(0, 60)}:${cf.lineNumber}`;
                agg[key] = (agg[key] || 0) + t;
            }
            console.log('  CPU self-time TOP:'); Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`    ${Math.round(v)}ms  ${k}`));
        }
        const { result } = await S('Runtime.evaluate', { expression: 'JSON.stringify(window.__perf)', returnByValue: true });
        const { result: pageInfo } = await S('Runtime.evaluate', { expression: 'document.title + " | body=" + document.body.innerText.length', returnByValue: true });
        const P = JSON.parse(result.value || '{}');
        const fcp = P.fcp ?? 0;
        const lts = (P.lt || []).sort((a, b) => b.dur - a.dur);
        const tbt = (P.lt || []).filter(l => l.start >= fcp).reduce((sum, l) => sum + Math.max(0, l.dur - 50), 0);
        const byHost = {};
        let total = 0;
        for (const b of Object.values(bytes)) { let h = 'other'; try { h = new URL(b.url).host; } catch {} byHost[h] = (byHost[h] || 0) + b.len; total += b.len; }
        c.ws.close();
        if (PATCHES.length && !patched) console.warn("  ⚠️ --patch: hech bir chunk o'zgartirilmadi");
        if (errors.length) console.log(`  JS xatolar (${errors.length}): ${errors.slice(0, 2).join(' || ')}`);
        const r = { run: n, loadMs, patched, errors: errors.length, page: pageInfo.value, fcp: P.fcp, lcp: P.lcp, lcpEl: P.lcpEl, lcpUrl: P.lcpUrl, maxLongTask: lts[0]?.dur || 0, tbt, longTasks: lts.slice(0, 5),
            totalKB: Math.round(total / 1024), byHostKB: Object.fromEntries(Object.entries(byHost).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([h, v]) => [h, Math.round(v / 1024)])) };
        console.log(`  sahifa: ${pageInfo.value}`);
        console.log(`#${n} maxLT=${r.maxLongTask}ms TBT=${r.tbt}ms FCP=${r.fcp} LCP=${r.lcp} (${r.lcpEl} ${String(r.lcpUrl || '').slice(-60)}) ${r.totalKB}KB load=${loadMs}ms`);
        return r;
    } finally {
        chrome.kill();
        await sleep(800);
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    }
}

const runs = [];
console.log(`${URL_} — ${MOBILE ? 'MOBIL 390x844, CPU 4x, 4G' : 'KOMPYUTER 1440x900'}${BLOCK.length ? ' — blok: ' + BLOCK.join(', ') : ''}`);
for (let i = 1; i <= RUNS; i++) runs.push(await runOnce(i));
const summary = {
    url: URL_, mobile: MOBILE, block: BLOCK, runs: RUNS,
    maxLongTask: median(runs.map(r => r.maxLongTask)), tbt: median(runs.map(r => r.tbt)),
    fcp: median(runs.map(r => r.fcp || 0)), lcp: median(runs.map(r => r.lcp || 0)), totalKB: median(runs.map(r => r.totalKB)),
};
console.log('MEDIANA:', JSON.stringify(summary));
if (OUT) {
    const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
    prev.push({ at: new Date().toISOString(), summary, runs });
    fs.writeFileSync(OUT, JSON.stringify(prev, null, 1));
}
