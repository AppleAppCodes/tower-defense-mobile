import { EnemyType, TowerType, TowerConfig, Vector2D, MapDefinition, GameTheme, PerkType } from './types';

// CHANGED: Portrait resolution to match mobile screens better and prevent stretching
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 800; // 1:2 Aspect Ratio (close to 9:16)
export const GRID_SIZE = 40;
export const AUTO_START_DELAY = 600; // 10 seconds at 60fps

export const MAPS: MapDefinition[] = [
  {
    id: 'valley',
    name: 'Serpentine',
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
    id: 'loop',
    name: 'The Knot',
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
  },
  {
    id: 'central',
    name: 'Core Defence',
    difficulty: 'HARD',
    waypoints: [
      { x: 200, y: 0 },
      { x: 200, y: 160 },
      { x: 360, y: 160 },
      { x: 360, y: 640 },
      { x: 40, y: 640 },
      { x: 40, y: 320 },
      { x: 200, y: 320 }, // Spiral inward
      { x: 200, y: 480 },
    ]
  }
];

export const THEMES: GameTheme[] = [
  {
    id: 'default',
    name: 'Deep Space',
    price: 0,
    background: '#020617', // Slate 950
    grid: 'rgba(30, 64, 175, 0.1)',
    pathOuter: '#1e293b',
    pathInner: '#0f172a',
    pathGlow: 'rgba(59, 130, 246, 0.3)',
    scanline: 'rgba(56, 189, 248, 0.1)',
    uiAccent: '#3b82f6'
  },
  {
    id: 'mars',
    name: 'Red Planet',
    price: 50,
    background: '#2a0a0a', // Dark Red/Brown
    grid: 'rgba(220, 38, 38, 0.1)',
    pathOuter: '#450a0a',
    pathInner: '#2a0a0a',
    pathGlow: 'rgba(239, 68, 68, 0.3)',
    scanline: 'rgba(248, 113, 113, 0.1)',
    uiAccent: '#ef4444'
  },
  {
    id: 'cyber',
    name: 'Matrix Grid',
    price: 100,
    background: '#000000',
    grid: 'rgba(34, 197, 94, 0.15)',
    pathOuter: '#052e16',
    pathInner: '#000000',
    pathGlow: 'rgba(34, 197, 94, 0.4)',
    scanline: 'rgba(74, 222, 128, 0.15)',
    uiAccent: '#22c55e'
  },
  {
    id: 'void',
    name: 'Neon Void',
    price: 250,
    background: '#0f0518', // Deep Purple
    grid: 'rgba(192, 38, 211, 0.15)',
    pathOuter: '#2e073b',
    pathInner: '#0f0518',
    pathGlow: 'rgba(216, 180, 254, 0.4)',
    scanline: 'rgba(232, 121, 249, 0.15)',
    uiAccent: '#d946ef'
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

// REDUCED SPEEDS (Approx 50% slower)
export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; reward: number; color: string; radius: number }> = {
  [EnemyType.NORMAL]: { maxHp: 85, speed: 1.0, reward: 10, color: '#94a3b8', radius: 14 }, 
  [EnemyType.FAST]: { maxHp: 45, speed: 2.2, reward: 15, color: '#a3e635', radius: 10 },   
  [EnemyType.TANK]: { maxHp: 350, speed: 0.5, reward: 35, color: '#475569', radius: 18 },   
  [EnemyType.BOSS]: { maxHp: 3500, speed: 0.3, reward: 250, color: '#ef4444', radius: 32 }, 
};

export const PERK_STATS: Record<PerkType, { color: string; duration: number; icon: string, name: string }> = {
  [PerkType.DAMAGE]: { color: '#ef4444', duration: 600, icon: '⚔️', name: 'DMG BOOST' },
  [PerkType.SPEED]: { color: '#eab308', duration: 600, icon: '⚡', name: 'HYPER SPD' },
  [PerkType.MONEY]: { color: '#22c55e', duration: 0, icon: '💰', name: 'CASH DROP' },
  [PerkType.FREEZE]: { color: '#06b6d4', duration: 0, icon: '❄️', name: 'DEEP FRZ' }
};

export const INITIAL_STATE = {
  money: 120,
  lives: 20,
  wave: 1
};