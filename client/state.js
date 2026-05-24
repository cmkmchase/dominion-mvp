/**
 * Dominion.io — Client-side game state
 * Mirrors server state, allows optimistic updates
 */

export class GameState {
  constructor(provinces = [], playerId = null) {
    this.provinces = provinces;
    this.playerId = playerId;
    this.playerColor = '#ffffff';
    this.gold = 0;
    this.day = 1;
    this.year = 1;
    this.scoutedProvinces = new Set();
  }

  /**
   * Get province by ID
   */
  getProvince(id) {
    return this.provinces.find(p => p.id === id);
  }

  /**
   * Get unit count in province
   */
  getUnitCount(provId) {
    const prov = this.getProvince(provId);
    return prov && prov.units ? prov.units.length : 0;
  }

  /**
   * Update province from server
   */
  updateProvince(provData) {
    const prov = this.getProvince(provData.id);
    if (prov) {
      Object.assign(prov, provData);
      prov.unitCount = this.getUnitCount(provData.id);
    }
  }

  /**
   * Update time
   */
  setTime(day, year) {
    this.day = day;
    this.year = year;
  }

  /**
   * Add/remove scouted province
   */
  addScoutedProvince(id) {
    this.scoutedProvinces.add(id);
  }

  removeScoutedProvince(id) {
    this.scoutedProvinces.delete(id);
  }

  /**
   * Get owned provinces
   */
  getOwnedProvinces() {
    return this.provinces.filter(p => p.owner === this.playerId);
  }

  /**
   * Get capital province
   */
  getCapital() {
    return this.getOwnedProvinces()[0] || null;
  }
}
