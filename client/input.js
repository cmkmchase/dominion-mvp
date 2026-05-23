export class InputHandler {
  constructor(canvas, camera, onAction) {
    this.canvas = canvas;
    this.camera = camera;
    this.onAction = onAction;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      this.camera.zoomAt(sx, sy, e.deltaY > 0 ? -1 : 1);
      onAction('zoom', { zoom: this.camera.zoom });
    }, { passive: false });
    
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    
    canvas.addEventListener('mousemove', (e) => {
      if (this.dragging && e.buttons === 1) {
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.camera.pan(dx, dy);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        onAction('pan');
      }
    });
    
    canvas.addEventListener('mouseup', (e) => {
      if (this.dragging) {
        this.dragging = false;
        return;
      }
      // Click (not drag)
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x, y } = this.camera.screenToWorld(sx, sy);
      onAction('click', { worldX: x, worldY: y, screenX: sx, screenY: sy });
    });
    
    canvas.addEventListener('mouseleave', () => {
      this.dragging = false;
    });
    
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        onAction('center');
      } else if (e.key.toLowerCase() === 'r') {
        onAction('recruit');
      } else if (e.key === 'Escape') {
        onAction('cancel');
      }
    });
  }
}