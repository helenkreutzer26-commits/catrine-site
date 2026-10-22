const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'сайт CATRINE');

// Простая загрузка .env без внешних зависимостей
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const SYSTEM_PROMPT = `Ты — дружелюбный и профессиональный ИИ-консультант мебельной фабрики CATRINE (г. Астана, Казахстан).
Твоя цель — помогать посетителям сайта, отвечать на вопросы о мебели на заказ, материалах, сроках и ориентировать их по услугам.

Информация о CATRINE:
- Фабрика в Астане с 2005 года (более 20 лет опыта).
- Собственное производство 6000 м² с современным европейским парком станков.
- Продукция:
  • Кухни на заказ (влагостойкие корпуса, фасады: натуральный шпон, матовая/глянцевая эмаль, МДФ, массив).
  • Шкафы и гардеробные (встроенные, купе, распашные, продуманное наполнение).
  • Модульная мебель Catrine Modul (прихожие, гардеробные системы).
  • Мебель для ванных комнат (влагостойкие тумбы с доводчиками).
  • Гостиные, библиотеки, ТВ-зоны со стеновыми панелями.
  • Детские комнаты и рабочие зоны.
  • Мебель для бизнеса и девелоперов (AVALON-K).
- Фурнитура: оригинальная немецкая Hettich (доводчики, петли, направляющие) с пожизненной гарантией, плавным и бесшумным ходом.
- Сроки: фиксируются в договоре с финансовой ответственностью (неустойка за каждый день задержки). В среднем от 25 до 45 рабочих дней.
- Сервис: Бесплатный выезд дизайнера-замерщика с образцами материалов и создание точного 3D-проекта.
- Адреса и контакты:
  • Шоурум Catrine Individual: г. Астана, ул. Ташенова, 19. WhatsApp / Тел: +7 771 033 33 99
  • Шоурум Catrine Modul: г. Астана, ул. Жиенкуловой, 5. Тел: +7 771 033 33 63
  • Текстиль: Catrine Textile (+7 771 033 02 20)

Правила общения:
1. Отвечай емко, по делу и дружелюбно. Используй понятный русский язык. Если пользователь обращается на казахском — отвечай на казахском.
2. При вопросе о точной стоимости честно объясни, что цена зависит от размеров, выбранных материалов (шпон, эмаль, пластик) и фурнитуры, поэтому оптимально вызвать дизайнера на бесплатный замер или прислать план/размеры в WhatsApp.
3. Помогай пользователю сориентироваться на сайте и подсказывай контакты или форму записи на замер.`;

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let decodedPath = decodeURIComponent(parsedUrl.pathname);

    // API для OpenAI Chat
    if (req.method === 'POST' && decodedPath === '/api/chat') {
      return handleChatApi(req, res);
    }

    // Маршруты страниц
    if (decodedPath === '/' || decodedPath === '/index.html') {
      return serveFile(path.join(SITE_DIR, 'index.html'), res);
    }
    if (decodedPath === '/cjm' || decodedPath === '/cjm.html') {
      return serveFile(path.join(ROOT, 'CJM_кухня_на_заказ.html'), res);
    }

    // Статика из 'сайт CATRINE'
    let candidate = path.join(SITE_DIR, decodedPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return serveFile(candidate, res);
    }

    // Статика из корня
    candidate = path.join(ROOT, decodedPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return serveFile(candidate, res);
    }

    // Если папка с index.html
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      const idx = path.join(candidate, 'index.html');
      if (fs.existsSync(idx)) {
        return serveFile(idx, res);
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Server Error: ' + err.message);
  }
});

// Обработка обращений к OpenAI API
function handleChatApi(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) req.destroy();
  });

  req.on('end', async () => {
    try {
      // Обновляем переменные окружения из .env если файл редактировался
      loadEnv();

      const { messages } = JSON.parse(body || '{}');

      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Параметр messages должен быть непустым массивом сообщений.' }));
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.trim() === '') {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          error: 'API-ключ OpenAI не настроен на сервере. Укажите ваш OPENAI_API_KEY в файле .env в корне проекта.'
        }));
      }

      // Фильтруем и берём последние 10 сообщений для сохранения контекста диалога и экономии токенов
      const sanitizedHistory = messages
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content.trim() }));

      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...sanitizedHistory
        ],
        temperature: 0.7,
        max_tokens: 600
      };

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await openaiRes.json();

      if (!openaiRes.ok) {
        const msg = data.error?.message || `Ошибка OpenAI API (${openaiRes.status})`;
        res.writeHead(openaiRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: msg }));
      }

      const reply = data.choices?.[0]?.message?.content || 'Не удалось получить ответ.';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Ошибка при обработке запроса: ' + err.message }));
    }
  });
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error loading file: ' + err.message);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log(`CATRINE Server running at http://localhost:${PORT}/`);
  console.log(`- Основной сайт: http://localhost:${PORT}/`);
  console.log(`- CJM (карта клиента): http://localhost:${PORT}/cjm`);
  console.log(`- Чат API: POST http://localhost:${PORT}/api/chat`);
});
