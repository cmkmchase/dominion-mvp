import config from '../shared/config.js';
import { GameState } from './state.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const dayDisplay = document.getElementById('dayDisplay');
const goldDisplay = document.getElementById('goldDisplay');
const provCount = document.getElementById('provCount');
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panelTitle');
const panelContent = document.getElementById('panelContent');
const panelControls = document.getElementById('panelControls');
const tooltip = document.getElementById('tooltip');
const zoomIndicator = document.getElementById('zoomIndicator');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatText');

// Game state
const game = new GameState();
const camera = new Camera(canvas, config.WORLD_W, config.WORLD_H);
const renderer = new Renderer(canvas, camera);
let ws = null;
let pendingMarch = null;

// Resize handling
function resize() {
  camera.resize();
  render();
}
window.addEventListener('resize', resize);

// Render loop
function render() {
  renderer.render(game);
}

// Update UI
function updateUI() {
  dayDisplay.textContent = game.day;
  goldDisplay.textContent = game.gold;
  provCount.textContent = game.getOwnedProvinces().length;
  zoomIndicator.textContent = `Zoom: ${camera.zoom.toFixed(1)}x`;
}

// Show province panel
function showProvincePanel(prov) {
  panel.classList.add('visible');
  panelTitle.textContent = `${prov.name} • ${prov.biome}`;
  
  let html = `<div>Owner: ${prov.owner === null ? 'Neutral' : prov.owner === game.playerId ? 'You' : 'Enemy'}</div>`;
  html += `<div>Capacity: ${prov.units.reduce((s,u)=>s+config.UNITS[u.type].slots,0)}/${prov.capBase}</div>`;
  html += `<div>Units: ${prov.units?.length || 0} infantry</div>`;
  if (prov.fortified) html += `<div>🔒 Fortified</div>`;
  panelContent.innerHTML = html;
  
  // Controls
  panelControls.innerHTML = '';
  
  if (prov.owner === game.playerId) {
    // Recruit
    const recruitBtn = document.createElement('button');
    recruitBtn.textContent = '+ Recruit Infantry (20g)';
    recruitBtn.disabled = !game.canRecruit(prov, 1);
    recruitBtn.onclick = () => {
      if (game.canRecruit(prov, 1)) {
        ws.send(JSON.stringify({ type: 'recruit', provId: prov.id, count: 1 }));
      }
    };
    panelControls.appendChild(recruitBtn);
    
    // March mode
    const marchBtn = document.createElement('button');
    marchBtn.textContent = '→ March Orders';
    marchBtn.onclick = () => {
      game.marchSource = prov.id;
      render();
    };
    panelControls.appendChild(marchBtn);
  }
  
  // Close
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  closeBtn.onclick = () => {
    panel.classList.remove('visible');
    game.selectedProv = null;
    game.marchSource = null;
    render();
  };
  panelControls.appendChild(closeBtn);
}

// Hide panel
function hidePanel() {
  panel.classList.remove('visible');
  game.selectedProv = null;
  game.marchSource = null;
}

