export class Database {
  constructor(env) {
    this.env = env;
    this.kv = env.NEWS_DB;
  }
  
  async checkDuplicate(id) {
    try {
      const key = `news_${id}`;
      const exists = await this.kv.get(key);
      return !!exists;
    } catch (error) {
      console.error('Check duplicate error:', error);
      return false;
    }
  }
  
  async saveNews(newsItem) {
    try {
      const key = `news_${newsItem.id}`;
      const value = JSON.stringify({
        ...newsItem,
        savedAt: new Date().toISOString()
      });
      
      await this.kv.put(key, value, {
        expirationTtl: 60 * 60 * 24 * 7
      });
      
      await this.incrementNewsCount();
      return true;
      
    } catch (error) {
      console.error('Save news error:', error);
      return false;
    }
  }
  
  async saveEvents(events) {
    try {
      await this.kv.put('events', JSON.stringify(events));
      return true;
    } catch (error) {
      console.error('Save events error:', error);
      return false;
    }
  }
  
  async getEvents() {
    try {
      const events = await this.kv.get('events');
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Get events error:', error);
      return [];
    }
  }
  
  async getLatestNews(limit = 20) {
    try {
      const keys = await this.kv.list({ prefix: 'news_' });
      const newsItems = [];
      
      for (const key of keys.keys) {
        const value = await this.kv.get(key.name);
        if (value) {
          try {
            newsItems.push(JSON.parse(value));
          } catch (e) {
            console.error('Parse error for key:', key.name);
          }
        }
      }
      
      newsItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      return newsItems.slice(0, limit);
    } catch (error) {
      console.error('Get latest news error:', error);
      return [];
    }
  }
  
  async getNewsCount() {
    try {
      const count = await this.kv.get('news_count');
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error('Get news count error:', error);
      return 0;
    }
  }
  
  async incrementNewsCount() {
    try {
      const current = await this.getNewsCount();
      await this.kv.put('news_count', String(current + 1));
    } catch (error) {
      console.error('Increment news count error:', error);
    }
  }
  
  async getEventsCount() {
    const events = await this.getEvents();
    return events.length;
  }
  
  async getLastUpdate() {
    try {
      const lastUpdate = await this.kv.get('last_update');
      return lastUpdate || null;
    } catch (error) {
      console.error('Get last update error:', error);
      return null;
    }
  }
  
  async setLastUpdate(timestamp) {
    try {
      await this.kv.put('last_update', timestamp);
    } catch (error) {
      console.error('Set last update error:', error);
    }
  }
  
  async getLastCalendarUpdate() {
    try {
      const lastUpdate = await this.kv.get('calendar_last_update');
      return lastUpdate || null;
    } catch (error) {
      console.error('Get calendar last update error:', error);
      return null;
    }
  }
  
  async setLastCalendarUpdate(timestamp) {
    try {
      await this.kv.put('calendar_last_update', timestamp);
    } catch (error) {
      console.error('Set calendar last update error:', error);
    }
  }
  
  async getLastCleanup() {
    try {
      const lastCleanup = await this.kv.get('last_cleanup');
      return lastCleanup || null;
    } catch (error) {
      console.error('Get last cleanup error:', error);
      return null;
    }
  }
  
  async setLastCleanup(timestamp) {
    try {
      await this.kv.put('last_cleanup', timestamp);
    } catch (error) {
      console.error('Set last cleanup error:', error);
    }
  }
  
  async getLastTranslationReset() {
    try {
      const lastReset = await this.kv.get('last_translation_reset');
      return lastReset || null;
    } catch (error) {
      console.error('Get last translation reset error:', error);
      return null;
    }
  }
  
  async setLastTranslationReset(timestamp) {
    try {
      await this.kv.put('last_translation_reset', timestamp);
    } catch (error) {
      console.error('Set last translation reset error:', error);
    }
  }
  
  async cleanOldNews(days = 7) {
    try {
      console.log(`Cleaning old news older than ${days} days`);
      return true;
    } catch (error) {
      console.error('Clean old news error:', error);
      return false;
    }
  }
}
