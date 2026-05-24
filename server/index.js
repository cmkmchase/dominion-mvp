/**
 * Dominion.io — Server entry point
 * Express static file server + WebSocket game server
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GameServer } from './game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Serve client and shared
app.use(express.static(join(__dirname, '../client')));
app.use(express.static(join(__dirname, '../shared')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../client/index.html'));
});

// Initialize game server
const gameServer = new GameServer(wss);

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log(`[WS] Client connected. Total: ${wss.clients.size}`);
  gameServer.addClient(ws);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      gameServer.handleMessage(ws, msg);
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  });

  ws.on('close', () => {
    gameServer.removeClient(ws);
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});

// HTTP server
httpServer.listen(port, () => {
  console.log(`[Server] Dominion.io running on http://localhost:${port}`);
  console.log(`[Server] For LAN, use ngrok: npx ngrok http ${port}`);
});
