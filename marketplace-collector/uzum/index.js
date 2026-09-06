const UzumClient = require('./client');
const UzumSearch = require('./search');
const UzumProduct = require('./product');
const UzumCategory = require('./category');
const UzumCities = require('./cities');

class UzumSDK {
  constructor(options = {}) {
    this.client = new UzumClient(options);
    this.search = new UzumSearch(this.client);
    this.product = new UzumProduct(this.client);
    this.category = new UzumCategory(this.client);
    this.cities = new UzumCities(this.client);
  }

  /**
   * Tezkor qidiruv (Search helper)
   */
  async searchProducts(query, options = {}) {
    return this.search.search(query, options);
  }

  /**
   * Ikki tilda qidiruv (Bilingual search helper)
   */
  async searchBilingual(query, options = {}) {
    return this.search.searchBilingual(query, options);
  }

  /**
   * Mahsulot to'liq ma'lumotlarini olish
   */
  async getProduct(productId, lang = 'uz-UZ') {
    return this.product.getDetails(productId, lang);
  }

  /**
   * Kategoriya daraxti
   */
  async getCategories(text = '', lang = 'uz-UZ') {
    return this.category.getCategoryTree(text, lang);
  }
}

module.exports = {
  UzumSDK,
  UzumClient,
  UzumSearch,
  UzumProduct,
  UzumCategory,
  UzumCities,
  default: UzumSDK
};
