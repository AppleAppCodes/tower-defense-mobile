
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, MapDefinition, FloatingText, GameMode, OpponentState, WaveData } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, GRID_SIZE, INITIAL_STATE, THEMES, ERA_DATA } from '../constants';
import { audioService } from '../services/audioService';
import { socketService } from '../services/socketService';
import { Heart, Coins, Play, Check, ArrowUpCircle, Wifi, PlayCircle, Clock, Home, Zap, FastForward, Users, Eye, Trophy } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (wave: number) => void;
  initialMode?: GameMode;
  onlineGameId?: string;
  onlinePlayerNumber?: 1 | 2;
  initialWaveData?: WaveData;
}

// --- CONSTANTS ---
const BUILD_PHASE_DURATION = 600; // 10 Seconds (60fps)
const STATE_SYNC_INTERVAL = 10; // Send state every 10 frames

// --- HELPER FUNCTIONS ---
const isPointOnPath = (x: number, y: number, width: number, waypoints: Vector2D[]) => {
  for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i+1];
      const A = x - p1.x; const B = y - p1.y; const C = p2.x - p1.x; const D = p2.y - p1.y;
      const dot = A * C + B * D; const lenSq = C * C + D * D;
      let param = -1; if (lenSq !== 0) param = dot / lenSq;
      let xx, yy;
      if (param < 0) { xx = p1.x; yy = p1.y; }
      else if (param > 1) { xx = p2.x; yy = p2.y; }
      else { xx = p1.x + param * C; yy = p1.y + param * D; }
      const dx = x - xx; const dy = y - yy;
      if ((dx * dx + dy * dy) < width * width) return true;
  }
  return false;
};

const createNoisePattern = (ctx: CanvasRenderingContext2D, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 100;
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return null;
    pCtx.fillStyle = color; pCtx.fillRect(0, 0, 100, 100);
    for (let i = 0; i < 400; i++) {
        pCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
        pCtx.fillRect(Math.random() * 100, Math.random() * 100, 2, 2);
    }
    return ctx.createPattern(canvas, 'repeat');
};

// Local wave generation (for solo mode only)
const generateWaveEnemies = (wave: number) => {
    const baseCount = 5 + Math.floor(wave * 2);
    const queue: { type: EnemyType; delay: number }[] = [];

    if (wave % 5 === 0) {
        queue.push({ type: EnemyType.BOSS, delay: 0 });
        for(let i=0; i<5; i++) queue.push({ type: EnemyType.NORMAL, delay: 40 });
    } else if (wave % 3 === 0) {
        for(let i=0; i<3; i++) queue.push({ type: EnemyType.TANK, delay: i === 0 ? 0 : 80 });
        for(let i=0; i<baseCount; i++) queue.push({ type: EnemyType.NORMAL, delay: 40 });
    } else if (wave % 2 === 0) {
        for(let i=0; i<baseCount + 5; i++) queue.push({ type: EnemyType.FAST, delay: i === 0 ? 0 : 20 });
    } else {
        for(let i=0; i<baseCount; i++) queue.push({ type: EnemyType.NORMAL, delay: i === 0 ? 0 : 35 });
    }
    return queue;
};

// --- DRAWING ---
const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower, era: number, gameTime: number) => {
  ctx.save();
  const timeSinceShot = gameTime - tower.lastShotFrame;
  let recoil = 0; if (timeSinceShot < 10) recoil = (10 - timeSinceShot) * 0.5;

  // Base
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI*2); ctx.fill();

  if (era === 0) { // Stone Age
      ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
  } else if (era === 1) { // Castle
      ctx.fillStyle = '#64748b'; ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#334155'; ctx.strokeRect(-14, -14, 28, 28);
  } else { // Imperial
      ctx.fillStyle = '#1e293b'; ctx.beginPath();
      for (let i = 0; i < 6; i++) ctx.lineTo(18 * Math.cos(i * Math.PI / 3), 18 * Math.sin(i * Math.PI / 3));
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();
  }

  // Turret
  ctx.save(); ctx.rotate(tower.rotation); ctx.translate(-recoil, 0);
  if (era === 0) {
      if (tower.type === TowerType.BASIC) {
          ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, 5, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -5, 4, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 0); ctx.lineTo(22, -6); ctx.moveTo(15, 0); ctx.lineTo(22, 6); ctx.stroke();
      } else {
          ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(30, 0); ctx.stroke();
      }
  } else if (era === 1) {
       ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); ctx.fillRect(0, -2, 15, 4);
  } else {
       ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(24, -4); ctx.lineTo(24, 4); ctx.lineTo(-5, 6); ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore(); ctx.restore();
};

