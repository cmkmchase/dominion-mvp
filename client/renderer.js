import config from '../shared/config.js';

export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.playerColor = '#4a90d9';
  }
  
  setPlayerColor(color) {
    this.playerColor = color;
  }
  
  clear() {
    this.ctx.fillStyle = '#0a0e14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawProvince(prov, isScouted = true) {
    const ctx = this.ctx;
    const owner = prov.owner;
    const ownerColor = owner === null ? '#444' : 
      (owner === 'self' ? this.playerColor : `hsl(${owner * 137 % 360}, 70%, 50%)`);
    
    // Fill polygon
    ctx.beginPath();
    const [first, ...rest] = prov.pts;
    const [fx, fy] = this.camera.worldToScreen(first[0], first[1]);
    ctx.moveTo(fx, fy);
    for (const [x, y] of rest) {
      const [sx, sy] = this.camera.worldToScreen(x, y);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    
    // Blend biome + owner color
    const biome = config.BIOMES[prov.biome];
    ctx.fillStyle = this.blendColors(biome.color, ownerColor, 0.65);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = owner === null ? '#334' : ownerColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  drawBorders(provinces) {
    const ctx = this.ctx;
    // Political borders (owner changes)
    for (const prov of provinces) {
      for (const adjId of prov.adj) {
        const adj = provinces.find(p => p.id === adjId);
        if (!adj || prov.owner === adj.owner) continue;
        
        // Draw thick border between different owners
        const [p1, p2] = this.findSharedEdge(prov.pts, adj.pts);
        if (!p1 || !p2) continue;
        const [sx1, sy1] = this.camera.worldToScreen(p1[0], p1[1]);
        const [sx2, sy2] = this.camera.worldToScreen(p2[0], p2[1]);
        
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2.5 / this.camera.zoom;
        ctx.stroke();
      }
    }
  }
  
  findSharedEdge(pts1, pts2) {
    // Simplified: return first close pair
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const dx = p1[0]-p2[0], dy = p1[1]-p2[1];
        if (dx*dx + dy*dy < 100) return [p1, p2];
      }
    }
    return [null, null];
  }
  
  drawOwnershipMarkers(provinces) {
    const ctx = this.ctx;
    for (const prov of provinces) {
      if (prov.owner === null) continue;
      const [sx, sy] = this.camera.worldToScreen(prov.cx, prov.cy);
      const ownerColor = prov.owner === 'self' ? this.playerColor : 
        `hsl(${prov.owner * 137 % 360}, 70%, 50%)`;
      
      ctx.fillStyle = ownerColor;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      
      // Unit count at medium zoom
      if (this.camera.zoom >= 0.4 && prov.units?.length > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(prov.units.length, sx, sy - 8);
      }
    }
  }
  
  drawSelection(prov) {
    if (!prov) return;
    const ctx = this.ctx;
    ctx.beginPath();
    const [first, ...rest] = prov.pts;
    const [fx, fy] = this.camera.worldToScreen(first[0], first[1]);
    ctx.moveTo(fx, fy);
    for (const [x, y] of rest) {
      const [sx, sy] = this.camera.worldToScreen(x, y);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 / this.camera.zoom;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  drawValidTargets(prov, game) {
    if (!prov || prov.owner !== game.playerId) return;
    const ctx = this.ctx;
    for (const adjId of prov.adj) {
      const adj = game.provinces.get(adjId);
      if (!adj) continue;
      const [sx, sy] = this.camera.worldToScreen(adj.cx, adj.cy);
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.stroke();
    }
  }
  
  drawMarchArrow(from, to) {
    const ctx = this.ctx;
    const [sx1, sy1] = this.camera.worldToScreen(from.cx, from.cy);
    const [sx2, sy2] = this.camera.worldToScreen(to.cx, to.cy);
    
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.strokeStyle = '#ffd93d';
    ctx.lineWidth = 2 / this.camera.zoom;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Arrowhead
    const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
    ctx.beginPath();
    ctx.moveTo(sx2, sy2);
    ctx.lineTo(sx2 - 8 * Math.cos(angle - 0.4), sy2 - 8 * Math.sin(angle - 0.4));
    ctx.lineTo(sx2 - 8 * Math.cos(angle + 0.4), sy2 - 8 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = '#ffd93d';
    ctx.fill();
  }
  
  blendColors(c1, c2, t) {
    const parse = (c) => {
      if (c.startsWith('#')) {
        const hex = c.slice(1);
        return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
      }
      return [100, 100, 100];
    };
    const [r1,g1,b1] = parse(c1), [r2,g2,b2] = parse(c2);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `rgb(${r},${g},${b})`;
  }
  
  render(game) {
    this.clear();
    
    // Setup camera transform
    this.ctx.save();
    
    // Draw provinces (back to front)
    const provList = [...game.provinces.values()];
    for (const prov of provList) {
      this.drawProvince(prov);
    }
    
    // Draw borders
    this.drawBorders(provList);
    
    // Draw ownership markers
    this.drawOwnershipMarkers(provList);
    
    // Draw selection
    if (game.selectedProv) {
      this.drawSelection(game.provinces.get(game.selectedProv));
    }
    
    // Draw valid targets
    if (game.marchSource) {
      this.drawValidTargets(game.provinces.get(game.marchSource), game);
    }
    
    // Draw march preview
    if (game.marchSource && game.selectedProv && game.selectedProv !== game.marchSource) {
      this.drawMarchArrow(
        game.provinces.get(game.marchSource),
        game.provinces.get(game.selectedProv)
      );
    }
    
    this.ctx.restore();
  }
}