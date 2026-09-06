const UzumClient = require('./client');

class UzumCities {
  constructor(client = new UzumClient()) {
    this.client = client;
  }

  /**
   * Koordinatalar (lat, lon) bo'yicha shahar ma'lumotlarini olish
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {string} lang - 'uz-UZ' yoki 'ru-RU'
   */
  async getCityByLocation(latitude = 41.379112, longitude = 69.29944, lang = 'uz-UZ') {
    const payload = {
      id: 1,
      pickTime: new Date().toISOString(),
      latitude,
      longitude
    };

    return new Promise((resolve, reject) => {
      const https = require('https');
      const req = https.request('https://api.uzum.uz/api/main/cities/city-by-location', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Accept': 'application/json',
          'Accept-Language': lang,
          'User-Agent': this.client.userAgent,
          'authorization': `Bearer ${this.client.token}`,
          'x-iid': this.client.xiid,
          'Origin': 'https://uzum.uz',
          'Referer': 'https://uzum.uz/'
        }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  /**
   * Faol topshirish punktlarini (PVZ) olish
   * @param {string} lang 
   */
  async getActiveDeliveryPoints(lang = 'uz-UZ') {
    return this.client.restGet('main/cities/active-delivery-points', {}, lang);
  }
}

module.exports = UzumCities;
