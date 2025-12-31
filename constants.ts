import { EnemyType, TowerType, TowerConfig, Vector2D, MapDefinition } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 40;
export const AUTO_START_DELAY = 600; // 10 seconds at 60fps

export const MAPS: MapDefinition[] = [
  {
    id: 'canyon',
    name: 'Canyon Run',
    difficulty: 'EASY',
    waypoints: [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 400 },
      { x: 500, y: 400 },
      { x: 500, y: 200 },
      { x: 700, y: 200 },
      { x: 700, y: 500 },
      { x: 800, y: 500 },
    ]
  },
  {
    id: 'omega',
    name: 'Omega Loop',
    difficulty: 'MEDIUM',
    waypoints: [
      { x: 0, y: 300 },
      { x: 200, y: 300 },
      { x: 200, y: 100 },
      { x: 600, y: 100 },
      { x: 600, y: 500 },
      { x: 200, y: 500 },
      { x: 200, y: 300 }, // The Loop closes here near start
      { x: 800, y: 300 },
    ]
  },
  {
    id: 'zigzag',
    name: 'Zig Zag',
    difficulty: 'HARD',
    waypoints: [
      { x: 40, y: 0 },
      { x: 40, y: 500 },
      { x: 200, y: 500 },
      { x: 200, y: 100 },
      { x: 360, y: 100 },
      { x: 360, y: 500 },
      { x: 520, y: 500 },
      { x: 520, y: 100 },
      { x: 680, y: 100 },
      { x: 680, y: 600 },
    ]
  }
];

export const TOWER_TYPES: Record<TowerType, TowerConfig> = {
  [TowerType.BASIC]: {
    name: 'Sentry',
    type: TowerType.BASIC,
    cost: 50,
    range: 120,
    damage: 20,
    cooldown: 40,
    color: '#60a5fa', // Blue 400
    description: 'Standard perimeter defense.'
  },
  [TowerType.RAPID]: {
    name: 'Gatling',
    type: TowerType.RAPID,
    cost: 120,
    range: 100,
    damage: 8,
    cooldown: 8,
    color: '#84cc16', // Lime 500
    description: 'High fire rate, low damage.'
  },
  [TowerType.SNIPER]: {
    name: 'Railgun',
    type: TowerType.SNIPER,
    cost: 200,
    range: 280,
    damage: 120,
    cooldown: 120,
    color: '#f97316', // Orange 500
    description: 'Long range anti-armor.'
  },
  [TowerType.AOE]: {
    name: 'Howitzer',
    type: TowerType.AOE,
    cost: 300,
    range: 160,
    damage: 50,
    cooldown: 90,
    color: '#dc2626', // Red 600
    description: 'Explosive area damage.'
  },
  // --- NEW WEAPONS ---
  [TowerType.LASER]: {
    name: 'Prism',
    type: TowerType.LASER,
    cost: 180,
    range: 140,
    damage: 5,
    cooldown: 5, // Extremely fast
    color: '#06b6d4', // Cyan 500
    description: 'Continuous energy beam.'
  },
  [TowerType.FROST]: {
    name: 'Cryo',
    type: TowerType.FROST,
    cost: 150,
    range: 110,
    damage: 10,
    cooldown: 45,
    color: '#e0f2fe', // Sky 100 (Ice white/blue)
    description: 'Slows down enemies.'
  },
  [TowerType.SHOCK]: {
    name: 'Tesla',
    type: TowerType.SHOCK,
    cost: 250,
    range: 90,
    damage: 80,
    cooldown: 50,
    color: '#facc15', // Yellow 400
    description: 'High voltage short range.'
  },
  [TowerType.MISSILE]: {
    name: 'Swarm',
    type: TowerType.MISSILE,
    cost: 400,
    range: 200,
    damage: 60,
    cooldown: 100,
    color: '#9333ea', // Purple 600
    description: 'Tracking missiles, large blast.'
  }
};

export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; reward: number; color: string; radius: number }> = {
  [EnemyType.NORMAL]: { maxHp: 60, speed: 2, reward: 10, color: '#94a3b8', radius: 12 }, // Slate 400
  [EnemyType.FAST]: { maxHp: 30, speed: 4, reward: 15, color: '#a3e635', radius: 10 },   // Lime 400
  [EnemyType.TANK]: { maxHp: 200, speed: 1, reward: 30, color: '#475569', radius: 16 },   // Slate 600
  [EnemyType.BOSS]: { maxHp: 1000, speed: 0.5, reward: 100, color: '#7e22ce', radius: 24 }, // Purple 700
};

export const INITIAL_STATE = {
  money: 120,
  lives: 20,
  wave: 1
};