const express = require('express');
const { exec } = require('child_process');
const app = express();

app.use(express.json());

app.post('/update-bot', (req, res) => {
  console.log("📦 Получен Webhook от GitHub. Обновляю бот...");

  exec('git pull && pm2 restart neurofox', (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Ошибка при обновлении:", stderr);
      return res.status(500).send("Ошибка при обновлении");
    }

    console.log("✅ Успешно обновлено:\n", stdout);
    res.send("Бот обновлён и перезапущен!");
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook-сервер запущен на http://localhost:${PORT}`);
});
