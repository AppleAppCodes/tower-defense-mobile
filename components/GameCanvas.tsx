import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle, MapDefinition, FloatingText } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, GRID_SIZE, INITIAL_STATE, AUTO_START_DELAY } from '../constants';
import { getTacticalAdvice } from '../services/geminiService';
import { audioService } from '../services/audioService';
import { Heart, Coins, Shield, Bot, Play, RefreshCw, Rocket, Timer, Map as MapIcon, ChevronRight, ChevronLeft, Zap, Trash2, FastForward, AlertTriangle } from 'lucide-react';

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
  switch (type) {
    case TowerType.BASIC: // Sentry
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <circle cx="12" cy="12" r="8" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
          <path d="M12 12L12 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill={color} />
        </svg>
      );
    case TowerType.RAPID: // Gatling
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <rect x="5" y="5" width="14" height="14" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
          <rect x="9" y="3" width="2" height="6" fill={color} />
          <rect x="13" y="3" width="2" height="6" fill={color} />
        </svg>
      );
    case TowerType.SNIPER: // Railgun
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <path d="M12 4L20 20H4L12 4Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
          <rect x="11.5" y="3" width="1" height="14" fill={color} />
        </svg>
      );
    case TowerType.AOE: // Howitzer
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5" fill={color} />
          <circle cx="12" cy="12" r="2" fill="#0f172a" />
        </svg>
      );
    case TowerType.LASER: // Prism
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="white" />
          <path d="M12 2V6M12 18V22" stroke={color} strokeWidth="1" />
        </svg>
      );
    case TowerType.FROST: // Cryo
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
          <path d="M12 4V20M4 12H20M6.3 6.3L17.7 17.7M6.3 17.7L17.7 6.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case TowerType.SHOCK: // Tesla
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
          <path d="M11 7L8 12H13L10 17" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 2V4M22 12H20M2 12H4" stroke={color} strokeWidth="1" />
        </svg>
      );
    case TowerType.MISSILE: // Swarm
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          <rect x="4" y="4" width="16" height="16" rx="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.5" fill={color} />
          <circle cx="16" cy="8" r="2.5" fill={color} />
          <circle cx="8" cy="16" r="2.5" fill={color} />
          <circle cx="16" cy="16" r="2.5" fill={color} />
        </svg>
      );
    default:
      return <div className="w-8 h-8 rounded-full border-2" style={{ borderColor: color, backgroundColor: color + '33' }} />;
  }
};

