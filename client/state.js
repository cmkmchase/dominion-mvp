import config from '../shared/config.js';

export class GameState {
  constructor() {
    this.map = null; // { provinces: [], W, H }
    this.provinces = new Map(); // id -> runtime state
    this.players = new Map();
    this.playerId = null;
    this.playerName = '';
    this.playerColor = '';
    this.gold = 0;
    this.day = 1;
    this.selectedProv = null;
    this.marchSource = null;
  }
  
  init(mapData) {
    this.map = mapData;
    this.provinces.clear();
    for (const p of mapData.provinces) {
      this.provinces.set(p.id, {
        ...p,
        owner: null,
        units: [],
        fortified: false,
        battle: null
      });
    }
  }
  
  updateProvince(data) {
    const prov = this.provinces.get(data.id);
    if (!prov) return;
    if (data.owner !== undefined) prov.owner = data.owner;
    if (data.units !== undefined) prov.units = data.units;
    if (data.fortified !== undefined) prov.fortified = data.fortified;
    if (data.battle !== undefined) prov.battle = data.battle;
  }
  
  getOwnedProvinces() {
    const list = [];
    for (const prov of this.provinces.values()) {
      if (prov.owner === this.playerId) list.push(prov);
    }
    return list;
  }
  
  canRecruit(prov, count) {
    if (prov.owner !== this.playerId) return false;
    const template = config.UNITS.infantry;
    const slotsUsed = prov.units.reduce((sum, u) => sum + config.UNITS[u.type].slots, 0);
    const slotsAvail = prov.capBase - slotsUsed;
    return count > 0 && this.gold >= count * template.cost && count <= slotsAvail;
  }
  
  canMarch(from, to, count) {
    if (from.owner !== this.playerId) return false;
    if (!from.adj.includes(to.id)) return false;
    const available = from.units.filter(u => u.type === 'infantry').length;
    return count > 0 && count <= available;
  }
}