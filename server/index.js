import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../shared/config.js';
import { generateMap } from '../shared/mapgen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MAP_SEED = Math.floor(Math.random() * 2**32);

// Serve static files
app.use(express.static(join(__dirname, '../client')));

// Game state
const players = new Map(); // playerId -> { name, color, gold, capitalProv }
const provinces = []; // Runtime province state
let gameDay = 1;
let nextUnitId = 1000;
let nextPlayerId = 1;

// Initialize map geometry (immutable)
const mapGeometry = generateMap(MAP_SEED);

// Initialize province runtime state
function initProvinces() {
  return mapGeometry.provinces.map(p => ({
    ...p,
    owner: null, // null = neutral
    units: [],
    fortified: false,
    income: p.incomeBase,
    battle: null
  }));
}

// Create a new unit
function createUnit(type, hp = null) {
  const template = config.UNITS[type];
  return {
    id: nextUnitId++,
    type,
    hp: hp ?? template.hp,
    maxHp: template.hp
  };
}

// Spawn player with starting provinces
function spawnPlayer(playerId) {
  const player = {
    id: playerId,
    name: `Player ${playerId}`,
    color: `hsl(${playerId * 137 % 360}, 70%, 50%)`,
    gold: config.START_GOLD,
    capitalProv: null
  };
  
  // Claim 2 adjacent neutral provinces as starting territory
  const startProv = mapGeometry.provinces.find(p => p.id === playerId % mapGeometry.provinces.length);
  if (startProv) {
    const prov = provinces[startProv.id];
    prov.owner = playerId;
    prov.units = [createUnit('infantry'), createUnit('infantry')];
    player.capitalProv = startProv.id;
    
    // Claim one adjacent if available
    const adj = startProv.adj.find(adjId => provinces[adjId].owner === null);
    if (adj) {
      const adjProv = provinces[adj];
      adjProv.owner = playerId;
      adjProv.units = [createUnit('infantry')];
    }
  }
  
  return player;
}

// Simple combat resolution (MVP: single round)
function resolveBattle(attackerProv, defenderProv, attackerUnits) {
  const atkPower = attackerUnits.reduce((sum, u) => {
    const t = config.UNITS[u.type];
    return sum + t.atk * (u.hp / u.maxHp);
  }, 0) * config.ATK_DMG_MULT;
  
  const defPower = defenderProv.units.reduce((sum, u) => {
    const t = config.UNITS[u.type];
    return sum + t.def * (u.hp / u.maxHp) * defenderProv.defMult;
  }, 0) * config.DEF_DMG_MULT;
  
  // Apply damage
  const defDamage = atkPower;
  const atkDamage = defPower;
  
  // Damage defenders proportionally
  let remainingDefDamage = defDamage;
  for (const unit of [...defenderProv.units]) {
    if (remainingDefDamage <= 0) break;
    const dmg = Math.min(remainingDefDamage, unit.hp);
    unit.hp -= dmg;
    remainingDefDamage -= dmg;
  }
  defenderProv.units = defenderProv.units.filter(u => u.hp > 0);
  
  // Damage attackers proportionally
  let remainingAtkDamage = atkDamage;
  for (const unit of attackerUnits) {
    if (remainingAtkDamage <= 0) break;
    const dmg = Math.min(remainingAtkDamage, unit.hp);
    unit.hp -= dmg;
    remainingAtkDamage -= dmg;
  }
  
  // Determine outcome
  if (defenderProv.units.length === 0) {
    // Attacker wins - capture province
    defenderProv.owner = attackerProv.owner;
    defenderProv.units = attackerUnits.filter(u => u.hp > 0);
    attackerProv.units = []; // All attacking units moved
    return { result: 'captured', newOwner: defenderProv.owner };
  } else if (attackerUnits.every(u => u.hp <= 0)) {
    // Defender wins
    attackerProv.units = []; // Attackers destroyed
    return { result: 'repelled' };
  } else {
    // Partial - attackers retreat with survivors
    attackerProv.units = attackerUnits.filter(u => u.hp > 0);
    return { result: 'retreated' };
  }
}

// Game tick
function gameTick() {
  gameDay++;
  
  // Income every INCOME_TICK days
  if (gameDay % config.INCOME_TICK === 0) {
    for (const player of players.values()) {
      let income = 0;
      for (const prov of provinces) {
        if (prov.owner === player.id) {
          income += prov.income;
        }
      }
      player.gold += income;
      broadcast({ type: 'gold_update', playerId: player.id, gold: player.gold });
    }
  }
  
  // Broadcast tick
  broadcast({ type: 'tick', day: gameDay });
}

