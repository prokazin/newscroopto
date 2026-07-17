import { CONFIG } from '../config.js';
import { Database } from '../utils/database.js';

export class CalendarEvents {
  constructor(env) {
    this.env = env;
    this.db = new Database(env);
  }
  
  async updateEvents() {
    try {
      const events = await this.fetchEvents();
      await this.db.saveEvents(events);
      return events;
    } catch (error) {
      console.error('Failed to update events:', error);
      return [];
    }
  }
  
  async fetchEvents() {
    const events = [];
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const knownEvents = [
      { name: 'Bitcoin Halving', date: '2026-04-20', type: 'halving', importance: 'high', description: 'Четвертый халвинг биткоина, награда за блок уменьшится до 3.125 BTC' },
      { name: 'Bitcoin Conference 2026', date: '2026-05-15', type: 'conference', importance: 'medium', description: 'Крупнейшая биткоин-конференция в Майами' },
      { name: 'Ethereum Pectra Upgrade', date: '2026-08-15', type: 'upgrade', importance: 'high', description: 'Крупное обновление сети Ethereum' },
      { name: 'Ethereum Shanghai Upgrade', date: '2026-12-10', type: 'upgrade', importance: 'high', description: 'Следующее обновление после Pectra' },
      { name: 'Solana Breakpoint 2026', date: '2026-07-20', type: 'conference', importance: 'medium', description: 'Ежегодная конференция Solana в Лиссабоне' },
      { name: 'Cardano Summit 2026', date: '2026-11-05', type: 'conference', importance: 'medium', description: 'Глобальная конференция Cardano' },
      { name: 'Polkadot Decoded 2026', date: '2026-09-10', type: 'conference', importance: 'medium', description: 'Ежегодное мероприятие Polkadot' },
      { name: 'DeFi Summit 2026', date: '2026-06-25', type: 'summit', importance: 'high', description: 'Глобальный саммит по DeFi в Лондоне' },
      { name: 'ETHGlobal 2026', date: '2026-10-12', type: 'hackathon', importance: 'medium', description: 'Глобальный хакатон Ethereum' },
      { name: 'MiCA Implementation', date: '2026-07-01', type: 'regulation', importance: 'high', description: 'Вступление в силу полного регулирования MiCA в ЕС' },
      { name: 'CBDC Progress Report', date: '2026-09-30', type: 'regulation', importance: 'medium', description: 'Отчет о прогрессе цифровых валют центробанков' }
    ];
    
    for (const event of knownEvents) {
      const eventDate = new Date(event.date);
      if (eventDate >= now && eventDate <= nextMonth) {
        events.push({
          id: `event-${event.name.toLowerCase().replace(/\s+/g, '-')}`,
          ...event,
          date: event.date,
          daysUntil: Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24)),
          timestamp: eventDate.toISOString()
        });
      }
    }
    
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    return events.slice(0, CONFIG.calendarEventsCount);
  }
  
  async getEvents() {
    return await this.db.getEvents();
  }
  
  async getUpcomingEvents(days = 30) {
    const events = await this.getEvents();
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + days);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= future;
    });
  }
  
  formatEventsMessage(events) {
    if (!events || events.length === 0) {
      return '📅 <b>Крипто календарь</b>\n\n<i>Нет предстоящих событий</i>';
    }
    
    const lines = ['📅 <b>Крипто календарь событий</b>', ''];
    
    for (const event of events) {
      const emoji = this.getEventEmoji(event.type);
      const importance = event.importance === 'high' ? '🔴 ' : '';
      
      lines.push(`${emoji} <b>${event.name}</b>`);
      lines.push(`📆 ${event.date} (через ${event.daysUntil} дн.)`);
      lines.push(`📝 ${event.description}`);
      lines.push(`🏷️ #${event.type}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  getEventEmoji(type) {
    const emojis = {
      halving: '⛏️',
      upgrade: '⚡',
      conference: '🎤',
      summit: '🏛️',
      hackathon: '💻',
      regulation: '📋'
    };
    return emojis[type] || '📌';
  }
}
