/**
 * Dominion.io — Voronoi Map Generator
 * Bowyer-Watson Delaunay + Lloyd relaxation
 * Seeded PRNG for deterministic map generation
 */

import { MAP, BIOME_LIST } from './config.js';

/**
 * Seeded PRNG (Linear Congruential Generator)
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return (this.seed >>> 0) / 0x100000000;
  }
}

/**
 * Generate random points using seeded PRNG
 */
function generatePoints(count, width, height, seed) {
  const rng = new SeededRandom(seed);
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push([
      rng.next() * width,
      rng.next() * height,
    ]);
  }
  return points;
}

/**
 * Distance between two points
 */
function dist(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Lloyd relaxation: move points towards centroid of their Voronoi cells
 * Simplified: average neighboring Delaunay vertices per point
 * For production, use true Voronoi → centroid. This is fast approximation.
 */
function lloydRelaxation(points, iterations = 4) {
  let current = points.map(p => [...p]);
  for (let iter = 0; iter < iterations; iter++) {
    const next = current.map((p, i) => {
      // Find k-nearest neighbors and average
      const neighbors = current
        .map((q, j) => ({ q, dist: dist(p, q), j }))
        .filter(x => x.j !== i)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 6); // 6 neighbors
      const cx = (p[0] + neighbors.reduce((sum, x) => sum + x.q[0], 0)) / (neighbors.length + 1);
      const cy = (p[1] + neighbors.reduce((sum, x) => sum + x.q[1], 0)) / (neighbors.length + 1);
      return [cx, cy];
    });
    current = next;
  }
  return current;
}

/**
 * Bowyer-Watson Delaunay triangulation
 * Returns list of triangles: [[p0, p1, p2], ...]
 */
function delaunayTriangulation(points) {
  const triangles = [];
  const width = MAP.WIDTH;
  const height = MAP.HEIGHT;

  // Super-triangle: covers entire map
  const p0 = [-width * 2, -height * 2];
  const p1 = [width * 3, -height * 2];
  const p2 = [width / 2, height * 3];
  triangles.push([p0, p1, p2]);

  // Insert each point
  for (const point of points) {
    const badTriangles = [];
    for (const tri of triangles) {
      if (isInsideCircumcircle(point, tri)) {
        badTriangles.push(tri);
      }
    }
    const polygon = [];
    for (const tri of badTriangles) {
      for (let i = 0; i < 3; i++) {
        const edge = [tri[i], tri[(i + 1) % 3]];
        let isBoundary = true;
        for (const other of badTriangles) {
          if (other === tri) continue;
          for (let j = 0; j < 3; j++) {
            const otherEdge = [other[j], other[(j + 1) % 3]];
            if (edgesEqual(edge, otherEdge)) {
              isBoundary = false;
              break;
            }
          }
          if (!isBoundary) break;
        }
        if (isBoundary) polygon.push(edge);
      }
    }
    for (const tri of badTriangles) {
      const idx = triangles.indexOf(tri);
      if (idx > -1) triangles.splice(idx, 1);
    }
    for (const edge of polygon) {
      triangles.push([edge[0], edge[1], point]);
    }
  }

  // Remove triangles with super-triangle vertices
  return triangles.filter(
    tri => !tri.some(p => p === p0 || p === p1 || p === p2)
  );
}

/**
 * Check if point is inside circumcircle of triangle
 */
function isInsideCircumcircle(point, triangle) {
  const [a, b, c] = triangle;
  const ax = a[0], ay = a[1];
  const bx = b[0], by = b[1];
  const cx = c[0], cy = c[1];
  const px = point[0], py = point[1];

  const ax2 = ax * ax + ay * ay;
  const bx2 = bx * bx + by * by;
  const cx2 = cx * cx + cy * cy;
  const px2 = px * px + py * py;

  const det =
    ax * (by - cy) + bx * (cy - ay) + cx * (ay - by);
  if (Math.abs(det) < 1e-10) return false;

  const ccx =
    (ax2 * (by - cy) + bx2 * (cy - ay) + cx2 * (ay - by)) / (2 * det);
  const ccy =
    (ax2 * (cx - bx) + bx2 * (ax - cx) + cx2 * (bx - ax)) / (2 * det);
  const r2 = (ccx - ax) * (ccx - ax) + (ccy - ay) * (ccy - ay);

  const d2 = (px - ccx) * (px - ccx) + (py - ccy) * (py - ccy);
  return d2 < r2 + 1e-10;
}

