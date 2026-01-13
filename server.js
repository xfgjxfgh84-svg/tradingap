const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();

// CORS ayarı: Frontend harada host olunacaqsa ora icazə verməliyik
app.use(cors({
    origin: "*", // Realda bura frontend linkini yazacaqsınız
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
let binanceConn;

function startBinanceStream() {
    binanceConn = new WebSocket(BINANCE_WS_URL);

    binanceConn.on('message', (data) => {
        try {
            const raw = JSON.parse(data);
            const ticker = {
                price: parseFloat(raw.c).toFixed(2),
                change: parseFloat(raw.P).toFixed(2),
                symbol: "BTC/USDT"
            };
            io.emit('marketData', ticker);
        } catch (e) {
            console.error("Data parse xətası:", e);
        }
    });

    binanceConn.on('close', () => {
        console.log('Binance qopdu, 5 san sonra bərpa olunur...');
        setTimeout(startBinanceStream, 5000);
    });

    binanceConn.on('error', (err) => console.log("WS Xətası:", err));
}

startBinanceStream();

// VACİB DƏYİŞİKLİK: Hostinq provayderinin verdiyi PORT-u istifadə etmək
const PORT = process.env.PORT || 4000; 

server.listen(PORT, () => {
    console.log(`Server ${PORT} portunda aktivdir.`);
});
