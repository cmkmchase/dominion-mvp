export class Camera {
  constructor(canvas, worldW, worldH) {
    this.canvas = canvas;
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = worldW / 2;
    this.y = worldH / 2;
    this.zoom = 0.3;
    this.minZoom = 0.1;
    this.maxZoom = 3.0;
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.canvas.width / 2,
      y: (wy - this.y) * this.zoom + this.canvas.height / 2
    };
  }
  
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.zoom + this.x,
      y: (sy - this.canvas.height / 2) / this.zoom + this.y
    };
  }
  
  zoomAt(sx, sy, delta) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 + delta * 0.1)));
    const after = this.screenToWorld(sx, sy);
    // Keep mouse position stable
    this.x += after.x - before.x;
    this.y += after.y - before.y;
    // Clamp to world bounds
    this.x = Math.max(this.canvas.width/(2*this.zoom), Math.min(this.worldW - this.canvas.width/(2*this.zoom), this.x));
    this.y = Math.max(this.canvas.height/(2*this.zoom), Math.min(this.worldH - this.canvas.height/(2*this.zoom), this.y));
  }
  
  pan(dx, dy) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    // Clamp
    this.x = Math.max(this.canvas.width/(2*this.zoom), Math.min(this.worldW - this.canvas.width/(2*this.zoom), this.x));
    this.y = Math.max(this.canvas.height/(2*this.zoom), Math.min(this.worldH - this.canvas.height/(2*this.zoom), this.y));
  }
  
  centerOn(x, y) {
    this.x = x;
    this.y = y;
  }
}