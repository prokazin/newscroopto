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
      // Мини-приложение
      if (path === '/mini-app' || path === '/') {
        const html = getMiniAppHTML();
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // API для мини-приложения
      if (path === '/api/news') {
        const db = new Database(env);
        const news = await db.getLatestNews(20);
        return new Response(JSON.stringify(news), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (path === '/api/calendar') {
        const calendar = new CalendarEvents(env);
        const events = await calendar.getUpcomingEvents(30);
        return new Response(JSON.stringify(events), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (path === '/api/altcoins') {
        const data = [
          { id: 1, name: 'Ethereum (ETH)', price: '$3,450', change: '+2.3%', source: 'altcoins' },
          { id: 2, name: 'Solana (SOL)', price: '$178', change: '+5.1%', source: 'altcoins' },
          { id: 3, name: 'Cardano (ADA)', price: '$0.45', change: '-0.8%', source: 'altcoins' },
          { id: 4, name: 'Polkadot (DOT)', price: '$6.80', change: '+1.2%', source: 'altcoins' },
          { id: 5, name: 'Avalanche (AVAX)', price: '$35.20', change: '+3.7%', source: 'altcoins' }
        ];
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (path === '/api/exclusive') {
        const db = new Database(env);
        const news = await db.getLatestNews(10);
        const exclusive = news.map(item => ({
          ...item,
          source: `⭐ ${item.source}`
        }));
        return new Response(JSON.stringify(exclusive), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Админ панель
      if (path === '/admin' || path === '/admin/') {
        const admin = new Admin(env);
        return admin.handle(request);
      }
      
      // Webhook для Telegram
      if (path === '/webhook') {
        const bot = new Bot(env);
        return bot.handleWebhook(request);
      }
      
      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: env.WORKER_URL || 'local'
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
      return new Response(`Internal Server Error: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
  
  async scheduled(event, env, ctx) {
    console.log('🔄 Starting scheduled task...');
    
    const collector = new NewsCollector(env);
    const calendar = new CalendarEvents(env);
    const bot = new Bot(env);
    const db = new Database(env);
    
    try {
      await db.setLastUpdate(new Date().toISOString());
      
      const news = await collector.collectAll();
      if (news && news.length > 0) {
        console.log(`📰 Collected ${news.length} news items`);
        await bot.sendNewsToChannel(news);
      } else {
        console.log('📭 No new news found');
      }
      
      const lastCalendarUpdate = await db.getLastCalendarUpdate();
      const shouldUpdateCalendar = !lastCalendarUpdate || 
        (Date.now() - new Date(lastCalendarUpdate).getTime() > 24 * 60 * 60 * 1000);
      
      if (shouldUpdateCalendar) {
        console.log('📅 Updating calendar...');
        await calendar.updateEvents();
        await db.setLastCalendarUpdate(new Date().toISOString());
        console.log('✅ Calendar updated');
      }
      
      const lastCleanup = await db.getLastCleanup();
      const shouldCleanup = !lastCleanup || 
        (Date.now() - new Date(lastCleanup).getTime() > 7 * 24 * 60 * 60 * 1000);
      
      if (shouldCleanup) {
        console.log('🧹 Cleaning old news...');
        await db.cleanOldNews(7);
        await db.setLastCleanup(new Date().toISOString());
        console.log('✅ Cleanup completed');
      }
      
      console.log('✅ Scheduled task completed successfully');
      
    } catch (error) {
      console.error('❌ Scheduled task failed:', error);
      try {
        await bot.sendErrorMessage(error.message);
      } catch (notifyError) {
        console.error('Failed to send error notification:', notifyError);
      }
    }
  }
};

// HTML мини-приложения
function getMiniAppHTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>COIN DIGEST</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            color: #ffffff;
            padding-top: 44px;
            padding-bottom: 80px;
        }
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 44px;
            background: rgba(26, 26, 46, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }
        .header h1 { font-size: 17px; font-weight: 600; letter-spacing: 0.5px; }
        .header .status {
            position: absolute;
            right: 16px;
            font-size: 12px;
            color: #4ade80;
        }
        .tabs {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: rgba(26, 26, 46, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-around;
            align-items: center;
            z-index: 100;
            padding-bottom: 10px;
        }
        .tab-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 4px 12px;
            border-radius: 12px;
            min-width: 60px;
            transition: all 0.3s;
        }
        .tab-item .icon { font-size: 24px; line-height: 1.2; }
        .tab-item .label {
            font-size: 10px;
            margin-top: 2px;
            color: rgba(255, 255, 255, 0.5);
            transition: color 0.3s;
        }
        .tab-item.active .label { color: #4ade80; }
        .tab-item.active { background: rgba(74, 222, 128, 0.1); }
        .content { padding: 16px; max-width: 600px; margin: 0 auto; }
        .tab-content { display: none; animation: fadeIn 0.3s ease; }
        .tab-content.active { display: block; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .card {
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s;
            cursor: pointer;
        }
        .card:active { transform: scale(0.98); }
        .card .source {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        .card .title {
            font-size: 16px;
            font-weight: 600;
            line-height: 1.4;
            margin-bottom: 8px;
        }
        .card .description {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .card .time {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.3);
            margin-top: 8px;
        }
        .event-item {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .event-item:last-child { border-bottom: none; }
        .event-date {
            min-width: 60px;
            text-align: center;
            margin-right: 16px;
        }
        .event-date .day {
            font-size: 20px;
            font-weight: 700;
            color: #4ade80;
        }
        .event-date .month {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
        }
        .event-info { flex: 1; }
        .event-info .name { font-size: 15px; font-weight: 500; }
        .event-info .desc {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.5);
        }
        .event-badge {
            font-size: 10px;
            padding: 2px 10px;
            border-radius: 20px;
            background: rgba(74, 222, 128, 0.2);
            color: #4ade80;
            margin-left: 8px;
        }
        .loading {
            text-align: center;
            padding: 40px 0;
            color: rgba(255, 255, 255, 0.3);
        }
        .loading .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #4ade80;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty {
            text-align: center;
            padding: 40px 0;
            color: rgba(255, 255, 255, 0.3);
        }
        .empty .emoji { font-size: 48px; margin-bottom: 12px; }
        ::-webkit-scrollbar { width: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ COIN DIGEST</h1>
        <span class="status" id="statusDot">●</span>
    </div>
    <div class="content">
        <div id="tab-news" class="tab-content active">
            <div id="news-list"><div class="loading"><div class="spinner"></div><div>Загрузка новостей...</div></div></div>
        </div>
        <div id="tab-altcoins" class="tab-content">
            <div id="altcoins-list"><div class="loading"><div class="spinner"></div><div>Загрузка альткоинов...</div></div></div>
        </div>
        <div id="tab-calendar" class="tab-content">
            <div id="calendar-list"><div class="loading"><div class="spinner"></div><div>Загрузка календаря...</div></div></div>
        </div>
        <div id="tab-exclusive" class="tab-content">
            <div id="exclusive-list"><div class="loading"><div class="spinner"></div><div>Загрузка эксклюзива...</div></div></div>
        </div>
    </div>
    <div class="tabs">
        <div class="tab-item active" data-tab="news"><span class="icon">📰</span><span class="label">Новости</span></div>
        <div class="tab-item" data-tab="altcoins"><span class="icon">📈</span><span class="label">Альткоины</span></div>
        <div class="tab-item" data-tab="calendar"><span class="icon">📅</span><span class="label">Календарь</span></div>
        <div class="tab-item" data-tab="exclusive"><span class="icon">⭐</span><span class="label">Эксклюзив</span></div>
    </div>
    <script>
        let tg = window.Telegram?.WebApp;
        if (tg) {
            tg.expand();
            tg.setBackgroundColor('#1a1a2e');
            tg.setHeaderColor('#1a1a2e');
        }
        
        const API_URL = 'https://newscroopto.nazar-bronnikov22.workers.dev/api';
        
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const tabId = this.dataset.tab;
                document.getElementById('tab-' + tabId).classList.add('active');
                loadTabData(tabId);
            });
        });
        
        async function loadTabData(tab) {
            const container = document.getElementById(tab + '-list');
            try {
                let data;
                if (tab === 'news') data = await fetchData('/news');
                else if (tab === 'altcoins') data = await fetchData('/altcoins');
                else if (tab === 'calendar') data = await fetchData('/calendar');
                else if (tab === 'exclusive') data = await fetchData('/exclusive');
                renderData(tab, data, container);
            } catch (error) {
                container.innerHTML = '<div class="empty"><div class="emoji">😕</div><div>Ошибка загрузки</div></div>';
            }
        }
        
        async function fetchData(endpoint) {
            const response = await fetch(API_URL + endpoint);
            if (!response.ok) throw new Error('Error');
            return response.json();
        }
        
        function renderData(tab, data, container) {
            if (!data || data.length === 0) {
                container.innerHTML = '<div class="empty"><div class="emoji">📭</div><div>Нет данных</div></div>';
                return;
            }
            if (tab === 'news' || tab === 'altcoins' || tab === 'exclusive') {
                container.innerHTML = data.map(item => \`
                    <div class="card" onclick="window.open('\${item.url || '#'}', '_blank')">
                        <div class="source">\${item.source || 'Источник'}</div>
                        <div class="title">\${item.title || 'Без заголовка'}</div>
                        <div class="description">\${item.description || ''}</div>
                        <div class="time">\${formatTime(item.publishedAt)}</div>
                    </div>
                \`).join('');
            } else if (tab === 'calendar') {
                container.innerHTML = data.map(event => \`
                    <div class="event-item">
                        <div class="event-date">
                            <div class="day">\${formatDay(event.date)}</div>
                            <div class="month">\${formatMonth(event.date)}</div>
                        </div>
                        <div class="event-info">
                            <div class="name">
                                \${event.name}
                                \${event.importance === 'high' ? '<span class="event-badge">🔥 Важно</span>' : ''}
                            </div>
                            <div class="desc">\${event.description || ''}</div>
                        </div>
                    </div>
                \`).join('');
            }
        }
        
        function formatTime(date) {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        function formatDay(date) {
            if (!date) return '';
            return String(new Date(date).getDate()).padStart(2, '0');
        }
        
        function formatMonth(date) {
            if (!date) return '';
            const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            return months[new Date(date).getMonth()];
        }
        
        loadTabData('news');
        document.getElementById('statusDot').textContent = '●';
        document.getElementById('statusDot').style.color = '#4ade80';
    </script>
</body>
</html>`;
}
