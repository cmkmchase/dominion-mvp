// MVP balance constants - expand later
export default {
  // Map
  PROVINCE_COUNT: 350,
  WORLD_W: 4000,
  WORLD_H: 2500,
  LLOYD_ITERATIONS: 3, // Fewer for MVP speed

  // Time
  TICK_MS: 1000, // 1 real second = 1 game day
  INCOME_TICK: 10, // Faster income for testing

  // Economy
  START_GOLD: 100,
  BASE_INCOME: 3,

  // Units (MVP: Infantry only)
  UNITS: {
    infantry: {
      cost: 20,
      hp: 10,
      atk: 1.0,
      def: 1.0,
      marchDays: 1,
      slots: 1
    }
  },

  // Combat (simplified single-round)
  ATK_DMG_MULT: 0.8,
  DEF_DMG_MULT: 0.6,

  // Terrain (MVP: all plains)
  BIOMES: {
    plains: { defMult: 1.0, capBase: 6, incBonus: 0, color: '#2e4a22' }
  }
};