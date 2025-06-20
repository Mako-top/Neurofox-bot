require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

console.log("✅ NeuroFox загружается...");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// === Обработка обычных сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  // Пропускаем команды вроде /start и /donate
  if (!userMessage || userMessage.startsWith('/')) return;

  bot.sendChatAction(chatId, 'typing');

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "openrouter/openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://t.me/neurofox_assistant_bot',
        'X-Title': 'NeuroFox AI Assistant'
      }
    });

    const reply = response.data.choices?.[0]?.message?.content || "❌ ИИ не дал ответа.";
    bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error("❌ Ошибка:", error?.response?.data || error.message);
    bot.sendMessage(chatId, '⚠️ Произошла ошибка. Попробуй позже.');
  }
});

// === /donate — Показать кнопку Kaspi
bot.onText(/\/donate/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🙏 Спасибо за поддержку! Перевод через Kaspi:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💳 Перевести на Kaspi", url: "https://kaspi.kz/transfer/Mako-top" }
        ]
      ]
    }
  });
});

console.log("✅ NeuroFox с Kaspi-донатом запущен!");
