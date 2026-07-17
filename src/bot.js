import { CONFIG, CHANNELS, TELEGRAM } from './config.js';
import { Translator } from './news/translator.js';
import { Database } from './utils/database.js';

export class Bot {
  constructor(env) {
    this.env = env;
    this.token = env.BOT_TOKEN;
    this.channelId = env.CHANNEL_ID;
    this.translator = new Translator(env);
    this.db = new Database(env);
    this.apiUrl = `${TELEGRAM.apiUrl}${this.token}`;
  }
  
  async handleWebhook(request) {
    try {
      const update = await request.json();
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        
        if (text === '/start') {
          await this.sendWelcome(chatId);
        } else if (text === '/help') {
          await this.sendHelp(chatId);
        } else if (text === '/stats') {
          await this.sendStats(chatId);
        } else if (text === '/admin') {
          await this.sendAdminLink(chatId);
        } else {
          await this.sendUnknownCommand(chatId);
        }
      }
      
      return new Response('OK', { status: 200 });
      
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response('Error', { status: 500 });
    }
  }
  
  async sendNewsToChannel(newsItems) {
    let sentCount = 0;
    
    for (const item of newsItems) {
      try {
        const isDuplicate = await this.db.checkDuplicate(item.id);
        if (isDuplicate) continue;
        
        let translatedItem = item;
        if (CONFIG.enableTranslation) {
          translatedItem = await this.translator.translate(item);
        }
        
        const message = this.formatNewsMessage(translatedItem);
        const messages = this.splitLongMessage(message);
        
        for (const msg of messages) {
          await this.sendMessageWithRetry(this.channelId, msg);
        }
        
        await this.db.saveNews(item);
        sentCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error sending news ${item.id}:`, error);
      }
    }
    
    console.log(`Sent ${sentCount} news items to channel`);
    return sentCount;
  }
  
  async sendMessageToChannel(text) {
    await this.sendMessageWithRetry(this.channelId, text);
  }
  
  formatNewsMessage(news) {
    const lines = [
      `📰 <b>${this.escapeHtml(news.title)}</b>`,
      '',
      this.escapeHtml(news.description || ''),
      '',
      `🔗 <a href="${news.url}">Читать далее</a>`,
      `📅 ${this.formatDate(news.publishedAt)}`,
      `🏷️ #${news.source}`
    ];
    
    if (news.image) {
      lines.splice(1, 0, `<a href="${news.image}">&#8205;</a>`);
    }
    
    return lines.join('\n');
  }
  
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
  
  splitLongMessage(message) {
    const maxLength = TELEGRAM.maxMessageLength;
    if (message.length <= maxLength) return [message];
    
    const messages = [];
    let current = '';
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (current.length + line.length + 1 > maxLength) {
        messages.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    
    if (current) messages.push(current);
    return messages;
  }
  
  async sendMessageWithRetry(chatId, text, retryCount = 0) {
    try {
      const url = `${this.apiUrl}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: TELEGRAM.parseMode,
          disable_web_page_preview: TELEGRAM.disableWebPagePreview
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${response.status} - ${error}`);
      }
      
      return await response.json();
      
    } catch (error) {
      if (retryCount < CONFIG.maxRetries) {
        console.log(`Retry ${retryCount + 1}/${CONFIG.maxRetries} for message`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (retryCount + 1)));
        return this.sendMessageWithRetry(chatId, text, retryCount + 1);
      }
      throw error;
    }
  }
  
  async sendWelcome(chatId) {
    const welcome = `
<b>🤖 Добро пожаловать в COIN DIGEST!</b>

<i>Ваш персональный агрегатор крипто-новостей</i>

📊 <b>Доступные функции:</b>
• 🔥 Актуальные новости из 6 источников
• 📈 Аналитика альткоинов
• 📅 Крипто календарь событий
• 📊 Анализ рынка (утро/вечер)

⚡️ <b>Обновления каждые 15 минут</b>
🌐 Автоматический перевод на русский

<b>Команды:</b>
/start - Показать это сообщение
/help - Помощь
/stats - Статистика
/admin - Админ панель

<i>Приятного использования! 🚀</i>
    `;
    
    await this.sendMessageWithRetry(chatId, welcome);
  }
  
  async sendHelp(chatId) {
    const help = `
<b>📚 Помощь по боту COIN DIGEST</b>

<b>📰 Новости:</b>
Бот собирает новости с 6 ведущих крипто-ресурсов каждые 15 минут и публикует их в канале.

<b>🔄 Автоперевод:</b>
Все новости автоматически переводятся на русский язык.

<b>📅 Крипто календарь:</b>
Отслеживает важные события: халвинги, обновления, форки.

<b>📊 Анализ рынка:</b>
Утром (9:00) и вечером (21:00) МСК публикуется анализ крипторынка.

<b>👨‍💼 Админ панель:</b>
Доступна по ссылке /admin для управления ботом.

<b>⚙️ Технические детали:</b>
• Хостинг: Cloudflare Workers
• Обновление: каждые 15 минут
• Хранение: 7 дней
    `;
    
    await this.sendMessageWithRetry(chatId, help);
  }
  
  async sendStats(chatId) {
    const newsCount = await this.db.getNewsCount();
    const eventsCount = await this.db.getEventsCount();
    const lastUpdate = await this.db.getLastUpdate();
    
    const stats = `
<b>📊 Статистика COIN DIGEST</b>

📰 Новостей собрано: <b>${newsCount}</b>
📅 Событий в календаре: <b>${eventsCount}</b>
🔄 Последнее обновление: <b>${this.formatDate(lastUpdate)}</b>
📡 Активных источников: <b>6</b>
⏱ Интервал обновления: <b>15 минут</b>
    `;
    
    await this.sendMessageWithRetry(chatId, stats);
  }
  
  async sendAdminLink(chatId) {
    const adminLink = `
<b>🔐 Админ панель</b>

Доступна по адресу:
<code>https://${this.env.WORKER_URL}/admin</code>

<b>⚠️ Требуется авторизация</b>
    `;
    
    await this.sendMessageWithRetry(chatId, adminLink);
  }
  
  async sendUnknownCommand(chatId) {
    const message = `
<i>❌ Неизвестная команда</i>

Используйте /help для списка доступных команд.
    `;
    
    await this.sendMessageWithRetry(chatId, message);
  }
  
  async sendErrorMessage(error) {
    const adminChatId = this.env.ADMIN_CHAT_ID || this.channelId;
    
    const errorMessage = `
⚠️ <b>Ошибка в работе бота</b>

${this.escapeHtml(error)}

🕐 ${new Date().toLocaleString('ru-RU')}
    `;
    
    try {
      await this.sendMessageWithRetry(adminChatId, errorMessage);
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
}
