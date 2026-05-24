/**
 * Dominion.io — Client entry point
 * Initializes canvas, camera, renderer, input, and game loop
 */

import { generateMap } from '../shared/mapgen.js';
import { MAP } from '../shared/config.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { GameState } from './state.js';

// Setup canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth - 300; // Account for sidebar
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Initialize game
const camera = new Camera(canvas.width, canvas.height);
const renderer = new Renderer(canvas, camera);

// Generate map
const provinces = generateMap(MAP.SEED);
console.log(`Generated ${provinces.length} provinces`);

// Initialize state
const gameState = new GameState(provinces);

// Setup input
const inputHandler = new InputHandler(canvas, camera, {
  onLeftClick: (worldX, worldY, e) => {
    const clicked = findProvinceAt(worldX, worldY, provinces);
    if (clicked) {
      selectProvince(clicked);
    }
  },
  onMouseMove: (worldX, worldY, e) => {
    const hovered = findProvinceAt(worldX, worldY, provinces);
    updateHoverInfo(hovered);
  },
  onCameraMoved: () => {
    updateDebugInfo();
    frameScheduled = false; // Trigger redraw
  },
  onSpacePress: () => {
    const capital = gameState.getCapital();
    if (capital) {
      camera.centerOn(capital.cx, capital.cy);
      updateDebugInfo();
    }
  },
});

// Selected province
let selectedProvince = null;

function selectProvince(province) {
  selectedProvince = province;
  updateSidebarInfo();
  console.log(`Selected: ${province.name} (${province.id})`);
}

function updateSidebarInfo() {
  const info = document.getElementById('provinceInfo');
  if (!selectedProvince) {
    info.innerHTML = 'Click a province to view details';
    return;
  }
  const p = selectedProvince;
  info.innerHTML = `
    <div><strong>${p.name}</strong></div>
    <div>ID: ${p.id}</div>
    <div>Biome: ${p.biome}</div>
    <div>Pos: (${Math.round(p.cx)}, ${Math.round(p.cy)})</div>
    <div>Cap: ${p.capBase} | Income: ${p.incomeBase}</div>
    <div>Def mult: ${p.defMult.toFixed(2)}x</div>
    <div style="margin-top: 8px; color: #666; font-size: 11px;">
      Adjacent: ${p.adj.length} provinces
    </div>
  `;
}

function findProvinceAt(x, y, provinces) {
  // Simple: find closest centroid
  let closest = null;
  let minDist = 100; // Threshold
  for (const p of provinces) {
    const dx = p.cx - x;
    const dy = p.cy - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      closest = p;
    }
  }
  return closest;
}

function updateHoverInfo(province) {
  const tooltip = document.getElementById('tooltip');
  if (!province) {
    tooltip.style.display = 'none';
    return;
  }
  tooltip.innerHTML = `<strong>${province.name}</strong><br>${province.biome}`;
  tooltip.style.display = 'block';
  tooltip.style.left = event?.clientX + 10 + 'px';
  tooltip.style.right = 'auto';
  tooltip.style.top = event?.clientY + 10 + 'px';
}

function updateDebugInfo() {
  const debug = document.getElementById('debugInfo');
  const showDebug = localStorage.getItem('showDebug') === 'true';
  debug.style.display = showDebug ? 'block' : 'none';
  if (showDebug) {
    document.getElementById('debugZoom').textContent = camera.zoom.toFixed(2);
    document.getElementById('debugPan').textContent = `${Math.round(camera.centerX)}, ${Math.round(camera.centerY)}`;
  }
}

// Toggle debug with Ctrl+D
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'd') {
    const current = localStorage.getItem('showDebug') === 'true';
    localStorage.setItem('showDebug', !current);
    updateDebugInfo();
  }
});

// Game loop
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsUpdateTime = lastFrameTime;
let frameScheduled = false;

function gameLoop() {
  const now = performance.now();
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  // Update FPS
  frameCount++;
  if (now - fpsUpdateTime >= 1000) {
    document.getElementById('debugFps').textContent = frameCount;
    frameCount = 0;
    fpsUpdateTime = now;
  }

  // Update UI
  document.getElementById('statDay').textContent = gameState.day;
  document.getElementById('statGold').textContent = gameState.gold;

  // Handle continuous key movement
  inputHandler.handleMovement();

  // Render
  renderer.render(gameState.provinces, {
    playerId: gameState.playerId,
    playerColor: gameState.playerColor,
    scoutedProvinces: gameState.scoutedProvinces,
  });

  requestAnimationFrame(gameLoop);
}

// Start
console.log('Dominion.io client initialized');
gameLoop();
