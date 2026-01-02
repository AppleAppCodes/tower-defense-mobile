
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle, MapDefinition, FloatingText, PerkDrop, ActivePerk, PerkType, GameMode, PvpPhase } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, PERK_STATS, GRID_SIZE, INITIAL_STATE, AUTO_START_DELAY, THEMES, ERA_DATA, UNIT_TYPES } from '../constants';
import { audioService } from '../services/audioService';
import { socketService } from '../services/socketService';
import { Heart, Coins, Shield, Play, RefreshCw, Timer, ChevronRight, ChevronLeft, Zap, Trash2, FastForward, AlertTriangle, Star, Palette, X, Check, ArrowUpCircle, Lock, HelpCircle, Skull, User, Eye, Sword, Wifi } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (wave: number) => void;
  initialMode?: GameMode;
  onlineGameId?: string;
  onlineRole?: 'DEFENDER' | 'ATTACKER';
}

// Helper for path collision
const isPointOnPath = (x: number, y: number, width: number, waypoints: Vector2D[]) => {
  for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i+1];
      
      const A = x - p1.x;
      const B = y - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = p1.x;
        yy = p1.y;
      }
      else if (param > 1) {
        xx = p2.x;
        yy = p2.y;
      }
      else {
        xx = p1.x + param * C;
        yy = p1.y + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      if ((dx * dx + dy * dy) < width * width) return true;
  }
  return false;
};

const createNoisePattern = (ctx: CanvasRenderingContext2D, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return null;
    pCtx.fillStyle = color;
    pCtx.fillRect(0, 0, 100, 100);
    for (let i = 0; i < 400; i++) {
        pCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
        pCtx.fillRect(Math.random() * 100, Math.random() * 100, 2, 2);
    }
    return ctx.createPattern(canvas, 'repeat');
};

