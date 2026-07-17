export class CoindeskSource {
  constructor() {
    this.name = 'coindesk';
    this.url = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
  }
  
  async fetchNews() {
    try {
      const response = await fetch(this.url);
      const text = await response.text();
      const items = this.parseRSS(text);
      
      return items.slice(0, 5).map(item => ({
        id: `coindesk-${item.guid || item.link}`,
        title: this.cleanText(item.title),
        description: this.cleanText(item.description || item.content || ''),
        url: item.link,
        publishedAt: item.pubDate || new Date().toISOString(),
        source: this.name,
        image: this.extractImage(item.content)
      }));
      
    } catch (error) {
      console.error('Coindesk fetch error:', error);
      return [];
    }
  }
  
  parseRSS(xml) {
    const items = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    for (const itemXml of itemMatches) {
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                    itemXml.match(/<title>(.*?)<\/title>/);
      const link = itemXml.match(/<link>(.*?)<\/link>/);
      const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || 
                          itemXml.match(/<description>(.*?)<\/description>/);
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const guid = itemXml.match(/<guid>(.*?)<\/guid>/);
      const content = itemXml.match(/<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/);
      
      items.push({
        title: title ? title[1] : '',
        link: link ? link[1] : '',
        description: description ? description[1] : '',
        pubDate: pubDate ? pubDate[1] : new Date().toISOString(),
        guid: guid ? guid[1] : '',
        content: content ? content[1] : ''
      });
    }
    
    return items;
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
