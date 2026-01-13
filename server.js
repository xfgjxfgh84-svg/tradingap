const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const multer = require('multer'); // Yeni: Faylları tutmaq üçün
const axios = require('axios');   // Yeni: Telegram-a məlumat göndərmək üçün
const FormData = require('form-data');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- AYARLAR ---
const BOT_TOKEN = 'BURA_BOT_TOKENİNİ_YAZ'; 
const ADMIN_ID = 'BURA_ID_Nİ_YAZ'; 
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdc@ticker';

// ---------------------------------------------------------
// 1. YENİ FUNKSİYA: Depozit Çekini Telegram-a göndərmək
// ---------------------------------------------------------
app.post('/upload-receipt', upload.single('receipt'), async (req, res) => {
    try {
        const { amount } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'Fayl yüklənmədi' });

        // Telegram-a şəkli və yazını paketləyib göndəririk
        const formData = new FormData();
        formData.append('chat_id', ADMIN_ID);
        formData.append('caption', `🔔 YENİ DEPOZİT SORĞUSU!\n💰 Məbləğ: ${amount} USDT\n\nYuxarıdakı məbləğin çeklə uyğunluğunu yoxlayın.`);
        formData.append('photo', file.buffer, { filename: file.originalname });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, {
            headers: formData.getHeaders()
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Telegram xətası:", error.message);
        res.status(500).json({ success: false });
    }
});

// ---------------------------------------------------------
// 2. KÖHNƏ FUNKSİYA: Binance Canlı Qiymət (Dəyişməz qaldı)
// ---------------------------------------------------------
function startBinanceStream() {
    console.log("Binance bağlantısı aktivdir...");
    const binanceConn = new WebSocket(BINANCE_WS_URL);
    
    binanceConn.on('message', (data) => {
        try {
            const raw = JSON.parse(data);
            // Frontend-ə qiyməti göndəririk
            io.emit('marketData', {
                price: parseFloat(raw.c).toFixed(2),
                change: parseFloat(raw.P).toFixed(2)
            });
        } catch (e) {
            console.log("Data parsing xətası:", e);
        }
    });

    binanceConn.on('close', () => {
        console.log("Bağlantı kəsildi, 5 saniyəyə bərpa olunur...");
        setTimeout(startBinanceStream, 5000);
    });
}

startBinanceStream();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
