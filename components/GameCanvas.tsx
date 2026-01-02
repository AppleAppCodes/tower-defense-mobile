
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, MapDefinition, FloatingText, GameMode } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, GRID_SIZE, INITIAL_STATE, THEMES, ERA_DATA, UNIT_TYPES } from '../constants';
import { audioService } from '../services/audioService';
import { socketService } from '../services/socketService';
import { Heart, Coins, Play, Check, ArrowUpCircle, Sword, Wifi, PlayCircle, Clock, Home, Zap, FastForward } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (wave: number) => void;
  initialMode?: GameMode;
  onlineGameId?: string;
  onlineRole?: 'DEFENDER' | 'ATTACKER';
}

// --- CONSTANTS ---
const BUILD_PHASE_DURATION = 600; // 10 Seconds (60fps)

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

const generateWaveEnemies = (wave: number) => {
    const baseCount = 5 + Math.floor(wave * 2);
    const queue: { type: EnemyType; delay: number }[] = [];
    if (wave % 5 === 0) {
        queue.push({ type: EnemyType.BOSS, delay: 0 });
        for(let i=0; i<5; i++) queue.push({ type: EnemyType.NORMAL, delay: 60 + i*30 });
    } else if (wave % 3 === 0) {
        for(let i=0; i<3; i++) queue.push({ type: EnemyType.TANK, delay: i*120 });
        for(let i=0; i<baseCount; i++) queue.push({ type: EnemyType.NORMAL, delay: 300 + i*40 });
    } else if (wave % 2 === 0) {
        for(let i=0; i<baseCount + 5; i++) queue.push({ type: EnemyType.FAST, delay: i*25 });
    } else {
        for(let i=0; i<baseCount; i++) queue.push({ type: EnemyType.NORMAL, delay: i*45 });
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
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill(); // Head
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
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, enemy.radius/2, enemy.radius, enemy.radius/2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = enemy.color; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    const bob = Math.sin(gameTime * 0.2) * 2; ctx.translate(0, bob);

    if (enemy.type === EnemyType.NORMAL) {
        ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-4, -2, 4, 0, Math.PI*2); ctx.arc(4, -2, 4, 0, Math.PI*2); ctx.fill();
    } else if (enemy.type === EnemyType.FAST) {
        ctx.beginPath(); ctx.moveTo(0, -enemy.radius); ctx.lineTo(enemy.radius, enemy.radius); ctx.lineTo(-enemy.radius, enemy.radius); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (enemy.type === EnemyType.TANK) {
        ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius*2, enemy.radius*2); ctx.strokeRect(-enemy.radius, -enemy.radius, enemy.radius*2, enemy.radius*2);
    } else if (enemy.type === EnemyType.BOSS) {
        ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    const hpPct = enemy.hp / enemy.maxHp;
    if (hpPct < 1.0) {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-10, -enemy.radius - 8, 20 * hpPct, 3);
        ctx.strokeStyle = '#000'; ctx.strokeRect(-10, -enemy.radius - 8, 20, 3);
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
        0: { // Stone Age
            [TowerType.BASIC]: "🪃",
            [TowerType.RAPID]: "🏹",
            [TowerType.SNIPER]: "🔱",
            [TowerType.AOE]: "🪨",
        },
        1: { // Castle Age
            [TowerType.BASIC]: "🏰",
            [TowerType.RAPID]: "🤺",
            [TowerType.SNIPER]: "🎯",
            [TowerType.AOE]: "💣",
            [TowerType.LASER]: "🔮",
            [TowerType.FROST]: "❄️",
        },
        2: { // Imperial Age
            [TowerType.BASIC]: "🔫",
            [TowerType.RAPID]: "⚙️",
            [TowerType.SNIPER]: "🎯",
            [TowerType.AOE]: "💥",
            [TowerType.LASER]: "⚡",
            [TowerType.FROST]: "🧊",
            [TowerType.SHOCK]: "⚡",
            [TowerType.MISSILE]: "🚀",
        }
    };

    const icon = iconMap[era]?.[type] || "🗼";
    const bgColors = ['bg-amber-900/60', 'bg-slate-600/60', 'bg-slate-800/60'];

    return (
        <div className={`w-full h-full ${bgColors[era]} rounded-lg flex items-center justify-center text-2xl shadow-inner border border-white/10`}>
            {icon}
        </div>
    );
};

