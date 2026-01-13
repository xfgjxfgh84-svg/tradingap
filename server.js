const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Daha stabil bağlantı üçün alternativ stream ünvanı
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdc@ticker';

function startBinanceStream() {
    console.log("Frankfurt üzərindən Binance-a qoşulur...");
    const binanceConn = new WebSocket(BINANCE_WS_URL);

    binanceConn.on('open', () => {
        console.log("UĞURLU: Binance bağlantısı açıldı!");
    });

    binanceConn.on('message', (data) => {
        try {
            const raw = JSON.parse(data);
            io.emit('marketData', {
                price: parseFloat(raw.c).toFixed(2),
                change: parseFloat(raw.P).toFixed(2)
            });
        } catch (e) {
            console.log("Data xətası:", e);
        }
    });

    binanceConn.on('error', (err) => {
        console.log("XƏTA: ", err.message);
    });

    binanceConn.on('close', () => {
        console.log("Bağlantı qopdu, 5 saniyəyə bərpa olunur...");
        setTimeout(startBinanceStream, 5000);
    });
}

startBinanceStream();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
