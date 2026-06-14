import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive_ce.dart';

// Current Selected Locale Provider (persistent via Hive)
class LocaleNotifier extends StateNotifier<String> {
  final Box _settingsBox;

  LocaleNotifier(this._settingsBox) : super(_settingsBox.get('locale', defaultValue: 'uz'));

  Future<void> setLocale(String localeCode) async {
    if (localeCode == 'uz' || localeCode == 'ru') {
      state = localeCode;
      await _settingsBox.put('locale', localeCode);
    }
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, String>((ref) {
  final box = Hive.box('settings');
  return LocaleNotifier(box);
});

class AppLocalization {
  final String locale;

  AppLocalization(this.locale);

  static final Map<String, dynamic> _localizedValues = {
    'uz': {
      'nav': {
        'home': 'Asosiy',
        'reels': 'Reels',
        'wishlist': 'Saralangan',
        'cart': 'Savat',
        'profile': 'Profil',
        'messages': 'Xabarlar'
      },
      'common': {
        'search': 'Qidirish...',
        'categories': 'Kategoriyalar',
        'all': 'Hammasi',
        'addToCart': "Savatga qo'shish",
        'buyNow': 'Sotib olish',
        'outOfStock': "Sotuvda yo'q",
        'price': 'Narxi',
        'delivery': 'Yetkazib berish',
        'description': 'Tavsif',
        'characteristics': 'Xususiyatlari',
        'reviews': 'Sharhlar',
        'noProducts': 'Mahsulotlar topilmadi',
        'loading': 'Yuklanmoqda...',
        'error': 'Xatolik yuz berdi',
        'confirm': 'Tasdiqlash',
        'cancel': 'Bekor qilish',
        'address': 'Manzil',
        'phone': 'Telefon',
        'orderSummary': 'Buyurtma hisobi',
        'total': 'Jami',
        'checkout': 'Buyurtma berish',
        'save': 'Saqlash',
        'edit': 'Tahrirlash',
        'delete': "O'chirish",
        'original': 'Original',
        'tomorrow': 'Ertaga',
        'justNow': 'Hozirgina',
        'new': 'Yangi',
        'homeTitle': "Velari — O'zbekistondagi premium internet-do'kon. Gadjetlar, smartfonlar va aksessuarlar",
        'notEnoughStock': "Ayrim mahsulotlar qoldig'i yetarli emas",
        'onlyLeft': 'Faqat {count} ta qolgan',
        'editCart': 'Savatni tahrirlash',
        'selectOnMap': 'Kartadan tanlash',
        'addressPlaceholder': 'Toshkent sh., Yunusobod tumani...',
        'promoQuestion': 'Promo kod bormi?',
        'promoPlaceholder': 'PROMOKODINGIZNI KIRITING',
        'apply': "Qo'llash",
        'payFromWallet': 'Hamyondan toʻlash',
        'availableBalance': 'Mavjud: {balance} soʻm',
        'walletUsageHint': '- {amount} soʻm kashbek ishlatiladi',
        'products': 'Mahsulotlar',
        'sending': 'Yuborilmoqda...',
        'goToPayment': "To'lovga o'tish",
        'promoApplied': 'Promo kod qoʻllanildi!',
        'statusPendingPayment': 'Toʻlov kutilmoqda',
        'profileInfo': 'Profil maʼlumotlari',
        'myOrders': 'Mening buyurtmalarim',
        'logoutSystem': 'Tizimdan chiqish',
        'users': 'Foydalanuvchilar',
        'noUserFound': 'Hech kim topilmadi',
        'supportService': 'Qoʻllab-quvvatlash xizmati',
        'clickToContact': 'Admin bilan bogʻlanish uchun bosing',
        'startConversation': 'Suhbatni boshlash',
        'orderId': 'Buyurtma ID',
        'details': 'Batafsil',
        'orderDetail': 'Buyurtma Tafsiloti',
        'unit': 'dona',
        'inMarket': 'Marketda',
        'review': 'Sharh',
        'status': 'Holati',
        'addressNotSet': 'Manzil koʻrsatilmagan',
        'cancelOrder': 'Buyurtmani bekor qilish',
        'leaveReviewTitle': 'Sharh qoldirish',
        'yourOpinion': 'Fikringiz',
        'productOpinionPlaceholder': 'Mahsulot haqida nima deysiz?',
        'photo': 'Rasm',
        'video': 'Video',
        'send': 'Yuborish',
        'noOrders': 'Sizda hali buyurtmalar yoʻq',
        'loginToSeeOrders': 'Buyurtmalarni koʻrish uchun tizimga kiring',
        'cancelConfirmTitle': 'Buyurtmani bekor qilish',
        'cancelConfirmText': 'Haqiqatan ham ushbu buyurtmani bekor qilmoqchimisiz? Bu amalni ortga qaytarib boʻlmaydi.',
        'back': 'Orqaga',
        'reviewSaved': 'Sharh muvaffaqiyatli saqlandi!',
        'mediaUploading': 'Media yuklanmoqda, iltimos kuting...',
        'usernameRequired': 'Sharh qoldirish uchun profil sozlangan boʻlishi kerak (username kiritilmagan)',
        'statusCancelled': 'Bekor qilingan',
        'statusDelivered': 'Yetkazildi',
        'statusPaid': 'Toʻlandi',
        'loginToSeeWishlist': 'Saralanganlarni koʻrish uchun tizimga kiring',
        'nothingHereYet': 'Hozircha hech narsa yoʻq',
        'viewProducts': 'Mahsulotlarni koʻrish'
      },
      'cart': {
        'empty': 'Savatingiz boʻsh',
        'title': 'Savat',
        'items': 'ta mahsulot',
        'clear': 'Savatni tozalash',
        'orderSummary': 'Buyurtma xulosasi',
        'productCount': 'Mahsulotlar soni',
        'delivery': 'Yetkazib berish',
        'free': 'Bepul',
        'startShopping': 'Xaridni boshlash',
        'product': 'Mahsulot',
        'quantity': 'Soni',
        'price': 'Narxi',
        'remove': 'Oʻchirish'
      },
      'account': {
        'title': 'Mening profilim',
        'orders': 'Buyurtmalarim',
        'logout': 'Chiqish',
        'login': 'Kirish',
        'name': 'Ism',
        'phone': 'Telefon raqami',
        'history': 'Xaridlar tarixi',
        'sections': {
          'shopping': 'Xarid qilish',
          'benefits': 'Foyda',
          'settings': 'Sozlamalar',
          'others': 'Boshqalar',
          'purchased': 'Sotib olinganlar',
          'returns': 'Qaytish',
          'promoCodes': 'Promokodlar',
          'reviews': 'Sharhlar va savollar',
          'language': 'Tilni tanlash',
          'support': 'Yordam markazi'
        },
        'myInfo': 'Mening maʼlumotlarim'
      },
      'wallet': {
        'title': 'Keshbek hamyoni',
        'balance': 'Keshbek balansi',
        'pending': 'Kutilmoqda',
        'user': 'Foydalanuvchi',
        'transfer': 'Hamyonlararo oʻtkazma',
        'transferHint': '2FA Telegram orqali himoyalangan',
        'history': 'AMALLAR TARIXI',
        'noTx': 'Hozircha tranzaksiyalar yoʻq',
        'modalTitle': 'Oʻtkazma',
        'modal2fa': '2FA Tasdiqlash',
        'phoneLabel': 'Qabul qiluvchi telefoni',
        'phonePlaceholder': 'Telefon raqami (masalan: 998901234567)...',
        'amountLabel': 'Oʻtkazma summasi',
        'amountPlaceholder': 'Summa (soʻm)...',
        'isGift': 'Sovgʻa sifatida yuborish',
        'continue': 'Davom etish',
        'confirm': 'Tasdiqlash',
        'otpPlaceholder': 'Telegram botdan kelgan kod...',
        'minAmountError': 'Minimal oʻtkazma: 1 000 soʻm',
        'otpHint': 'Kodni Telegram botimizdan oldingiz',
        'success': 'Oʻtkazma muvaffaqiyatli yakunlandi!'
      },
      'affiliate': {
        'title': 'Hamkorlik kabineti',
        'dashboard': 'Dashboard',
        'products': 'Mahsulotlar',
        'promos': 'Promo kodlar',
        'links': 'Havolalar',
        'clicks': 'Jami bosishlar',
        'conversions': 'Konversiyalar',
        'commission': 'Komissiya balansi',
        'convRate': 'Konversiya %',
        'activeLinks': 'Havolalar roʻyxati',
        'activePromos': 'Mening promo-kodlarim',
        'generateLink': 'Havola yaratish',
        'generateLinkBtn': 'Yaratish',
        'productSearchPlaceholder': 'Mahsulot qidirish...',
        'copied': 'Havola buferga nusxalandi!'
      },
      'reels': {
        'title': 'Reels',
        'comments': 'Sharhlar',
        'writeComment': 'Sharh qoldiring...',
        'noComments': 'Hozircha sharhlar yoʻq',
        'share': 'Ulashish',
        'like': 'Yoqtirish'
      },
      'product': {
        'original': 'Original Sifat',
        'newProduct': 'Yangi mahsulot',
        'reviews': 'Sharhlar',
        'questions': 'Savollar',
        'color': 'Rang',
        'notSelected': 'Tanlanmagan',
        'stock': 'Qoldiq',
        'available': 'ta vaqt',
        'fast': 'Tezkor',
        'description': 'Mahsulot tavsifi',
        'fullDescription': 'Toʻliq tavsif',
        'leaveReview': 'Sharh qoldiring...',
        'leaveQuestion': 'Savolingizni bering...',
        'rating': 'Baholang:',
        'reply': 'Javob berish',
        'edit': 'Tahrirlash',
        'delete': 'Oʻchirish',
        'save': 'Saqlash',
        'cancel': 'Bekor qilish',
        'showAll': 'Barchasini koʻrish',
        'hide': 'Yopish',
        'seeReplies': 'Javoblarni koʻrish',
        'hideReplies': 'Javoblarni yashirish',
        'mayLike': 'Sizga yoqishi mumkin',
        'boughtTogether': 'Birga sotib olishdi',
        'popular': 'Ommabop mahsulotlar',
        'bestsellers': 'Eng koʻp sotilyotganlar',
        'addToCart': 'SAVATGA QOʻSHISH',
        'gotoCart': 'OʻTISH'
      }
    },
    'ru': {
      'nav': {
        'home': 'Главная',
        'reels': 'Reels',
        'wishlist': 'Избранное',
        'cart': 'Корзина',
        'profile': 'Профиль',
        'messages': 'Сообщения'
      },
      'common': {
        'search': 'Поиск...',
        'categories': 'Категории',
        'all': 'Все',
        'addToCart': 'В корзину',
        'buyNow': 'Купить',
        'outOfStock': 'Нет в наличии',
        'price': 'Цена',
        'delivery': 'Доставка',
        'description': 'Описание',
        'characteristics': 'Характеристики',
        'reviews': 'Отзывы',
        'noProducts': 'Товары не найдены',
        'loading': 'Загрузка...',
        'error': 'Произошла ошибка',
        'confirm': 'Подтвердить',
        'cancel': 'Отмена',
        'address': 'Адрес',
        'phone': 'Телефон',
        'orderSummary': 'Итог заказа',
        'total': 'Итого',
        'checkout': 'Оформить заказ',
        'save': 'Сохранить',
        'edit': 'Изменить',
        'delete': 'Удалить',
        'original': 'Оригинал',
        'tomorrow': 'Завтра',
        'justNow': 'Только что',
        'new': 'Новый',
        'homeTitle': 'Velari — премиум интернет-магазин в Узбекистане. Гаджеты, смартфоны и аксессуары',
        'notEnoughStock': 'Недостаточное количество некоторых товаров',
        'onlyLeft': 'Осталось только {count} шт',
        'editCart': 'Редактировать корзину',
        'selectOnMap': 'Выбрать на карте',
        'addressPlaceholder': 'г. Ташкент, Юнусабадский район...',
        'promoQuestion': 'Есть промокод?',
        'promoPlaceholder': 'ВВЕДИТЕ ПРОМОКОД',
        'apply': 'ПРИМЕНИТЬ',
        'payFromWallet': 'Оплатить из кошелька',
        'availableBalance': 'Доступно: {balance} сум',
        'walletUsageHint': '- {amount} сум кэшбэка будет использовано',
        'products': 'Товары',
        'sending': 'Отправка...',
        'goToPayment': 'Перейти к оплате',
        'promoApplied': 'Промокод применен!',
        'statusPendingPayment': 'Ожидание оплаты',
        'profileInfo': 'Данные профиля',
        'myOrders': 'Мои заказы',
        'logoutSystem': 'Выйти из системы',
        'users': 'Пользователи',
        'noUserFound': 'Никто не найден',
        'supportService': 'Служба поддержки',
        'clickToContact': 'Нажмите, чтобы связаться с админом',
        'startConversation': 'Начать общение',
        'orderId': 'ID заказа',
        'details': 'Подробнее',
        'orderDetail': 'Детали заказа',
        'unit': 'шт',
        'inMarket': 'В маркет',
        'review': 'Отзыв',
        'status': 'Статус',
        'addressNotSet': 'Адрес не указан',
        'cancelOrder': 'Отменить заказ',
        'leaveReviewTitle': 'Оставить отзыв',
        'yourOpinion': 'Ваш отзыв',
        'productOpinionPlaceholder': 'Что вы думаете о товаре?',
        'photo': 'Фото',
        'video': 'Видео',
        'send': 'Отправить',
        'noOrders': 'У вас пока нет заказов',
        'loginToSeeOrders': 'Войдите в систему, чтобы просмотреть заказы',
        'cancelConfirmTitle': 'Отмена заказа',
        'cancelConfirmText': 'Вы действительно хотите отменить этот заказ? Это действие нельзя отменить.',
        'back': 'Назад',
        'reviewSaved': 'Отзыв успешно сохранен!',
        'mediaUploading': 'Медиа загружается, пожалуйста подождите...',
        'usernameRequired': 'Для того чтобы оставить комментарий должен быть настроен профиль (не введено имя пользователя)',
        'statusCancelled': 'Отменен',
        'statusDelivered': 'Доставлено',
        'statusPaid': 'Оплачено',
        'loginToSeeWishlist': 'Войдите в систему, чтобы увидеть избранное',
        'nothingHereYet': 'Пока ничего нет',
        'viewProducts': 'Посмотреть товары'
      },
      'cart': {
        'empty': 'Ваша корзина пуста',
        'title': 'Корзина',
        'items': 'товаров',
        'clear': 'Очистить корзину',
        'orderSummary': 'Итог заказа',
        'productCount': 'Количество товаров',
        'delivery': 'Доставка',
        'free': 'Бесплатно',
        'startShopping': 'Начать покупки',
        'product': 'Товар',
        'quantity': 'Кол-во',
        'price': 'Цена',
        'remove': 'Удалить'
      },
      'account': {
        'title': 'Мой профиль',
        'orders': 'Мои заказы',
        'logout': 'Выйти',
        'login': 'Войти',
        'name': 'Имя',
        'phone': 'Номер телефона',
        'history': 'История покупок',
        'sections': {
          'shopping': 'Покупки',
          'benefits': 'Выгода',
          'settings': 'Настройки',
          'others': 'Прочее',
          'purchased': 'Купленные товары',
          'returns': 'Возвраты',
          'promoCodes': 'Промокоды',
          'reviews': 'Отзывы и вопросы',
          'language': 'Выбор языка',
          'support': 'Служба поддержки'
        },
        'myInfo': 'Мои данные'
      },
      'wallet': {
        'title': 'Кэшбэк кошелёк',
        'balance': 'Кэшбэк баланс',
        'pending': 'Ожидается',
        'user': 'Пользователь',
        'transfer': 'Перевод между кошельками',
        'transferHint': 'Защита через 2FA Telegram',
        'history': 'ИСТОРИЯ ОПЕРАЦИЙ',
        'noTx': 'Транзакций пока нет',
        'modalTitle': 'Перевод',
        'modal2fa': '2FA Подтверждение',
        'phoneLabel': 'Телефон получателя',
        'phonePlaceholder': 'Номер телефона (например: 998901234567)...',
        'amountLabel': 'Сумма перевода',
        'amountPlaceholder': 'Сумма (сум)...',
        'isGift': 'Отправить как подарок',
        'continue': 'Продолжить',
        'confirm': 'Подтвердить',
        'otpPlaceholder': 'Код из Telegram...',
        'minAmountError': 'Минимум: 1 000 сум',
        'otpHint': 'Код получен в Telegram боте',
        'success': 'Перевод успешно выполнен!'
      },
      'affiliate': {
        'title': 'Партнёрский кабинет',
        'dashboard': 'Панель управления',
        'products': 'Товары',
        'promos': 'Промокоды',
        'links': 'Ссылки',
        'clicks': 'Всего кликов',
        'conversions': 'Конверсии',
        'commission': 'Баланс комиссии',
        'convRate': 'Конверсия %',
        'activeLinks': 'Список ссылок',
        'activePromos': 'Мои промокоды',
        'generateLink': 'Создать ссылку',
        'generateLinkBtn': 'Создать',
        'productSearchPlaceholder': 'Поиск товара...',
        'copied': 'Ссылка скопирована в буфер!'
      },
      'reels': {
        'title': 'Reels',
        'comments': 'Комментарии',
        'writeComment': 'Оставить комментарий...',
        'noComments': 'Пока нет комментариев',
        'share': 'Поделиться',
        'like': 'Нравится'
      },
      'product': {
        'original': 'Оригинальное качество',
        'newProduct': 'Новый товар',
        'reviews': 'Отзывы',
        'questions': 'Вопросы',
        'color': 'Цвет',
        'notSelected': 'Не выбран',
        'stock': 'В наличии',
        'available': 'шт',
        'fast': 'Быстро',
        'description': 'Описание товара',
        'fullDescription': 'Полное описание',
        'leaveReview': 'Оставить отзыв...',
        'leaveQuestion': 'Задать вопрос...',
        'rating': 'Оцените:',
        'reply': 'Ответить',
        'edit': 'Изменить',
        'delete': 'Удалить',
        'save': 'Сохранить',
        'cancel': 'Отмена',
        'showAll': 'Посмотреть все',
        'hide': 'Скрыть',
        'seeReplies': 'Посмотреть ответы',
        'hideReplies': 'Скрыть ответы',
        'mayLike': 'Вам может понравиться',
        'boughtTogether': 'С этим товаром покупают',
        'popular': 'Популярные товары',
        'bestsellers': 'Бестселлеры',
        'addToCart': 'В КОРЗИНУ',
        'gotoCart': 'ПЕРЕЙТИ'
      }
    }
  };

  String translate(String key, {Map<String, String>? args}) {
    final parts = key.split('.');
    dynamic current = _localizedValues[locale];
    for (final part in parts) {
      if (current is Map && current.containsKey(part)) {
        current = current[part];
      } else {
        // Fallback checks for legacy flat keys
        final direct = _localizedValues[locale]?[key];
        if (direct != null) {
          return _replaceArgs(direct.toString(), args);
        }
        
        if (key == 'nav_home') return _replaceArgs(_localizedValues[locale]?['nav']?['home'] ?? key, args);
        if (key == 'nav_cart') return _replaceArgs(_localizedValues[locale]?['nav']?['cart'] ?? key, args);
        if (key == 'nav_reels') return _replaceArgs(_localizedValues[locale]?['nav']?['reels'] ?? key, args);
        if (key == 'nav_wishlist') return _replaceArgs(_localizedValues[locale]?['nav']?['wishlist'] ?? key, args);
        if (key == 'nav_profile') return _replaceArgs(_localizedValues[locale]?['nav']?['profile'] ?? key, args);
        if (key == 'empty_cart') return _replaceArgs(_localizedValues[locale]?['cart']?['empty'] ?? key, args);
        if (key == 'settings_lang') return _replaceArgs(_localizedValues[locale]?['account']?['sections']?['language'] ?? key, args);
        return _replaceArgs(key, args);
      }
    }
    return _replaceArgs(current?.toString() ?? key, args);
  }

  String _replaceArgs(String text, Map<String, String>? args) {
    if (args == null || args.isEmpty) return text;
    String result = text;
    args.forEach((key, value) {
      result = result.replaceAll('{$key}', value);
    });
    return result;
  }
}

extension LocalizationExtension on BuildContext {
  String tr(String key, WidgetRef ref, {Map<String, String>? args}) {
    final locale = ref.watch(localeProvider);
    return AppLocalization(locale).translate(key, args: args);
  }
}
