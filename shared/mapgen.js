import config from './config.js';

// Simple seeded RNG (Mulberry32)
export function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generate random points with minimum distance
function generatePoints(count, width, height, rng) {
  const points = [];
  const minDist = Math.min(width, height) / Math.sqrt(count) * 0.6;
  
  while (points.length < count) {
    const x = rng() * width;
    const y = rng() * height;
    let valid = true;
    for (const p of points) {
      const dx = p.x - x, dy = p.y - y;
      if (dx*dx + dy*dy < minDist*minDist) { valid = false; break; }
    }
    if (valid) points.push({ x, y, id: points.length });
  }
  return points;
}

// Lloyd relaxation (simplified)
function relax(points, width, height, iterations, rng) {
  let pts = points.map(p => ({...p}));
  for (let iter = 0; iter < iterations; iter++) {
    // Simple centroid approximation (not true Voronoi, but good enough for MVP)
    const newPts = pts.map((p, i) => {
      let sumX = 0, sumY = 0, count = 0;
      for (const q of pts) {
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 200 && dist > 0) { // Local neighborhood
          sumX += q.x; sumY += q.y; count++;
        }
      }
      if (count > 0) {
        // Blend toward centroid
        return {
          ...p,
          x: p.x * 0.7 + (sumX/count) * 0.3,
          y: p.y * 0.7 + (sumY/count) * 0.3
        };
      }
      return p;
    });
    pts = newPts;
  }
  return pts;
}

// Generate adjacency from Delaunay-ish proximity
function computeAdjacency(points, width, height) {
  const adj = {};
  const maxDist = Math.min(width, height) / 15;
  
  for (let i = 0; i < points.length; i++) {
    adj[i] = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx*dx + dy*dy < maxDist*maxDist) {
        adj[i].push(j);
      }
    }
  }
  return adj;
}

// Generate simple polygon around point (circle approximation)
function generatePolygon(cx, cy, radius, rng) {
  const pts = [];
  const sides = 6 + Math.floor(rng() * 4);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rng() * 0.3;
    const r = radius * (0.7 + rng() * 0.3);
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return pts;
}

export function generateMap(seed) {
  const rng = mulberry32(seed);
  const { PROVINCE_COUNT, WORLD_W, WORLD_H, LLOYD_ITERATIONS } = config;
  
  // Generate and relax points
  let points = generatePoints(PROVINCE_COUNT, WORLD_W, WORLD_H, rng);
  points = relax(points, WORLD_W, WORLD_H, LLOYD_ITERATIONS, rng);
  
  // Compute adjacency
  const adj = computeAdjacency(points, WORLD_W, WORLD_H);
  
  // Generate province data
  const provinces = points.map((p, i) => {
    const radius = Math.min(WORLD_W, WORLD_H) / 25;
    const pts = generatePolygon(p.x, p.y, radius, rng);
    return {
      id: i,
      name: `Province ${i}`,
      cx: p.x, cy: p.y,
      pts,
      ptsStr: pts.map(([x,y]) => `${x},${y}`).join(' '),
      adj: adj[i],
      biome: 'plains',
      biomeColor: config.BIOMES.plains.color,
      defMult: config.BIOMES.plains.defMult,
      capBase: config.BIOMES.plains.capBase,
      incomeBase: config.BASE_INCOME + config.BIOMES.plains.incBonus
    };
  });
  
  return { provinces, W: WORLD_W, H: WORLD_H };
}