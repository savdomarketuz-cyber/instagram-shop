/**
 * Marketplace Collector - Konfiguratsiya
 */

module.exports = {
  uzum: {
    graphqlUrl: 'https://graphql.uzum.uz/',
    apiUrl: 'https://api.uzum.uz/api/',
    token: "eyJraWQiOiIwcE9oTDBBVXlWSXF1V0w1U29NZTdzcVNhS2FqYzYzV1N5THZYb0ZhWXRNIiwiYWxnIjoiRWREU0EiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJVenVtIElEIiwiaWF0IjoxNzg4Njc2MTc3LCJzdWIiOiJmNTlhMDA4ZC02NjNkLTQ5Y2QtYTBjNC1lMTRlOWZjZDA0OGUiLCJhdWQiOlsidXp1bV9hcHBzIiwibWFya2V0L3dlYiJdLCJldmVudHMiOnt9LCJleHAiOjE3ODg2ODY5Nzd9.VWVY0W2SNnI414SKzaP26gYLTqkrZBhe9UFiZgFCC5WLbZ9hux0pV7nK0bo7R1TydElnCMRELd8LPq7t5q82BQ",
    xiid: 'b7b25dac-7e68-4ef5-a714-ba651a527a37',
    clientName: 'web-customers',
    clientVersion: '1.63.2',
    defaultCityId: '1', // Toshkent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  },
  wildberries: {
    searchUrl: 'https://search.wb.ru/exactmatch/ru/common/v7/search',
    catalogUrl: 'https://catalog.wb.ru/catalog',
    detailUrl: 'https://card.wb.ru/cards/v2/detail',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    defaultDest: '-1257786', // Toshkent / umumiy mintaqa dest kodi
    defaultCurr: 'rub' // rub, uzs
  }
};