// --- DRAW TOWER WITH SPRITE SUPPORT ---
const drawTower = (
    ctx: CanvasRenderingContext2D, 
    tower: Tower, 
    era: number, 
    gameTime: number, 
    slingerSprite: HTMLImageElement | null
) => {
  ctx.save();
  ctx.scale(1.3, 1.3);

  // --- SPRITE RENDERING FOR SLINGER (Stone Age Basic) ---
  if (era === 0 && tower.type === TowerType.BASIC && slingerSprite) {
      // Logic: Map the cooldown/timeSinceShot to a frame index.
      // Assuming 42 frames in the sprite sheet.
      // If we are shooting (timeSinceShot < 42), play animation. Otherwise idle at frame 0.
      
      const totalFrames = 42;
      const timeSinceShot = gameTime - tower.lastShotFrame;
      
      // Calculate which frame to show
      let currentFrame = 0;
      
      if (timeSinceShot < totalFrames) {
          // Play animation once per shot
          currentFrame = Math.floor(timeSinceShot); 
          if (currentFrame >= totalFrames) currentFrame = totalFrames - 1;
      } else {
          // Idle Loop (Optional: Bounce between frame 0-10 or just stay at 0)
          // For now, static idle at frame 0
          currentFrame = 0;
      }

      // Calculate source position from sprite sheet
      // Assumption: Sprite sheet is HORIZONTAL (all frames side-by-side)
      // Frame Width = Total Width / 42
      const frameWidth = slingerSprite.width / totalFrames;
      const frameHeight = slingerSprite.height;

      const srcX = currentFrame * frameWidth;
      const srcY = 0;

      ctx.save();
      // Draw Base Dirt
      ctx.fillStyle = 'rgba(50, 40, 30, 0.4)'; 
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();

      // Rotate towards target
      ctx.rotate(tower.rotation);
      // Adjust draw position to center the sprite. 
      // Assuming sprite is roughly square-ish or centered. Adjust -frameWidth/2 as needed.
      // We scale it down to fit the grid (approx 40x40 game units)
      const drawWidth = 50; 
      const drawHeight = 50 * (frameHeight / frameWidth);

      // Flip correction if needed (since rotation handles direction, usually standard draw is fine, 
      // but if sprite faces RIGHT by default, we are good. If sprite faces DOWN, offset rotation).
      // Assuming sprite faces RIGHT in the PNG.
      
      ctx.drawImage(
          slingerSprite, 
          srcX, srcY, frameWidth, frameHeight, // Source
          -drawWidth/2, -drawHeight/2, drawWidth, drawHeight // Destination
      );
      ctx.restore();

      // Skip default procedural drawing
      ctx.restore();
      return; 
  }

  // --- FALLBACK PROCEDURAL DRAWING (For other eras/types) ---
  
  const timeSinceShot = gameTime - tower.lastShotFrame;
  let recoil = 0;
  if (era > 0 && timeSinceShot < 10) recoil = (10 - timeSinceShot) * 0.8; 

  if (era === 0) { 
      ctx.fillStyle = 'rgba(50, 40, 30, 0.4)'; 
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();
  } else if (era === 1) { 
      ctx.fillStyle = '#334155'; ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth=2; ctx.strokeRect(-14, -14, 28, 28);
  } else { 
      ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.stroke();
  }

  ctx.save();
  ctx.rotate(tower.rotation);
  if (era > 0) ctx.translate(-recoil, 0); 
  ctx.fillStyle = era === 0 ? '#78350f' : era === 1 ? '#475569' : '#1e293b';
  if (tower.type === TowerType.BASIC) {
      ctx.fillRect(-5, -5, 20, 10); ctx.beginPath(); ctx.arc(0,0, 10, 0, Math.PI*2); ctx.fill();
  } else {
      ctx.fillRect(-5, -5, 20, 10); ctx.beginPath(); ctx.arc(0,0, 8, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  if (tower.level > 1) {
      ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      const startX = -((tower.level - 1) * 8) / 2;
      for(let i=0; i<tower.level; i++) {
          ctx.beginPath(); ctx.arc(startX + (i*8), -16, 3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
  }
  ctx.restore(); 
};

const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, era: number, gameTime: number) => {
    ctx.fillStyle = enemy.color;
    ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
};

const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile, era: number) => {
    ctx.save();
    ctx.translate(proj.position.x, proj.position.y);
    ctx.fillStyle = proj.color || '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
};

// --- TowerIcon Component Wrapper ---
const TowerIcon = ({ type, era }: { type: TowerType; era: number }) => {
    return <div className="w-full h-full bg-slate-700/50 rounded-full flex items-center justify-center text-[8px]">{type.substring(0,2)}</div>;
};

// --- MAIN GAME COMPONENT ---

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, initialMode = 'DEFENSE', onlineGameId, onlineRole }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  
  const lastFrameTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const bgPatternRef = useRef<CanvasPattern | null>(null);
  const sceneryRef = useRef<{x: number, y: number, r: number, type: 'tree' | 'rock' | 'bush' | 'grass'}[]>([]);

  // ASSETS
  const slingerSpriteRef = useRef<HTMLImageElement | null>(null);

  // PVP State Storage
  const p1DefenseLayout = useRef<Tower[]>([]);
  const p2DefenseLayout = useRef<Tower[]>([]);

  const gameStateRef = useRef<GameState>({
    ...INITIAL_STATE,
    mode: initialMode,
    pvpPhase: initialMode === 'PVP_LOCAL' ? 'P1_BUILD' : initialMode === 'PVP_ONLINE' ? (onlineRole === 'DEFENDER' ? 'ONLINE_BUILDING' : 'ONLINE_WAITING') : undefined,
    isPlaying: false,
    isGameOver: false,
    gameTime: 0,
    autoStartTimer: -1,
    gameSpeed: 1,
  });
  
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const perkDropsRef = useRef<PerkDrop[]>([]);
  const activePerksRef = useRef<ActivePerk[]>([]);
  const spawnQueueRef = useRef<{ type: EnemyType; delay: number }[]>([]);
  
  const [activePerks, setActivePerks] = useState<ActivePerk[]>([]);
  const [perkInventory, setPerkInventory] = useState<Record<PerkType, number>>({ [PerkType.DAMAGE]: 0, [PerkType.SPEED]: 0, [PerkType.MONEY]: 0, [PerkType.FREEZE]: 0 });
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{title: string, subtitle?: string, color: string, type: 'info' | 'boss' | 'evolve'} | null>(null);
  const [currentMap, setCurrentMap] = useState<MapDefinition>(MAPS[0]);
  const [hasStartedGame, setHasStartedGame] = useState(false);

  // Helper Functions
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'error' | 'success' | 'warning') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
        if (style === 'error' || style === 'success' || style === 'warning') window.Telegram.WebApp.HapticFeedback.notificationOccurred(style);
        else window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const spawnFloatingText = (position: Vector2D, text: string, color: string) => {
    floatingTextsRef.current.push({ id: Math.random().toString(), position: { ...position }, text, life: 1.0, color, velocity: { x: (Math.random() - 0.5) * 2, y: -2 } });
  };
  const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);

  // --- SOCKET EVENT HANDLERS ---
  useEffect(() => {
    if (initialMode !== 'PVP_ONLINE' || !onlineGameId) return;

    socketService.onOpponentAction((action) => {
        if (action.type === 'LAYOUT') {
            if (onlineRole === 'ATTACKER') {
                towersRef.current = action.payload.towers;
                gameStateRef.current.pvpPhase = 'ONLINE_ATTACKING';
                gameStateRef.current.isPlaying = true;
                setNotification({ title: "ATTACK NOW!", subtitle: "BREACH THE DEFENSE", color: "text-red-500", type: 'boss' });
                triggerHaptic('heavy');
                setUiState({...gameStateRef.current});
            }
        } 
        else if (action.type === 'SPAWN') {
            if (onlineRole === 'DEFENDER') {
                const config = UNIT_TYPES[action.payload.unitKey];
                for(let i=0; i<config.count; i++) {
                    spawnQueueRef.current.push({ type: config.type, delay: i * 15 });
                }
                spawnFloatingText(currentMap.waypoints[0], `${config.name}!`, "#ef4444");
            }
        }
    });
    return () => { socketService.disconnect(); };
  }, [initialMode, onlineGameId, onlineRole, currentMap]);


  // --- GAME LOGIC ---

  // Handle Resize
  useEffect(() => {
    const handleResize = () => { if (containerRef.current) setCanvasDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }); };
    handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Init Assets & Sprites
  useEffect(() => {
    // 1. Procedural Pattern
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    if (ctx) { const pattern = createNoisePattern(ctx, THEMES[0].background); if (pattern) bgPatternRef.current = pattern; }
    
    // 2. Scenery
    if (sceneryRef.current.length === 0) {
        for (let i = 0; i < 60; i++) sceneryRef.current.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, r: Math.random() * 10 + 5, type: Math.random() > 0.9 ? 'rock' : Math.random() > 0.7 ? 'tree' : 'bush' });
    }

    // 3. Load Sprite Sheet
    // IMPORTANT: You need to place your 42-frame horizontal sprite sheet at /public/slinger_sheet.png
    const img = new Image();
    img.src = '/slinger_sheet.png'; 
    img.onload = () => {
        console.log("Sprite Sheet Loaded");
        slingerSpriteRef.current = img;
    };
    img.onerror = () => {
        console.warn("Sprite Sheet not found. Falling back to procedural drawing.");
    };

  }, []);

  const initializeGame = useCallback(() => {
      setHasStartedGame(true);
      gameStateRef.current.autoStartTimer = 600;
      gameStateRef.current.isPlaying = false; 
      gameStateRef.current.mode = initialMode; 
      
      if (initialMode === 'ATTACK') {
          gameStateRef.current.money = 600; 
      } else if (initialMode === 'PVP_LOCAL') {
          gameStateRef.current.pvpPhase = 'P1_BUILD';
          towersRef.current = [];
          gameStateRef.current.money = 2000;
      } else if (initialMode === 'PVP_ONLINE') {
          if (onlineRole === 'DEFENDER') {
             gameStateRef.current.pvpPhase = 'ONLINE_BUILDING';
             gameStateRef.current.money = 2000;
             towersRef.current = [];
          } else {
             gameStateRef.current.pvpPhase = 'ONLINE_WAITING';
             gameStateRef.current.money = 1200;
             towersRef.current = [];
             setNotification({ title: "WAITING...", subtitle: "OPPONENT IS BUILDING", color: "text-blue-500", type: 'info' });
          }
      } else {
          gameStateRef.current.money = 100;
          towersRef.current = [];
      }
      setUiState(prev => ({ ...gameStateRef.current, autoStartTimer: 600 }));
      triggerHaptic('medium');
  }, [initialMode, onlineRole]);

  const handleStartWave = useCallback(() => {
    const state = gameStateRef.current;
    
    if (state.mode === 'PVP_ONLINE' && state.pvpPhase === 'ONLINE_BUILDING' && onlineGameId) {
        socketService.sendAction(onlineGameId, 'LAYOUT', { towers: towersRef.current });
        state.pvpPhase = 'ONLINE_SPECTATING'; 
        setNotification({ title: "DEFENSE UPLOADED", subtitle: "WAITING FOR ATTACK", color: "text-green-500", type: 'info' });
        state.isPlaying = true;
        setUiState({...state});
        return;
    }

    if (state.mode === 'PVP_LOCAL') {
        const phase = state.pvpPhase;
        if (phase === 'P1_BUILD') { state.pvpPhase = 'HANDOVER_TO_P2'; p1DefenseLayout.current = [...towersRef.current]; }
        if (phase === 'P2_BUILD') { state.pvpPhase = 'HANDOVER_TO_P1'; p2DefenseLayout.current = [...towersRef.current]; }
        setUiState({...state});
        return;
    }

    if (!state.isPlaying) {
        setHasStartedGame(true);
        state.isPlaying = true;
        state.autoStartTimer = -1; 
        triggerHaptic('medium');
        setUiState(prev => ({ ...prev, isPlaying: true, autoStartTimer: -1 }));
    }
  }, [onlineGameId, onlineRole]);

  const handleSpawnUnit = (unitKey: string) => {
      const config = UNIT_TYPES[unitKey];
      
      if (gameStateRef.current.mode === 'PVP_ONLINE' && onlineGameId) {
           if (gameStateRef.current.money >= config.cost) {
              gameStateRef.current.money -= config.cost;
              socketService.sendAction(onlineGameId, 'SPAWN', { unitKey });
              triggerHaptic('medium');
              for(let i=0; i<config.count; i++) spawnQueueRef.current.push({ type: config.type, delay: i * 15 });
              setUiState({...gameStateRef.current});
           }
           return;
      }

      if (gameStateRef.current.money >= config.cost) {
          gameStateRef.current.money -= config.cost;
          triggerHaptic('medium');
          audioService.playBuild();
          for(let i=0; i<config.count; i++) spawnQueueRef.current.push({ type: config.type, delay: i * 15 });
          setUiState({...gameStateRef.current});
      } else triggerHaptic('error');
  };

  // --- UPDATE LOOP ---
  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isGameOver) return;
    if (state.mode === 'PVP_LOCAL' && (state.pvpPhase?.includes('HANDOVER'))) return;

    const loops = state.gameSpeed;
    for (let loop = 0; loop < loops; loop++) {
        state.gameTime++;
        
        const queue = spawnQueueRef.current;
        if (queue.length > 0) {
          if (queue[0].delay <= 0) {
            const nextEnemy = queue.shift();
            if (nextEnemy) {
              const stats = ENEMY_STATS[nextEnemy.type];
              enemiesRef.current.push({
                id: Math.random().toString(36), position: { ...currentMap.waypoints[0] }, 
                type: nextEnemy.type, hp: stats.maxHp, maxHp: stats.maxHp, speed: stats.speed,
                pathIndex: 0, distanceTraveled: 0, frozen: 0, moneyReward: stats.reward, expReward: stats.expReward, color: stats.color, radius: stats.radius
              });
            }
          } else queue[0].delay--;
        }

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
          if (distance(p.position, target.position) <= p.speed) {
            target.hp -= p.damage;
            spawnFloatingText(target.position, Math.floor(p.damage).toString(), '#fff');
            if (loop === 0) audioService.playImpact();
            projectilesRef.current.splice(i, 1);
          }
        }

        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          const target = currentMap.waypoints[enemy.pathIndex + 1]; 
          if (!target) {
            state.lives--; 
            if (loop === 0) { triggerHaptic('error'); audioService.playDamage(); }
            enemiesRef.current.splice(i, 1);
            
            if (state.mode === 'PVP_ONLINE' && state.lives <= 0) {
                state.isGameOver = true;
                const win = onlineRole === 'ATTACKER';
                setNotification({ title: win ? "VICTORY" : "DEFEAT", subtitle: win ? "BASE DESTROYED" : "BASE DESTROYED", color: win ? "text-green-500" : "text-red-500", type: 'boss' });
            }
            continue;
          }
          const dist = distance(enemy.position, target);
          if (dist <= enemy.speed) { enemy.position = { ...target }; enemy.pathIndex++; } 
          else {
            const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
            enemy.position.x += Math.cos(angle) * enemy.speed; enemy.position.y += Math.sin(angle) * enemy.speed;
          }
        }

        towersRef.current.forEach(tower => {
          let target: Enemy | null = null;
          let maxDist = -1;
          for (const enemy of enemiesRef.current) {
            const d = distance(tower.position, enemy.position);
            if (d <= tower.range) { if (enemy.distanceTraveled > maxDist) { maxDist = enemy.distanceTraveled; target = enemy; } }
          }
          if (target) tower.rotation = Math.atan2(target.position.y - tower.position.y, target.position.x - tower.position.x);
          if (tower.lastShotFrame + tower.cooldown <= state.gameTime) {
            if (target) {
              tower.lastShotFrame = state.gameTime;
              if (loop === 0) audioService.playShoot('NORMAL', state.era);
              const angle = Math.atan2(target.position.y - tower.position.y, target.position.x - tower.position.x);
              projectilesRef.current.push({
                id: Math.random().toString(), position: { ...tower.position }, targetId: target.id,
                damage: tower.damage, speed: 12, color: '#000', radius: 3, hasHit: false, type: 'SINGLE',
                velocity: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 }, visualType: 'ARROW'
              });
            }
          }
        });

        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          if (enemiesRef.current[i].hp <= 0) {
            if (state.mode !== 'PVP_LOCAL' && state.mode !== 'PVP_ONLINE') state.money += enemiesRef.current[i].moneyReward;
            spawnFloatingText(enemiesRef.current[i].position, `+$${enemiesRef.current[i].moneyReward}`, '#fbbf24');
            enemiesRef.current.splice(i, 1);
          }
        }
        
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
            const ft = floatingTextsRef.current[i]; ft.life -= 0.02; ft.position.x += ft.velocity.x; ft.position.y += ft.velocity.y;
            if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
        }
    }
    if (state.gameTime % 5 === 0) setUiState({ ...state });
  }, [onGameOver, currentMap, onlineRole]); 

  const calculateTransform = () => {
      const { width, height } = canvasDimensions;
      const gameW = CANVAS_WIDTH; const gameH = CANVAS_HEIGHT;
      const scale = Math.min(width / gameW, height / gameH);
      return { scale, offsetX: (width - gameW * scale) / 2, offsetY: (height - gameH * scale) / 2 };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const theme = THEMES[0];
    const { scale, offsetX, offsetY } = calculateTransform();

    ctx.fillStyle = theme.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
    if (bgPatternRef.current) { ctx.fillStyle = bgPatternRef.current; ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT); } 

    // Draw Entities
    sceneryRef.current.forEach(item => { ctx.fillStyle = item.type === 'tree' ? '#14532d' : '#57534e'; ctx.beginPath(); ctx.arc(item.x, item.y, item.r, 0, Math.PI*2); ctx.fill(); });
    if (currentMap.waypoints.length > 0) {
        ctx.strokeStyle = theme.pathInner; ctx.lineWidth = 60; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
        for (let i = 1; i < currentMap.waypoints.length; i++) ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y);
        ctx.stroke();
    }
    // Pass slingerSpriteRef to drawTower
    towersRef.current.forEach(tower => { ctx.save(); ctx.translate(tower.position.x, tower.position.y); drawTower(ctx, tower, gameStateRef.current.era, gameStateRef.current.gameTime, slingerSpriteRef.current); ctx.restore(); });
    enemiesRef.current.forEach(enemy => { ctx.save(); ctx.translate(enemy.position.x, enemy.position.y); drawEnemySprite(ctx, enemy, gameStateRef.current.era, gameStateRef.current.gameTime); ctx.restore(); });
    projectilesRef.current.forEach(proj => drawProjectile(ctx, proj, gameStateRef.current.era));
    floatingTextsRef.current.forEach(ft => { ctx.fillStyle = ft.color; ctx.font = 'bold 16px Arial'; ctx.fillText(ft.text, ft.position.x, ft.position.y); });

    // Placement Preview (Only for Builders)
    const canBuild = (gameStateRef.current.mode === 'DEFENSE' || gameStateRef.current.pvpPhase?.includes('BUILD') || gameStateRef.current.pvpPhase === 'ONLINE_BUILDING');
    if (canBuild && mousePosRef.current && selectedTowerType) {
        const gx = Math.floor(mousePosRef.current.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(mousePosRef.current.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTowerType];
        ctx.beginPath(); ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.arc(gx, gy, config.range, 0, Math.PI * 2); ctx.fill();
        const isValid = gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 35, currentMap.waypoints) && !towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20);
        ctx.save(); ctx.translate(gx, gy); ctx.globalAlpha = 0.8;
        // Mock tower for preview
        const mock: Tower = { id:'p', position:{x:gx, y:gy}, type:selectedTowerType, level:1, lastShotFrame:0, range:0, damage:0, cooldown:0, rotation:0, eraBuilt:0};
        drawTower(ctx, mock, gameStateRef.current.era, 0, slingerSpriteRef.current); 
        ctx.restore();
        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'; ctx.beginPath(); ctx.arc(gx, gy, 20, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }, [currentMap, selectedTowerType, canvasDimensions]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = (timestamp: number) => {
        if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
        const deltaTime = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;
        accumulatorRef.current += deltaTime;
        if (accumulatorRef.current > 250) accumulatorRef.current = 250; 
        const FIXED_TIME_STEP = 1000 / 60;
        while (accumulatorRef.current >= FIXED_TIME_STEP) { update(); accumulatorRef.current -= FIXED_TIME_STEP; }
        draw();
        animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, draw]);

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
    if (!pos) return; 
    
    // BUILD LOGIC
    const canBuild = (gameStateRef.current.mode === 'DEFENSE' || gameStateRef.current.pvpPhase?.includes('BUILD') || gameStateRef.current.pvpPhase === 'ONLINE_BUILDING');
    if (canBuild && selectedTowerType) {
        const gx = Math.floor(pos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(pos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTowerType];
        const isValid = gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 35, currentMap.waypoints) && !towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20);
        if (isValid) {
            audioService.playBuild();
            gameStateRef.current.money -= config.cost;
            towersRef.current.push({
                id: Math.random().toString(), position: { x: gx, y: gy }, type: config.type,
                range: config.range, damage: config.damage, cooldown: config.cooldown, lastShotFrame: 0, rotation: 0, level: 1, eraBuilt: gameStateRef.current.era
            });
            triggerHaptic('light');
            setUiState({ ...gameStateRef.current });
            setSelectedTowerType(null); 
        } else triggerHaptic('error');
    }
  };
  const handlePointerLeave = () => { if (!isPointerDownRef.current) mousePosRef.current = null; };

  // --- RENDER ---
  const isBuilder = (uiState.mode === 'DEFENSE' || uiState.pvpPhase?.includes('BUILD') || uiState.pvpPhase === 'ONLINE_BUILDING');
  const isAttacker = (uiState.mode === 'ATTACK' || uiState.pvpPhase === 'ONLINE_ATTACKING' || uiState.pvpPhase?.includes('ATTACK'));

  return (
    <div className="flex flex-col gap-2 w-full h-full overflow-hidden box-border bg-[#1c1917]">
      <div ref={containerRef} className="flex-1 relative group flex-shrink-0 mx-auto w-full h-full flex justify-center items-center overflow-hidden bg-black shadow-2xl">
        <canvas 
            ref={canvasRef} width={canvasDimensions.width} height={canvasDimensions.height}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerLeave}
            className="block w-full h-full" style={{ touchAction: 'none' }}
        />
        
        {/* ONLINE STATUS INDICATOR */}
        {initialMode === 'PVP_ONLINE' && (
             <div className="absolute top-1 right-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full z-40">
                 <Wifi size={12} className="text-green-500 animate-pulse" />
                 <span className="text-[10px] text-green-500 font-mono">LIVE</span>
             </div>
        )}

        {/* TOP HUD */}
        {hasStartedGame && !uiState.isGameOver && (
            <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-xs font-bold text-white shadow-lg flex items-center gap-2">
                     <span style={{ color: ERA_DATA[uiState.era].color }}>WAVE {uiState.wave}</span>
                     {onlineRole && <span className="ml-2 text-yellow-500">{onlineRole}</span>}
                </div>
            </div>
        )}

        {/* START SCREEN */}
        {!hasStartedGame && !uiState.isPlaying && !uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-md">
                <div className="bg-[#292524] p-6 rounded-2xl border border-[#78350f] text-center shadow-2xl w-[320px]">
                    <h2 className="text-xl font-display text-[#fcd34d] mb-1 tracking-widest">
                        {initialMode === 'PVP_ONLINE' ? "MULTIPLAYER" : "READY?"}
                    </h2>
                    <button onClick={initializeGame} className="w-full px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded font-bold flex items-center justify-center gap-2 mx-auto text-sm tracking-widest shadow-lg">
                        <Play size={18} /> START
                    </button>
                </div>
            </div>
        )}

        {/* NOTIFICATION */}
        {notification && (
            <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center animate-in fade-in zoom-in-90 duration-300`}>
                 <h2 className={`font-display text-4xl lg:text-5xl font-black ${notification.color} drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-widest text-center stroke-black`}>
                     {notification.title}
                 </h2>
                 {notification.subtitle && <div className="bg-black/60 text-white px-4 py-1 rounded-full text-xs font-mono border border-white/20 mt-2 backdrop-blur-md">{notification.subtitle}</div>}
            </div>
        )}
      </div>

      {/* 2. MENU */}
      <div className="shrink-0 flex flex-col gap-1 w-full min-w-0 pb-1 px-2 relative bg-[#1c1917]">
        {/* STATS */}
        <div className="bg-[#292524] px-3 py-1.5 rounded-lg border border-[#44403c] flex items-center justify-between w-full shadow-lg h-10">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Heart className="text-red-500 w-3.5 h-3.5" />
                    <span className="text-sm font-bold text-red-100">{uiState.lives}</span>
                </div>
                <div className="flex items-center gap-1.5"><Coins className="text-yellow-400 w-3.5 h-3.5" /><span className="text-sm font-bold text-yellow-100">{uiState.money}</span></div>
             </div>
        </div>

        {/* BUILDER MENU */}
        {isBuilder && (
        <div className="bg-[#292524] p-1 rounded-lg border border-[#44403c] flex gap-2 w-full shadow-lg h-20 items-center overflow-hidden">
             <button onClick={handleStartWave} className={`h-full aspect-square rounded-md flex flex-col items-center justify-center gap-1 font-bold transition-all relative overflow-hidden flex-shrink-0 bg-green-600 text-white`}>
                    <Check size={24} /> <span className="text-[9px]">DONE</span>
            </button>
            <div className="w-[1px] h-[80%] bg-white/10" />
            <div className="flex gap-1 overflow-x-auto h-full items-center scrollbar-hide px-1 w-full">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button key={tower.type} onClick={() => { setSelectedTowerType(selectedTowerType === tower.type ? null : tower.type); setSelectedPlacedTowerId(null); triggerHaptic('light'); }}
                        className={`min-w-[64px] h-[90%] rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 relative ${selectedTowerType === tower.type ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-black/20 hover:bg-black/40'}`}>
                        <div className="w-8 h-8"><TowerIcon type={tower.type} era={uiState.era} /></div>
                        <div className="text-[9px] text-[#fbbf24] font-mono font-bold">${tower.cost}</div>
                    </button>
                ))}
            </div>
        </div>
        )}

        {/* ATTACK MENU */}
        {isAttacker && (
        <div className="bg-[#292524] p-1 rounded-lg border border-[#44403c] flex gap-2 w-full shadow-lg h-20 items-center overflow-hidden">
            <div className="h-full aspect-square rounded-md flex flex-col items-center justify-center bg-red-900/50 text-red-200 border border-red-800">
                <Sword size={24} /> <span className="text-[8px] font-bold">ATTACK</span>
            </div>
            <div className="w-[1px] h-[80%] bg-white/10" />
            <div className="flex gap-1 overflow-x-auto h-full items-center scrollbar-hide px-1 w-full">
                {Object.entries(UNIT_TYPES).map(([key, unit]) => {
                    const canAfford = uiState.money >= unit.cost;
                    return (
                        <button key={key} onClick={() => handleSpawnUnit(key)} disabled={!canAfford}
                            className={`min-w-[70px] h-[90%] rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 relative ${canAfford ? 'border-white/10 bg-white/5 hover:bg-white/10 active:scale-95' : 'border-white/5 bg-black/20 opacity-50 cursor-not-allowed'}`}>
                            <div className="text-2xl">{unit.icon}</div>
                            <div className="text-[9px] font-bold text-white">{unit.name}</div>
                            <div className="text-[9px] text-[#fbbf24] font-mono font-bold">${unit.cost}</div>
                        </button>
                    );
                })}
            </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;
