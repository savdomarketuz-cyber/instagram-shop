const https = require('https');
const http = require('http');
const config = require('../config');

class UzumClient {
  constructor(options = {}) {
    this.token = options.token || config.uzum.token;
    this.xiid = options.xiid || config.uzum.xiid;
    this.graphqlUrl = options.graphqlUrl || config.uzum.graphqlUrl;
    this.apiUrl = options.apiUrl || config.uzum.apiUrl;
    this.cityId = options.cityId || config.uzum.defaultCityId;
    this.userAgent = options.userAgent || config.uzum.userAgent;
  }

  /**
   * GraphQL so'rovlarini bajarish
   */
  async graphql(operationName, query, variables = {}, lang = 'uz-UZ') {
    const payload = JSON.stringify({
      operationName,
      query,
      variables
    });

    const headers = {
      'content-type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': lang,
      'User-Agent': this.userAgent,
      'authorization': `Bearer ${this.token}`,
      'x-iid': this.xiid,
      'apollographql-client-name': config.uzum.clientName,
      'apollographql-client-version': config.uzum.clientVersion,
      'city-id': this.cityId,
      'Origin': 'https://uzum.uz',
      'Referer': 'https://uzum.uz/'
    };

    return new Promise((resolve, reject) => {
      const req = https.request(this.graphqlUrl, {
        method: 'POST',
        headers
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.errors && json.errors.length > 0) {
              resolve({ data: json.data || null, errors: json.errors, statusCode: res.statusCode });
            } else {
              resolve({ data: json.data || null, statusCode: res.statusCode });
            }
          } catch (err) {
            resolve({ error: err.message, raw: data, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * REST API so'rovlarini bajarish (api.uzum.uz)
   */
  async restGet(endpoint, params = {}, lang = 'uz-UZ') {
    const urlObj = new URL(endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint.replace(/^\//, '')}`);
    Object.keys(params).forEach(k => urlObj.searchParams.append(k, params[k]));

    const headers = {
      'Accept': 'application/json',
      'Accept-Language': lang,
      'User-Agent': this.userAgent,
      'authorization': `Bearer ${this.token}`,
      'x-iid': this.xiid,
      'Origin': 'https://uzum.uz',
      'Referer': 'https://uzum.uz/'
    };

    return new Promise((resolve, reject) => {
      const client = urlObj.protocol === 'https:' ? https : http;
      client.get(urlObj.toString(), { headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data, statusCode: res.statusCode });
          }
        });
      }).on('error', reject);
    });
  }
}

module.exports = UzumClient;
