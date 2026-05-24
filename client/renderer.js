/**
 * Dominion.io — Canvas Renderer
 * Draws map, provinces, units, UI overlays
 */

import { RENDERING } from '../shared/config.js';

export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
  }

  /**
   * Clear and redraw entire frame
   */
  render(provinces, gameState = {}) {
    // Clear
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context state
    this.ctx.save();

    // Apply camera transform
    this.camera.apply(this.ctx);

    // Get viewport to cull rendering
    const bounds = this.camera.getViewportBounds();

    // Draw provinces
    for (const province of provinces) {
      this.drawProvince(province, bounds, gameState);
    }

    // Draw borders
    this.ctx.strokeStyle = RENDERING.BORDER_COLOR;
    this.ctx.lineWidth = RENDERING.BORDER_WIDTH / this.camera.zoom;
    for (const province of provinces) {
      for (const adjId of province.adj) {
        const other = provinces.find(p => p.id === adjId);
        if (!other) continue;
        // Only draw border once (when id < adjId)
        if (province.id < adjId && province.owner !== other.owner) {
          this.drawBorder(province, other);
        }
      }
    }

    // Restore context
    this.ctx.restore();

    // Draw screen-space UI (zoom labels, unit counts, morale bars)
    this.drawScreenSpaceUI(provinces, gameState);
  }

  /**
   * Draw single province polygon with fill
   */
  drawProvince(province, bounds, gameState) {
    // Culling check
    const margin = 200;
    if (
      province.cx < bounds.minX - margin ||
      province.cx > bounds.maxX + margin ||
      province.cy < bounds.minY - margin ||
      province.cy > bounds.maxY + margin
    ) {
      return;
    }

    const isScouted = gameState.scoutedProvinces && gameState.scoutedProvinces.has(province.id);

    if (!isScouted && !gameState.playerId) {
      // Not scouted and no player context: render dark
      this.ctx.fillStyle = RENDERING.FOG_COLOR;
    } else if (!isScouted) {
      // Fog of war active
      this.ctx.fillStyle = RENDERING.FOG_COLOR;
    } else {
      // Draw biome color
      const biomeColor = province.color || '#2e4a22';
      if (province.owner && gameState.playerColor) {
        // Blend biome with owner color
        this.ctx.fillStyle = this.blendColors(
          biomeColor,
          gameState.playerColor,
          RENDERING.BIOME_BLEND_RATIO
        );
      } else {
        this.ctx.fillStyle = biomeColor;
      }
    }

    // Draw polygon
    if (province.pts && province.pts.length > 0) {
      this.ctx.beginPath();
      const [firstX, firstY] = province.pts[0];
      this.ctx.moveTo(firstX, firstY);
      for (let i = 1; i < province.pts.length; i++) {
        const [x, y] = province.pts[i];
        this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Draw ownership marker
    if (isScouted && province.owner) {
      const markerSize = RENDERING.MARKER_SIZE;
      this.ctx.fillStyle = gameState.playerColor || '#ffffff';
      this.ctx.fillRect(
        province.cx - markerSize / 2,
        province.cy - markerSize / 2,
        markerSize,
        markerSize
      );
    }
  }

  /**
   * Draw political border between two provinces
   */
  drawBorder(prov1, prov2) {
    // Simple: line between centroids
    this.ctx.beginPath();
    this.ctx.moveTo(prov1.cx, prov1.cy);
    this.ctx.lineTo(prov2.cx, prov2.cy);
    this.ctx.stroke();
  }

  /**
   * Draw screen-space UI (zoom-gated labels, unit counts, morale bars)
   */
  drawScreenSpaceUI(provinces, gameState) {
    const zoom = this.camera.zoom;

    for (const province of provinces) {
      const isScouted = gameState.scoutedProvinces && gameState.scoutedProvinces.has(province.id);
      if (!isScouted) continue;

      const [screenX, screenY] = this.camera.worldToScreen(province.cx, province.cy);

      // Unit count (zoom >= 0.4x)
      if (zoom >= RENDERING.UNIT_COUNT_MIN_ZOOM && province.unitCount !== undefined) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${12 / zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(province.unitCount, screenX, screenY - 20 / zoom);
      }

      // Province name (zoom >= 1.0x)
      if (zoom >= RENDERING.NAME_LABEL_MIN_ZOOM) {
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = `bold ${14 / zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(province.name, screenX, screenY + 30 / zoom);
      }

      // Morale bar (zoom >= 1.0x)
      if (zoom >= RENDERING.MORALE_BAR_MIN_ZOOM && province.morale !== undefined) {
        const barWidth = 40 / zoom;
        const barHeight = 4 / zoom;
        const moraleFraction = province.morale / 100;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(
          screenX - barWidth / 2,
          screenY + 40 / zoom,
          barWidth,
          barHeight
        );
        this.ctx.fillStyle = this.moraleColor(moraleFraction);
        this.ctx.fillRect(
          screenX - barWidth / 2,
          screenY + 40 / zoom,
          barWidth * moraleFraction,
          barHeight
        );
      }
    }
  }

  /**
   * Blend two colors
   */
  blendColors(color1, color2, ratio) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r * ratio + c2.r * (1 - ratio));
    const g = Math.round(c1.g * ratio + c2.g * (1 - ratio));
    const b = Math.round(c1.b * ratio + c2.b * (1 - ratio));
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Color morale bar by value
   */
  moraleColor(fraction) {
    if (fraction >= 0.75) return '#00ff00'; // Green
    if (fraction >= 0.5) return '#ffff00'; // Yellow
    if (fraction >= 0.3) return '#ff8800'; // Orange
    return '#ff0000'; // Red
  }
}