// Show tooltip
function showTooltip(text, x, y) {
  tooltip.textContent = text;
  tooltip.style.left = (x + 12) + 'px';
  tooltip.style.top = (y + 12) + 'px';
  tooltip.classList.add('visible');
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// Connect to server
function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onopen = () => console.log('🔗 Connected to server');
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    switch (msg.type) {
      case 'game_state':
        game.init(msg.map);
        game.playerId = msg.playerId;
        game.playerName = msg.playerName;
        game.playerColor = msg.playerColor;
        game.gold = msg.state.gold[msg.playerId] || 0;
        game.day = msg.state.day;
        renderer.setPlayerColor(msg.playerColor);
        
        // Apply runtime state
        for (const p of msg.state.provinces) {
          game.updateProvince(p);
        }
        updateUI();
        render();
        break;
        
      case 'province_update':
        game.updateProvince(msg.province);
        if (game.selectedProv === msg.province.id) {
          showProvincePanel(game.provinces.get(msg.province.id));
        }
        render();
        break;
        
      case 'gold_update':
        if (msg.playerId === game.playerId) {
          game.gold = msg.gold;
          updateUI();
        }
        break;
        
      case 'tick':
        game.day = msg.day;
        updateUI();
        break;
        
      case 'battle_result':
        // Could add animation here
        console.log('⚔️ Battle result:', msg.result);
        break;
        
      case 'chat':
        const msgEl = document.createElement('div');
        msgEl.className = 'msg';
        msgEl.innerHTML = `<span class="name" style="color:${msg.playerId === game.playerId ? game.playerColor : `hsl(${msg.playerId * 137 % 360}, 70%, 50%)`}">[${msg.name}]</span>: ${msg.text}`;
        chatLog.appendChild(msgEl);
        chatLog.scrollTop = chatLog.scrollHeight;
        break;
        
      case 'player_joined':
        addChatSystem(`🎉 ${msg.player.name} joined the game`);
        break;
        
      case 'player_left':
        addChatSystem(`❌ Player left`);
        break;
    }
  };
  
  ws.onclose = () => {
    console.log('❌ Disconnected');
    addChatSystem('🔌 Disconnected from server');
    setTimeout(connect, 2000);
  };
}

function addChatSystem(text) {
  const el = document.createElement('div');
  el.className = 'msg';
  el.style.color = '#888';
  el.textContent = text;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Handle user actions
function handleAction(type, data) {
  switch (type) {
    case 'click': {
      // Find clicked province
      const { worldX, worldY, screenX, screenY } = data;
      let clicked = null;
      for (const prov of game.provinces.values()) {
        // Point-in-polygon test (ray casting)
        let inside = false;
        const pts = prov.pts;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (((yi > worldY) !== (yj > worldY)) && 
              (worldX < (xj - xi) * (worldY - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        if (inside) { clicked = prov; break; }
      }
      
      if (!clicked) { hidePanel(); render(); return; }
      
      // March mode: select target
      if (game.marchSource && game.marchSource !== clicked.id) {
        const from = game.provinces.get(game.marchSource);
        const to = clicked;
        if (game.canMarch(from, to, 1)) {
          ws.send(JSON.stringify({ type: 'march', from: from.id, to: to.id, count: 1 }));
        }
        hidePanel();
        game.marchSource = null;
        render();
        return;
      }
      
      // Normal select
      game.selectedProv = clicked.id;
      showProvincePanel(clicked);
      render();
      break;
    }
    
    case 'zoom':
      updateUI();
      render();
      break;
      
    case 'pan':
      render();
      break;
      
    case 'center': {
      // Center on capital (first owned province)
      const capital = game.getOwnedProvinces()[0];
      if (capital) {
        camera.centerOn(capital.cx, capital.cy);
        render();
      }
      break;
    }
    
    case 'recruit': {
      if (game.selectedProv) {
        const prov = game.provinces.get(game.selectedProv);
        if (game.canRecruit(prov, 1)) {
          ws.send(JSON.stringify({ type: 'recruit', provId: prov.id, count: 1 }));
        }
      }
      break;
    }
    
    case 'cancel':
      hidePanel();
      render();
      break;
  }
}

// Setup input
const input = new InputHandler(canvas, camera, handleAction);

// Chat
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    ws.send(JSON.stringify({ type: 'chat', text: chatInput.value.trim() }));
    chatInput.value = '';
  }
});

// Mouse hover for tooltips
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const { x, y } = camera.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  
  // Find province under mouse
  for (const prov of game.provinces.values()) {
    let inside = false;
    const pts = prov.pts;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    if (inside) {
      showTooltip(`${prov.name}\n${prov.biome}\n${prov.owner === null ? 'Neutral' : prov.owner === game.playerId ? 'You' : 'Enemy'}`, e.clientX, e.clientY);
      canvas.style.cursor = 'pointer';
      return;
    }
  }
  hideTooltip();
  canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('mouseleave', hideTooltip);

// Start
resize();
connect();
render();
addChatSystem('🎮 Welcome to Dominion.io MVP!');
addChatSystem('💡 Tip: Click a province to select, recruit infantry, then march to adjacent provinces');