// WebSocket server
const server = app.listen(PORT, () => {
  console.log(`🎮 Dominion MVP running on http://localhost:${PORT}`);
  console.log(`🔗 Share via: npx ngrok http ${PORT}`);
});

const wss = new WebSocketServer({ server });

// Broadcast to all clients
function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

// Send filtered state to a player
function sendState(ws, player) {
  const state = {
    type: 'game_state',
    seed: MAP_SEED,
    map: { provinces: mapGeometry.provinces, W: mapGeometry.W, H: mapGeometry.H },
    state: {
      provinces: provinces.map(p => ({
        id: p.id, owner: p.owner, units: p.units, fortified: p.fortified, battle: p.battle
      })),
      gold: Object.fromEntries([...players].map(([id, p]) => [id, p.gold])),
      day: gameDay
    },
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color
  };
  ws.send(JSON.stringify(state));
}

wss.on('connection', (ws) => {
  console.log('🔗 Client connected');
  
  // Assign player ID
  const playerId = nextPlayerId++;
  const player = spawnPlayer(playerId);
  players.set(playerId, player);
  
  // Send initial state
  sendState(ws, player);
  
  // Broadcast new player
  broadcast({ type: 'player_joined', player: { id: player.id, name: player.name, color: player.color } });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const player = players.get(playerId);
      if (!player) return;
      
      switch (msg.type) {
        case 'recruit': {
          const prov = provinces[msg.provId];
          if (prov.owner !== playerId) break;
          
          const template = config.UNITS.infantry;
          const slotsUsed = prov.units.reduce((sum, u) => sum + config.UNITS[u.type].slots, 0);
          const slotsAvail = prov.capBase - slotsUsed;
          
          if (msg.count > 0 && player.gold >= msg.count * template.cost && msg.count <= slotsAvail) {
            player.gold -= msg.count * template.cost;
            for (let i = 0; i < msg.count; i++) {
              prov.units.push(createUnit('infantry'));
            }
            broadcast({ type: 'province_update', province: {
              id: prov.id, units: prov.units, owner: prov.owner
            }});
            broadcast({ type: 'gold_update', playerId, gold: player.gold });
          }
          break;
        }
        
        case 'march': {
          const from = provinces[msg.from];
          const to = provinces[msg.to];
          if (from.owner !== playerId) break;
          if (!from.adj.includes(msg.to)) break;
          
          // Select units to send (MVP: send all infantry for simplicity)
          const unitsToSend = from.units.filter(u => u.type === 'infantry').slice(0, msg.count || from.units.length);
          if (unitsToSend.length === 0) break;
          
          // Remove from source
          from.units = from.units.filter(u => !unitsToSend.includes(u));
          
          // Handle arrival (MVP: instant for simplicity, add delay later)
          if (to.owner === playerId) {
            // Reinforce
            to.units.push(...unitsToSend);
            broadcast({ type: 'province_update', province: {
              id: to.id, units: to.units, owner: to.owner
            }});
          } else if (to.owner === null) {
            // Claim neutral
            to.owner = playerId;
            to.units = unitsToSend;
            broadcast({ type: 'province_update', province: {
              id: to.id, units: to.units, owner: to.owner
            }});
          } else {
            // Attack enemy
            const result = resolveBattle(from, to, unitsToSend);
            broadcast({ type: 'battle_result', provId: to.id, result,
              attackerUnits: from.units, defenderUnits: to.units });
            broadcast({ type: 'province_update', province: {
              id: to.id, units: to.units, owner: to.owner
            }});
            if (from.units.length > 0) {
              broadcast({ type: 'province_update', province: {
                id: from.id, units: from.units, owner: from.owner
              }});
            }
          }
          break;
        }
        
        case 'chat': {
          broadcast({ type: 'chat', playerId, name: player.name, text: msg.text });
          break;
        }
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });
  
  ws.on('close', () => {
    console.log(`❌ Player ${playerId} disconnected`);
    // Optional: clean up player provinces or mark as AI
    players.delete(playerId);
    broadcast({ type: 'player_left', playerId });
  });
});

// Start game loop
setInterval(gameTick, config.TICK_MS);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close();
  process.exit(0);
});