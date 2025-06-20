require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

console.log("✅ NeuroFox загружается...");

// Создаем бот с polling
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Простая клавиатура с кнопками
const keyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "Clear чат" }],
      [{ text: "Помощь" }],
      [{ text: "О боте" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  }
};

// Хранилище истории сообщений для каждого пользователя
const chatHistory = {};

// Функция получения ответа от OpenRouter API (ChatGPT)
async function getAIResponse(messages) {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "openrouter/openai/gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка запроса к ИИ:', error.response?.data || error.message);
    return "❌ Ошибка при обработке запроса к ИИ.";
  }
}

// Обработка входящих сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text) return;

  // Команды
  if (text === "/start") {
    await bot.sendMessage(chatId, "Привет! Я NeuroFox — твой ИИ ассистент.\nНапиши что-нибудь, и я отвечу!", keyboard);
    chatHistory[userId] = [];
    return;
  }

  if (text === "Clear чат") {
    chatHistory[userId] = [];
    await bot.sendMessage(chatId, "🧹 История чата очищена.", keyboard);
    return;
  }

  if (text === "Помощь") {
    await bot.sendMessage(chatId,
      "🛠️ Вот что я умею:\n" +
      "- Отвечать на любые вопросы\n" +
      "- Очистка истории чата\n" +
      "- Поддержка кнопок\n" +
      "- Автоопределение языка\n\n" +
      "Просто напиши мне что-нибудь.",
      keyboard);
    return;
  }

  if (text === "О боте") {
    await bot.sendMessage(chatId,
      "NeuroFox — ИИ-бот на базе OpenRouter API и Telegram.\n" +
      "Создан с любовью для помощи тебе.",
      keyboard);
    return;
  }

  // Добавляем сообщение пользователя в историю
  if (!chatHistory[userId]) chatHistory[userId] = [];
  chatHistory[userId].push({ role: "user", content: text });

  await bot.sendChatAction(chatId, 'typing');

  // Получаем ответ от ИИ
  const aiResponse = await getAIResponse(chatHistory[userId]);

  // Добавляем ответ ИИ в историю
  chatHistory[userId].push({ role: "assistant", content: aiResponse });

  // Отправляем ответ пользователю
  await bot.sendMessage(chatId, aiResponse, { parse_mode: 'Markdown', reply_markup: keyboard });
});

console.log("✅ NeuroFox запущен. Жду сообщений...");
