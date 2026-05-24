/**
 * Dominion.io — Input Handler
 * Click, drag, scroll, keyboard
 */

import { CAMERA } from '../shared/config.js';

export class InputHandler {
  constructor(canvas, camera, callbacks = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.callbacks = callbacks;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Hover state
    this.hoveredProvinceId = null;

    this.setupListeners();
  }

  setupListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Keyboard
    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('keyup', e => this.onKeyUp(e));

    // Track key state
    this.keysPressed = {};
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.button === 0) {
      // Left click: select/order
      const [worldX, worldY] = this.camera.screenToWorld(screenX, screenY);
      this.callbacks.onLeftClick?.(worldX, worldY, e);
    } else if (e.button === 2) {
      // Right click: pan
      this.isDragging = true;
      this.dragStartX = screenX;
      this.dragStartY = screenY;
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const [worldX, worldY] = this.camera.screenToWorld(screenX, screenY);

    if (this.isDragging) {
      const deltaX = screenX - this.dragStartX;
      const deltaY = screenY - this.dragStartY;
      this.camera.pan(deltaX, deltaY);
      this.dragStartX = screenX;
      this.dragStartY = screenY;
      this.callbacks.onCameraMoved?.();
    }

    // Hover
    this.callbacks.onMouseMove?.(worldX, worldY, e);
  }

  onMouseUp(e) {
    if (e.button === 2) {
      this.isDragging = false;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 1 / (1 + CAMERA.ZOOM_STEP) : 1 + CAMERA.ZOOM_STEP;
    this.camera.zoomAt(screenX, screenY, zoomFactor);
    this.callbacks.onCameraMoved?.();
  }

  onKeyDown(e) {
    this.keysPressed[e.key.toLowerCase()] = true;
    this.handleMovement();

    if (e.key === ' ') {
      e.preventDefault();
      this.callbacks.onSpacePress?.();
    }
  }

  onKeyUp(e) {
    this.keysPressed[e.key.toLowerCase()] = false;
  }

  handleMovement() {
    const panSpeed = 20 / this.camera.zoom; // World units per frame
    const keys = this.keysPressed;

    if (keys['w'] || keys['arrowup']) this.camera.pan(0, panSpeed);
    if (keys['s'] || keys['arrowdown']) this.camera.pan(0, -panSpeed);
    if (keys['a'] || keys['arrowleft']) this.camera.pan(panSpeed, 0);
    if (keys['d'] || keys['arrowright']) this.camera.pan(-panSpeed, 0);

    if (keys['w'] || keys['s'] || keys['a'] || keys['d'] || 
        keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright']) {
      this.callbacks.onCameraMoved?.();
    }
  }
}
