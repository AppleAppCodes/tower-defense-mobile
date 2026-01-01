import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle, MapDefinition, FloatingText, PerkDrop, ActivePerk, PerkType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, PERK_STATS, GRID_SIZE, INITIAL_STATE, AUTO_START_DELAY, THEMES } from '../constants';
import { audioService } from '../services/audioService';
import { Heart, Coins, Shield, Play, RefreshCw, Timer, ChevronRight, ChevronLeft, Zap, Trash2, FastForward, AlertTriangle, Star, Palette, X, Check } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (wave: number) => void;
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

const TowerIcon = ({ type, color }: { type: TowerType; color: string }) => {
  const BasePlate = () => (
    <>
      <circle cx="20" cy="20" r="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
      <circle cx="20" cy="20" r="10" fill="#1e293b" />
    </>
  );

  switch (type) {
    case TowerType.BASIC: // Sentry
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <rect x="14" y="14" width="12" height="12" rx="6" fill="#475569" />
          <rect x="16" y="6" width="3" height="10" fill="#94a3b8" />
          <rect x="21" y="6" width="3" height="10" fill="#94a3b8" />
          <circle cx="20" cy="20" r="4" fill={color} />
        </svg>
      );
    case TowerType.RAPID: // Gatling
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <rect x="12" y="14" width="16" height="14" rx="1" fill="#3f6212" />
          <rect x="18" y="6" width="4" height="8" fill="#a3e635" />
          <rect x="13" y="8" width="3" height="6" fill="#a3e635" />
          <rect x="24" y="8" width="3" height="6" fill="#a3e635" />
          <circle cx="14" cy="18" r="3" fill="#1e293b" />
        </svg>
      );
    case TowerType.SNIPER: // Railgun
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <rect x="17" y="4" width="6" height="32" fill="#7c2d12" />
          <rect x="16" y="10" width="8" height="2" fill={color} />
          <rect x="16" y="18" width="8" height="2" fill={color} />
          <rect x="16" y="26" width="8" height="2" fill={color} />
          <circle cx="20" cy="30" r="5" fill="#0ea5e9" />
        </svg>
      );
    case TowerType.AOE: // Howitzer
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <path d="M10 12 L30 12 L30 28 L10 28 Z" fill="#7f1d1d" />
          <rect x="14" y="6" width="12" height="10" fill="#1e293b" />
          <rect x="18" y="4" width="4" height="4" fill="#000" />
        </svg>
      );
    case TowerType.LASER: // Prism
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <path d="M12 10 L20 16 L12 22 Z" fill="#fff" />
          <path d="M28 10 L20 16 L28 22 Z" fill="#fff" />
          <path d="M20 8 L26 20 L20 32 L14 20 Z" fill={color} stroke="white" strokeWidth="0.5" />
        </svg>
      );
    case TowerType.FROST: // Cryo
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <circle cx="20" cy="20" r="10" fill="#e0f2fe" />
          <path d="M20 10 L23 6 L17 6 Z" fill="#0ea5e9" />
          <path d="M29 25 L33 28 L28 30 Z" fill="#0ea5e9" />
          <path d="M11 25 L7 28 L12 30 Z" fill="#0ea5e9" />
          <circle cx="20" cy="20" r="4" fill="#fff" />
        </svg>
      );
    case TowerType.SHOCK: // Tesla
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <rect x="14" y="14" width="12" height="12" fill="#854d0e" />
          <circle cx="20" cy="20" r="8" stroke={color} strokeWidth="2" strokeDasharray="2 2" />
          <circle cx="20" cy="20" r="4" fill="#fff" className="animate-pulse" />
        </svg>
      );
    case TowerType.MISSILE: // Swarm
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-md w-full h-full">
          <BasePlate />
          <rect x="10" y="10" width="20" height="20" rx="4" fill="#581c87" />
          <circle cx="15" cy="15" r="3" fill="#000" />
          <circle cx="25" cy="15" r="3" fill="#000" />
          <circle cx="15" cy="25" r="3" fill="#000" />
          <circle cx="25" cy="25" r="3" fill="#000" />
          <circle cx="15" cy="15" r="1.5" fill={color} />
          <circle cx="25" cy="15" r="1.5" fill={color} />
          <circle cx="15" cy="25" r="1.5" fill={color} />
          <circle cx="25" cy="25" r="1.5" fill={color} />
        </svg>
      );
    default:
      return <div className="w-10 h-10 rounded-full bg-gray-500" />;
  }
};