const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, era: number, gameTime: number) => {
    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 5, enemy.radius * 0.6, enemy.radius * 0.3, 0, 0, Math.PI*2);
    ctx.fill();

    // Walking Animation
    const walkSpeed = enemy.type === EnemyType.FAST ? 0.4 : 0.2;
    const walkCycle = Math.sin(gameTime * walkSpeed);
    const bob = Math.abs(walkCycle) * 2;

    ctx.translate(0, -bob);

    // Legs
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, 8 + (walkCycle * 4)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(4, 8 - (walkCycle * 4)); ctx.stroke();

    // Body variations
    if (enemy.type === EnemyType.FAST) {
        ctx.rotate(15 * Math.PI / 180);
        ctx.fillStyle = enemy.color;
        ctx.beginPath(); ctx.roundRect(-6, -12, 12, 14, 4); ctx.fill();
        ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -14, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = enemy.color; ctx.fillRect(-5, -16, 10, 3);
        ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(-12, -18 + Math.sin(gameTime*0.3)*3); ctx.stroke();
        ctx.strokeStyle = enemy.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-10, -5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(10, -5); ctx.stroke();
    } else if (enemy.type === EnemyType.TANK) {
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.roundRect(-10, -15, 20, 18, 2); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(0, -16, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0ea5e9'; ctx.fillRect(-4, -18, 8, 3);
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(-12, -8, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, -8, 5, 0, Math.PI*2); ctx.fill();
    } else if (enemy.type === EnemyType.BOSS) {
        const scale = 1.5; ctx.scale(scale, scale);
        ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-12, 10); ctx.lineTo(12, 10); ctx.lineTo(8, -10); ctx.fill();
        ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.roundRect(-8, -15, 16, 18, 4); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(0, -5); ctx.lineTo(6, -15); ctx.fill();
        ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -18, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-3, -24); ctx.lineTo(0, -20); ctx.lineTo(3, -24); ctx.lineTo(6, -20); ctx.lineTo(6, -16); ctx.lineTo(-6, -16); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-2, -19, 1, 1); ctx.fillRect(1, -19, 1, 1);
    } else {
        ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.roundRect(-6, -12, 12, 14, 3); ctx.fill();
        ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -14, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, -15, 5.5, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(8, -5); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.fillRect(6, -7, 6, 2);
    }

    const hpPct = enemy.hp / enemy.maxHp;
    if (hpPct < 1.0) {
        ctx.fillStyle = '#111'; ctx.fillRect(-10, -30, 20, 4);
        ctx.fillStyle = hpPct < 0.3 ? '#ef4444' : hpPct < 0.6 ? '#eab308' : '#22c55e';
        ctx.fillRect(-9, -29, 18 * hpPct, 2);
    }
    ctx.restore();
};

const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile, era: number) => {
    ctx.save(); ctx.translate(proj.position.x, proj.position.y); ctx.rotate(Math.atan2(proj.velocity.y, proj.velocity.x));
    if (proj.visualType === 'ROCK') {
        ctx.fillStyle = '#a8a29e'; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(-2, 3); ctx.lineTo(-3, -1); ctx.lineTo(0, -3); ctx.fill();
    } else if (proj.visualType === 'ARROW') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(2, -2); ctx.lineTo(2, 2); ctx.fill();
    } else {
        ctx.fillStyle = proj.color || '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
};

const TowerIcon = ({ type, era }: { type: TowerType; era: number }) => {
    const iconMap: Record<number, Partial<Record<TowerType, string>>> = {
        0: { [TowerType.BASIC]: "🪃", [TowerType.RAPID]: "🏹", [TowerType.SNIPER]: "🔱", [TowerType.AOE]: "🪨" },
        1: { [TowerType.BASIC]: "🏰", [TowerType.RAPID]: "🤺", [TowerType.SNIPER]: "🎯", [TowerType.AOE]: "💣", [TowerType.LASER]: "🔮", [TowerType.FROST]: "❄️" },
        2: { [TowerType.BASIC]: "🔫", [TowerType.RAPID]: "⚙️", [TowerType.SNIPER]: "🎯", [TowerType.AOE]: "💥", [TowerType.LASER]: "⚡", [TowerType.FROST]: "🧊", [TowerType.SHOCK]: "⚡", [TowerType.MISSILE]: "🚀" }
    };
    const icon = iconMap[era]?.[type] || "🗼";
    const bgColors = ['bg-amber-900/60', 'bg-slate-600/60', 'bg-slate-800/60'];
    return <div className={`w-full h-full ${bgColors[era]} rounded-lg flex items-center justify-center text-2xl shadow-inner border border-white/10`}>{icon}</div>;
};

