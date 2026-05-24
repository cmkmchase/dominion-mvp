/**
 * Dominion.io — Camera (pan, zoom, transforms)
 */

import { MAP, CAMERA } from '../shared/config.js';

export class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // World position of camera center
    this.centerX = MAP.WIDTH / 2;
    this.centerY = MAP.HEIGHT / 2;

    // Zoom level (1.0 = 1 pixel per logical unit)
    this.zoom = 0.5;
    this.zoom = Math.max(CAMERA.MIN_ZOOM, Math.min(this.zoom, CAMERA.MAX_ZOOM));
  }

  /**
   * Pan by delta in screen space
   */
  pan(deltaScreenX, deltaScreenY) {
    const worldDeltaX = -deltaScreenX / this.zoom;
    const worldDeltaY = -deltaScreenY / this.zoom;
    this.centerX += worldDeltaX;
    this.centerY += worldDeltaY;
    this.clampToMap();
  }

  /**
   * Zoom at a point (screen space)
   */
  zoomAt(screenX, screenY, zoomFactor) {
    const oldZoom = this.zoom;
    this.zoom *= zoomFactor;
    this.zoom = Math.max(CAMERA.MIN_ZOOM, Math.min(this.zoom, CAMERA.MAX_ZOOM));

    // Keep world point under cursor fixed
    const worldX = this.screenToWorldX(screenX);
    const worldY = this.screenToWorldY(screenY);

    this.centerX += (oldZoom / this.zoom - 1) * (worldX - this.centerX);
    this.centerY += (oldZoom / this.zoom - 1) * (worldY - this.centerY);

    this.clampToMap();
  }

  /**
   * Center on world position
   */
  centerOn(worldX, worldY) {
    this.centerX = worldX;
    this.centerY = worldY;
    this.clampToMap();
  }

  /**
   * Screen to world transform
   */
  screenToWorldX(screenX) {
    return this.centerX + (screenX - this.canvasWidth / 2) / this.zoom;
  }

  screenToWorldY(screenY) {
    return this.centerY + (screenY - this.canvasHeight / 2) / this.zoom;
  }

  screenToWorld(screenX, screenY) {
    return [
      this.screenToWorldX(screenX),
      this.screenToWorldY(screenY),
    ];
  }

  /**
   * World to screen transform
   */
  worldToScreenX(worldX) {
    return (worldX - this.centerX) * this.zoom + this.canvasWidth / 2;
  }

  worldToScreenY(worldY) {
    return (worldY - this.centerY) * this.zoom + this.canvasHeight / 2;
  }

  worldToScreen(worldX, worldY) {
    return [
      this.worldToScreenX(worldX),
      this.worldToScreenY(worldY),
    ];
  }

  /**
   * Apply camera transform to canvas context
   */
  apply(ctx) {
    ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.centerX, -this.centerY);
  }

  /**
   * Clamp camera to map bounds
   */
  clampToMap() {
    const viewportWidth = this.canvasWidth / this.zoom;
    const viewportHeight = this.canvasHeight / this.zoom;

    this.centerX = Math.max(
      viewportWidth / 2,
      Math.min(this.centerX, MAP.WIDTH - viewportWidth / 2)
    );
    this.centerY = Math.max(
      viewportHeight / 2,
      Math.min(this.centerY, MAP.HEIGHT - viewportHeight / 2)
    );
  }

  /**
   * Get viewport bounds in world space
   */
  getViewportBounds() {
    const w = this.canvasWidth / this.zoom / 2;
    const h = this.canvasHeight / this.zoom / 2;
    return {
      minX: this.centerX - w,
      maxX: this.centerX + w,
      minY: this.centerY - h,
      maxY: this.centerY + h,
    };
  }
}
