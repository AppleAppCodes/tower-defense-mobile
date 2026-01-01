export type Vector2D = { x: number; y: number };

export enum TowerType {
  BASIC = 'BASIC',
  RAPID = 'RAPID',
  SNIPER = 'SNIPER',
  AOE = 'AOE',
  LASER = 'LASER',
  FROST = 'FROST',
  SHOCK = 'SHOCK',
  MISSILE = 'MISSILE'
}

export enum EnemyType {
  NORMAL = 'NORMAL',
  FAST = 'FAST',
  TANK = 'TANK',
  BOSS = 'BOSS'
}

export enum PerkType {
  DAMAGE = 'DAMAGE',   // Double Damage
  SPEED = 'SPEED',     // Fast Fire Rate
  MONEY = 'MONEY',     // Instant Cash
  FREEZE = 'FREEZE'    // Freeze All
}

export interface PerkDrop {
  id: string;
  position: Vector2D;
  type: PerkType;
  life: number; // Frames until disappear
  maxLife: number;
}

export interface ActivePerk {
  type: PerkType;
  endTime: number; // GameTime frame when it expires
  duration: number; // Total duration in frames
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

export interface MapDefinition {
  id: string;
  name: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  waypoints: Vector2D[];
}

export interface GameTheme {
  id: string;
  name: string;
  price: number; // Stars
  background: string;
  grid: string;
  pathOuter: string;
  pathInner: string;
  pathGlow: string;
  scanline: string;
  uiAccent: string; // Helper for UI coloring
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
  level: number; // 1, 2, or 3
  lastShotFrame: number;
  range: number;
  damage: number;
  cooldown: number;
  rotation: number; // Radians
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
  effect?: 'FREEZE' | 'SHOCK'; // Status effects
  velocity: Vector2D; // Added for trails
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'circle' | 'ring'; // New type for shockwaves
}

export interface FloatingText {
  id: string;
  position: Vector2D;
  text: string;
  life: number; // 0 to 1
  color: string;
  velocity: Vector2D;
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gameTime: number; // Total frames
  autoStartTimer: number; // Frames until next wave
  gameSpeed: number; // 1 or 2
}

export interface WaveConfig {
  count: number;
  interval: number; // Frames between spawns
  enemyType: EnemyType;
}

// Telegram Web App Global Types
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        isVersionAtLeast: (version: string) => boolean;
        disableVerticalSwipes: () => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
          setText: (text: string) => void;
        };
        initDataUnsafe: {
          user?: {
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        colorScheme: 'light' | 'dark';
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
    // Audio Context Polyfill
    webkitAudioContext: typeof AudioContext;
  }
}