'use strict';

const crypto = require('crypto');

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), s, 64).toString('hex');
  return s + ':' + hash;
}

module.exports = function defaults() {
  return {
    siteName: 'ONIKA',
    tagline: 'Одяг із характером',
    heroTitle: 'Нова колекція вже тут',
    heroSubtitle:
      'Жіночий та дитячий одяг, взуття, білизна і аксесуари від улюблених брендів. Оригінальні речі за чесними цінами.',
    announcement:
      'Безкоштовна доставка від 5000 ₴ · Відправка Новою поштою щодня · Оригінал 100%',
    translations: {
      ru: {
        tagline: 'Одежда с характером',
        heroTitle: 'Новая коллекция уже здесь',
        heroSubtitle:
          'Женская и детская одежда, обувь, бельё и аксессуары от любимых брендов. Оригинальные вещи по честным ценам.',
        announcement:
          'Бесплатная доставка от 5000 ₴ · Отправка Новой почтой ежедневно · Оригинал 100%',
      },
      en: {
        tagline: 'Clothing with character',
        heroTitle: 'The new collection is here',
        heroSubtitle:
          "Women's and kids' clothing, shoes, lingerie and accessories from your favourite brands. Original items at fair prices.",
        announcement:
          'Free shipping from ₴5000 · Nova Poshta shipping daily · 100% original',
      },
    },
    phone: '+380 (67) 000-00-00',
    email: 'hello@onika.shop',
    address: 'м. Київ, вул. Хрещатик, 1',
    instagram: 'https://instagram.com/',
    telegram: 'https://t.me/',
    viber: '',
    freeShippingFrom: 5000,
    currency: '₴',
    adminUser: 'admin',
    adminPass: hashPassword('onika2024'),
    mustChangePassword: true,
  };
};

module.exports.hashPassword = hashPassword;
