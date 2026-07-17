// Добавьте в класс Database:

async getLatestNews(limit = 20) {
  try {
    // Получаем все ключи новостей
    const keys = await this.kv.list({ prefix: 'news_' });
    const newsItems = [];
    
    for (const key of keys.keys) {
      const value = await this.kv.get(key.name);
      if (value) {
        newsItems.push(JSON.parse(value));
      }
    }
    
    // Сортируем по дате и берем последние
    newsItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return newsItems.slice(0, limit);
  } catch (error) {
    console.error('Get latest news error:', error);
    return [];
  }
}

async getExclusiveNews(limit = 10) {
  // Для эксклюзива можно использовать те же новости, но с меткой exclusive
  const news = await this.getLatestNews(limit);
  return news.map(item => ({
    ...item,
    source: `⭐ ${item.source}`
  }));
}
