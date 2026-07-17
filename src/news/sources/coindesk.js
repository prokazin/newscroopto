import Parser from 'rss-parser';

export class CoindeskSource {
  constructor() {
    this.parser = new Parser();
    this.name = 'coindesk';
    this.url = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
  }
  
  async fetchNews() {
    try {
      const feed = await this.parser.parseURL(this.url);
      
      return feed.items.slice(0, 5).map(item => ({
        id: `coindesk-${item.guid || item.link}`,
        title: this.cleanText(item.title),
        description: this.cleanText(item.contentSnippet || item.content || ''),
        url: item.link,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        source: this.name,
        image: this.extractImage(item.content)
      }));
      
    } catch (error) {
      console.error('Coindesk fetch error:', error);
      return [];
    }
  }
  
  cleanText(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  
  extractImage(content) {
    if (!content) return null;
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
  }
}
