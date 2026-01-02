
export type Vector2D = { x: number; y: number };

export type GameMode = 'DEFENSE' | 'ATTACK' | 'PVP_LOCAL' | 'PVP_ONLINE';

export type PvpPhase = 'P1_BUILD' | 'HANDOVER_TO_P2' | 'P2_ATTACK' | 'P2_BUILD' | 'HANDOVER_TO_P1' | 'P1_ATTACK' | 'GAME_OVER' 
                     | 'ONLINE_WAITING' | 'ONLINE_BUILDING' | 'ONLINE_ATTACKING' | 'ONLINE_SPECTATING';

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
  type: TowerType;
  cost: number;
  range: number;
  damage: number;
  cooldown: number; // Frames between shots
  baseName: string; // Generic name used for ID
}

export interface UnitConfig {
    type: EnemyType;
    cost: number;
    name: string;
    count: number; // How many spawn per click (squad size)
    icon: string;
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
  expReward: number; // New EXP field
  color: string;
  radius: number;
  
  // Animation Props
  frameX: number; // Current frame in sprite sheet
  maxFrame: number; // Total frames - 1
  gameFrame: number; // Internal counter for animation speed
  spriteLoaded?: boolean;
}

export interface Tower extends Entity {
  type: TowerType;
  level: number; // 1, 2, or 3
  lastShotFrame: number;
  range: number;
  damage: number;
  cooldown: number;
  rotation: number; // Radians
  eraBuilt: number; // To track visuals if we want mixed eras (currently global era applies)
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
  visualType: 'ARROW' | 'ROCK' | 'BULLET' | 'MISSILE' | 'MAGIC'; // For rendering
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'circle' | 'ring' | 'debris'; // debris for wood/stone chips
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
  mode: GameMode; 
  pvpPhase?: PvpPhase; 
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gameTime: number; // Total frames
  autoStartTimer: number; // Frames until next wave
  gameSpeed: number; // 1 or 2
  
  // Age of Empires Mechanics
  era: number; // 0 = Stone, 1 = Castle, 2 = Imperial
  exp: number;
  maxExp: number;
}

export interface WaveConfig {
  count: number;
  interval: number; // Frames between spawns
  enemyType: EnemyType;
}

// Socket Events Payloads
export interface ServerToClientEvents {
  match_found: (data: { role: 'DEFENDER' | 'ATTACKER', gameId: string }) => void;
  opponent_action: (action: { type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any }) => void;
  room_error: (msg: string) => void;
}

export interface ClientToServerEvents {
  join_game: (roomId: string) => void;
  send_action: (data: { gameId: string, type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any }) => void;
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
