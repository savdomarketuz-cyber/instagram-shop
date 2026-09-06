const https = require('https');

const token = "eyJraWQiOiIwcE9oTDBBVXlWSXF1V0w1U29NZTdzcVNhS2FqYzYzV1N5THZYb0ZhWXRNIiwiYWxnIjoiRWREU0EiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJVenVtIElEIiwiaWF0IjoxNzg4Njc2MTc3LCJzdWIiOiJmNTlhMDA4ZC02NjNkLTQ5Y2QtYTBjNC1lMTRlOWZjZDA0OGUiLCJhdWQiOlsidXp1bV9hcHBzIiwibWFya2V0L3dlYiJdLCJldmVudHMiOnt9LCJleHAiOjE3ODg2ODY5Nzd9.VWVY0W2SNnI414SKzaP26gYLTqkrZBhe9UFiZgFCC5WLbZ9hux0pV7nK0bo7R1TydElnCMRELd8LPq7t5q82BQ";
const xiid = "b7b25dac-7e68-4ef5-a714-ba651a527a37";

const query = `query MakeSearch_ItemsAndFilters($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    items {
      catalogCard {
        productId
        title
      }
    }
  }
}`;

async function test(text, lang) {
  const payload = JSON.stringify({
    operationName: 'MakeSearch_ItemsAndFilters',
    query: query,
    variables: {
      queryInput: {
        text: text,
        showAdultContent: "TRUE",
        filters: [],
        sort: "BY_RELEVANCE_DESC",
        pagination: {
          offset: 0,
          limit: 10
        },
        correctQuery: true
      }
    }
  });

  return new Promise((resolve) => {
    const req = https.request('https://graphql.uzum.uz/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Accept-Language': lang,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0',
        'authorization': `Bearer ${token}`,
        'x-iid': xiid,
        'apollographql-client-name': 'web-customers',
        'apollographql-client-version': '1.63.2',
        'city-id': '1'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`[${lang}] for "${text}":`);
          const items = json.data?.makeSearch?.items?.map(i => i.catalogCard.title) || [];
          console.log(items.slice(0, 3));
          resolve(items);
        } catch(e) {
          console.log(`[${lang}] Error:`, data);
          resolve([]);
        }
      });
    });
    req.on('error', (e) => {
      console.log('Req error:', e);
      resolve([]);
    });
    req.write(payload);
    req.end();
  });
}

async function run() {
  await test('VGR V-107', 'uz-UZ');
  await test('VGR V-107', 'ru-RU');
  await test('VGR V-030', 'uz-UZ');
  await test('VGR V-030', 'ru-RU');
  await test('VGR V-227', 'uz-UZ');
  await test('VGR V-227', 'ru-RU');
}
run();