const MapPreviewSVG = ({ map, activeThemeId }: { map: MapDefinition, activeThemeId: string }) => {
    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
    const scaleX = 60 / CANVAS_WIDTH; // Adjusted for Portrait preview (60px wide)
    const scaleY = 100 / CANVAS_HEIGHT; // Adjusted for Portrait preview (100px tall)
    let pathData = `M ${map.waypoints[0].x * scaleX} ${map.waypoints[0].y * scaleY}`;
    for (let i = 1; i < map.waypoints.length; i++) {
        pathData += ` L ${map.waypoints[i].x * scaleX} ${map.waypoints[i].y * scaleY}`;
    }
    return (
        <svg width="60" height="100" viewBox="0 0 60 100" style={{ backgroundColor: theme.background }} className="rounded border border-white/20 shadow-inner">
            <path d={pathData} stroke={theme.uiAccent} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower) => {
  const config = TOWER_TYPES[tower.type];
  const color = config.color;
  
  // Note: Context is already translated to tower center and rotated
  
  switch (tower.type) {
    case TowerType.BASIC: // Sentry
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4, -14, 3, 10); // Left barrel
      ctx.fillRect(1, -14, 3, 10);  // Right barrel
      
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      // @ts-ignore
      ctx.roundRect ? ctx.roundRect(-6, -6, 12, 12, 4) : ctx.fillRect(-6, -6, 12, 12); // Fallback
      ctx.fill();
      
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
      break;

    case TowerType.RAPID: // Gatling
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      // @ts-ignore
      ctx.roundRect ? ctx.roundRect(-8, -6, 16, 14, 2) : ctx.fillRect(-8, -6, 16, 14);
      ctx.fill();
      
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(-2, -14, 4, 8); // Center
      ctx.fillRect(-7, -12, 3, 6); // Left
      ctx.fillRect(4, -12, 3, 6); // Right
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(-6, 2, 3, 0, Math.PI*2); ctx.fill();
      break;

    case TowerType.SNIPER: // Railgun
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(-3, -20, 6, 26);
      
      ctx.fillStyle = color;
      ctx.fillRect(-4, -14, 8, 2);
      ctx.fillRect(-4, -6, 8, 2);
      ctx.fillRect(-4, 2, 8, 2);
      
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath(); ctx.arc(0, 6, 5, 0, Math.PI*2); ctx.fill();
      break;

    case TowerType.AOE: // Howitzer
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(10, -8);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.fill();
      
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -14, 12, 10);
      
      ctx.fillStyle = '#000';
      ctx.fillRect(-2, -14, 4, 4);
      break;

    case TowerType.LASER: // Prism
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(0, -4); ctx.lineTo(-8, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(0, -4); ctx.lineTo(8, 2); ctx.fill();
      
      ctx.fillStyle = color;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(6, 0); ctx.lineTo(0, 12); ctx.lineTo(-6, 0); ctx.closePath(); 
      ctx.fill();
      ctx.stroke();
      break;

    case TowerType.FROST: // Cryo
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(3, -14); ctx.lineTo(-3, -14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, 5); ctx.lineTo(13, 8); ctx.lineTo(8, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 5); ctx.lineTo(-13, 8); ctx.lineTo(-8, 10); ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
      break;

    case TowerType.SHOCK: // Tesla
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-6, -6, 12, 12);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
      break;

    case TowerType.MISSILE: // Swarm
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      // @ts-ignore
      ctx.roundRect ? ctx.roundRect(-10, -10, 20, 20, 4) : ctx.fillRect(-10, -10, 20, 20);
      ctx.fill();
      
      const drawMissile = (x: number, y: number) => {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
      };
      drawMissile(-5, -5);
      drawMissile(5, -5);
      drawMissile(-5, 5);
      drawMissile(5, 5);
      break;
      
    default:
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
  }
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  
  // Timing Refs for Fixed Timestep
  const lastFrameTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  // Theme State
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(['default']);
  const [activeThemeId, setActiveThemeId] = useState<string>('default');
  
  // Ref for background elements
  const terrainRef = useRef<{
      craters: {x: number, y: number, r: number}[], 
      stars: {x: number, y: number, size: number, alpha: number, speed: number}[],
      scanline: number
  }>({ craters: [], stars: [], scanline: 0 });

  const gameStateRef = useRef<GameState>({
    money: 120,
    lives: 20,
    wave: 1,
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
  
  // NEW: Perks refs
  const perkDropsRef = useRef<PerkDrop[]>([]);
  const [activePerks, setActivePerks] = useState<ActivePerk[]>([]);
  
  // INVENTORY SYSTEM
  const [perkInventory, setPerkInventory] = useState<Record<PerkType, number>>({
      [PerkType.DAMAGE]: 0,
      [PerkType.SPEED]: 0,
      [PerkType.MONEY]: 0,
      [PerkType.FREEZE]: 0,
  });
  
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{title: string, subtitle?: string, color: string, type: 'info' | 'boss'} | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  
  // FIX: Use useRef for spawnQueue to avoid stale state in game loop
  const spawnQueueRef = useRef<{ type: EnemyType; delay: number }[]>([]);
  
  const [userName, setUserName] = useState<string>("");
  const [currentMap, setCurrentMap] = useState<MapDefinition>(MAPS[0]);
  const [hasStartedGame, setHasStartedGame] = useState(false);

  const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
  
  // LOCK CANVAS SCROLLING
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventDefault = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
    };
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchend', preventDefault, { passive: false });
    return () => {
        canvas.removeEventListener('touchmove', preventDefault);
        canvas.removeEventListener('touchstart', preventDefault);
        canvas.removeEventListener('touchend', preventDefault);
    };
  }, []);

  // Initialize terrain and starfield
  useEffect(() => {
    if (terrainRef.current.craters.length === 0) {
        // Craters
        for (let i = 0; i < 30; i++) {
            terrainRef.current.craters.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                r: Math.random() * 30 + 5
            });
        }
        // Stars
        for (let i = 0; i < 150; i++) {
            terrainRef.current.stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random(),
                speed: Math.random() * 0.2 + 0.05
            });
        }
    }
  }, []);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'error' | 'success' | 'selection') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'error' || type === 'success') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
      } else if (type === 'selection') {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
  };

  const spawnFloatingText = (pos: Vector2D, text: string, color: string) => {
    floatingTextsRef.current.push({
        id: Math.random().toString(),
        position: { ...pos, y: pos.y - 15 },
        text,
        life: 1.0,
        color,
        velocity: { x: (Math.random() - 0.5) * 0.5, y: -1.5 }
    });
  };

  const spawnParticle = (pos: Vector2D, color: string, count: number = 5, type: 'circle' | 'ring' = 'circle') => {
    if (type === 'ring') {
         particlesRef.current.push({
            id: Math.random().toString(36),
            position: { ...pos },
            velocity: { x: 0, y: 0 },
            life: 1.0,
            maxLife: 1.0,
            color: color,
            size: 1, // Start small
            type: 'ring'
        });
        return;
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1; // Faster particles
      particlesRef.current.push({
        id: Math.random().toString(36),
        position: { ...pos },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 3 + 1,
        type: 'circle'
      });
    }
  };

  // Helper to spawn perks on death
  const handleEnemyDeath = (enemy: Enemy) => {
      // 5% Chance for normal enemies, 100% for Bosses
      const chance = enemy.type === EnemyType.BOSS ? 1.0 : 0.05;
      
      if (Math.random() < chance) {
          const types = [PerkType.DAMAGE, PerkType.SPEED, PerkType.MONEY, PerkType.FREEZE];
          const randType = types[Math.floor(Math.random() * types.length)];
          
          perkDropsRef.current.push({
              id: Math.random().toString(),
              position: { ...enemy.position },
              type: randType,
              life: 300, // 5 seconds to pick up
              maxLife: 300
          });
          audioService.playBuild(); // Use build sound as a "drop" sound for now
      }
  };

  const activatePerk = (type: PerkType) => {
    if (perkInventory[type] <= 0) return;

    // Decrement inventory
    setPerkInventory(prev => ({
        ...prev,
        [type]: Math.max(0, prev[type] - 1)
    }));

    // Apply Immediate Effect
    if (type === PerkType.MONEY) {
        gameStateRef.current.money += 200; // Bonus cash for active use
        spawnFloatingText({x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2}, "+$200", "#22c55e");
        audioService.playBuild(); 
    } else if (type === PerkType.FREEZE) {
        enemiesRef.current.forEach(e => e.frozen = 240); // 4 seconds
        // Full screen freeze effect particles
        for(let i=0; i<5; i++) {
            spawnParticle({
                x: Math.random() * CANVAS_WIDTH, 
                y: Math.random() * CANVAS_HEIGHT
            }, '#06b6d4', 5, 'ring');
        }
        audioService.playShoot('LASER');
    } else {
        // Apply Buff
        const duration = PERK_STATS[type].duration;
        setActivePerks(prev => {
            const filtered = prev.filter(p => p.type !== type);
            return [...filtered, {
                type: type,
                endTime: gameStateRef.current.gameTime + duration,
                duration: duration
            }];
        });
        audioService.playAlarm(); 
    }
    
    triggerHaptic('success');
  };

  const startWave = useCallback((waveNum: number) => {
    // UPDATED: Bosses appear every 5 rounds
    const isBossWave = waveNum > 0 && waveNum % 5 === 0;
    
    if (isBossWave) {
         audioService.playAlarm();
         triggerHaptic('heavy');
         setNotification({
             title: "BOSS DETECTED",
             subtitle: "CLASS-5 LEVIATHAN INBOUND",
             color: "text-red-500",
             type: 'boss'
         });
         setTimeout(() => setNotification(null), 3500);
    } else {
         audioService.playWaveStart();
    }

    const count = 5 + Math.floor(waveNum * 1.5);
    const newQueue: { type: EnemyType; delay: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      let type = EnemyType.NORMAL;
      // FIX: Default Interval is 30 frames (0.5s), not "i * 60"
      let interval = 30; 

      if (waveNum > 2 && i % 3 === 0) {
          type = EnemyType.FAST;
          interval = 15; // Fast swarm: 0.25s
      }
      if (waveNum > 4 && i % 6 === 0) {
          type = EnemyType.TANK;
          interval = 60; // Tank: 1.0s gap after
      }
      
      // Boss Logic
      if (isBossWave && i === count - 1) {
          type = EnemyType.BOSS;
          interval = 120; // Big gap before boss
      }

      // First enemy comes immediately
      if (i === 0) interval = 0;
      
      newQueue.push({ type, delay: interval });
    }
    // Set synchronous ref
    spawnQueueRef.current = newQueue;
  }, []);

  const handleStartWave = useCallback(() => {
    if (!gameStateRef.current.isPlaying) {
        setHasStartedGame(true);
        startWave(gameStateRef.current.wave);
        gameStateRef.current.isPlaying = true;
        gameStateRef.current.autoStartTimer = -1; 
        triggerHaptic('medium');
        setUiState(prev => ({ ...prev, isPlaying: true, autoStartTimer: -1 }));
    }
  }, [startWave]);

  const initializeGame = useCallback(() => {
      setHasStartedGame(true);
      // Start with 10 seconds (600 frames) countdown for the first wave
      gameStateRef.current.autoStartTimer = 600;
      gameStateRef.current.isPlaying = false; 
      setUiState(prev => ({ ...prev, autoStartTimer: 600 }));
      triggerHaptic('medium');
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    setUserName(tg.initDataUnsafe?.user?.first_name || "Commander");
    const mainBtn = tg.MainButton;
    
    const updateMainButton = () => {
      if (uiState.isGameOver) {
        mainBtn.setText("RESTART MISSION");
        mainBtn.color = "#ef4444";
        mainBtn.show();
      } else {
        mainBtn.hide();
      }
    };
    updateMainButton();
    const onMainBtnClick = () => {
      if (uiState.isGameOver) {
        resetGame();
      }
    };
    mainBtn.onClick(onMainBtnClick);
    return () => {
      mainBtn.offClick(onMainBtnClick);
      mainBtn.hide();
    };
  }, [uiState.isPlaying, uiState.isGameOver, uiState.wave, uiState.autoStartTimer, handleStartWave, hasStartedGame]);

  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isGameOver) return;

    const loops = state.gameSpeed;

    for (let loop = 0; loop < loops; loop++) {
        state.gameTime++;
        // Animate Scanline
        terrainRef.current.scanline = (terrainRef.current.scanline + 2) % CANVAS_HEIGHT;

        // --- UPDATE ACTIVE PERKS ---
        setActivePerks(prev => prev.filter(p => {
             if (state.gameTime >= p.endTime) return false;
             return true;
        }));

        // --- UPDATE PERK DROPS (Disappearing) ---
        for (let i = perkDropsRef.current.length - 1; i >= 0; i--) {
            perkDropsRef.current[i].life--;
            if (perkDropsRef.current[i].life <= 0) {
                perkDropsRef.current.splice(i, 1);
            }
        }

        // --- VISUAL FX UPDATE LOOP (Runs even if !isPlaying) ---
        
        // Update Projectiles (Finish flying even if wave ended)
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const target = enemiesRef.current.find(e => e.id === p.targetId);
          
          if (!target) {
            // Projectile continues straight if target lost
            p.position.x += p.velocity.x;
            p.position.y += p.velocity.y;
            
            // Remove if out of bounds
            if (p.position.x < 0 || p.position.x > CANVAS_WIDTH || p.position.y < 0 || p.position.y > CANVAS_HEIGHT) {
                projectilesRef.current.splice(i, 1);
            }
            continue;
          }

          const angle = Math.atan2(target.position.y - p.position.y, target.position.x - p.position.x);
          p.velocity.x = Math.cos(angle) * p.speed;
          p.velocity.y = Math.sin(angle) * p.speed;
          
          p.position.x += p.velocity.x;
          p.position.y += p.velocity.y;

          const dist = distance(p.position, target.position);
          if (dist <= p.speed) {
            if (p.type === 'AOE' && p.blastRadius) {
               if (loop === 0) audioService.playExplosion();
               spawnParticle(p.position, '#f97316', 1, 'ring');
               spawnParticle(p.position, '#f97316', 10, 'circle');
               enemiesRef.current.forEach(e => {
                 if (distance(e.position, p.position) <= p.blastRadius!) {
                     e.hp -= p.damage;
                     spawnFloatingText(e.position, Math.floor(p.damage).toString(), '#fff');
                     if (p.effect === 'FREEZE') e.frozen = 40;
                 }
               });
            } else {
               if (loop === 0) audioService.playImpact();
               target.hp -= p.damage;
               spawnFloatingText(target.position, Math.floor(p.damage).toString(), '#fff');
               if (p.effect === 'FREEZE') target.frozen = 40;
               spawnParticle(p.position, p.color, 4, 'circle');
            }
            projectilesRef.current.splice(i, 1);
          }
        }

        // Update Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life -= 0.05;
          
          if (p.type === 'ring') {
              p.size += 2; 
          } else {
              p.position.x += p.velocity.x;
              p.position.y += p.velocity.y;
          }
          
          if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        // Update Floating Text
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
           const ft = floatingTextsRef.current[i];
           ft.life -= 0.02;
           ft.position.x += ft.velocity.x;
           ft.position.y += ft.velocity.y;
           if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
        }

        // --- GAME LOGIC (Wait State) ---
        if (!state.isPlaying) {
             if (state.autoStartTimer > 0) {
                // Play tick sound for last 3 seconds (180, 120, 60 frames approx)
                if (state.autoStartTimer === 180 || state.autoStartTimer === 120 || state.autoStartTimer === 60) {
                    audioService.playTick();
                }

                state.autoStartTimer--;
                if (state.autoStartTimer === 0) handleStartWave();
                if (state.autoStartTimer % 60 === 0 && loop === 0) setUiState({ ...state });
             }
             continue; // Skip enemy/tower logic if waiting
        }

        // --- COMBAT LOGIC (Spawn, Move, Shoot) ---
        const queue = spawnQueueRef.current;
        if (queue.length > 0) {
          if (queue[0].delay <= 0) {
            const nextEnemy = queue.shift();
            if (nextEnemy) {
              const stats = ENEMY_STATS[nextEnemy.type];
              // INCREASED DIFFICULTY SCALING: 35% HP increase per wave instead of 20%
              const waveMultiplier = state.wave * 0.35;
              enemiesRef.current.push({
                id: Math.random().toString(36),
                position: { ...currentMap.waypoints[0] }, // Spawn at current map start
                type: nextEnemy.type,
                hp: stats.maxHp + (stats.maxHp * waveMultiplier),
                maxHp: stats.maxHp + (stats.maxHp * waveMultiplier),
                speed: stats.speed,
                pathIndex: 0,
                distanceTraveled: 0,
                frozen: 0,
                moneyReward: stats.reward,
                color: stats.color,
                radius: stats.radius
              });
            }
            // No need to set state, we modified ref directly
          } else {
            queue[0].delay--;
          }
        } else if (enemiesRef.current.length === 0 && state.lives > 0) {
           // WAVE CLEAR LOGIC
           // Only trigger if queue is really empty (ref check handles this immediately)
           state.isPlaying = false;
           state.wave++;
           state.money += 50 + (state.wave * 10);
           state.autoStartTimer = AUTO_START_DELAY; 
           triggerHaptic('success');
           setUiState(prev => ({ ...prev, isPlaying: false, wave: state.wave, money: state.money, autoStartTimer: state.autoStartTimer }));
           // Don't break loop here, just continue to next iteration where !isPlaying catches it
           continue; 
        }

        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          const target = currentMap.waypoints[enemy.pathIndex + 1]; 
          if (!target) {
            state.lives--;
            triggerHaptic('error');
            enemiesRef.current.splice(i, 1);
            if (state.lives <= 0) {
              state.isGameOver = true;
              state.isPlaying = false;
              onGameOver(state.wave);
            }
            continue;
          }
          const dist = distance(enemy.position, target);
          const moveSpeed = enemy.frozen > 0 ? enemy.speed * 0.5 : enemy.speed;
          if (enemy.frozen > 0) enemy.frozen--;
          if (dist <= moveSpeed) {
            enemy.position = { ...target };
            enemy.pathIndex++;
          } else {
            const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
            enemy.position.x += Math.cos(angle) * moveSpeed;
            enemy.position.y += Math.sin(angle) * moveSpeed;
            enemy.distanceTraveled += moveSpeed;
          }
        }

        towersRef.current.forEach(tower => {
          let target: Enemy | null = null;
          let maxDist = -1;
          
          for (const enemy of enemiesRef.current) {
            const d = distance(tower.position, enemy.position);
            if (d <= tower.range) {
              if (enemy.distanceTraveled > maxDist) {
                maxDist = enemy.distanceTraveled;
                target = enemy;
              }
            }
          }

          if (target) {
              tower.rotation = Math.atan2(target.position.y - tower.position.y, target.position.x - tower.position.x);
          }

          // PERK MODIFIERS
          const isRapid = activePerks.some(p => p.type === PerkType.SPEED);
          const activeCooldown = isRapid ? tower.cooldown / 2 : tower.cooldown;

          if (tower.lastShotFrame + activeCooldown <= state.gameTime) {
            if (target) {
              tower.lastShotFrame = state.gameTime;
              
              // PERK DAMAGE MODIFIER
              const isDoubleDmg = activePerks.some(p => p.type === PerkType.DAMAGE);
              const activeDmg = isDoubleDmg ? tower.damage * 2 : tower.damage;

              let pType: 'SINGLE' | 'AOE' = 'SINGLE';
              let blast = 0;
              let effect: 'FREEZE' | 'SHOCK' | undefined = undefined;
              let speed = 12; // Faster projectiles
              let color = TOWER_TYPES[tower.type].color;
              let soundType: 'LASER' | 'HEAVY' | 'NORMAL' = 'NORMAL';

              if (tower.type === TowerType.AOE) { pType = 'AOE'; blast = 60 + (tower.level * 10); soundType = 'HEAVY'; speed = 8; }
              if (tower.type === TowerType.MISSILE) { pType = 'AOE'; blast = 80 + (tower.level * 15); speed = 6; soundType = 'HEAVY'; }
              if (tower.type === TowerType.LASER) { speed = 25; soundType = 'LASER'; }
              if (tower.type === TowerType.FROST) { effect = 'FREEZE'; soundType = 'LASER'; }
              if (tower.type === TowerType.SHOCK) { effect = 'SHOCK'; soundType = 'LASER'; }
              
              if (loop === 0) audioService.playShoot(soundType); 

              const angle = Math.atan2(target.position.y - tower.position.y, target.position.x - tower.position.x);

              projectilesRef.current.push({
                id: Math.random().toString(),
                position: { ...tower.position },
                targetId: target.id,
                damage: activeDmg,
                speed: speed,
                color: color,
                radius: 3,
                hasHit: false,
                type: pType,
                blastRadius: blast,
                effect: effect,
                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
              });
            }
          }
        });

        // Clean up dead enemies
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          if (enemiesRef.current[i].hp <= 0) {
            state.money += enemiesRef.current[i].moneyReward;
            
            // Drop Perk Logic
            if (loop === 0) handleEnemyDeath(enemiesRef.current[i]);

            spawnFloatingText(enemiesRef.current[i].position, `+$${enemiesRef.current[i].moneyReward}`, '#fbbf24');
            spawnParticle(enemiesRef.current[i].position, '#fff', 1, 'ring'); // Death ring
            spawnParticle(enemiesRef.current[i].position, enemiesRef.current[i].color, 8, 'circle');
            enemiesRef.current.splice(i, 1);
          }
        }
    }

    if (state.gameTime % 5 === 0) {
      setUiState({ ...state });
    }
  }, [onGameOver, handleStartWave, currentMap, activePerks]); // Removed spawnQueue from dependencies

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Theme Config
    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

    // 1. Clear & Background
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Draw Starfield
    ctx.fillStyle = "#ffffff";
    terrainRef.current.stars.forEach(star => {
        ctx.globalAlpha = Math.abs(Math.sin(gameStateRef.current.gameTime * star.speed * 0.05 + star.x));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 3. Draw Grid
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // 4. Draw Path
    if (currentMap.waypoints.length > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme.pathGlow;
        ctx.strokeStyle = theme.pathOuter;
        ctx.lineWidth = 40;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
        for (let i = 1; i < currentMap.waypoints.length; i++) {
            ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y);
        }
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = theme.pathInner;
        ctx.lineWidth = 32;
        ctx.stroke();

        ctx.strokeStyle = theme.uiAccent;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
    }

    // 5. Draw Perk Drops
    perkDropsRef.current.forEach(perk => {
        const info = PERK_STATS[perk.type];
        const pulse = 1 + Math.sin(gameStateRef.current.gameTime * 0.1) * 0.2;
        
        ctx.save();
        ctx.translate(perk.position.x, perk.position.y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = info.color;
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(info.icon, 0, 0);
        ctx.restore();
    });

    // 6. Draw Towers
    towersRef.current.forEach(tower => {
        const config = TOWER_TYPES[tower.type];
        ctx.save();
        ctx.translate(tower.position.x, tower.position.y);
        
        // Base
        ctx.fillStyle = '#1e293b'; 
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.rotate(tower.rotation);
        
        // Draw sophisticated tower per type (reusing similar logic to icon but simplified for canvas)
        drawTower(ctx, tower); // Using the helper function we already have!
        
        ctx.restore();

        // Selection ring
        if (selectedPlacedTowerId === tower.id) {
            ctx.beginPath();
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([4, 4]);
            ctx.arc(tower.position.x, tower.position.y, tower.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tower.position.x, tower.position.y, 20, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // 7. Draw Enemies
    enemiesRef.current.forEach(enemy => {
        const target = currentMap.waypoints[enemy.pathIndex + 1];
        let angle = 0;
        if (target) {
            angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
        }

        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y);
        ctx.rotate(angle);

        // Enemy Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;
        ctx.fillStyle = enemy.color;
        
        // --- COMPLEX DRAWING LOGIC ---
        if (enemy.type === EnemyType.BOSS) {
            // "THE LEVIATHAN" - Rotating Dreadnought
            const spin = gameStateRef.current.gameTime * 0.05;
            
            // Outer Shield Ring
            ctx.save();
            ctx.rotate(spin);
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for(let k=0; k<6; k++) {
                const a = (k * Math.PI * 2) / 6;
                ctx.moveTo(Math.cos(a)*28, Math.sin(a)*28);
                ctx.lineTo(Math.cos(a)*34, Math.sin(a)*34);
            }
            ctx.stroke();
            ctx.beginPath(); ctx.arc(0,0, 28, 0, Math.PI*2); ctx.stroke();
            ctx.restore();

            // Inner Core
            ctx.fillStyle = '#0f172a'; // Dark center
            ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill();
            
            // Pulsing Reactor
            ctx.fillStyle = enemy.color;
            ctx.beginPath(); 
            ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.lineTo(8, 10); ctx.lineTo(-8, 10);
            ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();

        } else if (enemy.type === EnemyType.TANK) {
            // "THE BEHEMOTH" - Heavy Armor Square
            ctx.fillStyle = '#334155'; // Dark Slate Base
            ctx.fillRect(-16, -16, 32, 32);
            ctx.fillStyle = enemy.color;
            // Armor Plates
            ctx.fillRect(-14, -14, 10, 28); // Left track
            ctx.fillRect(4, -14, 10, 28); // Right track
            // Turret
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(0,0, 8, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(12, 0); ctx.stroke();

        } else if (enemy.type === EnemyType.FAST) {
            // "THE VIPER" - Fast Jet
            ctx.beginPath();
            ctx.moveTo(14, 0); // Nose
            ctx.lineTo(-10, -10); // Left Wing
            ctx.lineTo(-4, 0); // Center back
            ctx.lineTo(-10, 10); // Right Wing
            ctx.closePath();
            ctx.fill();
            // Engine Glow
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-6, 0, 2, 0, Math.PI*2); ctx.fill();

        } else {
            // "THE SCARAB" - Normal Unit
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-6, -8);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-6, 8);
            ctx.closePath();
            ctx.fill();
            // Eye
            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(2, 0, 3, 0, Math.PI*2); ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        // --- HEALTH BARS ---
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        if (hpPct < 1) {
            ctx.save();
            ctx.translate(enemy.position.x, enemy.position.y);
            const barY = enemy.type === EnemyType.BOSS ? -45 : -20;
            const barW = enemy.type === EnemyType.BOSS ? 60 : 20;
            
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-barW/2, barY, barW, 4);
            ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : '#f87171';
            ctx.fillRect(-barW/2, barY, barW * hpPct, 4);
            ctx.restore();
        }
        
        // Frozen indicator
        if (enemy.frozen > 0) {
            ctx.save();
            ctx.translate(enemy.position.x, enemy.position.y);
            ctx.strokeStyle = '#67e8f9';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 4, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    });

    // 8. Draw Projectiles
    projectilesRef.current.forEach(proj => {
        ctx.save();
        ctx.translate(proj.position.x, proj.position.y);
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 9. Draw Particles
    particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        if (p.type === 'ring') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    // 10. Floating Text
    floatingTextsRef.current.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.position.x, ft.position.y);
        ctx.restore();
    });

    // 11. Scanline
    ctx.fillStyle = theme.scanline;
    ctx.fillRect(0, terrainRef.current.scanline, CANVAS_WIDTH, 4);
    
    // Vignette
    const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 12. Preview
    if (mousePosRef.current && selectedTowerType) {
        const gx = Math.floor(mousePosRef.current.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(mousePosRef.current.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTowerType];
        
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.arc(gx, gy, config.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Using Math.hypot inline instead of distance function to avoid dependency issues or unnecessary complexity
        const isValid = gameStateRef.current.money >= config.cost 
                    && !isPointOnPath(gx, gy, 25, currentMap.waypoints) 
                    && !towersRef.current.some(t => Math.hypot(t.position.x - gx, t.position.y - gy) < 20);
        
        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        ctx.beginPath();
        ctx.arc(gx, gy, 16, 0, Math.PI * 2);
        ctx.fill();
    }
  }, [activeThemeId, currentMap, selectedPlacedTowerId, selectedTowerType]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = (timestamp: number) => {
        if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
        const deltaTime = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;

        accumulatorRef.current += deltaTime;

        // Safety cap to prevent spiral of death
        if (accumulatorRef.current > 250) accumulatorRef.current = 250; 

        // Run Logic at Fixed Time Step (60 FPS)
        const FIXED_TIME_STEP = 1000 / 60; // ~16.666ms
        
        while (accumulatorRef.current >= FIXED_TIME_STEP) {
            update(); // Execute one simulation tick
            accumulatorRef.current -= FIXED_TIME_STEP;
        }

        draw();
        animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, draw]);

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current.isGameOver || !hasStartedGame || isStoreOpen) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);

    if (gameStateRef.current.isGameOver || !hasStartedGame || isStoreOpen) return;
    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pos) return; 
    
    // 1. Check Collision with Perk Drops (Priority over towers)
    const clickedPerkIndex = perkDropsRef.current.findIndex(p => distance(p.position, pos) < 30);
    if (clickedPerkIndex !== -1) {
        const perk = perkDropsRef.current[clickedPerkIndex];
        
        // NEW LOGIC: Store in inventory instead of immediate activation
        // Add to inventory
        setPerkInventory(prev => ({
            ...prev,
            [perk.type]: prev[perk.type] + 1
        }));

        spawnFloatingText(perk.position, "GOT IT!", "#fff");
        
        // Remove perk
        spawnParticle(perk.position, '#fff', 10, 'circle');
        perkDropsRef.current.splice(clickedPerkIndex, 1);
        audioService.playBuild(); // Pickup sound
        triggerHaptic('success');
        return; // Stop processing click
    }
    
    // 2. Check if clicked on existing tower
    const clickedTower = towersRef.current.find(t => distance(t.position, pos) < 20);
    
    if (clickedTower) {
        setSelectedPlacedTowerId(clickedTower.id);
        setSelectedTowerType(null); // Cancel placement if selecting a tower
        triggerHaptic('selection');
        return;
    } else {
        // If clicking empty space, deselect tower unless we are placing
        if (!selectedTowerType) {
             setSelectedPlacedTowerId(null);
        }
    }

    if (!selectedTowerType) return;

    const gx = Math.floor(pos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gy = Math.floor(pos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const config = TOWER_TYPES[selectedTowerType];
    
    const isValid = gameStateRef.current.money >= config.cost 
                    && !isPointOnPath(gx, gy, 25, currentMap.waypoints) 
                    && !towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20);

    if (isValid) {
      audioService.playBuild();
      gameStateRef.current.money -= config.cost;
      towersRef.current.push({
        id: Math.random().toString(), position: { x: gx, y: gy }, type: config.type,
        range: config.range, damage: config.damage, cooldown: config.cooldown, lastShotFrame: 0, rotation: 0, level: 1
      });
      triggerHaptic('light');
      setUiState({ ...gameStateRef.current });
      setSelectedTowerType(null); 
    } else {
      triggerHaptic('error');
    }
  };
  
  const handlePointerLeave = () => {
    if (!isPointerDownRef.current) {
        mousePosRef.current = null;
    }
  };
  
  const resetGame = () => {
      gameStateRef.current = { ...INITIAL_STATE, isPlaying: false, isGameOver: false, gameTime: 0, autoStartTimer: -1, gameSpeed: 1 };
      setHasStartedGame(false); // Go back to map select
      towersRef.current = []; enemiesRef.current = []; projectilesRef.current = []; particlesRef.current = []; floatingTextsRef.current = [];
      perkDropsRef.current = []; setActivePerks([]);
      
      // Reset Inventory
      setPerkInventory({
          [PerkType.DAMAGE]: 0,
          [PerkType.SPEED]: 0,
          [PerkType.MONEY]: 0,
          [PerkType.FREEZE]: 0,
      });

      spawnQueueRef.current = []; // Clear Ref Queue
      setUiState({...gameStateRef.current});
      triggerHaptic('medium');
  };

  const changeMap = (direction: 'next' | 'prev') => {
      const idx = MAPS.findIndex(m => m.id === currentMap.id);
      let newIdx = direction === 'next' ? idx + 1 : idx - 1;
      if (newIdx < 0) newIdx = MAPS.length - 1;
      if (newIdx >= MAPS.length) newIdx = 0;
      setCurrentMap(MAPS[newIdx]);
      triggerHaptic('light');
  };

  const toggleGameSpeed = () => {
      gameStateRef.current.gameSpeed = gameStateRef.current.gameSpeed === 1 ? 2 : 1;
      setUiState({ ...gameStateRef.current });
      triggerHaptic('selection');
  };

  // --- UPGRADE / SELL LOGIC ---
  const getSelectedTower = () => towersRef.current.find(t => t.id === selectedPlacedTowerId);
  const selectedTowerEntity = getSelectedTower();

  const handleUpgradeTower = () => {
    if (!selectedTowerEntity) return;
    const upgradeCost = Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.8 * selectedTowerEntity.level);
    
    if (gameStateRef.current.money >= upgradeCost && selectedTowerEntity.level < 3) {
        gameStateRef.current.money -= upgradeCost;
        selectedTowerEntity.level++;
        selectedTowerEntity.damage *= 1.3; // 30% damage boost
        selectedTowerEntity.range *= 1.1; // 10% range boost
        
        audioService.playBuild();
        triggerHaptic('success');
        spawnFloatingText(selectedTowerEntity.position, "UPGRADED!", "#fbbf24");
        setUiState({...gameStateRef.current});
    } else {
        triggerHaptic('error');
    }
  };

  const handleSellTower = () => {
    if (!selectedTowerEntity) return;
    const sellValue = Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.7 * selectedTowerEntity.level);
    
    gameStateRef.current.money += sellValue;
    towersRef.current = towersRef.current.filter(t => t.id !== selectedPlacedTowerId);
    
    audioService.playBuild(); // Recycling sound?
    spawnFloatingText(selectedTowerEntity.position, `+$${sellValue}`, "#fbbf24");
    setSelectedPlacedTowerId(null);
    setUiState({...gameStateRef.current});
  };

  // --- SKIN SHOP LOGIC ---
  const handleBuySkin = (themeId: string, price: number) => {
      // Mock logic for Telegram Stars purchase
      // window.Telegram.WebApp.openInvoice(...)
      
      triggerHaptic('success');
      audioService.playBuild();
      
      setUnlockedThemes(prev => [...prev, themeId]);
      setActiveThemeId(themeId); // Auto-equip
      spawnFloatingText({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }, `THEME ACQUIRED`, '#fbbf24');
  };

  const handleEquipSkin = (themeId: string) => {
      setActiveThemeId(themeId);
      triggerHaptic('selection');
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full overflow-hidden box-border">
      {/* 1. GAME CANVAS AREA (Maximized) */}
      <div className="flex-1 relative group flex-shrink-0 mx-auto w-full flex justify-center items-center overflow-hidden bg-slate-950 shadow-2xl">
        <canvas 
          ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          className="block cursor-crosshair"
        />

        {/* ACTIVE PERKS UI - Overlay showing remaining time */}
        <div className="absolute top-14 right-3 flex flex-col gap-2 pointer-events-none">
            {activePerks.map(perk => {
                const info = PERK_STATS[perk.type];
                const remaining = perk.endTime - gameStateRef.current.gameTime;
                const pct = remaining / perk.duration;
                
                return (
                    <div key={perk.type} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg p-2 flex items-center gap-2 animate-in slide-in-from-right-10 shadow-lg min-w-[120px]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-inner" style={{backgroundColor: info.color + '40'}}>
                            {info.icon}
                        </div>
                        <div className="flex-1">
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-100 ease-linear"
                                    style={{ width: `${pct * 100}%`, backgroundColor: info.color }}
                                />
                            </div>
                            <div className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-wider">{perk.type}</div>
                        </div>
                    </div>
                );
            })}
        </div>
        
        {/* HUD: Wave Indicator (Permanent, Top-Left) */}
        {!uiState.isGameOver && hasStartedGame && (
             <div className="absolute top-3 left-3 z-10 pointer-events-none animate-in fade-in duration-500">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-blue-500/20 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    <div className={`w-2 h-2 rounded-full ${uiState.isPlaying ? 'bg-green-400 shadow-[0_0_8px_currentColor] animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-blue-100 font-display text-xs font-bold tracking-widest">WAVE {uiState.wave}</span>
                </div>
            </div>
        )}
        
        {/* START SCREEN & MAP SELECT */}
        {!hasStartedGame && !uiState.isPlaying && !uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-md">
                <div className="bg-slate-900/90 p-6 rounded-2xl border border-blue-500/30 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)] w-[320px] backdrop-blur-xl">
                    <h2 className="text-xl font-display text-white mb-1 tracking-widest">SELECT SECTOR</h2>
                    <p className="text-slate-400 mb-4 text-xs uppercase tracking-wide">Tactical Map Data Loaded</p>
                    
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMap('prev')} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft /></button>
                        <div className="flex flex-col items-center gap-2">
                             <MapPreviewSVG map={currentMap} activeThemeId={activeThemeId} />
                             <div className="font-bold text-lg text-blue-400 font-display">{currentMap.name}</div>
                             <div className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${
                                 currentMap.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                 currentMap.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                             }`}>{currentMap.difficulty}</div>
                        </div>
                        <button onClick={() => changeMap('next')} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight /></button>
                    </div>

                    <button 
                      onClick={initializeGame}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-all flex items-center justify-center gap-2 mx-auto text-sm tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    >
                        <Play size={18} /> INITIATE DROP
                    </button>
                </div>
            </div>
        )}

        {/* SKIN SHOP MODAL */}
        {isStoreOpen && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 w-[320px] shadow-[0_0_50px_rgba(168,85,247,0.2)] relative max-h-[90%] flex flex-col">
                    <button onClick={() => setIsStoreOpen(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-2 z-10">
                        <X size={20} />
                    </button>
                    
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-display text-purple-400 mb-1 tracking-widest">VISUAL UPGRADES</h2>
                        <p className="text-slate-400 text-xs">Customize tactical interface</p>
                    </div>

                    <div className="overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                        {THEMES.map(theme => {
                            const isOwned = unlockedThemes.includes(theme.id);
                            const isActive = activeThemeId === theme.id;
                            
                            return (
                                <div key={theme.id} className={`rounded-xl p-3 border transition-all relative overflow-hidden group ${isActive ? 'border-green-500 bg-green-500/5' : 'border-slate-700 bg-slate-800'}`}>
                                    <div className="flex items-center gap-3">
                                        {/* Color Preview */}
                                        <div className="w-12 h-12 rounded-lg shadow-inner border border-white/10 shrink-0" style={{ background: theme.background }}>
                                            <div className="w-full h-full opacity-30" style={{ backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)`, backgroundSize: '8px 8px' }} />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-sm font-display flex items-center gap-2">
                                                {theme.name}
                                                {isActive && <div className="text-[9px] bg-green-500 text-black px-1.5 rounded font-bold">ACTIVE</div>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate">Holographic Field Mod</div>
                                        </div>

                                        <div className="shrink-0">
                                            {isOwned ? (
                                                isActive ? (
                                                    <div className="text-green-500 p-2"><Check size={20} /></div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleEquipSkin(theme.id)}
                                                        className="px-3 py-1.5 rounded text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                                                    >
                                                        EQUIP
                                                    </button>
                                                )
                                            ) : (
                                                <button 
                                                    onClick={() => handleBuySkin(theme.id, theme.price)}
                                                    className="px-3 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1 shadow-lg shadow-blue-500/20"
                                                >
                                                    <Star size={12} fill="currentColor" /> {theme.price}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* NOTIFICATION OVERLAY */}
        {notification && (
            <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center animate-in fade-in zoom-in-90 duration-300 ${notification.type === 'boss' ? 'animate-pulse' : ''}`}>
                 <h2 className={`font-display text-4xl lg:text-6xl font-black ${notification.color} drop-shadow-[0_0_25px_rgba(0,0,0,1)] tracking-widest text-center`}>
                     {notification.title}
                 </h2>
                 {notification.subtitle && (
                     <div className="bg-red-950/80 text-red-200 px-6 py-2 rounded-full text-sm font-mono border border-red-500/50 mt-4 flex items-center gap-2 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                         <AlertTriangle size={16} /> {notification.subtitle}
                     </div>
                 )}
            </div>
        )}

        {/* UPGRADE MENU OVERLAY */}
        {selectedTowerEntity && !uiState.isGameOver && !isStoreOpen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-blue-500/30 rounded-2xl p-2 flex gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-10 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex flex-col items-center border-r border-slate-700/50 pr-4 justify-center">
                     <span className="text-[10px] font-bold text-slate-400 mb-0.5 tracking-wider">LEVEL {selectedTowerEntity.level}</span>
                     <div className="font-display text-blue-300 font-bold text-xs">{TOWER_TYPES[selectedTowerEntity.type].name}</div>
                 </div>
                 
                 {selectedTowerEntity.level < 3 ? (
                     <button onClick={handleUpgradeTower} className="flex flex-col items-center justify-center gap-1 min-w-[50px] hover:bg-slate-800/50 rounded p-1 transition-colors group">
                        <div className="bg-yellow-500/10 p-1.5 rounded-full group-hover:bg-yellow-500/20 transition-colors border border-yellow-500/30">
                            <Zap size={14} className="text-yellow-400" />
                        </div>
                        <span className="text-[10px] font-bold text-yellow-400">-${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.8 * selectedTowerEntity.level)}</span>
                     </button>
                 ) : (
                     <div className="flex flex-col items-center justify-center min-w-[50px] opacity-50">
                         <span className="text-[10px] font-bold text-yellow-500">MAX</span>
                     </div>
                 )}

                 <button onClick={handleSellTower} className="flex flex-col items-center justify-center gap-1 min-w-[50px] hover:bg-slate-800/50 rounded p-1 transition-colors group">
                    <div className="bg-red-500/10 p-1.5 rounded-full group-hover:bg-red-500/20 transition-colors border border-red-500/30">
                        <Trash2 size={14} className="text-red-400" />
                    </div>
                    <span className="text-[10px] font-bold text-red-400">+${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.7 * selectedTowerEntity.level)}</span>
                 </button>
            </div>
        )}

        {uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-sm">
                <h2 className="text-4xl lg:text-6xl font-display text-red-500 mb-2 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">CRITICAL FAILURE</h2>
                <p className="text-slate-400 text-lg lg:text-xl mb-8 font-mono">Signal Lost at Wave {uiState.wave}</p>
                <button onClick={resetGame} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm font-bold transition flex items-center gap-2 tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                    <RefreshCw size={20} /> REBOOT SYSTEM
                </button>
            </div>
        )}
      </div>

      {/* 2. COMPACT BOTTOM MENU */}
      <div className="shrink-0 flex flex-col gap-1 w-full min-w-0 pb-1 px-2 relative">
        
        {/* ROW 1: COMPACT STATS & CONTROLS */}
        <div className="bg-slate-900/80 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center justify-between w-full shadow-lg h-10">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Heart className="text-red-500 w-3.5 h-3.5 drop-shadow-sm" />
                    <span className="text-sm font-bold text-red-100">{uiState.lives}</span>
                </div>
                <div className="flex items-center gap-1.5 relative">
                    <Coins className="text-yellow-400 w-3.5 h-3.5 drop-shadow-sm" />
                    <span className="text-sm font-bold text-yellow-100">{uiState.money}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Shield className="text-blue-400 w-3.5 h-3.5 drop-shadow-sm" />
                    <span className="text-sm font-bold text-blue-100">W{uiState.wave}</span>
                </div>
             </div>

             <div className="flex items-center gap-2">
                 {/* Skin Shop Toggle */}
                 <button 
                    onClick={() => setIsStoreOpen(true)}
                    className="p-1 px-2 rounded flex items-center gap-1 font-bold text-[10px] transition-colors border bg-purple-500/20 border-purple-400/50 text-purple-200"
                 >
                    <Palette size={12} /> SKIN
                 </button>

                 {/* Speed Toggle */}
                 <button 
                  onClick={toggleGameSpeed}
                  className={`p-1 px-2 rounded flex items-center gap-1 font-bold text-[10px] transition-colors border ${uiState.gameSpeed === 2 ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                >
                    <FastForward size={12} /> {uiState.gameSpeed}x
                </button>
             </div>
        </div>

        {/* ROW 2: PLAY BTN + TOWERS */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-1 rounded-lg border border-slate-700/50 flex gap-2 w-full shadow-lg h-20 items-center overflow-hidden">
             {/* Play Button */}
             <button 
                  onClick={handleStartWave}
                  disabled={uiState.isPlaying} 
                  className={`h-full aspect-square rounded-md flex flex-col items-center justify-center gap-1 font-bold transition-all relative overflow-hidden flex-shrink-0
                    ${uiState.isPlaying 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                        : uiState.autoStartTimer > 0 
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white animate-pulse border border-yellow-400/50' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-inner'}`}
                >
                    {uiState.autoStartTimer > 0 ? (
                        <>
                            <Timer size={20} />
                            <span className="text-[10px]">{Math.ceil(uiState.autoStartTimer / 60)}s</span>
                        </>
                    ) : (
                        <Play size={24} fill="currentColor" />
                    )}
            </button>
            
            <div className="w-[1px] h-[80%] bg-slate-700/50" />

            {/* Tower Scroll List */}
            <div className="flex gap-1 overflow-x-auto h-full items-center scrollbar-hide px-1 w-full">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button
                        key={tower.type}
                        onClick={() => { 
                            setSelectedTowerType(selectedTowerType === tower.type ? null : tower.type); 
                            setSelectedPlacedTowerId(null); 
                            triggerHaptic('light'); 
                        }}
                        className={`min-w-[64px] h-[90%] rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 relative
                            ${selectedTowerType === tower.type 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-slate-800 bg-slate-950/50 hover:bg-slate-900'}`}
                    >
                        <div className="w-8 h-8">
                             <TowerIcon type={tower.type} color={tower.color} />
                        </div>
                        <div className="text-[9px] text-yellow-500 font-mono font-bold">${tower.cost}</div>
                    </button>
                ))}
            </div>
        </div>

        {/* ROW 3: PERK INVENTORY BAR (New dedicated row) */}
        <div className="bg-slate-900/80 backdrop-blur-xl px-2 py-1 rounded-lg border border-slate-700/50 flex gap-2 w-full shadow-lg h-14 items-center justify-between">
             {Object.entries(PERK_STATS).map(([type, stats]) => {
                 const count = perkInventory[type as PerkType];
                 const isActive = activePerks.some(p => p.type === type);
                 
                 return (
                     <button
                        key={type}
                        onClick={() => activatePerk(type as PerkType)}
                        disabled={count <= 0}
                        className={`flex-1 h-full rounded border flex flex-col items-center justify-center relative transition-all active:scale-95
                            ${count > 0 
                                ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 cursor-pointer shadow-sm' 
                                : 'bg-slate-950/50 border-slate-800/50 opacity-40 cursor-not-allowed'}
                            ${isActive ? 'ring-2 ring-offset-1 ring-offset-slate-900 animate-pulse' : ''}    
                        `}
                        style={{ borderColor: count > 0 ? stats.color : undefined }}
                     >
                         <div className="text-xl leading-none mb-1">{stats.icon}</div>
                         <div className="text-[8px] font-bold font-display leading-none" style={{ color: count > 0 ? stats.color : '#64748b' }}>
                            {stats.name}
                         </div>
                         
                         {/* Count Badge */}
                         {count > 0 && (
                             <div className="absolute -top-1.5 -right-1.5 bg-white text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                 {count}
                             </div>
                         )}
                     </button>
                 );
             })}
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;