// --- GAME COMPONENT ---
const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, initialMode = 'DEFENSE', onlineGameId, onlinePlayerNumber, initialWaveData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  const lastFrameTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const bgPatternRef = useRef<CanvasPattern | null>(null);
  const sceneryRef = useRef<{x: number, y: number, r: number, type: 'tree' | 'rock' | 'bush'}[]>([]);

  // SWIPE STATE FOR SPECTATOR MODE
  const swipeStartRef = useRef<{ x: number; time: number } | null>(null);
  const [isSpectating, setIsSpectating] = useState(false);
  const [opponentState, setOpponentState] = useState<OpponentState | null>(null);

  // GAME STATE REFS
  const gameStateRef = useRef<GameState>({
    ...INITIAL_STATE,
    mode: initialMode,
    lives: 20,
    money: initialMode === 'PVP_ONLINE' ? 600 : 100,
    wave: 1,
    gameTime: 0,
    era: 0,
    exp: 0,
    maxExp: ERA_DATA[0].maxExp,
    autoStartTimer: BUILD_PHASE_DURATION,
    isPlaying: false,
    isGameOver: false,
    gameSpeed: 1
  });

  // Entities Refs
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const spawnQueueRef = useRef<{ type: EnemyType; delay: number }[]>([]);
  const waveFinishedRef = useRef<boolean>(false);

  // React State for UI
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [notification, setNotification] = useState<{title: string, subtitle?: string, color: string} | null>(null);
  const [currentMap, setCurrentMap] = useState<MapDefinition>(MAPS[0]);
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const gameStartTimeRef = useRef<number | null>(null);

  const triggerHaptic = (style: 'light' | 'medium' | 'error' | 'success') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
        if (style === 'error' || style === 'success') window.Telegram.WebApp.HapticFeedback.notificationOccurred(style);
        else window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  // Resize Handler
  useEffect(() => {
    const handleResize = () => { if (containerRef.current) setCanvasDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }); };
    handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Background Init
  useEffect(() => {
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    if (ctx) { const pattern = createNoisePattern(ctx, THEMES[0].background); if (pattern) bgPatternRef.current = pattern; }
    if (sceneryRef.current.length === 0) {
        for (let i = 0; i < 60; i++) sceneryRef.current.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, r: Math.random() * 10 + 5, type: Math.random() > 0.9 ? 'rock' : 'tree' });
    }
  }, []);

  // --- SPAWN HELPER ---
  const spawnLocalEnemy = useCallback((type: EnemyType) => {
    const stats = ENEMY_STATS[type];
    const waveMult = 1 + (gameStateRef.current.wave * 0.1);
    enemiesRef.current.push({
        id: Math.random().toString(36), position: { ...currentMap.waypoints[0] },
        type: type, hp: stats.maxHp * waveMult, maxHp: stats.maxHp * waveMult, speed: stats.speed,
        pathIndex: 0, distanceTraveled: 0, frozen: 0, moneyReward: stats.reward, expReward: stats.expReward, color: stats.color, radius: stats.radius
    });
  }, [currentMap]);

  // --- SOCKET EVENT LISTENERS FOR SYNCHRONIZED GAMEPLAY ---
  useEffect(() => {
    if (!onlineGameId || initialMode !== 'PVP_ONLINE') return;

    // Game starts when both players are ready
    const startGameWithWave = (waveData?: WaveData) => {
      if (gameStartTimeRef.current !== null) return;
      gameStartTimeRef.current = Date.now();
      setWaitingForOpponent(false);
      gameStateRef.current.isPlaying = true;
      if (waveData) {
        gameStateRef.current.wave = waveData.wave;
        spawnQueueRef.current = [...waveData.enemies];
      } else {
        spawnQueueRef.current = generateWaveEnemies(1);
      }
      waveFinishedRef.current = false;
      audioService.playWaveStart(gameStateRef.current.era);
      setNotification({ title: "WAVE 1", subtitle: "ENEMIES INCOMING!", color: "text-yellow-400" });
      setTimeout(() => setNotification(null), 2000);
      setUiState({ ...gameStateRef.current });
    };

    socketService.onGameStart(({ waveData }) => {
      console.log('Game starting with synced wave:', waveData);
      startGameWithWave(waveData);
    });

    socketService.onOpponentJoined(() => {
      console.log('Opponent joined, starting game');
      startGameWithWave();
    });

    const startGameTimeout = setTimeout(() => {
      if (waitingForOpponent && gameStartTimeRef.current === null) {
        console.log('Timeout waiting for opponent event, starting game anyway');
        startGameWithWave();
      }
    }, 3000);

    // Receive next wave sync
    socketService.onWaveSync((waveData) => {
      console.log('Wave sync received:', waveData);
      gameStateRef.current.isPlaying = true;
      gameStateRef.current.wave = waveData.wave;
      spawnQueueRef.current = [...waveData.enemies];
      waveFinishedRef.current = false;
      audioService.playWaveStart(gameStateRef.current.era);
      setNotification({ title: "WAVE " + waveData.wave, subtitle: "ENEMIES INCOMING!", color: "text-yellow-400" });
      setTimeout(() => setNotification(null), 2000);
      setUiState({ ...gameStateRef.current });
    });

    // Receive opponent state for spectator mode
    socketService.onOpponentState((state) => {
      setOpponentState(state);
    });

    // Opponent lost - we won!
    socketService.onOpponentLost(({ wave }) => {
      console.log('Opponent lost at wave:', wave);
      gameStateRef.current.isGameOver = true;
      setGameResult('won');
      triggerHaptic('success');
      setNotification({ title: "VICTORY!", subtitle: `Opponent fell at wave ${wave}`, color: "text-green-400" });
      setUiState({ ...gameStateRef.current });
    });

    // Opponent disconnected
    socketService.onOpponentDisconnected(() => {
      setNotification({ title: "OPPONENT LEFT", subtitle: "You win by default!", color: "text-yellow-400" });
      gameStateRef.current.isGameOver = true;
      setGameResult('won');
      setUiState({ ...gameStateRef.current });
    });

    return () => clearTimeout(startGameTimeout);
  }, [onlineGameId, initialMode, waitingForOpponent]);

  // Initialize Game Logic
  const initializeGame = useCallback(() => {
      setHasStartedGame(true);
      gameStateRef.current = {
          ...INITIAL_STATE,
          mode: initialMode,
          lives: 20,
          money: initialMode === 'PVP_ONLINE' ? 600 : 450,
          wave: 1,
          gameTime: 0,
          era: 0,
          exp: 0,
          maxExp: ERA_DATA[0].maxExp,
          autoStartTimer: BUILD_PHASE_DURATION,
          isPlaying: false,
          isGameOver: false,
          gameSpeed: 1
      };

      towersRef.current = [];
      enemiesRef.current = [];
      projectilesRef.current = [];
      floatingTextsRef.current = [];
      spawnQueueRef.current = [];
      waveFinishedRef.current = false;
      setGameResult(null);

      setUiState({...gameStateRef.current});
      triggerHaptic('medium');

      // PVP_ONLINE: Don't send ready here - Lobby already did that!
      // The game_start event from server will trigger the first wave
  }, [initialMode, onlineGameId]);

  // Auto-start for PVP_ONLINE (no START button needed, Lobby already handled ready)
  useEffect(() => {
    if (initialMode === 'PVP_ONLINE' && onlineGameId && !hasStartedGame) {
      // Initialize the game immediately for online matches
      setHasStartedGame(true);
      gameStateRef.current = {
          ...INITIAL_STATE,
          mode: initialMode,
          lives: 20,
          money: 600,
          wave: initialWaveData?.wave || 1,
          gameTime: 0,
          era: 0,
          exp: 0,
          maxExp: ERA_DATA[0].maxExp,
          autoStartTimer: -1, // No auto-start timer for online
          isPlaying: true, // Start playing immediately with wave data from Lobby
          isGameOver: false,
          gameSpeed: 1
      };

      // Use the wave data from Lobby (passed via game_start event)
      if (initialWaveData?.enemies) {
        spawnQueueRef.current = [...initialWaveData.enemies];
        waveFinishedRef.current = false;
        audioService.playWaveStart(0);
        setNotification({ title: "WAVE " + (initialWaveData.wave || 1), subtitle: "LOS GEHT'S!", color: "text-yellow-400" });
        setTimeout(() => setNotification(null), 2000);
      }

      setUiState({...gameStateRef.current});
    }
  }, [initialMode, onlineGameId, hasStartedGame, initialWaveData]);


  // --- START WAVE (Solo mode only) ---
  const handleStartWave = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.isPlaying && !state.isGameOver && initialMode !== 'PVP_ONLINE') {
        state.isPlaying = true;
        state.autoStartTimer = -1;

        const newEnemies = generateWaveEnemies(state.wave);
        spawnQueueRef.current = newEnemies;

        audioService.playWaveStart(state.era);
        triggerHaptic('medium');
        setUiState(prev => ({ ...prev, isPlaying: true, autoStartTimer: -1 }));
        setCountdown(null);
    }
  }, [initialMode]);

  // --- SEND STATE UPDATE FOR SPECTATING ---
  const sendStateUpdate = useCallback(() => {
    if (!onlineGameId || initialMode !== 'PVP_ONLINE') return;

    const state = gameStateRef.current;
    const opponentStateData: OpponentState = {
      lives: state.lives,
      wave: state.wave,
      era: state.era,
      towers: towersRef.current.map(t => ({ position: t.position, type: t.type, level: t.level })),
      enemies: enemiesRef.current.map(e => ({ position: e.position, type: e.type, hp: e.hp, maxHp: e.maxHp })),
      isGameOver: state.isGameOver
    };

    socketService.sendStateUpdate(onlineGameId, opponentStateData);
  }, [onlineGameId, initialMode]);

  // --- UPDATE LOOP ---
  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isGameOver) return;

    // 1. BUILD PHASE TIMER (Only for Solo)
    if (!state.isPlaying && hasStartedGame && initialMode !== 'PVP_ONLINE') {
        if (state.autoStartTimer > 0) {
            state.autoStartTimer--;
            if (state.autoStartTimer === 0) handleStartWave();
        }
    }

    // 2. GAME PHYSICS
    const loops = state.gameSpeed;
    for (let loop = 0; loop < loops; loop++) {
        state.gameTime++;

        // Spawning from queue
        if (state.isPlaying) {
            const queue = spawnQueueRef.current;
            if (queue.length > 0) {
                if (queue[0].delay <= 0) {
                    const nextEnemy = queue.shift();
                    if (nextEnemy) spawnLocalEnemy(nextEnemy.type);
                } else queue[0].delay--;
            } else if (enemiesRef.current.length === 0 && !waveFinishedRef.current) {
                // Wave complete
                waveFinishedRef.current = true;
                state.isPlaying = false;
                state.money += 150 + (state.wave * 25);

                if (initialMode === 'PVP_ONLINE' && onlineGameId) {
                    // Request next wave from server
                    socketService.requestNextWave(onlineGameId);
                    setNotification({ title: "WAVE COMPLETE", subtitle: "WAITING FOR OPPONENT...", color: "text-green-400" });
                } else {
                    // Solo mode - continue locally
                    state.wave++;
                    state.autoStartTimer = BUILD_PHASE_DURATION;
                    setNotification({ title: "WAVE COMPLETE", subtitle: "PREPARE DEFENSES", color: "text-green-400" });
                }
                setTimeout(() => setNotification(null), 2500);
                audioService.playBuild();
            }
        }

        // Move Projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
            const p = projectilesRef.current[i];
            const target = enemiesRef.current.find(e => e.id === p.targetId);
            if (!target) {
                p.position.x += p.velocity.x; p.position.y += p.velocity.y;
                if (p.position.x < 0 || p.position.x > CANVAS_WIDTH || p.position.y < 0 || p.position.y > CANVAS_HEIGHT) projectilesRef.current.splice(i, 1);
                continue;
            }
            const angle = Math.atan2(target.position.y - p.position.y, target.position.x - p.position.x);
            p.velocity.x = Math.cos(angle) * p.speed; p.velocity.y = Math.sin(angle) * p.speed;
            p.position.x += p.velocity.x; p.position.y += p.velocity.y;
            if (Math.hypot(p.position.x - target.position.x, p.position.y - target.position.y) <= p.speed) {
                target.hp -= p.damage;
                floatingTextsRef.current.push({ id: Math.random().toString(), position: { ...target.position }, text: Math.floor(p.damage).toString(), life: 1.0, color: '#fff', velocity: { x: 0, y: -2 } });
                projectilesRef.current.splice(i, 1);
            }
        }

        // Move Enemies
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            const enemy = enemiesRef.current[i];
            const target = currentMap.waypoints[enemy.pathIndex + 1];
            if (!target) {
                state.lives--;
                if (loop === 0) { triggerHaptic('error'); audioService.playDamage(); }
                enemiesRef.current.splice(i, 1);

                // Check game over
                if (state.lives <= 0) {
                    state.isGameOver = true;
                    setGameResult('lost');

                    // Notify server that we lost
                    if (initialMode === 'PVP_ONLINE' && onlineGameId) {
                        socketService.sendPlayerLost(onlineGameId, state.wave);
                    }

                    onGameOver(state.wave);
                }
                continue;
            }
            const dist = Math.hypot(enemy.position.x - target.x, enemy.position.y - target.y);
            if (dist <= enemy.speed) { enemy.position = { ...target }; enemy.pathIndex++; }
            else {
                const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
                enemy.position.x += Math.cos(angle) * enemy.speed; enemy.position.y += Math.sin(angle) * enemy.speed;
            }
        }

        // Towers Shoot
        towersRef.current.forEach(tower => {
            if (tower.lastShotFrame + tower.cooldown > state.gameTime) return;
            let target = null; let maxDist = -1;
            for (const enemy of enemiesRef.current) {
                const d = Math.hypot(tower.position.x - enemy.position.x, tower.position.y - enemy.position.y);
                if (d <= tower.range && enemy.distanceTraveled > maxDist) { maxDist = enemy.distanceTraveled; target = enemy; }
            }
            if (target) {
                tower.lastShotFrame = state.gameTime;
                tower.rotation = Math.atan2(target.position.y - tower.position.y, target.position.x - tower.position.x);
                projectilesRef.current.push({
                    id: Math.random().toString(), position: { ...tower.position }, targetId: target.id,
                    damage: tower.damage, speed: 12, color: '#000', radius: 3, hasHit: false, type: 'SINGLE',
                    velocity: { x: 0, y: 0 }, visualType: state.era === 0 ? 'ROCK' : 'ARROW'
                });
                if (loop === 0) audioService.playShoot('NORMAL', state.era);
            }
        });

        // Kill Enemies
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            if (enemiesRef.current[i].hp <= 0) {
                state.money += enemiesRef.current[i].moneyReward;
                state.exp += enemiesRef.current[i].expReward;
                floatingTextsRef.current.push({ id: Math.random().toString(), position: { ...enemiesRef.current[i].position }, text: `+$${enemiesRef.current[i].moneyReward}`, life: 1.0, color: '#fbbf24', velocity: { x: 0, y: -2 } });
                enemiesRef.current.splice(i, 1);
            }
        }

        // Floating Text
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
            const ft = floatingTextsRef.current[i]; ft.life -= 0.02; ft.position.y += ft.velocity.y;
            if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
        }
    }

    // Send state update for spectating (every N frames)
    if (state.gameTime % STATE_SYNC_INTERVAL === 0 && initialMode === 'PVP_ONLINE') {
        sendStateUpdate();
    }

    // UI Sync
    if (state.gameTime % 5 === 0 || !state.isPlaying) {
        setUiState({...state});
        if (state.autoStartTimer > 0 && hasStartedGame && !state.isPlaying && initialMode !== 'PVP_ONLINE') {
            setCountdown(Math.ceil(state.autoStartTimer / 60));
        } else {
            setCountdown(null);
        }
    }

  }, [onGameOver, currentMap, hasStartedGame, handleStartWave, initialMode, onlineGameId, spawnLocalEnemy, sendStateUpdate]);

  // --- RENDERING LOOP ---
  const calculateTransform = () => {
      const { width, height } = canvasDimensions;
      const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
      return { scale, offsetX: (width - CANVAS_WIDTH * scale) / 2, offsetY: (height - CANVAS_HEIGHT * scale) / 2 };
  };

  // Draw opponent's game (for spectator mode) - uses same sprites as own game
  const drawOpponentGame = (ctx: CanvasRenderingContext2D, scale: number, offsetX: number, offsetY: number) => {
    if (!opponentState) return;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Background (same as own game)
    if (bgPatternRef.current) {
        ctx.fillStyle = bgPatternRef.current;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Scenery (same decorations)
    sceneryRef.current.forEach(item => {
        ctx.fillStyle = item.type === 'tree' ? '#14532d' : '#57534e';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Path (same style)
    if (currentMap.waypoints.length > 0) {
        ctx.strokeStyle = THEMES[0].pathInner;
        ctx.lineWidth = 60;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
        for (let i = 1; i < currentMap.waypoints.length; i++) {
            ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y);
        }
        ctx.stroke();
    }

    // Opponent's towers - use proper drawing function
    const opponentEra = opponentState.era;
    const gameTime = gameStateRef.current.gameTime;

    opponentState.towers.forEach(tower => {
        ctx.save();
        ctx.translate(tower.position.x, tower.position.y);
        // Create a mock tower object for drawing
        const mockTower: Tower = {
            id: 'opp',
            position: tower.position,
            type: tower.type as TowerType,
            level: tower.level,
            lastShotFrame: 0,
            range: 0,
            damage: 0,
            cooldown: 0,
            rotation: 0,
            eraBuilt: opponentEra
        };
        drawTower(ctx, mockTower, opponentEra, gameTime);
        ctx.restore();
    });

    // Opponent's enemies - use proper drawing function
    opponentState.enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y);
        // Create a mock enemy object for drawing
        const stats = ENEMY_STATS[enemy.type as EnemyType];
        const mockEnemy: Enemy = {
            id: 'opp',
            position: enemy.position,
            type: enemy.type as EnemyType,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            speed: stats?.speed || 1,
            pathIndex: 0,
            distanceTraveled: 0,
            frozen: 0,
            moneyReward: 0,
            expReward: 0,
            color: stats?.color || '#ef4444',
            radius: stats?.radius || 12
        };
        drawEnemySprite(ctx, mockEnemy, opponentEra, gameTime);
        ctx.restore();
    });

    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const { scale, offsetX, offsetY } = calculateTransform();

    // Clear canvas
    ctx.fillStyle = THEMES[0].background; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isSpectating && opponentState) {
        // Draw opponent's game when spectating
        drawOpponentGame(ctx, scale, offsetX, offsetY);

        // Draw "SPECTATING OPPONENT" overlay at top
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Top banner
        ctx.fillStyle = 'rgba(139, 92, 246, 0.9)'; // Purple
        ctx.fillRect(0, 0, CANVAS_WIDTH, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👁️ GEGNER BEOBACHTEN', CANVAS_WIDTH / 2, 25);

        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('← Swipe links um zurück zu kommen', CANVAS_WIDTH / 2, 42);

        // Opponent stats
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 60, 120, 50);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 60, 120, 50);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`❤️ ${opponentState.lives}`, 20, 82);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`⚔️ Wave ${opponentState.wave}`, 20, 100);

        ctx.restore();
    } else {
        // Draw own game
        ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
        if (bgPatternRef.current) { ctx.fillStyle = bgPatternRef.current; ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT); }

        // Path
        if (currentMap.waypoints.length > 0) {
            ctx.strokeStyle = THEMES[0].pathInner; ctx.lineWidth = 60; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
            for (let i = 1; i < currentMap.waypoints.length; i++) ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y);
            ctx.stroke();
        }

        // Entities
        sceneryRef.current.forEach(item => { ctx.fillStyle = item.type === 'tree' ? '#14532d' : '#57534e'; ctx.beginPath(); ctx.arc(item.x, item.y, item.r, 0, Math.PI*2); ctx.fill(); });
        towersRef.current.forEach(tower => { ctx.save(); ctx.translate(tower.position.x, tower.position.y); drawTower(ctx, tower, gameStateRef.current.era, gameStateRef.current.gameTime); ctx.restore(); });
        enemiesRef.current.forEach(enemy => { ctx.save(); ctx.translate(enemy.position.x, enemy.position.y); drawEnemySprite(ctx, enemy, gameStateRef.current.era, gameStateRef.current.gameTime); ctx.restore(); });
        projectilesRef.current.forEach(proj => drawProjectile(ctx, proj, gameStateRef.current.era));
        floatingTextsRef.current.forEach(ft => { ctx.fillStyle = ft.color; ctx.font = 'bold 16px Arial'; ctx.fillText(ft.text, ft.position.x, ft.position.y); });

        // Ghost Tower (Placement Preview)
        if (selectedTowerType && mousePosRef.current && hasStartedGame && !gameStateRef.current.isGameOver) {
            const gx = Math.floor(mousePosRef.current.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
            const gy = Math.floor(mousePosRef.current.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
            const config = TOWER_TYPES[selectedTowerType];

            ctx.beginPath(); ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.arc(gx, gy, config.range, 0, Math.PI * 2); ctx.fill();
            const isValid = gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 35, currentMap.waypoints) && !towersRef.current.some(t => Math.hypot(t.position.x - gx, t.position.y - gy) < 20);

            ctx.save(); ctx.translate(gx, gy); ctx.globalAlpha = 0.6;
            const mock: Tower = { id:'p', position:{x:gx, y:gy}, type:selectedTowerType, level:1, lastShotFrame:0, range:0, damage:0, cooldown:0, rotation:0, eraBuilt:0};
            drawTower(ctx, mock, gameStateRef.current.era, 0);
            ctx.restore();

            ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            ctx.beginPath(); ctx.arc(gx, gy, 15, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
  }, [currentMap, selectedTowerType, canvasDimensions, hasStartedGame, isSpectating, opponentState]);

  // --- INPUT HANDLERS ---
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current; if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = calculateTransform();
      return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY);

    // Track swipe start for spectator mode
    swipeStartRef.current = { x: e.clientX, time: Date.now() };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY);

    // Check for swipe gesture (only in PVP mode)
    if (initialMode === 'PVP_ONLINE' && swipeStartRef.current && isPointerDownRef.current) {
        const dx = e.clientX - swipeStartRef.current.x;
        const threshold = 100; // pixels

        if (dx < -threshold && isSpectating) {
            // Swipe left while spectating - return to own game
            setIsSpectating(false);
            swipeStartRef.current = null;
            triggerHaptic('light');
        } else if (dx > threshold && !isSpectating && opponentState) {
            // Swipe right while on own game - view opponent
            setIsSpectating(true);
            swipeStartRef.current = null;
            triggerHaptic('light');
        }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    swipeStartRef.current = null;

    // Don't place towers while spectating
    if (isSpectating) return;

    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pos || !selectedTowerType) return;

    // Logic to place tower:
    const gx = Math.floor(pos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gy = Math.floor(pos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const config = TOWER_TYPES[selectedTowerType];
    const state = gameStateRef.current;

    // Check Validity
    const isValid = state.money >= config.cost && !isPointOnPath(gx, gy, 35, currentMap.waypoints) && !towersRef.current.some(t => Math.hypot(t.position.x - gx, t.position.y - gy) < 20);

    if (isValid) {
        state.money -= config.cost;
        const newTower: Tower = {
            id: Math.random().toString(), position: { x: gx, y: gy }, type: config.type,
            range: config.range, damage: config.damage, cooldown: config.cooldown, lastShotFrame: 0, rotation: 0, level: 1, eraBuilt: state.era
        };
        towersRef.current.push(newTower);

        audioService.playBuild();
        triggerHaptic('light');
        setUiState({...state});
        setSelectedTowerType(null);
    } else {
        triggerHaptic('error');
    }
  };

  const handleEvolve = useCallback(() => {
    const state = gameStateRef.current;
    if (state.era < 2 && state.exp >= state.maxExp) {
        state.exp -= state.maxExp;
        state.era++;
        if (ERA_DATA[state.era]) state.maxExp = ERA_DATA[state.era].maxExp;
        triggerHaptic('success');
        audioService.playBuild();
        setNotification({ title: `${ERA_DATA[state.era].name}`, subtitle: "NEW TECHNOLOGY UNLOCKED", color: "text-yellow-400" });
        setTimeout(() => setNotification(null), 3000);
        setUiState({ ...state });
    }
  }, []);

  const handleToggleSpeed = useCallback(() => {
    const state = gameStateRef.current;
    state.gameSpeed = state.gameSpeed === 1 ? 2 : 1;
    triggerHaptic('light');
    setUiState({ ...state });
  }, []);

  // --- RAF LOOP ---
  useEffect(() => {
    let frameId: number;
    const loop = (time: number) => {
        if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
        const delta = time - lastFrameTimeRef.current;
        lastFrameTimeRef.current = time;
        accumulatorRef.current += delta;
        if (accumulatorRef.current > 250) accumulatorRef.current = 250;
        while (accumulatorRef.current >= 16.67) { update(); accumulatorRef.current -= 16.67; }
        draw();
        frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [update, draw]);


  // --- JSX RENDER ---
  const canEvolve = uiState.era < 2 && uiState.exp >= uiState.maxExp;

  return (
    <div className="flex flex-col gap-2 w-full h-full overflow-hidden box-border bg-[#1c1917]">
      <div ref={containerRef} className="flex-1 relative group flex-shrink-0 mx-auto w-full h-full flex justify-center items-center overflow-hidden bg-black shadow-2xl">
        <canvas
            ref={canvasRef} width={canvasDimensions.width} height={canvasDimensions.height}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={() => { isPointerDownRef.current = false; mousePosRef.current = null; swipeStartRef.current = null; }}
            className="block w-full h-full" style={{ touchAction: 'none' }}
        />

        {/* TOP HUD */}
        {hasStartedGame && !uiState.isGameOver && (
            <>
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none z-10">
                    {/* Player Badge / Wave Info */}
                    <div className="flex items-center gap-2">
                        {initialMode === 'PVP_ONLINE' ? (
                            <div className="flex items-center gap-2 bg-blue-950/80 border-blue-500/30 px-3 py-1.5 rounded-lg border backdrop-blur-sm">
                                <Users size={14} className="text-blue-400" />
                                <span className="text-blue-100 font-bold text-xs">P{onlinePlayerNumber}</span>
                                <span className="text-blue-300 text-xs">Wave {uiState.wave}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                                <Home size={14} className="text-amber-400" />
                                <span className="text-white/90 font-bold text-sm">Wave {uiState.wave}</span>
                            </div>
                        )}

                        {/* Spectator toggle button */}
                        {initialMode === 'PVP_ONLINE' && opponentState && (
                            <button
                                onClick={() => setIsSpectating(!isSpectating)}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-all pointer-events-auto active:scale-95 ${
                                    isSpectating
                                        ? 'bg-purple-600 border-purple-400 text-white'
                                        : 'bg-purple-950/80 border-purple-500/30 text-purple-100'
                                }`}
                            >
                                <Eye size={14} className={isSpectating ? 'text-white' : 'text-purple-400'} />
                                <span className="text-xs font-bold">{isSpectating ? '← ZURÜCK' : 'GEGNER →'}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                        {canEvolve && (
                            <button onClick={handleEvolve} className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 px-3 py-1.5 rounded-lg border border-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.5)] animate-pulse active:scale-95 transition-all">
                                <ArrowUpCircle size={14} className="text-yellow-900" />
                                <span className="text-yellow-900 font-bold text-xs">EVOLVE</span>
                            </button>
                        )}
                        {initialMode === 'DEFENSE' && (
                            <button onClick={handleToggleSpeed} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${uiState.gameSpeed === 2 ? 'bg-green-500/90 border-green-300 text-green-900' : 'bg-black/60 backdrop-blur-sm border-white/10 text-white/70 hover:bg-white/10'}`}>
                                <FastForward size={14} /> <span className="font-bold text-xs">x{uiState.gameSpeed}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Opponent lives indicator */}
                {initialMode === 'PVP_ONLINE' && opponentState && !isSpectating && (
                    <div className="absolute top-14 left-2 flex items-center gap-2 bg-red-950/60 backdrop-blur-sm px-2 py-1 rounded-lg pointer-events-none border border-red-500/20">
                        <span className="text-red-300 text-xs">Opponent:</span>
                        <Heart size={12} className="text-red-400 fill-red-400" />
                        <span className="text-red-100 text-xs font-bold">{opponentState.lives}</span>
                    </div>
                )}

                {countdown !== null && initialMode !== 'PVP_ONLINE' && (
                    <div className="absolute top-14 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
                        <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-yellow-500/30">
                            <Clock size={14} className="text-yellow-400" />
                            <span className="text-yellow-300 font-bold text-sm">Starts in {countdown}s</span>
                        </div>
                        <button onClick={handleStartWave} className="pointer-events-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-green-900/50 active:scale-95 transition-all border border-green-400/30">
                            <PlayCircle size={14} /> START NOW
                        </button>
                    </div>
                )}
            </>
        )}

        {/* WAITING FOR OPPONENT */}
        {waitingForOpponent && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-2xl border border-blue-500/30 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-blue-100 mb-2">WAITING FOR OPPONENT</h2>
                    <p className="text-slate-400 text-sm">Game starts when both players are ready</p>
                </div>
            </div>
        )}

        {/* START SCREEN */}
        {!hasStartedGame && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-slate-900/90 to-black/90 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-md">
                <div className="bg-gradient-to-b from-[#292524] to-[#1c1917] p-8 rounded-2xl border-2 border-amber-600/50 text-center shadow-2xl w-[320px]">
                    <div className="text-5xl mb-4">🏰</div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mb-3 tracking-widest">READY?</h2>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        {initialMode === 'PVP_ONLINE'
                            ? "Build towers to defend against waves. First to lose, loses the match!"
                            : "Build towers to stop the invaders."
                        }
                    </p>
                    <button onClick={initializeGame} className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-black flex items-center justify-center gap-3 text-lg tracking-widest shadow-lg shadow-orange-900/50 active:scale-[0.98] transition-all border border-orange-400/30">
                        <Play size={24} /> START GAME
                    </button>
                </div>
            </div>
        )}

        {/* NOTIFICATION */}
        {notification && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center">
                <div className="bg-black/80 backdrop-blur-md px-8 py-6 rounded-2xl border border-white/20 shadow-2xl">
                    <h2 className={`font-black text-4xl ${notification.color} drop-shadow-lg tracking-widest text-center`}>{notification.title}</h2>
                    {notification.subtitle && <div className="text-white/80 text-sm font-medium mt-3 text-center tracking-wide">{notification.subtitle}</div>}
                </div>
            </div>
        )}

        {/* GAME OVER SCREEN */}
        {uiState.isGameOver && (
            <div className={`absolute inset-0 ${gameResult === 'won' ? 'bg-gradient-to-b from-green-950/95 via-black/95 to-black/95' : 'bg-gradient-to-b from-red-950/95 via-black/95 to-black/95'} flex flex-col items-center justify-center z-40 backdrop-blur-sm`}>
                <div className={`bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-2xl border-2 ${gameResult === 'won' ? 'border-green-600/50' : 'border-red-600/50'} text-center shadow-2xl w-[320px]`}>
                    {gameResult === 'won' ? (
                        <>
                            <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2 tracking-widest">VICTORY!</h2>
                            <p className="text-slate-400 text-sm mb-4">Your opponent's defense crumbled!</p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-2 tracking-widest">GAME OVER</h2>
                            <p className="text-slate-400 text-sm mb-4">Your defense fell at wave {uiState.wave}!</p>
                        </>
                    )}
                    <button onClick={() => initializeGame()} className={`w-full px-6 py-4 ${gameResult === 'won' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-orange-600'} text-white rounded-xl font-black flex items-center justify-center gap-3 text-lg tracking-widest shadow-lg active:scale-[0.98] transition-all`}>
                        <Play size={24} /> {initialMode === 'PVP_ONLINE' ? 'PLAY AGAIN' : 'REMATCH'}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* MENU BAR (Stats & Building) */}
      <div className="shrink-0 flex flex-col gap-1.5 w-full min-w-0 pb-2 px-2 relative bg-[#1c1917] z-10">

        {/* STATS BAR */}
        <div className="bg-[#292524] px-3 py-2 rounded-lg border border-[#44403c] flex items-center justify-between w-full shadow-lg relative overflow-hidden">
             {/* XP BAR */}
             <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                 <div className="h-full transition-all duration-300 ease-out rounded-r-full" style={{ width: `${Math.min(100, (uiState.exp / uiState.maxExp) * 100)}%`, background: uiState.era === 0 ? 'linear-gradient(90deg, #d97706, #fbbf24)' : uiState.era === 1 ? 'linear-gradient(90deg, #64748b, #94a3b8)' : 'linear-gradient(90deg, #dc2626, #f87171)' }} />
             </div>

             <div className="flex items-center gap-4 z-10 relative">
                <div className="flex items-center gap-1.5 bg-red-950/50 px-2 py-1 rounded">
                    <Heart className="text-red-500 fill-red-500 w-4 h-4" />
                    <span className="text-base font-bold text-red-100">{uiState.lives}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-950/50 px-2 py-1 rounded">
                    <Coins className="text-yellow-400 fill-yellow-400 w-4 h-4" />
                    <span className="text-base font-bold text-yellow-100">${uiState.money}</span>
                </div>
             </div>
        </div>

        {/* TOWER BUILDING MENU - Available to all players now */}
        <div className="bg-[#292524] p-1.5 rounded-lg border border-[#44403c] shadow-lg overflow-hidden">
            <div className="flex gap-2 overflow-x-auto items-center scrollbar-hide px-1 pb-1">
                {ERA_DATA[uiState.era].availableTowers.map((type) => {
                    const config = TOWER_TYPES[type];
                    const isSelected = selectedTowerType === config.type;
                    const canAfford = uiState.money >= config.cost;
                    const towerName = ERA_DATA[uiState.era].towerNames[type] || config.baseName;
                    return (
                    <button key={config.type} onClick={() => { setSelectedTowerType(isSelected ? null : config.type); triggerHaptic('light'); }}
                        className={`min-w-[72px] py-2 px-1 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all shrink-0 relative ${isSelected ? 'border-yellow-500 bg-yellow-500/20' : 'border-slate-700 bg-slate-800'} ${!canAfford ? 'opacity-50 grayscale' : ''}`}>
                        <div className="w-10 h-10 flex items-center justify-center"><TowerIcon type={config.type} era={uiState.era} /></div>
                        <div className="text-[8px] text-slate-300 font-medium truncate w-full text-center px-1">{towerName}</div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${canAfford ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>${config.cost}</div>
                        {isSelected && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center"><Check size={10} className="text-yellow-900" /></div>}
                    </button>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
