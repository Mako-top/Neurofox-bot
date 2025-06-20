const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

console.log("✅ NeuroFox загружается...");

const chatHistory = {};
const userModel = {};
const userLimit = {};

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// === Определение языка через DetectLanguage API
async function getLanguage(text) {
  try {
    const res = await axios.post('https://ws.detectlanguage.com/0.2/detect', {
      q: text
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DETECTLANGUAGE_API_KEY}`
      }
    });

    const langCode = res.data.data.detections[0]?.language || 'en';
    const langNames = {
      en: "English", ru: "Russian", fr: "French", es: "Spanish",
      zh: "Chinese", de: "German", it: "Italian", tr: "Turkish",
      ja: "Japanese", ar: "Arabic", kk: "Kazakh"
    };
    return langNames[langCode] || "English";
  } catch (err) {
    console.error("🔍 Ошибка определения языка:", err.message);
    return 'English';
  }
}

// === Кнопки
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'help') {
    return bot.sendMessage(chatId, `🤖 *Помощь*\n\nНапиши текст — и я отвечу!\n\n/clear — очистить память\n!model gpt-4 — сменить модель\n!limit 1500 — длина ответа`, { parse_mode: 'Markdown' });
  }

  if (data === 'clear') {
    chatHistory[chatId] = [];
    return bot.sendMessage(chatId, `🧹 *История чата очищена.*`, { parse_mode: 'Markdown' });
  }

  if (data === 'gpt4') {
    userModel[chatId] = "openai/gpt-4";
    return bot.sendMessage(chatId, `🔁 *Модель переключена на GPT-4*`, { parse_mode: 'Markdown' });
  }
});

// === Текстовые сообщения
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;
  if (!userMessage) return;

  if (userMessage === '/clear') {
    chatHistory[chatId] = [];
    return bot.sendMessage(chatId, "🧹 *История диалога очищена.*", { parse_mode: 'Markdown' });
  }

  if (userMessage.startsWith('!model ')) {
    const modelName = userMessage.split(' ')[1]?.trim();

    const allowedModels = [
      "openai/gpt-3.5-turbo",
      "openai/gpt-4",
      "mistralai/mistral-7b-instruct",
      "anthropic/claude-3-opus",
      "meta-llama/llama-3-70b-instruct"
    ];

    if (allowedModels.includes(modelName)) {
      userModel[chatId] = modelName;
      return bot.sendMessage(chatId, `✅ *Модель установлена:* \`${modelName}\``, { parse_mode: 'Markdown' });
    } else {
      return bot.sendMessage(chatId, `❌ Модель не найдена.\n\n*Доступные:*\n${allowedModels.map(m => `- \`${m}\``).join('\n')}`, { parse_mode: 'Markdown' });
    }
  }

  if (userMessage.startsWith('!limit ')) {
    const limit = parseInt(userMessage.split(' ')[1]);

    if (!isNaN(limit) && limit > 100 && limit <= 4096) {
      userLimit[chatId] = limit;
      return bot.sendMessage(chatId, `📏 *Максимум токенов в ответе установлен:* \`${limit}\``, { parse_mode: 'Markdown' });
    } else {
      return bot.sendMessage(chatId, "⚠️ Укажи число от 100 до 4096, например: `!limit 1500`", { parse_mode: 'Markdown' });
    }
  }

  handleTextMessage(msg);
});

// === Обработка запроса к ИИ
async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (!chatHistory[chatId]) chatHistory[chatId] = [];
  if (!userModel[chatId]) userModel[chatId] = "openai/gpt-3.5-turbo";

  // 🧠 Определяем язык пользователя
  const languageName = await getLanguage(userMessage);

  // 🧼 Очищаем старую system-инструкцию и задаём новую
  chatHistory[chatId] = chatHistory[chatId].filter(m => m.role !== 'system');
  chatHistory[chatId].unshift({
    role: 'system',
    content: `You are a helpful assistant. Always reply in ${languageName}.`
  });

  chatHistory[chatId].push({ role: 'user', content: userMessage });

  // 🧠 Сохраняем последние 10 сообщений
  if (chatHistory[chatId].length > 10) {
    chatHistory[chatId] = chatHistory[chatId].slice(-10);
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: userModel[chatId],
      messages: chatHistory[chatId],
      max_tokens: userLimit[chatId] || 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://t.me/neurofox_assistant_bot',
        'X-Title': 'NeuroFox AI Assistant'
      }
    });

    const reply = response.data.choices?.[0]?.message?.content || "🤖 Нет ответа.";
    chatHistory[chatId].push({ role: 'assistant', content: reply });

    bot.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🤖 Помощь", callback_data: "help" },
            { text: "🧹 Очистить", callback_data: "clear" },
            { text: "🔁 GPT-4", callback_data: "gpt4" }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('❌ Ошибка OpenRouter:', error?.response?.data || error.message);
    bot.sendMessage(chatId, '⚠️ *Ошибка при запросе к ИИ.*', { parse_mode: 'Markdown' });
  }
}

console.log("✅ NeuroFox с автоязыком запущен!");
