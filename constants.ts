
import { EnemyType, TowerType, TowerConfig, Vector2D, MapDefinition, GameTheme, PerkType } from './types';

// Portrait resolution
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 800;
export const GRID_SIZE = 40;
export const AUTO_START_DELAY = 600; 

// --- ERA CONFIGURATION ---
export const ERA_DATA = [
  {
    name: "STONE AGE",
    color: "#d97706", // Amber
    maxExp: 500,
    towerVisuals: {
      material: "#78350f", // Wood
      accent: "#a8a29e", // Stone
      projectile: "ROCK"
    },
    towerNames: {
      [TowerType.BASIC]: "Slinger",
      [TowerType.RAPID]: "Thrower",
      [TowerType.SNIPER]: "Spearman",
      [TowerType.AOE]: "Rock Pile",
      [TowerType.LASER]: "Shaman", // Magic
      [TowerType.FROST]: "Ice Spirit",
      [TowerType.SHOCK]: "Storm Totem",
      [TowerType.MISSILE]: "Bee Hive"
    }
  },
  {
    name: "CASTLE AGE",
    color: "#64748b", // Slate
    maxExp: 1500,
    towerVisuals: {
      material: "#94a3b8", // Stone Brick
      accent: "#1e3a8a", // Blue Banner
      projectile: "ARROW"
    },
    towerNames: {
      [TowerType.BASIC]: "Archer",
      [TowerType.RAPID]: "Ballista",
      [TowerType.SNIPER]: "Crossbow",
      [TowerType.AOE]: "Catapult",
      [TowerType.LASER]: "Mage Tower",
      [TowerType.FROST]: "Frost Mage",
      [TowerType.SHOCK]: "Tesla Coil (Anachronism)", // Keeping funny
      [TowerType.MISSILE]: "Fire Works"
    }
  },
  {
    name: "IMPERIAL AGE",
    color: "#dc2626", // Red
    maxExp: 5000,
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
      { x: 200, y: 120 },
      { x: 80, y: 120 },
      { x: 80, y: 320 },
      { x: 320, y: 320 },
      { x: 320, y: 520 },
      { x: 120, y: 520 },
      { x: 120, y: 720 },
      { x: 200, y: 720 },
      { x: 200, y: 800 },
    ]
  },
  {
    id: 'desert',
    name: 'Dusty Canyon',
    difficulty: 'MEDIUM',
    waypoints: [
      { x: 40, y: 0 },
      { x: 40, y: 200 },
      { x: 360, y: 200 },
      { x: 360, y: 440 },
      { x: 40, y: 440 }, // Big loop cross
      { x: 40, y: 600 },
      { x: 200, y: 600 },
      { x: 200, y: 800 },
    ]
  }
];

export const THEMES: GameTheme[] = [
  {
    id: 'default',
    name: 'Green Valley',
    price: 0,
    background: '#3f6212', // Dark Green Grass
    grid: 'rgba(255, 255, 255, 0.05)',
    pathOuter: '#33281d', // Dark dirt
    pathInner: '#d6c4a0', // Sand/Dirt path
    pathGlow: 'rgba(0,0,0,0.2)', // Shadow instead of glow
    scanline: 'rgba(255, 255, 255, 0.02)', // Sun rays
    uiAccent: '#a3e635'
  },
  {
    id: 'snow',
    name: 'Winter Land',
    price: 100,
    background: '#cbd5e1', // Snow
    grid: 'rgba(0, 0, 0, 0.05)',
    pathOuter: '#475569',
    pathInner: '#f1f5f9', // Ice path
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
    range: 120,
    damage: 20,
    cooldown: 40,
  },
  [TowerType.RAPID]: {
    baseName: 'Rapid',
    type: TowerType.RAPID,
    cost: 120,
    range: 100,
    damage: 8,
    cooldown: 12, // Slower for arrows
  },
  [TowerType.SNIPER]: {
    baseName: 'Sniper',
    type: TowerType.SNIPER,
    cost: 200,
    range: 280,
    damage: 120,
    cooldown: 120,
  },
  [TowerType.AOE]: {
    baseName: 'Splasher',
    type: TowerType.AOE,
    cost: 300,
    range: 160,
    damage: 50,
    cooldown: 90,
  },
  [TowerType.LASER]: {
    baseName: 'Beam',
    type: TowerType.LASER,
    cost: 180,
    range: 140,
    damage: 5,
    cooldown: 5, 
  },
  [TowerType.FROST]: {
    baseName: 'Cold',
    type: TowerType.FROST,
    cost: 150,
    range: 110,
    damage: 10,
    cooldown: 45,
  },
  [TowerType.SHOCK]: {
    baseName: 'Zap',
    type: TowerType.SHOCK,
    cost: 250,
    range: 90,
    damage: 80,
    cooldown: 50,
  },
  [TowerType.MISSILE]: {
    baseName: 'Boom',
    type: TowerType.MISSILE,
    cost: 400,
    range: 200,
    damage: 60,
    cooldown: 100,
  }
};

export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; reward: number; expReward: number; color: string; radius: number }> = {
  [EnemyType.NORMAL]: { maxHp: 80, speed: 1.0, reward: 10, expReward: 15, color: '#94a3b8', radius: 12 }, 
  [EnemyType.FAST]: { maxHp: 40, speed: 2.0, reward: 15, expReward: 10, color: '#a3e635', radius: 8 },   
  [EnemyType.TANK]: { maxHp: 300, speed: 0.6, reward: 35, expReward: 50, color: '#475569', radius: 16 },   
  [EnemyType.BOSS]: { maxHp: 3000, speed: 0.4, reward: 250, expReward: 500, color: '#ef4444', radius: 28 }, 
};

export const PERK_STATS: Record<PerkType, { color: string; duration: number; icon: string, name: string }> = {
  [PerkType.DAMAGE]: { color: '#ef4444', duration: 600, icon: '⚔️', name: 'RAGE' },
  [PerkType.SPEED]: { color: '#eab308', duration: 600, icon: '⚡', name: 'HASTE' },
  [PerkType.MONEY]: { color: '#22c55e', duration: 0, icon: '💰', name: 'TAXES' },
  [PerkType.FREEZE]: { color: '#06b6d4', duration: 0, icon: '❄️', name: 'BLIZZARD' }
};

export const INITIAL_STATE = {
  money: 100,
  lives: 20,
  wave: 1,
  era: 0,
  exp: 0,
  maxExp: ERA_DATA[0].maxExp
};
