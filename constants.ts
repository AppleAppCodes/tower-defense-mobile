import { EnemyType, TowerType, TowerConfig, Vector2D } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 40;

// Simple winding path
export const PATH_WAYPOINTS: Vector2D[] = [
  { x: 0, y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 400 },
  { x: 500, y: 400 },
  { x: 500, y: 200 },
  { x: 700, y: 200 },
  { x: 700, y: 500 },
  { x: 800, y: 500 }, // End point
];

export const TOWER_TYPES: Record<TowerType, TowerConfig> = {
  [TowerType.BASIC]: {
    name: 'Turret',
    type: TowerType.BASIC,
    cost: 50,
    range: 120,
    damage: 20,
    cooldown: 40,
    color: '#22d3ee', // Cyan 400
    description: 'Balanced damage and fire rate.'
  },
  [TowerType.RAPID]: {
    name: 'Blaster',
    type: TowerType.RAPID,
    cost: 120,
    range: 100,
    damage: 8,
    cooldown: 10,
    color: '#f472b6', // Pink 400
    description: 'High fire rate, low damage.'
  },
  [TowerType.SNIPER]: {
    name: 'Sniper',
    type: TowerType.SNIPER,
    cost: 200,
    range: 250,
    damage: 100,
    cooldown: 120,
    color: '#a3e635', // Lime 400
    description: 'Long range, high damage, slow.'
  },
  [TowerType.AOE]: {
    name: 'Mortar',
    type: TowerType.AOE,
    cost: 300,
    range: 150,
    damage: 40,
    cooldown: 90,
    color: '#f59e0b', // Amber 500
    description: 'Area damage explosions.'
  }
};

export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; reward: number; color: string; radius: number }> = {
  [EnemyType.NORMAL]: { maxHp: 60, speed: 2, reward: 10, color: '#94a3b8', radius: 12 },
  [EnemyType.FAST]: { maxHp: 30, speed: 4, reward: 15, color: '#facc15', radius: 10 },
  [EnemyType.TANK]: { maxHp: 200, speed: 1, reward: 30, color: '#ef4444', radius: 16 },
  [EnemyType.BOSS]: { maxHp: 1000, speed: 0.5, reward: 100, color: '#a855f7', radius: 24 },
};

export const INITIAL_STATE = {
  money: 120,
  lives: 20,
  wave: 1
};
