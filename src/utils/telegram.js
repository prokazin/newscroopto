import { TELEGRAM } from '../config.js';

export class TelegramUtils {
  static async sendMessage(token, chatId, text, options = {}) {
    const url = `${TELEGRAM.apiUrl}${token}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || TELEGRAM.parseMode,
      disable_web_page_preview: options.disable_web_page_preview || TELEGRAM.disableWebPagePreview,
      ...options
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${response.status} - ${error}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Telegram send message error:', error);
      throw error;
    }
  }
  
  static escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  static formatDate(dateString) {
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
  
  static splitLongMessage(message, maxLength = TELEGRAM.maxMessageLength) {
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
}
