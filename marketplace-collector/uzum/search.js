const UzumClient = require('./client');

const SEARCH_QUERY = `query MakeSearch_ItemsAndFilters($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    queryText
    total
    mayHaveAdultContent
    categoryFullMatch
    items {
      catalogCard {
        id
        productId
        title
        adult
        photos {
          key
          link(trans: PRODUCT_540) {
            high
            low
          }
        }
        feedbackQuantity
        rating
        discount {
          discountPrice
        }
        minFullPrice
        minSellPrice
        buyingOptions {
          isBestPrice
          defaultSkuId
          isSingleSku
        }
      }
    }
    facets {
      filter {
        id
        title
        type
        measurementUnit
      }
      buckets {
        filterValue {
          id
          name
        }
        total
      }
      range {
        min
        max
      }
    }
  }
}`;

class UzumSearch {
  constructor(client = new UzumClient()) {
    this.client = client;
  }

  /**
   * Mahsulotlarni qidirish
   * @param {string} text - Qidiruv so'zi
   * @param {object} options - Qo'shimcha parametrlar: offset, limit, sort, lang, filters
   */
  async search(text, options = {}) {
    const {
      offset = 0,
      limit = 24,
      sort = 'BY_RELEVANCE_DESC',
      lang = 'uz-UZ',
      filters = []
    } = options;

    const variables = {
      queryInput: {
        text,
        showAdultContent: 'TRUE',
        filters,
        sort,
        pagination: {
          offset,
          limit
        },
        correctQuery: true
      }
    };

    const res = await this.client.graphql('MakeSearch_ItemsAndFilters', SEARCH_QUERY, variables, lang);
    const searchData = res.data?.makeSearch;

    if (!searchData) {
      return {
        query: text,
        total: 0,
        items: [],
        facets: [],
        error: res.errors || res.error || null
      };
    }

    const items = (searchData.items || []).map(item => {
      const card = item.catalogCard || {};
      return {
        id: card.id,
        productId: card.productId,
        title: card.title,
        price: card.minSellPrice ? Number(card.minSellPrice) : null,
        fullPrice: card.minFullPrice ? Number(card.minFullPrice) : null,
        rating: card.rating,
        feedbackCount: card.feedbackQuantity,
        images: (card.photos || []).map(p => p.link?.high || p.link?.low).filter(Boolean),
        isAdult: card.adult,
        url: `https://uzum.uz/${lang === 'uz-UZ' ? 'uz' : 'ru'}/product/${card.productId}`
      };
    });

    return {
      query: text,
      total: searchData.total || items.length,
      count: items.length,
      items,
      facets: searchData.facets || []
    };
  }

  /**
   * Bir vaqtning o'zida ikkala tilda (O'zbek va Rus) qidirish
   */
  async searchBilingual(text, options = {}) {
    const [uzRes, ruRes] = await Promise.all([
      this.search(text, { ...options, lang: 'uz-UZ' }),
      this.search(text, { ...options, lang: 'ru-RU' })
    ]);

    return {
      query: text,
      uz: uzRes,
      ru: ruRes
    };
  }
}

module.exports = UzumSearch;
