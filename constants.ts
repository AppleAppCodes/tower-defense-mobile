
import { EnemyType, TowerType, TowerConfig, Vector2D, MapDefinition, GameTheme, PerkType, UnitConfig } from './types';

// Portrait resolution
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 800;
export const GRID_SIZE = 50; 
export const AUTO_START_DELAY = 180; // Reduced to 3 seconds (180 frames)

// --- ASSET MAPPING ---
// Reverted to empty to force procedural rendering
export const ASSETS = {
    towers: {},
    enemies: {},
    projectiles: {}
};

// --- ERA CONFIGURATION ---
export const ERA_DATA = [
  {
    name: "STONE AGE",
    color: "#d97706", // Amber
    maxExp: 250, 
    availableTowers: [TowerType.BASIC, TowerType.RAPID, TowerType.SNIPER, TowerType.AOE], 
    towerVisuals: {
      material: "#78350f", // Wood
      accent: "#a8a29e", // Stone
      projectile: "ROCK"
    },
    towerNames: {
      [TowerType.BASIC]: "Slinger",
      [TowerType.RAPID]: "Hunter", 
      [TowerType.SNIPER]: "Spearman",
      [TowerType.AOE]: "Rock Thrower",
      [TowerType.LASER]: "Shaman", 
      [TowerType.FROST]: "Ice Spirit",
      [TowerType.SHOCK]: "Storm Totem",
      [TowerType.MISSILE]: "Bee Hive"
    }
  },
  {
    name: "CASTLE AGE",
    color: "#64748b", // Slate
    maxExp: 1500,
    availableTowers: [TowerType.BASIC, TowerType.RAPID, TowerType.SNIPER, TowerType.AOE, TowerType.LASER, TowerType.FROST], 
    towerVisuals: {
      material: "#94a3b8", // Stone Brick
      accent: "#1e3a8a", // Blue Banner
      projectile: "ARROW"
    },
    towerNames: {
      [TowerType.BASIC]: "Longbow",
      [TowerType.RAPID]: "Crossbow",
      [TowerType.SNIPER]: "Ballista",
      [TowerType.AOE]: "Mangonel",
      [TowerType.LASER]: "Mage Tower",
      [TowerType.FROST]: "Frost Mage",
      [TowerType.SHOCK]: "Tesla Coil", 
      [TowerType.MISSILE]: "Fire Works"
    }
  },
  {
    name: "IMPERIAL AGE",
    color: "#dc2626", // Red
    maxExp: 5000,
    availableTowers: Object.values(TowerType), // All Unlocked
    towerVisuals: {
      material: "#1e293b", // Metal
      accent: "#f59e0b", // Gold/Caution
      projectile: "BULLET"
    },
    towerNames: {
      [TowerType.BASIC]: "Sentry Gun",
      [TowerType.RAPID]: "Gatling",
      [TowerType.SNIPER]: "Sniper",
      [TowerType.AOE]: "Mortar",
      [TowerType.LASER]: "Laser Cannon",
      [TowerType.FROST]: "Cryo Ray",
      [TowerType.SHOCK]: "Tesla Tower",
      [TowerType.MISSILE]: "Rocket Silo"
    }
  }
];

export const MAPS: MapDefinition[] = [
  {
    id: 'plains',
    name: 'Green Plains',
    difficulty: 'EASY',
    waypoints: [ 
      { x: 200, y: 0 },
      { x: 200, y: 150 },
      { x: 100, y: 150 },
      { x: 100, y: 350 },
      { x: 300, y: 350 },
      { x: 300, y: 550 },
      { x: 150, y: 550 },
      { x: 150, y: 750 },
      { x: 200, y: 750 },
      { x: 200, y: 800 },
    ]
  },
  {
    id: 'desert',
    name: 'Dusty Canyon',
    difficulty: 'MEDIUM',
    waypoints: [ 
      { x: 50, y: 0 },
      { x: 50, y: 200 },
      { x: 350, y: 200 },
      { x: 350, y: 450 },
      { x: 50, y: 450 }, 
      { x: 50, y: 650 },
      { x: 200, y: 650 },
      { x: 200, y: 800 },
    ]
  }
];

