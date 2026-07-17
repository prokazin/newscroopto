import { Bot } from './bot.js';
import { NewsCollector } from './news/collector.js';
import { CalendarEvents } from './calendar/events.js';
import { Admin } from './admin/admin.js';
import { Database } from './utils/database.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      if (path === '/admin' || path === '/admin/') {
        const admin = new Admin(env);
        return admin.handle(request);
      }
      
      if (path === '/webhook') {
        const bot = new Bot(env);
        return bot.handleWebhook(request);
      }
      
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response('COIN DIGEST Bot is running', { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
      
    } catch (error) {
      console.error('Error in fetch:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  
  async scheduled(event, env, ctx) {
    const collector = new NewsCollector(env);
    const calendar = new CalendarEvents(env);
    const bot = new Bot(env);
    const db = new Database(env);
    
    try {
      await db.setLastUpdate(new Date().toISOString());
      
      const news = await collector.collectAll();
      if (news.length > 0) {
        console.log(`Collected ${news.length} news items`);
        await bot.sendNewsToChannel(news);
      }
      
      const lastCalendarUpdate = await db.getLastCalendarUpdate();
      const shouldUpdateCalendar = !lastCalendarUpdate || 
        (Date.now() - new Date(lastCalendarUpdate).getTime() > 24 * 60 * 60 * 1000);
      
      if (shouldUpdateCalendar) {
        await calendar.updateEvents();
        await db.setLastCalendarUpdate(new Date().toISOString());
        console.log('Calendar updated');
      }
      
      await db.cleanOldNews(7);
      
    } catch (error) {
      console.error('Cron job failed:', error);
      await bot.sendErrorMessage(error.message);
    }
  }
};
