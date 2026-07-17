import { CONFIG } from '../config.js';

export class Translator {
  constructor(env) {
    this.env = env;
    this.cache = new Map();
    this.dailyCount = 0;
    this.maxDaily = CONFIG.maxTranslationsPerDay;
  }
  
  async translate(newsItem) {
    if (!CONFIG.enableTranslation) {
      return newsItem;
    }
    
    try {
      const cacheKey = `trans_${newsItem.id}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CONFIG.cacheDuration * 1000) {
          return cached.data;
        }
      }
      
      if (this.dailyCount >= this.maxDaily) {
        console.warn('Daily translation limit reached');
        return newsItem;
      }
      
      const text = `${newsItem.title}\n${newsItem.description || ''}`;
      const charCount = text.length;
      
      if (charCount > CONFIG.maxCharsPerTranslation) {
        newsItem.description = this.truncateText(newsItem.description, CONFIG.maxCharsPerTranslation - newsItem.title.length - 10);
        const truncatedText = `${newsItem.title}\n${newsItem.description || ''}`;
        const translated = await this.translateText(truncatedText);
        const translatedItem = {
          ...newsItem,
          title: translated.title || newsItem.title,
          description: translated.description || newsItem.description
        };
        
        this.cache.set(cacheKey, {
          data: translatedItem,
          timestamp: Date.now()
        });
        
        this.dailyCount += charCount;
        return translatedItem;
      }
      
      const translated = await this.translateText(text);
      
      const translatedItem = {
        ...newsItem,
        title: translated.title || newsItem.title,
        description: translated.description || newsItem.description
      };
      
      this.cache.set(cacheKey, {
        data: translatedItem,
        timestamp: Date.now()
      });
      
      this.dailyCount += charCount;
      return translatedItem;
      
    } catch (error) {
      console.error('Translation failed:', error);
      return newsItem;
    }
  }
  
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  async translateText(text) {
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: CONFIG.sourceLanguage,
          target: CONFIG.defaultLanguage,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        throw new Error(`LibreTranslate API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseTranslatedText(data.translatedText);
      
    } catch (error) {
      console.error('LibreTranslate error:', error);
      try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${CONFIG.sourceLanguage}&tl=${CONFIG.defaultLanguage}&dt=t&q=${encodeURIComponent(text)}`);
        
        if (!response.ok) {
          throw new Error(`Google Translate API error: ${response.status}`);
        }
        
        const data = await response.json();
        const translatedText = data[0].map(item => item[0]).join('');
        return this.parseTranslatedText(translatedText);
        
      } catch (googleError) {
        console.error('Google Translate error:', googleError);
        return { title: '', description: '' };
      }
    }
  }
  
  parseTranslatedText(translatedText) {
    const parts = translatedText.split('\n');
    return {
      title: parts[0] || '',
      description: parts.slice(1).join('\n') || ''
    };
  }
  
  resetDailyCounter() {
    this.dailyCount = 0;
    console.log('Translation counter reset');
  }
  
  clearCache() {
    this.cache.clear();
    console.log('Translation cache cleared');
  }
}
