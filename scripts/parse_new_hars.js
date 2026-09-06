const fs = require('fs');

function analyzeHar(filePath, name) {
  console.log(`\n======================================================`);
  console.log(`=== ANALYZING ${name}: ${filePath} ===`);
  console.log(`======================================================`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const entries = data.log.entries;
  console.log('Total HTTP entries in log:', entries.length);

  const apis = [];

  entries.forEach((e) => {
    const url = e.request.url;
    // Filter out static assets
    if (/\.(js|css|png|jpg|jpeg|webp|gif|svg|woff2?|ttf|ico)(\?.*)?$/i.test(url)) {
      return;
    }
    // Filter out third-party analytics / tracking
    if (url.includes('google') || url.includes('yandex') || url.includes('sentry') || url.includes('facebook') || url.includes('clarity')) {
      return;
    }

    let postJson = null;
    if (e.request.postData && e.request.postData.text) {
      try {
        postJson = JSON.parse(e.request.postData.text);
      } catch(err) {
        postJson = e.request.postData.text;
      }
    }

    apis.push({
      method: e.request.method,
      url: e.request.url,
      status: e.response.status,
      headers: e.request.headers.filter(h => !['host', 'connection', 'accept-encoding', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site'].includes(h.name.toLowerCase())),
      postData: postJson,
      responseSnippet: e.response.content?.text ? e.response.content.text.slice(0, 300) : ''
    });
  });

  console.log(`Discovered ${apis.length} relevant API / Network requests.`);

  apis.forEach((api, idx) => {
    console.log(`\n--- [${idx + 1}] ${api.method} ${api.url} (Status: ${api.status}) ---`);
    if (api.postData?.operationName) {
      console.log(`GraphQL Operation: ${api.postData.operationName}`);
    }
    if (api.postData) {
      console.log('Request Payload:', JSON.stringify(api.postData, null, 2).slice(0, 400));
    }
    if (api.responseSnippet) {
      console.log('Response Snippet:', api.responseSnippet);
    }
  });

  return apis;
}

const uzumApis = analyzeHar('D:\\Desktop\\uzum', 'UZUM HAR');
const wbApis = analyzeHar('D:\\Desktop\\wildberries', 'WILDBERRIES HAR');
