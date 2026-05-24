/**
 * Dominion.io — Server-side game state & logic (stub)
 */

import { generateMap } from '../shared/mapgen.js';
import { MAP } from '../shared/config.js';

export class GameServer {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Map();
    this.provinces = generateMap(MAP.SEED);
    this.gameDay = 1;
    this.gameYear = 1;
    this.gameRunning = true;

    console.log(`[Game] Initialized with ${this.provinces.length} provinces`);

    // TODO: Implement game loop
    // this.startGameLoop();
  }

  addClient(ws) {
    const playerId = Math.random().toString(36).substr(2, 9);
    this.clients.set(ws, {
      id: playerId,
      ws,
      name: `Player ${this.clients.size + 1}`,
    });

    // Send welcome
    ws.send(
      JSON.stringify({
        type: 'welcome',
        playerId,
        playerName: `Player ${this.clients.size}`,
        playerColor: this.randomColor(),
        seed: MAP.SEED,
      })
    );
  }

  removeClient(ws) {
    this.clients.delete(ws);
  }

  handleMessage(ws, msg) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      // TODO: order, bombard, retreat, recruit, fortify, chat
      default:
        console.log(`[Game] Unknown message type: ${msg.type}`);
    }
  }

  randomColor() {
    const colors = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // TODO: Game loop tick function
  // tick() {
  //   this.gameDay++;
  //   if (this.gameDay > 30) {
  //     this.gameDay = 1;
  //     this.gameYear++;
  //   }
  //   // TODO: Resolve combats, income, encirclement, AI moves
  //   // TODO: Broadcast state updates
  // }
}
