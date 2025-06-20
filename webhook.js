const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

app.post('/update-bot', (req, res) => {
  console.log("📦 Получен push от GitHub, обновляю бота...");

  exec('git pull && pm2 restart neurofox', (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Ошибка при обновлении: ${stderr}`);
      return res.status(500).send('Ошибка обновления');
    }
    console.log(`✅ Обновление завершено:\n${stdout}`);
    res.send('Обновлено успешно!');
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook-сервер запущен на http://localhost:${PORT}`);
});

