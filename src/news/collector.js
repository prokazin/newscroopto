import { CONFIG } from '../config.js';
import { CointelegraphSource } from './sources/cointelegraph.js';
import { DecryptSource } from './sources/decrypt.js';
import { BitcoinMagazineSource } from './sources/bitcoinmagazine.js';
import { CoindeskSource } from './sources/coindesk.js';
import { CryptoslateSource } from './sources/cryptoslate.js';
import { NewsBitcoinSource } from './sources/newsbitcoin.js';

export class NewsCollector {
  constructor(env) {
    this.env = env;
    this.sources = {
      cointelegraph: new CointelegraphSource(),
      decrypt: new DecryptSource(),
      bitcoinmagazine: new BitcoinMagazineSource(),
      coindesk: new CoindeskSource(),
      cryptoslate: new CryptoslateSource(),
      newsbitcoin: new NewsBitcoinSource()
    };
  }
  
  async collectAll() {
    const allNews = [];
    
    for (const [name, source] of Object.entries(this.sources)) {
      try {
        const news = await source.fetchNews();
        allNews.push(...news);
      } catch (error) {
        console.error(`Error fetching from ${name}:`, error);
      }
    }
    
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return allNews;
  }
}