export const THEMES: GameTheme[] = [
  {
    id: 'default',
    name: 'Green Valley',
    price: 0,
    background: '#3f6212', 
    grid: 'rgba(255, 255, 255, 0.05)',
    pathOuter: '#33281d', 
    pathInner: '#d6c4a0', 
    pathGlow: 'rgba(0,0,0,0.2)', 
    scanline: 'rgba(255, 255, 255, 0.02)', 
    uiAccent: '#a3e635'
  },
  {
    id: 'snow',
    name: 'Winter Land',
    price: 100,
    background: '#cbd5e1', 
    grid: 'rgba(0, 0, 0, 0.05)',
    pathOuter: '#475569',
    pathInner: '#f1f5f9', 
    pathGlow: 'rgba(148, 163, 184, 0.5)',
    scanline: 'rgba(255, 255, 255, 0.1)',
    uiAccent: '#38bdf8'
  }
];

export const TOWER_TYPES: Record<TowerType, TowerConfig> = {
  [TowerType.BASIC]: {
    baseName: 'Basic',
    type: TowerType.BASIC,
    cost: 50,
    range: 140, 
    damage: 20,
    cooldown: 40,
  },
  [TowerType.RAPID]: {
    baseName: 'Rapid',
    type: TowerType.RAPID,
    cost: 120,
    range: 120,
    damage: 8,
    cooldown: 12, 
  },
  [TowerType.SNIPER]: {
    baseName: 'Sniper',
    type: TowerType.SNIPER,
    cost: 200,
    range: 300,
    damage: 120,
    cooldown: 120,
  },
  [TowerType.AOE]: {
    baseName: 'Splasher',
    type: TowerType.AOE,
    cost: 300,
    range: 180,
    damage: 50,
    cooldown: 90,
  },
  [TowerType.LASER]: {
    baseName: 'Beam',
    type: TowerType.LASER,
    cost: 180,
    range: 160,
    damage: 5,
    cooldown: 5, 
  },
  [TowerType.FROST]: {
    baseName: 'Cold',
    type: TowerType.FROST,
    cost: 150,
    range: 130,
    damage: 10,
    cooldown: 45,
  },
  [TowerType.SHOCK]: {
    baseName: 'Zap',
    type: TowerType.SHOCK,
    cost: 250,
    range: 110,
    damage: 80,
    cooldown: 50,
  },
  [TowerType.MISSILE]: {
    baseName: 'Boom',
    type: TowerType.MISSILE,
    cost: 400,
    range: 220,
    damage: 60,
    cooldown: 100,
  }
};

export const UNIT_TYPES: Record<string, UnitConfig> = {
    'SQUAD': {
        type: EnemyType.NORMAL,
        cost: 60,
        name: 'Grunt Squad',
        count: 3,
        icon: '⚔️'
    },
    'RUSH': {
        type: EnemyType.FAST,
        cost: 100,
        name: 'Speed Rush',
        count: 5,
        icon: '🐎'
    },
    'TANK': {
        type: EnemyType.TANK,
        cost: 150,
        name: 'Heavy Tank',
        count: 1,
        icon: '🛡️'
    },
    'BOSS': {
        type: EnemyType.BOSS,
        cost: 500,
        name: 'Titan',
        count: 1,
        icon: '👹'
    }
};

export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; reward: number; expReward: number; color: string; radius: number }> = {
  [EnemyType.NORMAL]: { maxHp: 80, speed: 1.0, reward: 10, expReward: 15, color: '#94a3b8', radius: 16 }, 
  [EnemyType.FAST]: { maxHp: 40, speed: 2.0, reward: 15, expReward: 10, color: '#a3e635', radius: 12 },   
  [EnemyType.TANK]: { maxHp: 300, speed: 0.6, reward: 35, expReward: 50, color: '#475569', radius: 24 },   
  [EnemyType.BOSS]: { maxHp: 3000, speed: 0.4, reward: 250, expReward: 500, color: '#ef4444', radius: 36 }, 
};

export const PERK_STATS: Record<PerkType, { color: string; duration: number; icon: string, name: string }> = {
  [PerkType.DAMAGE]: { color: '#ef4444', duration: 600, icon: '⚔️', name: 'RAGE' },
  [PerkType.SPEED]: { color: '#eab308', duration: 600, icon: '⚡', name: 'HASTE' },
  [PerkType.MONEY]: { color: '#22c55e', duration: 0, icon: '💰', name: 'TAXES' },
  [PerkType.FREEZE]: { color: '#06b6d4', duration: 0, icon: '❄️', name: 'BLIZZARD' }
};

export const INITIAL_STATE = {
  mode: 'DEFENSE',
  money: 100,
  lives: 20,
  wave: 1,
  era: 0,
  exp: 0,
  maxExp: ERA_DATA[0].maxExp
};