// --- GAME COMPONENT ---
const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, initialMode = 'DEFENSE', onlineGameId, onlineRole }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  
  const lastFrameTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const bgPatternRef = useRef<CanvasPattern | null>(null);
  const sceneryRef = useRef<{x: number, y: number, r: number, type: 'tree' | 'rock' | 'bush'}[]>([]);

  // GAME STATE REFS (Single Source of Truth)
  const gameStateRef = useRef<GameState>({
    ...INITIAL_STATE,
    mode: initialMode,
    lives: 20,
    money: 100, // Starting Money
    wave: 1,
    gameTime: 0,
    era: 0,
    exp: 0,
    maxExp: ERA_DATA[0].maxExp,
    autoStartTimer: BUILD_PHASE_DURATION,
    isPlaying: false,
    isGameOver: false,
    gameSpeed: 1 // CRITICAL: Game loop multiplier
  });
  
  // Entities Refs
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const spawnQueueRef = useRef<{ type: EnemyType; delay: number }[]>([]);
  
  // React State for UI
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [notification, setNotification] = useState<{title: string, subtitle?: string, color: string} | null>(null);
  const [currentMap, setCurrentMap] = useState<MapDefinition>(MAPS[0]);
  const [hasStartedGame, setHasStartedGame] = useState(false); // Controls "Ready" Screen only
  const [countdown, setCountdown] = useState<number | null>(null);

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

  // Initialize Logic (Only on Start Button Click)
  const initializeGame = useCallback(() => {
      setHasStartedGame(true);
      gameStateRef.current = {
          ...INITIAL_STATE,
          mode: initialMode,
          lives: 20,
          money: initialMode === 'PVP_LOCAL' || initialMode === 'PVP_ONLINE' ? 2000 : 450, // More starting money to build
          wave: 1,
          gameTime: 0,
          era: 0,
          exp: 0,
          maxExp: ERA_DATA[0].maxExp,
          autoStartTimer: BUILD_PHASE_DURATION, // 10s Build Phase
          isPlaying: false, // Wait for timer
          isGameOver: false,
          gameSpeed: 1 // Game loop multiplier
      };
      
      towersRef.current = [];
      enemiesRef.current = [];
      projectilesRef.current = [];
      floatingTextsRef.current = [];
      spawnQueueRef.current = [];

      setUiState({...gameStateRef.current});
      triggerHaptic('medium');
  }, [initialMode]);


  // --- CORE LOGIC: START WAVE ---
  const handleStartWave = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.isPlaying && !state.isGameOver) {
        // Start the wave
        state.isPlaying = true;
        state.autoStartTimer = -1;
        
        // Generate enemies
        const newEnemies = generateWaveEnemies(state.wave);
        spawnQueueRef.current = newEnemies;
        
        audioService.playWaveStart(state.era);
        triggerHaptic('medium');
        setUiState(prev => ({ ...prev, isPlaying: true, autoStartTimer: -1 }));
        setCountdown(null);
    }
  }, []);

  // --- UPDATE LOOP ---
  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isGameOver) return;

    // 1. BUILD PHASE TIMER
    if (!state.isPlaying && hasStartedGame) {
        if (state.autoStartTimer > 0) {
            state.autoStartTimer--;
            if (state.autoStartTimer === 0) {
                handleStartWave();
            }
        }
    }

    // 2. GAME PHYSICS (Always update projectiles/enemies if they exist, but only spawn if playing)
    const loops = state.gameSpeed;
    for (let loop = 0; loop < loops; loop++) {
        state.gameTime++;
        
        // Spawning (Only if playing)
        if (state.isPlaying) {
            const queue = spawnQueueRef.current;
            if (queue.length > 0) {
                if (queue[0].delay <= 0) {
                    const nextEnemy = queue.shift();
                    if (nextEnemy) {
                        const stats = ENEMY_STATS[nextEnemy.type];
                        const waveMult = 1 + (state.wave * 0.1);
                        enemiesRef.current.push({
                            id: Math.random().toString(36), position: { ...currentMap.waypoints[0] }, 
                            type: nextEnemy.type, hp: stats.maxHp * waveMult, maxHp: stats.maxHp * waveMult, speed: stats.speed,
                            pathIndex: 0, distanceTraveled: 0, frozen: 0, moneyReward: stats.reward, expReward: stats.expReward, color: stats.color, radius: stats.radius
                        });
                    }
                } else queue[0].delay--;
            } else if (enemiesRef.current.length === 0) {
                // Wave Complete
                state.isPlaying = false;
                state.wave++;
                state.money += 150 + (state.wave * 25);
                state.autoStartTimer = BUILD_PHASE_DURATION; // Reset 10s Timer
                setNotification({ title: "WAVE COMPLETE", subtitle: "PREPARE DEFENSES", color: "text-green-400" });
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
                if (state.lives <= 0) { state.isGameOver = true; onGameOver(state.wave); }
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

    // UI Sync (Every 5 frames or if significant change)
    if (state.gameTime % 5 === 0 || !state.isPlaying) {
        setUiState({...state});
        if (state.autoStartTimer > 0 && hasStartedGame && !state.isPlaying) {
            setCountdown(Math.ceil(state.autoStartTimer / 60));
        } else {
            setCountdown(null);
        }
    }

  }, [onGameOver, currentMap, hasStartedGame, handleStartWave]);

  // --- RENDERING LOOP ---
  const calculateTransform = () => {
      const { width, height } = canvasDimensions;
      const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
      return { scale, offsetX: (width - CANVAS_WIDTH * scale) / 2, offsetY: (height - CANVAS_HEIGHT * scale) / 2 };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const { scale, offsetX, offsetY } = calculateTransform();

    // Background
    ctx.fillStyle = THEMES[0].background; ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  }, [currentMap, selectedTowerType, canvasDimensions, hasStartedGame]);

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
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => { mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY); };
  
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pos || !selectedTowerType) return;
    
    // Logic to place tower:
    const gx = Math.floor(pos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    // FIX: Using pos.y and dividing by GRID_SIZE before floor
    const gy = Math.floor(pos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const config = TOWER_TYPES[selectedTowerType];
    const state = gameStateRef.current;

    // Check Validity
    const isValid = state.money >= config.cost && !isPointOnPath(gx, gy, 35, currentMap.waypoints) && !towersRef.current.some(t => Math.hypot(t.position.x - gx, t.position.y - gy) < 20);
    
    if (isValid) {
        state.money -= config.cost;
        towersRef.current.push({
            id: Math.random().toString(), position: { x: gx, y: gy }, type: config.type,
            range: config.range, damage: config.damage, cooldown: config.cooldown, lastShotFrame: 0, rotation: 0, level: 1, eraBuilt: state.era
        });
        audioService.playBuild();
        triggerHaptic('light');
        setUiState({...state}); // Force React Update immediately for UI money
        setSelectedTowerType(null); // Deselect after build
    } else {
        triggerHaptic('error');
    }
  };

  const handleEvolve = useCallback(() => {
    const state = gameStateRef.current;
    if (state.era < 2 && state.exp >= state.maxExp) {
        state.exp -= state.maxExp;
        state.era++;

        if (ERA_DATA[state.era]) {
            state.maxExp = ERA_DATA[state.era].maxExp;
        }

        triggerHaptic('success');
        audioService.playBuild();

        setNotification({
            title: `${ERA_DATA[state.era].name}`,
            subtitle: "NEW TECHNOLOGY UNLOCKED",
            color: "text-yellow-400"
        });
        setTimeout(() => setNotification(null), 3000);

        setUiState({ ...state });
    }
  }, []);

  // Speed Toggle (Solo Mode Only)
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
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={() => { isPointerDownRef.current = false; mousePosRef.current = null; }}
            className="block w-full h-full" style={{ touchAction: 'none' }}
        />
        
        {/* TOP HUD */}
        {hasStartedGame && !uiState.isGameOver && (
            <>
                {/* Top Bar - Wave left, Controls right */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none z-10">
                    {/* Left: Wave Info */}
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                        <Home size={14} className="text-amber-400" />
                        <span className="text-white/90 font-bold text-sm">Wave {uiState.wave}</span>
                        {uiState.isPlaying && enemiesRef.current.length > 0 && (
                            <span className="text-red-400 text-xs">({enemiesRef.current.length})</span>
                        )}
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 pointer-events-auto">
                        {/* Evolution Button - Small */}
                        {canEvolve && (
                            <button
                                onClick={handleEvolve}
                                className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-500
                                           px-3 py-1.5 rounded-lg border border-yellow-300
                                           shadow-[0_0_12px_rgba(234,179,8,0.5)] animate-pulse
                                           active:scale-95 transition-all"
                            >
                                <ArrowUpCircle size={14} className="text-yellow-900" />
                                <span className="text-yellow-900 font-bold text-xs">EVOLVE</span>
                            </button>
                        )}

                        {/* Speed Toggle - Solo Mode Only */}
                        {initialMode === 'DEFENSE' && (
                            <button
                                onClick={handleToggleSpeed}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all active:scale-95
                                    ${uiState.gameSpeed === 2
                                        ? 'bg-green-500/90 border-green-300 text-green-900'
                                        : 'bg-black/60 backdrop-blur-sm border-white/10 text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                <FastForward size={14} />
                                <span className="font-bold text-xs">x{uiState.gameSpeed}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Center: Countdown + Start Button */}
                {countdown !== null && (
                    <div className="absolute top-14 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
                        <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-yellow-500/30">
                            <Clock size={14} className="text-yellow-400" />
                            <span className="text-yellow-300 font-bold text-sm">Starts in {countdown}s</span>
                        </div>
                        <button
                            onClick={handleStartWave}
                            className="pointer-events-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500
                                       text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2
                                       shadow-lg shadow-green-900/50 active:scale-95 transition-all border border-green-400/30"
                        >
                            <PlayCircle size={14} /> START NOW
                        </button>
                    </div>
                )}
            </>
        )}

        {/* START SCREEN */}
        {!hasStartedGame && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-slate-900/90 to-black/90 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-md">
                <div className="bg-gradient-to-b from-[#292524] to-[#1c1917] p-8 rounded-2xl border-2 border-amber-600/50 text-center shadow-2xl w-[320px]">
                    <div className="text-5xl mb-4">🏰</div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mb-3 tracking-widest">
                        READY?
                    </h2>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        Build your defenses before the enemy horde arrives!
                    </p>
                    <button
                        onClick={initializeGame}
                        className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600
                                   hover:from-orange-500 hover:to-amber-500
                                   text-white rounded-xl font-black flex items-center justify-center gap-3
                                   text-lg tracking-widest shadow-lg shadow-orange-900/50
                                   active:scale-[0.98] transition-all border border-orange-400/30"
                    >
                        <Play size={24} /> START GAME
                    </button>
                </div>
            </div>
        )}

        {/* NOTIFICATION */}
        {notification && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center">
                <div className="bg-black/80 backdrop-blur-md px-8 py-6 rounded-2xl border border-white/20 shadow-2xl">
                    <h2 className={`font-black text-4xl ${notification.color} drop-shadow-lg tracking-widest text-center`}>
                        {notification.title}
                    </h2>
                    {notification.subtitle && (
                        <div className="text-white/80 text-sm font-medium mt-3 text-center tracking-wide">
                            {notification.subtitle}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* GAME OVER SCREEN */}
        {uiState.isGameOver && (
            <div className="absolute inset-0 bg-gradient-to-b from-red-950/95 via-black/95 to-black/95 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-2xl border-2 border-red-600/50 text-center shadow-2xl w-[320px]">
                    <div className="text-6xl mb-4">💀</div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-2 tracking-widest">
                        GAME OVER
                    </h2>
                    <p className="text-slate-400 text-sm mb-4">Your defenses have fallen!</p>

                    <div className="bg-black/50 rounded-xl p-4 mb-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400 text-sm">Waves Survived</span>
                            <span className="text-2xl font-black text-white">{uiState.wave - 1}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400 text-sm">Final Era</span>
                            <span className="text-lg font-bold" style={{ color: ERA_DATA[uiState.era].color }}>
                                {ERA_DATA[uiState.era].name}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Towers Built</span>
                            <span className="text-lg font-bold text-yellow-400">{towersRef.current.length}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            initializeGame();
                        }}
                        className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600
                                   hover:from-red-500 hover:to-orange-500
                                   text-white rounded-xl font-black flex items-center justify-center gap-3
                                   text-lg tracking-widest shadow-lg shadow-red-900/50
                                   active:scale-[0.98] transition-all border border-red-400/30"
                    >
                        <Play size={24} /> TRY AGAIN
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* 2. MENU BAR (Stats & Building) */}
      <div className="shrink-0 flex flex-col gap-1.5 w-full min-w-0 pb-2 px-2 relative bg-[#1c1917] z-10">

        {/* STATS BAR */}
        <div className="bg-[#292524] px-3 py-2 rounded-lg border border-[#44403c] flex items-center justify-between w-full shadow-lg relative overflow-hidden">

             {/* XP BAR - More visible */}
             <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                 <div
                     className="h-full transition-all duration-300 ease-out rounded-r-full"
                     style={{
                         width: `${Math.min(100, (uiState.exp / uiState.maxExp) * 100)}%`,
                         background: uiState.era === 0 ? 'linear-gradient(90deg, #d97706, #fbbf24)' :
                                     uiState.era === 1 ? 'linear-gradient(90deg, #64748b, #94a3b8)' :
                                     'linear-gradient(90deg, #dc2626, #f87171)',
                         boxShadow: '0 0 8px currentColor'
                     }}
                 />
             </div>

             {/* Left: Lives & Money */}
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

             {/* Right: Era Info & XP */}
             <div className="z-10 relative flex items-center gap-2">
                 <div className="flex flex-col items-end leading-tight">
                     <span
                         className="text-[11px] font-bold tracking-wider uppercase"
                         style={{ color: ERA_DATA[uiState.era].color }}
                     >
                         {ERA_DATA[uiState.era].name}
                     </span>
                     <div className="flex items-center gap-1">
                         <span className="text-[10px] text-slate-400 font-mono">
                             {uiState.exp}/{uiState.maxExp}
                         </span>
                         <span className="text-[9px] text-slate-500">XP</span>
                     </div>
                 </div>
             </div>
        </div>

        {/* BUILDER MENU */}
        <div className="bg-[#292524] p-1.5 rounded-lg border border-[#44403c] shadow-lg overflow-hidden">
            <div className="flex gap-2 overflow-x-auto items-center scrollbar-hide px-1 pb-1">
                {ERA_DATA[uiState.era].availableTowers.map((type) => {
                    const config = TOWER_TYPES[type];
                    const isSelected = selectedTowerType === config.type;
                    const canAfford = uiState.money >= config.cost;
                    const towerName = ERA_DATA[uiState.era].towerNames[type] || config.baseName;

                    return (
                    <button
                        key={config.type}
                        onClick={() => { setSelectedTowerType(isSelected ? null : config.type); triggerHaptic('light'); }}
                        className={`min-w-[72px] py-2 px-1 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all shrink-0 relative
                        ${isSelected
                            ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/30 to-yellow-600/10 scale-[0.97] shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                            : 'border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 hover:border-slate-600 hover:from-slate-700'}
                        ${!canAfford ? 'opacity-50 grayscale' : ''}
                        `}
                    >
                        <div className="w-10 h-10 flex items-center justify-center">
                            <TowerIcon type={config.type} era={uiState.era} />
                        </div>
                        <div className="text-[8px] text-slate-300 font-medium truncate w-full text-center px-1">
                            {towerName}
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${canAfford ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            ${config.cost}
                        </div>
                        {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                <Check size={10} className="text-yellow-900" />
                            </div>
                        )}
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