/**
 * Check if two edges are equal (ignoring direction)
 */
function edgesEqual(e1, e2) {
  const [p1, p2] = e1;
  const [p3, p4] = e2;
  return (
    (p1[0] === p3[0] && p1[1] === p3[1] && p2[0] === p4[0] && p2[1] === p4[1]) ||
    (p1[0] === p4[0] && p1[1] === p4[1] && p2[0] === p3[0] && p2[1] === p3[1])
  );
}

/**
 * Build adjacency from Delaunay triangles
 */
function buildAdjacency(points, triangles) {
  const n = points.length;
  const adj = Array(n).fill(null).map(() => new Set());

  for (const tri of triangles) {
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const pi = points.findIndex(p => p === tri[i]);
        const pj = points.findIndex(p => p === tri[j]);
        if (pi > -1 && pj > -1) {
          adj[pi].add(pj);
          adj[pj].add(pi);
        }
      }
    }
  }

  return adj.map(s => Array.from(s));
}

/**
 * Assign biome based on point location (noise-based)
 */
function assignBiome(x, y, seed) {
  const rng = new SeededRandom(seed + Math.floor(x / 100) * 73856093 ^ Math.floor(y / 100) * 19349663);
  const val = rng.next();
  // Simple noise: wrap around map edges
  const nx = (x / MAP.WIDTH) * 2;
  const ny = (y / MAP.HEIGHT) * 2;
  const noise = Math.sin(nx * 3) * Math.cos(ny * 2) * 0.5 + 0.5;
  const biomeIdx = Math.floor((val * 0.6 + noise * 0.4) * BIOME_LIST.length);
  return BIOME_LIST[Math.max(0, Math.min(biomeIdx, BIOME_LIST.length - 1))];
}

/**
 * Generate complete map
 */
export function generateMap(seed = MAP.SEED) {
  const width = MAP.WIDTH;
  const height = MAP.HEIGHT;
  const count = MAP.PROVINCE_COUNT;

  // Generate points
  let points = generatePoints(count, width, height, seed);

  // Clamp to map bounds
  points = points.map(p => [
    Math.max(0, Math.min(p[0], width)),
    Math.max(0, Math.min(p[1], height)),
  ]);

  // Lloyd relaxation
  points = lloydRelaxation(points, 4);

  // Delaunay triangulation
  const triangles = delaunayTriangulation(points);

  // Build adjacency
  const adjacency = buildAdjacency(points, triangles);

  // Assign biomes and build provinces
  const provinces = points.map((p, i) => {
    const biome = assignBiome(p[0], p[1], seed);
    return {
      id: i,
      name: `Province ${i}`, // TODO: procedural naming
      cx: p[0],
      cy: p[1],
      pts: buildProvincePolygon(p, points, adjacency[i], triangles),
      adj: adjacency[i],
      biome: biome.name,
      color: biome.color,
      defMult: biome.defMult,
      capBase: biome.capBase,
      incomeBase: biome.incomeBase,
    };
  });

  return provinces;
}

/**
 * Build polygon vertices for province (simplified Voronoi cell)
 * Uses centroid of adjacent points as polygon vertices
 */
function buildProvincePolygon(center, allPoints, adjacentIds, triangles) {
  // Collect all triangles containing this point
  const pts = [center];
  const seen = new Set();

  for (const tri of triangles) {
    if (!tri.some(p => p === center)) continue;
    for (const p of tri) {
      if (p !== center) {
        const key = `${p[0]},${p[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          pts.push(p);
        }
      }
    }
  }

  // Sort by angle from center
  pts.sort((a, b) => {
    const angleA = Math.atan2(a[1] - center[1], a[0] - center[0]);
    const angleB = Math.atan2(b[1] - center[1], b[0] - center[0]);
    return angleA - angleB;
  });

  return pts.map(p => [p[0], p[1]]);
}
