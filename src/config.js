export const CONFIG = {
  sources: [
    'cointelegraph',
    'decrypt',
    'bitcoinmagazine',
    'coindesk',
    'cryptoslate',
    'newsbitcoin'
  ],
  maxNewsPerSource: 5,
  maxTranslationsPerDay: 100000,
  maxCharsPerTranslation: 5000,
  updateInterval: 15,
  cacheDuration: 300,
  maxRetries: 3,
  retryDelay: 1000,
  maxNewsAge: 7,
  calendarEventsCount: 50,
  enableTranslation: true,
  defaultLanguage: 'ru',
  sourceLanguage: 'en'
};

export const CHANNELS = {
  news: '-1004345602790',
  altcoins: '-1004345602790',
  calendar: '-1004345602790'
};

export const TELEGRAM = {
  apiUrl: 'https://api.telegram.org/bot',
  maxMessageLength: 4096,
  parseMode: 'HTML',
  disableWebPagePreview: true
};
