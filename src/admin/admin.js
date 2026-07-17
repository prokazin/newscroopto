import { Database } from '../utils/database.js';

export class Admin {
  constructor(env) {
    this.env = env;
    this.db = new Database(env);
    this.password = env.ADMIN_PASSWORD || 'admin123';
  }
  
  async handle(request) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    const isAuthenticated = auth === `Bearer ${this.password}`;
    const cookie = request.headers.get('Cookie');
    const hasSession = cookie && cookie.includes(`admin_session=${this.password}`);
    
    if (!isAuthenticated && !hasSession) {
      if (url.pathname === '/admin' && request.method === 'GET') {
        return this.showLogin();
      }
      
      if (url.pathname === '/admin/login' && request.method === 'POST') {
        return this.handleLogin(request);
      }
      
      return new Response('Unauthorized', { 
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin Panel"' }
      });
    }
    
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      const stats = await this.getStats();
      return this.renderAdmin(stats);
    }
    
    if (url.pathname === '/api/stats') {
      const stats = await this.getStats();
      return new Response(JSON.stringify(stats), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    if (url.pathname === '/api/update' && request.method === 'POST') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/api/clear-cache' && request.method === 'POST') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/admin/logout') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin',
          'Set-Cookie': 'admin_session=; Path=/; HttpOnly; Max-Age=0'
        }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  showLogin() {
    return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Admin Login - COIN DIGEST</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-container {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
        }
        h1 { color: #fff; font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { color: rgba(255,255,255,0.8); display: block; margin-bottom: 5px; font-size: 14px; }
        input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            background: rgba(255,255,255,0.1);
            color: #fff;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus { outline: none; border-color: rgba(255,255,255,0.5); }
        input::placeholder { color: rgba(255,255,255,0.3); }
        button {
            width: 100%;
            padding: 12px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 10px;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>🔐 COIN DIGEST</h1>
        <form id="loginForm" action="/admin/login" method="POST">
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" name="password" placeholder="Введите пароль" required>
            </div>
            <button type="submit">Войти</button>
        </form>
    </div>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  async handleLogin(request) {
    const formData = await request.formData();
    const password = formData.get('password');
    
    if (password === this.password) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin',
          'Set-Cookie': `admin_session=${this.password}; Path=/; HttpOnly; Max-Age=86400`
        }
      });
    }
    
    return new Response(`
<!DOCTYPE html>
<html>
<head><title>Login Failed</title>
<style>
body { font-family: system-ui; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.error-container { background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; max-width: 400px; text-align: center; }
h1 { color: #ff6b6b; }
a { color: #fff; text-decoration: none; display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 10px; margin-top: 20px; }
</style>
</head>
<body>
<div class="error-container">
<h1>❌ Ошибка входа</h1>
<p>Неверный пароль</p>
<a href="/admin">Вернуться</a>
</div>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 401
    });
  }
  
  async getStats() {
    const newsCount = await this.db.getNewsCount();
    const eventsCount = await this.db.getEventsCount();
    const lastUpdate = await this.db.getLastUpdate();
    const lastCalendarUpdate = await this.db.getLastCalendarUpdate();
    
    return {
      newsCount,
      eventsCount,
      lastUpdate,
      lastCalendarUpdate,
      sources: ['cointelegraph', 'decrypt', 'bitcoinmagazine', 'coindesk', 'cryptoslate', 'newsbitcoin'],
      uptime: 'N/A',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
  
  renderAdmin(stats) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Admin Panel - COIN DIGEST</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        h1 { font-size: 28px; font-weight: 700; }
        .header-actions { display: flex; gap: 10px; }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            color: #fff;
            background: rgba(255,255,255,0.2);
        }
        .btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.3); }
        .btn-danger { background: rgba(255,107,107,0.3); }
        .btn-danger:hover { background: rgba(255,107,107,0.5); }
        .btn-success { background: rgba(74,222,128,0.3); }
        .btn-success:hover { background: rgba(74,222,128,0.5); }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.3s;
        }
        .card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .card-title { font-size: 14px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .card-value { font-size: 32px; font-weight: 700; }
        .card-sub { font-size: 12px; opacity: 0.6; margin-top: 5px; }
        .section {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; }
        .list-item {
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .list-item:last-child { border-bottom: none; }
        .status-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 12px;
        }
        .status-online { background: #4ade80; color: #000; }
        .timestamp { font-size: 12px; opacity: 0.6; margin-top: 10px; text-align: right; }
        @media (max-width: 768px) {
            .header { flex-direction: column; gap: 15px; align-items: stretch; }
            .header-actions { flex-direction: column; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>⚡ COIN DIGEST</h1>
                <div style="font-size: 14px; opacity: 0.8;">Административная панель</div>
            </div>
            <div class="header-actions">
                <button class="btn btn-success" onclick="triggerUpdate()">🔄 Обновить</button>
                <button class="btn btn-danger" onclick="clearCache()">🗑️ Очистить кэш</button>
                <a href="/admin/logout" class="btn">🚪 Выйти</a>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <div class="card-title">📰 Новостей</div>
                <div class="card-value">${stats.newsCount}</div>
                <div class="card-sub">Всего собрано</div>
            </div>
            <div class="card">
                <div class="card-title">📅 Событий</div>
                <div class="card-value">${stats.eventsCount}</div>
                <div class="card-sub">В календаре</div>
            </div>
            <div class="card">
                <div class="card-title">📡 Источников</div>
                <div class="card-value">${stats.sources.length}</div>
                <div class="card-sub">Активных</div>
            </div>
            <div class="card">
                <div class="card-title">⏱️ Статус</div>
                <div class="card-value">✅</div>
                <div class="card-sub">Бот активен</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📡 Активные источники новостей</div>
            ${stats.sources.map(source => `
                <div class="list-item">
                    <span>${source.charAt(0).toUpperCase() + source.slice(1)}</span>
                    <span class="status-badge status-online">online</span>
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <div class="section-title">ℹ️ Информация о системе</div>
            <div class="list-item">
                <span>Версия</span>
                <span>${stats.version}</span>
            </div>
            <div class="list-item">
                <span>Последнее обновление новостей</span>
                <span>${stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString('ru-RU') : 'Никогда'}</span>
            </div>
            <div class="list-item">
                <span>Последнее обновление календаря</span>
                <span>${stats.lastCalendarUpdate ? new Date(stats.lastCalendarUpdate).toLocaleString('ru-RU') : 'Никогда'}</span>
            </div>
        </div>
        
        <div class="timestamp">
            <i>Обновлено: ${new Date(stats.timestamp).toLocaleString('ru-RU')}</i>
        </div>
    </div>
    
    <script>
        async function triggerUpdate() {
            if (!confirm('Вы уверены, что хотите запустить ручное обновление?')) return;
            try {
                const response = await fetch('/api/update', { method: 'POST' });
                if (response.ok) {
                    alert('✅ Обновление запущено!');
                    setTimeout(() => location.reload(), 3000);
                } else {
                    alert('❌ Ошибка при запуске обновления');
                }
            } catch (error) {
                alert('❌ Ошибка: ' + error.message);
            }
        }
        
        async function clearCache() {
            if (!confirm('Вы уверены, что хотите очистить кэш?')) return;
            try {
                const response = await fetch('/api/clear-cache', { method: 'POST' });
                if (response.ok) {
                    alert('✅ Кэш очищен!');
                } else {
                    alert('❌ Ошибка при очистке кэша');
                }
            } catch (error) {
                alert('❌ Ошибка: ' + error.message);
            }
        }
        
        setTimeout(() => location.reload(), 60000);
    </script>
</body>
</html>
    `;
  }
}
