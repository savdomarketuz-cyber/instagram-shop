const UzumClient = require('./client');

const CATEGORIES_QUERY = `query MakeSearch_Categories($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    categoryTree {
      category {
        id
        title
        title_ru
        title_uz
        adult
        icon
        parent {
          id
        }
      }
      total
    }
    fastCategories {
      category {
        id
        title
      }
      total
    }
  }
}`;

class UzumCategory {
  constructor(client = new UzumClient()) {
    this.client = client;
  }

  /**
   * Kategoriya daraxtini olish (qidiruv so'zi yoki bo'sh so'rov bo'yicha)
   * @param {string} text - Qidiruv so'zi (default: '')
   * @param {string} lang - 'uz-UZ' yoki 'ru-RU'
   */
  async getCategoryTree(text = '', lang = 'uz-UZ') {
    const variables = {
      queryInput: {
        text,
        showAdultContent: 'TRUE',
        filters: [],
        sort: 'BY_RELEVANCE_DESC',
        pagination: {
          offset: 0,
          limit: 10
        },
        correctQuery: true,
        getFastCategories: true,
        fastCategoriesLimit: 20,
        fastCategoriesLevelOffset: 2,
        getPromotionItems: false,
        getFastFacets: false,
        fastFacetsLimit: 0
      }
    };

    const res = await this.client.graphql('MakeSearch_Categories', CATEGORIES_QUERY, variables, lang);
    const search = res.data?.makeSearch;

    if (!search) {
      return { categories: [], fastCategories: [], error: res.errors || null };
    }

    const categories = (search.categoryTree || []).map(c => ({
      id: c.category.id,
      title: lang === 'uz-UZ' ? (c.category.title_uz || c.category.title) : (c.category.title_ru || c.category.title),
      title_uz: c.category.title_uz,
      title_ru: c.category.title_ru,
      parentId: c.category.parent?.id || null,
      isAdult: c.category.adult,
      icon: c.category.icon,
      totalProducts: c.total
    }));

    const fastCategories = (search.fastCategories || []).map(f => ({
      id: f.category.id,
      title: f.category.title,
      total: f.total
    }));

    return {
      categories,
      fastCategories
    };
  }

  /**
   * Toifa ID raqami bo'yicha mahsulotlarni qidirish / ro'yxatini olish
   */
  async getProductsByCategory(categoryId, options = {}) {
    const {
      offset = 0,
      limit = 24,
      sort = 'BY_RELEVANCE_DESC',
      lang = 'uz-UZ'
    } = options;

    const query = `query MakeSearch_CategoryItems($queryInput: MakeSearchQueryInput!) {
      makeSearch(query: $queryInput) {
        total
        items {
          catalogCard {
            id
            productId
            title
            photos {
              link(trans: PRODUCT_540) {
                high
                low
              }
            }
            rating
            feedbackQuantity
            minSellPrice
            minFullPrice
          }
        }
      }
    }`;

    const variables = {
      queryInput: {
        text: '',
        categoryId: Number(categoryId),
        showAdultContent: 'TRUE',
        filters: [],
        sort,
        pagination: { offset, limit }
      }
    };

    const res = await this.client.graphql('MakeSearch_CategoryItems', query, variables, lang);
    const data = res.data?.makeSearch;

    return {
      categoryId,
      total: data?.total || 0,
      items: (data?.items || []).map(i => ({
        id: i.catalogCard.id,
        productId: i.catalogCard.productId,
        title: i.catalogCard.title,
        price: i.catalogCard.minSellPrice ? Number(i.catalogCard.minSellPrice) : null,
        fullPrice: i.catalogCard.minFullPrice ? Number(i.catalogCard.minFullPrice) : null,
        rating: i.catalogCard.rating,
        feedbackCount: i.catalogCard.feedbackQuantity,
        images: (i.catalogCard.photos || []).map(p => p.link?.high || p.link?.low).filter(Boolean),
        url: `https://uzum.uz/${lang === 'uz-UZ' ? 'uz' : 'ru'}/product/${i.catalogCard.productId}`
      }))
    };
  }
}

module.exports = UzumCategory;
