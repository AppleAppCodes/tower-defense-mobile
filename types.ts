export type Vector2D = { x: number; y: number };

export enum TowerType {
  BASIC = 'BASIC',
  RAPID = 'RAPID',
  SNIPER = 'SNIPER',
  AOE = 'AOE'
}

export enum EnemyType {
  NORMAL = 'NORMAL',
  FAST = 'FAST',
  TANK = 'TANK',
  BOSS = 'BOSS'
}

export interface TowerConfig {
  name: string;
  type: TowerType;
  cost: number;
  range: number;
  damage: number;
  cooldown: number; // Frames between shots
  color: string;
  description: string;
}

export interface Entity {
  id: string;
  position: Vector2D;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number; // Current target waypoint index
  distanceTraveled: number; // Used for tie-breaking targeting
  frozen: number; // Frames remaining frozen
  moneyReward: number;
  color: string;
  radius: number;
}

export interface Tower extends Entity {
  type: TowerType;
  lastShotFrame: number;
  range: number;
  damage: number;
  cooldown: number;
}

export interface Projectile extends Entity {
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  radius: number;
  hasHit: boolean;
  type: 'SINGLE' | 'AOE';
  blastRadius?: number;
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gameTime: number; // Total frames
}

export interface WaveConfig {
  count: number;
  interval: number; // Frames between spawns
  enemyType: EnemyType;
}
