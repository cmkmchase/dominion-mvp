/**
 * Dominion.io — Game Constants & Balance
 * Shared between server and client
 */

export const MAP = {
  WIDTH: 4000,
  HEIGHT: 2500,
  PROVINCE_COUNT: 350,
  SEED: 42, // Changeable per game
};

export const BIOMES = {
  PLAINS: {
    name: 'Plains',
    color: '#2e4a22',
    defMult: 1.0,
    capBase: 6,
    incomeBase: 5,
  },
  FOREST: {
    name: 'Forest',
    color: '#1a3318',
    defMult: 1.25,
    capBase: 5,
    incomeBase: 4,
  },
  HILLS: {
    name: 'Hills',
    color: '#4a3d28',
    defMult: 1.4,
    capBase: 7,
    incomeBase: 3,
  },
  MARSH: {
    name: 'Marsh',
    color: '#233028',
    defMult: 0.85,
    capBase: 4,
    incomeBase: 4,
  },
  COAST: {
    name: 'Coast',
    color: '#1a2a3a',
    defMult: 0.9,
    capBase: 5,
    incomeBase: 9,
  },
  DESERT: {
    name: 'Desert',
    color: '#3a3220',
    defMult: 0.8,
    capBase: 4,
    incomeBase: 3,
  },
  TUNDRA: {
    name: 'Tundra',
    color: '#252830',
    defMult: 1.1,
    capBase: 4,
    incomeBase: 2,
  },
  MOUNTAIN: {
    name: 'Mountain',
    color: '#3a3630',
    defMult: 1.8,
    capBase: 3,
    incomeBase: 1,
  },
};

export const BIOME_LIST = Object.values(BIOMES);

export const UNITS = {
  INFANTRY: {
    type: 'infantry',
    symbol: 'I',
    cost: 20,
    hp: 10,
    maxHp: 10,
    atk: 1.0,
    def: 1.0,
    marchDays: 1,
    slotCost: 1,
  },
  CAVALRY: {
    type: 'cavalry',
    symbol: 'C',
    cost: 35,
    hp: 8,
    maxHp: 8,
    atk: 1.4,
    def: 0.7,
    marchDays: 1,
    slotCost: 1,
  },
  ARMOR: {
    type: 'armor',
    symbol: 'A',
    cost: 60,
    hp: 14,
    maxHp: 14,
    atk: 1.8,
    def: 2.2,
    marchDays: 3,
    slotCost: 3,
  },
  ARTILLERY: {
    type: 'artillery',
    symbol: 'R',
    cost: 40,
    hp: 8,
    maxHp: 8,
    atk: 2.8,
    def: 0.4,
    marchDays: 2,
    slotCost: 2,
  },
};

export const UNIT_TYPES = Object.keys(UNITS).map(k => UNITS[k].type);

export const GAME = {
  TICK_MS: 1000, // 1 real second = 1 game day
  INCOME_INTERVAL: 30, // Every 30 days
  STARTING_GOLD: 200,
  FORTIFY_COST: 50,
};

export const COMBAT = {
  MORALE_MOD: {
    [75]: 1.15,
    [50]: 1.0,
    [30]: 0.8,
    [10]: 0.5,
    [0]: 0.25,
  },
  CAVALRY_SHOCK_ROUND_1: 1.5,
  CAVALRY_SHOCK_MORALE: -20,
  ATTACKER_DAMAGE_MULT: 0.8,
  DEFENDER_DAMAGE_MULT: 0.6,
  FORTIFY_DEF_MULT: 1.35,
  FORTIFY_SLOTS: 3,
  WIN_ROUND_MORALE: 8,
  LOSE_ROUND_MORALE: -12,
  UNIT_DESTROYED_MORALE: -5,
  ENCIRCLE_MORALE_DRAIN: -10,
  ENCIRCLE_NO_ADJACENT_MORALE_DRAIN: -20,
  DESERT_MORALE_DRAIN: -5,
  TUNDRA_MORALE_DRAIN: -3,
  OWNED_MORALE_RECOVERY: 4,
  FORTIFIED_MORALE_RECOVERY: 6,
  ROUT_HP_RATIO: 0.5,
};

export const TERRAIN_PENALTIES = {
  // { unit, terrain } -> penalty multiplier
  cavalry_mountain: 0.5, // -50% attack
  artillery_hills: 0.6, // -40% attack
  artillery_mountain: 0.4, // -60% attack
};

export const TERRAIN_MARCH_BONUSES = {
  // { unit, terrain } -> extra march days
  armor_marsh: 1,
  artillery_tundra: 1,
};

export const CAMERA = {
  MIN_ZOOM: 0.2,
  MAX_ZOOM: 2.5,
  ZOOM_STEP: 0.1,
};

export const RENDERING = {
  FOG_COLOR: '#0d0f14',
  BIOME_BLEND_RATIO: 0.65, // Biome 65%, owner color 35%
  BORDER_WIDTH: 3,
  BORDER_COLOR: '#ffff00',
  MARKER_SIZE: 8,
  UNIT_COUNT_MIN_ZOOM: 0.4,
  NAME_LABEL_MIN_ZOOM: 1.0,
  MORALE_BAR_MIN_ZOOM: 1.0,
};
