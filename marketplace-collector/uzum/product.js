const UzumClient = require('./client');

const PRODUCT_DETAIL_QUERY = `query GetProduct($id: Int!) {
  product(id: $id) {
    id
    title
    description
    rating
    feedbackQuantity
    ordersQuantity
    adult
    attributes
    category {
      id
      title
    }
    photos {
      key
      link(trans: PRODUCT_540) {
        high
        low
      }
    }
    skuList {
      id
      fullPrice
      sellPrice
      availableAmount
    }
  }
}`;

class UzumProduct {
  constructor(client = new UzumClient()) {
    this.client = client;
  }

  /**
   * Mahsulot ID bo'yicha to'liq ma'lumotlarni olish
   * @param {number|string} productId - Uzum mahsulot ID raqami
   * @param {string} lang - 'uz-UZ' yoki 'ru-RU'
   */
  async getDetails(productId, lang = 'uz-UZ') {
    const res = await this.client.graphql('GetProduct', PRODUCT_DETAIL_QUERY, { id: Number(productId) }, lang);
    const prod = res.data?.product;

    if (!prod) {
      return null;
    }

    let attributes = [];
    if (prod.attributes) {
      try {
        attributes = typeof prod.attributes === 'string' ? JSON.parse(prod.attributes) : prod.attributes;
      } catch (e) {
        attributes = prod.attributes;
      }
    }

    return {
      productId: prod.id,
      title: prod.title,
      description: prod.description,
      rating: prod.rating,
      feedbackCount: prod.feedbackQuantity,
      ordersCount: prod.ordersQuantity,
      isAdult: prod.adult,
      category: prod.category ? {
        id: prod.category.id,
        title: prod.category.title
      } : null,
      images: (prod.photos || []).map(p => p.link?.high || p.link?.low).filter(Boolean),
      attributes,
      skus: (prod.skuList || []).map(sku => ({
        skuId: sku.id,
        fullPrice: sku.fullPrice ? Number(sku.fullPrice) : null,
        sellPrice: sku.sellPrice ? Number(sku.sellPrice) : null,
        availableAmount: sku.availableAmount
      })),
      url: `https://uzum.uz/${lang === 'uz-UZ' ? 'uz' : 'ru'}/product/${productId}`
    };
  }
}

module.exports = UzumProduct;