const MapPreviewSVG = ({ map }: { map: MapDefinition }) => {
    const scaleX = 100 / CANVAS_WIDTH;
    const scaleY = 60 / CANVAS_HEIGHT;
    
    let pathData = `M ${map.waypoints[0].x * scaleX} ${map.waypoints[0].y * scaleY}`;
    for (let i = 1; i < map.waypoints.length; i++) {
        pathData += ` L ${map.waypoints[i].x * scaleX} ${map.waypoints[i].y * scaleY}`;
    }

    return (
        <svg width="100" height="60" viewBox="0 0 100 60" className="bg-slate-800 rounded border border-slate-600">
            <path d={pathData} stroke="#3b82f6" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  
  const terrainRef = useRef<{craters: {x: number, y: number, r: number}[], noise: {x: number, y: number, alpha: number}[]}>({ craters: [], noise: [] });

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
  
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{title: string, subtitle?: string, color: string, type: 'info' | 'boss'} | null>(null);
  
  const [advisorMessage, setAdvisorMessage] = useState<string>("Planetary defense systems online. Select a mission.");
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [spawnQueue, setSpawnQueue] = useState<{ type: EnemyType; delay: number }[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [currentMap, setCurrentMap] = useState<MapDefinition>(MAPS[0]);
  const [hasStartedGame, setHasStartedGame] = useState(false);

  const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
  
  // LOCK CANVAS SCROLLING
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Hard prevent default on all touch events to stop browser scrolling
    const preventDefault = (e: TouchEvent) => {
        // Allow zooming or other gestures? No, for game we typically lock everything.
        if (e.cancelable) e.preventDefault();
    };
    
    // Passive: false is required to allow preventDefault to work
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchend', preventDefault, { passive: false });

    return () => {
        canvas.removeEventListener('touchmove', preventDefault);
        canvas.removeEventListener('touchstart', preventDefault);
        canvas.removeEventListener('touchend', preventDefault);
    };
  }, []);

  useEffect(() => {
    if (terrainRef.current.craters.length === 0) {
        for (let i = 0; i < 40; i++) {
            terrainRef.current.craters.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                r: Math.random() * 30 + 5
            });
        }
        for (let i = 0; i < 200; i++) {
            terrainRef.current.noise.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                alpha: Math.random() * 0.1
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
        position: { ...pos, y: pos.y - 10 },
        text,
        life: 1.0,
        color,
        velocity: { x: (Math.random() - 0.5) * 0.5, y: -1 }
    });
  };

  const spawnParticle = (pos: Vector2D, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      particlesRef.current.push({
        id: Math.random().toString(36),
        position: { ...pos },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 3 + 1
      });
    }
  };

  const startWave = useCallback((waveNum: number) => {
    // Determine if it's a boss wave
    const isBossWave = waveNum >= 10 && waveNum % 10 === 0; // Boss every 10 waves
    
    if (isBossWave) {
         audioService.playAlarm();
         triggerHaptic('heavy');
         setNotification({
             title: "BOSS WARNING",
             subtitle: "MASSIVE SIGNAL DETECTED",
             color: "text-red-500",
             type: 'boss'
         });
         // Clear notification after 3s
         setTimeout(() => setNotification(null), 3000);
    } else {
         audioService.playWaveStart();
         // Permanent indicator used instead of notification for standard waves
    }

    const count = 5 + Math.floor(waveNum * 1.5);
    const newQueue: { type: EnemyType; delay: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      let type = EnemyType.NORMAL;
      if (waveNum > 2 && i % 3 === 0) type = EnemyType.FAST;
      if (waveNum > 4 && i % 5 === 0) type = EnemyType.TANK;
      if (waveNum % 10 === 0 && i === count - 1) type = EnemyType.BOSS;
      
      newQueue.push({ type, delay: i * 60 });
    }
    setSpawnQueue(newQueue);
  }, []);

  const handleStartWave = useCallback(() => {
    if (!gameStateRef.current.isPlaying) {
        setHasStartedGame(true);
        gameStateRef.current.isPlaying = true;
        gameStateRef.current.autoStartTimer = -1; 
        startWave(gameStateRef.current.wave);
        triggerHaptic('medium');
        setUiState(prev => ({ ...prev, isPlaying: true, autoStartTimer: -1 }));
    }
  }, [startWave]);

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
        // We only show the Telegram Main Button for Game Over now.
        // In-game controls are handled by the UI dashboard.
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
        if (!state.isPlaying && state.autoStartTimer > 0) {
            state.autoStartTimer--;
            if (state.autoStartTimer === 0) handleStartWave();
            if (state.autoStartTimer % 60 === 0 && loop === 0) setUiState({ ...state });
            continue;
        }

        if (!state.isPlaying) continue;

        state.gameTime++;

        if (spawnQueue.length > 0) {
          if (spawnQueue[0].delay <= 0) {
            const nextEnemy = spawnQueue.shift();
            if (nextEnemy) {
              const stats = ENEMY_STATS[nextEnemy.type];
              enemiesRef.current.push({
                id: Math.random().toString(36),
                position: { ...currentMap.waypoints[0] }, // Spawn at current map start
                type: nextEnemy.type,
                hp: stats.maxHp + (state.wave * stats.maxHp * 0.2),
                maxHp: stats.maxHp + (state.wave * stats.maxHp * 0.2),
                speed: stats.speed,
                pathIndex: 0,
                distanceTraveled: 0,
                frozen: 0,
                moneyReward: stats.reward,
                color: stats.color,
                radius: stats.radius
              });
            }
            setSpawnQueue([...spawnQueue]);
          } else {
            spawnQueue[0].delay--;
          }
        } else if (enemiesRef.current.length === 0 && state.lives > 0) {
           state.isPlaying = false;
           state.wave++;
           state.money += 50 + (state.wave * 10);
           state.autoStartTimer = AUTO_START_DELAY; 
           triggerHaptic('success');
           setUiState(prev => ({ ...prev, isPlaying: false, wave: state.wave, money: state.money, autoStartTimer: state.autoStartTimer }));
           break; // Break loop to ensure state update happens
        }

        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          const target = currentMap.waypoints[enemy.pathIndex + 1]; // Use current map
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

          if (tower.lastShotFrame + tower.cooldown <= state.gameTime) {
            if (target) {
              tower.lastShotFrame = state.gameTime;
              
              let pType: 'SINGLE' | 'AOE' = 'SINGLE';
              let blast = 0;
              let effect: 'FREEZE' | 'SHOCK' | undefined = undefined;
              let speed = 10;
              let color = TOWER_TYPES[tower.type].color;
              let soundType: 'LASER' | 'HEAVY' | 'NORMAL' = 'NORMAL';

              if (tower.type === TowerType.AOE) { pType = 'AOE'; blast = 60 + (tower.level * 10); soundType = 'HEAVY'; }
              if (tower.type === TowerType.MISSILE) { pType = 'AOE'; blast = 80 + (tower.level * 15); speed = 4; soundType = 'HEAVY'; }
              if (tower.type === TowerType.LASER) { speed = 20; soundType = 'LASER'; }
              if (tower.type === TowerType.FROST) { effect = 'FREEZE'; soundType = 'LASER'; }
              if (tower.type === TowerType.SHOCK) { effect = 'SHOCK'; soundType = 'LASER'; }
              
              if (loop === 0) audioService.playShoot(soundType); // Only play sound on first loop iter to avoid spam

              projectilesRef.current.push({
                id: Math.random().toString(),
                position: { ...tower.position },
                targetId: target.id,
                damage: tower.damage,
                speed: speed,
                color: color,
                radius: 4,
                hasHit: false,
                type: pType,
                blastRadius: blast,
                effect: effect
              });
            }
          }
        });

        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const target = enemiesRef.current.find(e => e.id === p.targetId);
          if (!target) {
            projectilesRef.current.splice(i, 1);
            continue;
          }
          const dist = distance(p.position, target.position);
          if (dist <= p.speed) {
            // Hit logic
            if (p.type === 'AOE' && p.blastRadius) {
               if (loop === 0) audioService.playExplosion();
               spawnParticle(p.position, '#f97316', 12);
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
               spawnParticle(p.position, p.color, 4);
            }
            projectilesRef.current.splice(i, 1);
          } else {
            const angle = Math.atan2(target.position.y - p.position.y, target.position.x - p.position.x);
            p.position.x += Math.cos(angle) * p.speed;
            p.position.y += Math.sin(angle) * p.speed;
          }
        }

        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          if (enemiesRef.current[i].hp <= 0) {
            state.money += enemiesRef.current[i].moneyReward;
            spawnFloatingText(enemiesRef.current[i].position, `+$${enemiesRef.current[i].moneyReward}`, '#fbbf24');
            spawnParticle(enemiesRef.current[i].position, '#cbd5e1', 8);
            enemiesRef.current.splice(i, 1);
          }
        }

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life -= 0.05;
          p.position.x += p.velocity.x;
          p.position.y += p.velocity.y;
          if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
           const ft = floatingTextsRef.current[i];
           ft.life -= 0.02;
           ft.position.x += ft.velocity.x;
           ft.position.y += ft.velocity.y;
           if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
        }
    }

    if (state.gameTime % 5 === 0) {
      setUiState({ ...state });
    }
  }, [spawnQueue, onGameOver, handleStartWave, currentMap]);

  const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower) => {
    ctx.save();
    ctx.translate(tower.position.x, tower.position.y);
    
    // Draw Base (Static)
    ctx.fillStyle = '#1e293b'; // Dark Slate Base
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    
    // Base shapes based on tower type
    if ([TowerType.BASIC, TowerType.LASER, TowerType.FROST].includes(tower.type)) {
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
    } else if ([TowerType.RAPID, TowerType.SHOCK].includes(tower.type)) {
        ctx.fillRect(-14, -14, 28, 28);
    } else if (tower.type === TowerType.SNIPER || tower.type === TowerType.MISSILE) {
         ctx.beginPath();
         ctx.moveTo(14, 0); ctx.lineTo(-10, 12); ctx.lineTo(-10, -12);
         ctx.fill();
    } else if (tower.type === TowerType.AOE) {
         ctx.beginPath();
         for(let i=0; i<6; i++) ctx.lineTo(16 * Math.cos(i * Math.PI / 3), 16 * Math.sin(i * Math.PI / 3));
         ctx.fill();
    }
    
    // Level Indicator (Chevrons on base)
    ctx.fillStyle = '#fbbf24'; // Gold
    for(let i=0; i<tower.level; i++) {
        ctx.beginPath();
        ctx.arc(10, 10 - (i*5), 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;

    // Rotate Context for Turret
    ctx.rotate(tower.rotation);

    // Draw Turret Head (Rotates)
    ctx.fillStyle = TOWER_TYPES[tower.type].color;
    
    switch(tower.type) {
        case TowerType.BASIC:
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); 
            ctx.fillRect(0, -3, 22, 6); 
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(20, -4, 4, 8); 
            break;

        case TowerType.RAPID:
            ctx.fillRect(-10, -10, 20, 20); 
            ctx.fillStyle = '#3f6212';
            ctx.fillRect(0, -6, 20, 4); 
            ctx.fillRect(0, 2, 20, 4);  
            break;

        case TowerType.SNIPER:
            ctx.fillStyle = '#7c2d12'; 
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = TOWER_TYPES[tower.type].color;
            ctx.fillRect(0, -2, 34, 4); 
            break;

        case TowerType.AOE:
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f1d1d'; 
            ctx.fillRect(0, -8, 20, 16); 
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); 
            break;

        // NEW TOWERS
        case TowerType.LASER:
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
            // Prismatic Barrel
            ctx.fillStyle = '#cffafe';
            ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(24, 0); ctx.lineTo(0, 4); ctx.fill();
            break;
            
        case TowerType.FROST:
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
            // Snow crystals
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
            ctx.stroke();
            break;

        case TowerType.SHOCK:
            ctx.fillStyle = '#854d0e';
            ctx.fillRect(-8, -8, 16, 16);
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            // Tesla coil
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 1.5); ctx.stroke();
            break;

        case TowerType.MISSILE:
            ctx.fillStyle = '#581c87';
            ctx.fillRect(-12, -12, 24, 24);
            // Pods
            ctx.fillStyle = '#d8b4fe';
            ctx.beginPath(); ctx.arc(-6, -6, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, -6, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-6, 6, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, 6, 4, 0, Math.PI * 2); ctx.fill();
            break;
    }

    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- Planet Terrain Generation ---
    terrainRef.current.craters.forEach(crater => {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        ctx.arc(crater.x, crater.y, crater.r, Math.PI, Math.PI * 1.5); 
        ctx.stroke();
    });

    terrainRef.current.noise.forEach(dot => {
        ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`;
        ctx.fillRect(dot.x, dot.y, 2, 2);
    });

    // Subtle Tactical Grid
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // 2. Path
    ctx.save();
    ctx.strokeStyle = '#1e293b'; 
    ctx.lineWidth = 44; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // USE CURRENT MAP WAYPOINTS
    ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
    for (let i = 1; i < currentMap.waypoints.length; i++) ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y);
    ctx.stroke();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 36;
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 30]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3. Towers
    towersRef.current.forEach(tower => {
        drawTower(ctx, tower);
        // Draw selection ring
        if (selectedPlacedTowerId === tower.id) {
            ctx.beginPath();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.arc(tower.position.x, tower.position.y, 24, 0, Math.PI * 2);
            ctx.stroke();
            // Draw Range
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
            ctx.arc(tower.position.x, tower.position.y, tower.range, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });

    // 4. Enemies
    enemiesRef.current.forEach(enemy => {
        const target = currentMap.waypoints[enemy.pathIndex + 1]; // Use current map
        let angle = 0;
        if (target) {
            angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
        }

        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y);
        ctx.rotate(angle);

        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;
        ctx.fillStyle = enemy.color;
        
        if (enemy.type === EnemyType.NORMAL) {
             ctx.beginPath();
             ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.6, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.beginPath(); ctx.arc(8, 0, enemy.radius * 0.5, 0, Math.PI * 2); ctx.fill();
             ctx.strokeStyle = enemy.color;
             ctx.lineWidth = 2;
             ctx.lineCap = 'round';
             ctx.beginPath();
             ctx.moveTo(-4, -4); ctx.lineTo(-8, -12);
             ctx.moveTo(-4, 4); ctx.lineTo(-8, 12);
             ctx.moveTo(4, -4); ctx.lineTo(8, -12);
             ctx.moveTo(4, 4); ctx.lineTo(8, 12);
             ctx.stroke();
        } else if (enemy.type === EnemyType.FAST) {
             ctx.beginPath();
             ctx.moveTo(enemy.radius + 4, 0);
             ctx.lineTo(-enemy.radius, -enemy.radius + 2);
             ctx.lineTo(-enemy.radius + 4, 0);
             ctx.lineTo(-enemy.radius, enemy.radius - 2);
             ctx.closePath();
             ctx.fill();
        } else if (enemy.type === EnemyType.TANK) {
             ctx.beginPath();
             ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
             ctx.fill();
             ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
             ctx.beginPath();
             ctx.moveTo(4, -enemy.radius + 4); ctx.lineTo(4, enemy.radius - 4);
             ctx.moveTo(-4, -enemy.radius + 4); ctx.lineTo(-4, enemy.radius - 4);
             ctx.fill();
             ctx.strokeStyle = enemy.color;
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.moveTo(enemy.radius - 2, -6); ctx.lineTo(enemy.radius + 6, -10);
             ctx.moveTo(enemy.radius - 2, 6); ctx.lineTo(enemy.radius + 6, 10);
             ctx.stroke();
        } else if (enemy.type === EnemyType.BOSS) {
             ctx.beginPath();
             ctx.ellipse(-4, 0, enemy.radius, enemy.radius * 0.7, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.fillStyle = '#d8b4fe'; 
             ctx.beginPath(); ctx.arc(-4, 0, enemy.radius * 0.4, 0, Math.PI * 2); ctx.fill();
             ctx.strokeStyle = enemy.color;
             ctx.lineWidth = 4;
             const timeOffset = Date.now() / 100;
             for(let t = -1; t <= 1; t++) {
                 ctx.beginPath();
                 ctx.moveTo(-10, t * 10);
                 ctx.quadraticCurveTo(-25, t * 15 + Math.sin(timeOffset + t) * 5, -35, t * 20);
                 ctx.stroke();
             }
        }
        
        ctx.restore();

        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(enemy.position.x - 12, enemy.position.y - 24, 24, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(enemy.position.x - 12, enemy.position.y - 24, 24 * hpPct, 4);
        
        // Frozen indicator
        if (enemy.frozen > 0) {
            ctx.strokeStyle = '#67e8f9';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(enemy.position.x, enemy.position.y, enemy.radius + 4, 0, Math.PI * 2); ctx.stroke();
        }
    });

    // 5. Projectiles
    projectilesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2); ctx.fill();
    });

    // 6. Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2); ctx.fill();
    });

    // 7. Floating Text
    ctx.font = "bold 12px Inter";
    ctx.textAlign = "center";
    floatingTextsRef.current.forEach(ft => {
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.position.x, ft.position.y);
    });

    ctx.globalAlpha = 1.0;

    // 8. Preview
    if (mousePosRef.current && selectedTowerType) {
        const { x, y } = mousePosRef.current;
        const gx = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTowerType];
        const isValid = gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 25, currentMap.waypoints);
        
        ctx.beginPath();
        ctx.fillStyle = isValid ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        ctx.strokeStyle = isValid ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1;
        ctx.arc(gx, gy, config.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = isValid ? config.color : '#ef4444';
        ctx.beginPath(); ctx.arc(gx, gy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
  }, [selectedTowerType, selectedPlacedTowerId, currentMap]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => { update(); draw(); animationFrameId = requestAnimationFrame(loop); };
    loop();
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
    if (gameStateRef.current.isGameOver || !hasStartedGame) return;
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

    if (gameStateRef.current.isGameOver || !hasStartedGame) return;
    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pos) return; 
    
    // Check if clicked on existing tower
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

  const handleConsultAI = async () => {
    setIsAdvisorLoading(true);
    triggerHaptic('medium');
    const advice = await getTacticalAdvice(gameStateRef.current, towersRef.current);
    setAdvisorMessage(advice);
    setIsAdvisorLoading(false);
    triggerHaptic('success');
  };
  
  const resetGame = () => {
      gameStateRef.current = { ...INITIAL_STATE, isPlaying: false, isGameOver: false, gameTime: 0, autoStartTimer: -1, gameSpeed: 1 };
      setHasStartedGame(false); // Go back to map select
      towersRef.current = []; enemiesRef.current = []; projectilesRef.current = []; particlesRef.current = []; floatingTextsRef.current = [];
      setSpawnQueue([]);
      setUiState({...gameStateRef.current});
      setAdvisorMessage("Systems reset. Awaiting command.");
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 lg:p-4 w-full max-w-[100vw] mx-auto h-full overflow-hidden box-border">
      <div className="relative group flex-shrink-0 mx-auto w-full lg:w-auto flex justify-center items-center overflow-hidden">
        <canvas 
          ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{ width: '100%', height: 'auto', maxHeight: '55vh', objectFit: 'contain', touchAction: 'none' }}
          className="block bg-[#0f172a] rounded-xl shadow-2xl border border-slate-700 cursor-crosshair"
        />
        
        {/* HUD: Wave Indicator (Permanent, Top-Left) */}
        {!uiState.isGameOver && hasStartedGame && (
             <div className="absolute top-3 left-3 z-10 pointer-events-none animate-in fade-in duration-500">
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${uiState.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-white/90 font-display text-xs font-bold tracking-widest">WAVE {uiState.wave}</span>
                </div>
            </div>
        )}

        {/* START SCREEN & MAP SELECT */}
        {!hasStartedGame && !uiState.isPlaying && !uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-sm">
                <div className="bg-slate-900/95 p-6 rounded-2xl border border-blue-500/50 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)] w-[320px]">
                    <h2 className="text-xl font-display text-white mb-1">SELECT SECTOR</h2>
                    <p className="text-slate-400 mb-4 text-xs">Choose battlefield topography</p>
                    
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMap('prev')} className="p-2 text-slate-400 hover:text-white"><ChevronLeft /></button>
                        <div className="flex flex-col items-center gap-2">
                             <MapPreviewSVG map={currentMap} />
                             <div className="font-bold text-lg text-blue-400">{currentMap.name}</div>
                             <div className={`text-xs px-2 py-0.5 rounded ${
                                 currentMap.difficulty === 'EASY' ? 'bg-green-900 text-green-300' : 
                                 currentMap.difficulty === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
                             }`}>{currentMap.difficulty}</div>
                        </div>
                        <button onClick={() => changeMap('next')} className="p-2 text-slate-400 hover:text-white"><ChevronRight /></button>
                    </div>

                    <button 
                      onClick={handleStartWave}
                      className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-sm font-bold transition-all flex items-center justify-center gap-2 mx-auto text-sm border-b-4 border-emerald-900"
                    >
                        <Play size={18} /> DEPLOY
                    </button>
                </div>
            </div>
        )}

        {/* NOTIFICATION OVERLAY */}
        {notification && (
            <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center animate-in fade-in zoom-in-90 duration-300 ${notification.type === 'boss' ? 'animate-pulse' : ''}`}>
                 <h2 className={`font-display text-4xl lg:text-6xl font-black ${notification.color} drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] stroke-black tracking-widest`}>
                     {notification.title}
                 </h2>
                 {notification.subtitle && (
                     <div className="bg-red-900/80 text-white px-4 py-1 rounded text-sm font-mono border border-red-500 mt-2 flex items-center gap-2">
                         <AlertTriangle size={16} /> {notification.subtitle}
                     </div>
                 )}
            </div>
        )}

        {/* UPGRADE MENU OVERLAY */}
        {selectedTowerEntity && !uiState.isGameOver && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-600 rounded-lg p-3 flex gap-4 shadow-xl backdrop-blur-md z-10 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex flex-col items-center border-r border-slate-700 pr-4">
                     <span className="text-xs font-bold text-slate-400 mb-1">LEVEL {selectedTowerEntity.level}</span>
                     <div className="font-display text-blue-400 font-bold">{TOWER_TYPES[selectedTowerEntity.type].name}</div>
                 </div>
                 
                 {selectedTowerEntity.level < 3 ? (
                     <button onClick={handleUpgradeTower} className="flex flex-col items-center justify-center gap-1 min-w-[60px] hover:bg-slate-800 rounded p-1 transition-colors group">
                        <div className="bg-yellow-900/50 p-2 rounded-full group-hover:bg-yellow-900/80 transition-colors border border-yellow-700/50">
                            <Zap size={16} className="text-yellow-400" />
                        </div>
                        <span className="text-[10px] font-bold text-yellow-500">-${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.8 * selectedTowerEntity.level)}</span>
                     </button>
                 ) : (
                     <div className="flex flex-col items-center justify-center min-w-[60px] opacity-50">
                         <span className="text-xs font-bold text-yellow-500">MAX</span>
                     </div>
                 )}

                 <button onClick={handleSellTower} className="flex flex-col items-center justify-center gap-1 min-w-[60px] hover:bg-slate-800 rounded p-1 transition-colors group">
                    <div className="bg-red-900/50 p-2 rounded-full group-hover:bg-red-900/80 transition-colors border border-red-700/50">
                        <Trash2 size={16} className="text-red-400" />
                    </div>
                    <span className="text-[10px] font-bold text-red-400">+${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.7 * selectedTowerEntity.level)}</span>
                 </button>
            </div>
        )}

        {uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-xl z-20">
                <h2 className="text-3xl lg:text-5xl font-display text-red-500 mb-4 animate-pulse">MISSION FAILED</h2>
                <p className="text-slate-300 text-lg lg:text-xl mb-6">Colony lost at wave {uiState.wave}</p>
                <button onClick={resetGame} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition flex items-center gap-2">
                    <RefreshCw size={20} /> Retry
                </button>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 lg:gap-4 overflow-y-auto pb-24 lg:pb-0 w-full min-w-0">
        <div className="bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-700 flex flex-col gap-2 lg:gap-4 w-full shadow-lg">
            <div className="flex justify-between items-center w-full">
                <div className="flex flex-col">
                  <h1 className="font-display text-lg lg:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 whitespace-nowrap">
                    PLANET DEFENSE <span className="text-[10px] text-yellow-500 ml-1 font-mono">v1.0 BETA</span>
                  </h1>
                  {userName && <span className="text-xs text-blue-400 font-mono truncate max-w-[200px]">Cmdr. {userName}</span>}
                </div>
                <button 
                  onClick={toggleGameSpeed}
                  className={`p-2 rounded flex items-center gap-1 font-bold text-xs transition-colors border ${uiState.gameSpeed === 2 ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                >
                    <FastForward size={16} /> {uiState.gameSpeed}x
                </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
                <div className="bg-slate-900 p-2 rounded-sm border-l-2 border-red-500 flex items-center gap-2 justify-center">
                    <Heart className="text-red-500 w-4 h-4 shrink-0" />
                    <div className="text-sm font-bold">{uiState.lives}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-sm border-l-2 border-yellow-500 flex items-center gap-2 justify-center">
                    <Coins className="text-yellow-400 w-4 h-4 shrink-0" />
                    <div className="text-sm font-bold">{uiState.money}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-sm border-l-2 border-blue-500 flex items-center gap-2 justify-center">
                    <Shield className="text-blue-400 w-4 h-4 shrink-0" />
                    <div className="text-sm font-bold">{uiState.wave}</div>
                </div>
                <button 
                  onClick={handleStartWave}
                  disabled={uiState.isPlaying} 
                  className={`p-2 rounded-sm flex items-center justify-center gap-2 font-bold transition
                    ${uiState.isPlaying 
                        ? 'bg-slate-700 text-slate-500' 
                        : uiState.autoStartTimer > 0 
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white animate-pulse' 
                            : 'bg-emerald-700 hover:bg-emerald-600 text-white border-b-4 border-emerald-900'}`}
                >
                    {uiState.autoStartTimer > 0 ? (
                        <span className="flex items-center gap-1"><Timer size={16} /> {Math.ceil(uiState.autoStartTimer / 60)}s</span>
                    ) : (
                        <Play size={18} />
                    )}
                </button>
            </div>
        </div>

        <div className="bg-slate-800 p-2 lg:p-4 rounded-xl border border-slate-700 w-full min-w-0 shadow-lg">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Deploy Units</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 w-full min-w-0 scrollbar-hide">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button
                        key={tower.type}
                        onClick={() => { 
                            setSelectedTowerType(selectedTowerType === tower.type ? null : tower.type); 
                            setSelectedPlacedTowerId(null); // Deselect placed tower
                            triggerHaptic('light'); 
                        }}
                        className={`min-w-[100px] p-2 rounded-sm border-b-4 flex flex-col items-center gap-1 transition shrink-0 relative
                            ${selectedTowerType === tower.type 
                                ? 'border-b-blue-500 bg-slate-700 border-t border-l border-r border-slate-600 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                                : 'border-b-black bg-slate-900 border-t border-l border-r border-slate-800'}`}
                    >
                        <TowerIcon type={tower.type} color={tower.color} />
                        <div className="text-xs font-bold text-center w-full truncate text-slate-200">
                            {tower.name}
                        </div>
                        <div className="text-xs text-yellow-500 font-mono">${tower.cost}</div>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-700 flex-1 min-h-[100px] w-full shadow-lg">
             <h3 className="text-blue-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Bot size={14} /> AI Command</h3>
             <div className="bg-slate-900/50 p-2 rounded-sm border-l-2 border-blue-500 text-xs lg:text-sm text-slate-300 font-mono mb-2 break-words">
                 <span className="text-blue-500 mr-2">{">"}</span>{advisorMessage}
             </div>
             <button onClick={handleConsultAI} disabled={isAdvisorLoading} className="w-full py-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-blue-300 rounded-sm text-xs font-bold transition font-mono uppercase">
                 {isAdvisorLoading ? "UPLINKING..." : "REQUEST TACTICAL DATA"}
             </button>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;