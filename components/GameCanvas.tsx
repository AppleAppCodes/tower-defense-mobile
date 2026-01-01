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
  // Simplified icons for UI
  switch (type) {
    case TowerType.BASIC: // Sentry
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill={color} />
        </svg>
      );
    default:
      return <div className="w-6 h-6 rounded-full border-2 shadow-[0_0_10px_currentColor]" style={{ borderColor: color, backgroundColor: color + '33', color: color }} />;
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
        <svg width="100" height="60" viewBox="0 0 100 60" className="bg-slate-900/50 rounded border border-slate-700/50 shadow-inner">
            <path d={pathData} stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
        </svg>
    );
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  
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

  const startWave = useCallback((waveNum: number) => {
    const isBossWave = waveNum >= 10 && waveNum % 10 === 0;
    
    if (isBossWave) {
         audioService.playAlarm();
         triggerHaptic('heavy');
         setNotification({
             title: "BOSS WARNING",
             subtitle: "MASSIVE SIGNAL DETECTED",
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
        // Animate Scanline
        terrainRef.current.scanline = (terrainRef.current.scanline + 2) % CANVAS_HEIGHT;

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
           break; 
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

          if (tower.lastShotFrame + tower.cooldown <= state.gameTime) {
            if (target) {
              tower.lastShotFrame = state.gameTime;
              
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
                damage: tower.damage,
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

          // Homing for missiles, others straight line if not super close?
          // For simplicity, all homing slightly to ensure hit feel is good
          const angle = Math.atan2(target.position.y - p.position.y, target.position.x - p.position.x);
          p.velocity.x = Math.cos(angle) * p.speed;
          p.velocity.y = Math.sin(angle) * p.speed;
          
          p.position.x += p.velocity.x;
          p.position.y += p.velocity.y;

          const dist = distance(p.position, target.position);
          if (dist <= p.speed) {
            // Hit logic
            if (p.type === 'AOE' && p.blastRadius) {
               if (loop === 0) audioService.playExplosion();
               spawnParticle(p.position, '#f97316', 1, 'ring'); // Ring shockwave
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

        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          if (enemiesRef.current[i].hp <= 0) {
            state.money += enemiesRef.current[i].moneyReward;
            spawnFloatingText(enemiesRef.current[i].position, `+$${enemiesRef.current[i].moneyReward}`, '#fbbf24');
            spawnParticle(enemiesRef.current[i].position, '#fff', 1, 'ring'); // Death ring
            spawnParticle(enemiesRef.current[i].position, enemiesRef.current[i].color, 8, 'circle');
            enemiesRef.current.splice(i, 1);
          }
        }

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life -= 0.05;
          
          if (p.type === 'ring') {
              p.size += 2; // Expand ring
          } else {
              p.position.x += p.velocity.x;
              p.position.y += p.velocity.y;
          }
          
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
    
    // Draw Base (Static) with Shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'black';
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(0,0, 16, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Technical ring
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0,0, 14, 0, Math.PI*2); ctx.stroke();
    
    // Level Indicator (Chevrons on base)
    ctx.fillStyle = '#fbbf24'; // Gold
    for(let i=0; i<tower.level; i++) {
        ctx.beginPath();
        ctx.arc(10, 10 - (i*5), 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Rotate Context for Turret
    ctx.rotate(tower.rotation);

    // Draw Turret Head (Rotates)
    ctx.fillStyle = TOWER_TYPES[tower.type].color;
    
    // Add glow to turret
    ctx.shadowBlur = 5;
    ctx.shadowColor = TOWER_TYPES[tower.type].color;

    // Simple shapes for better performance but kept stylization
    ctx.beginPath();
    if (tower.type === TowerType.SNIPER) {
        ctx.fillRect(-4, -15, 8, 30);
    } else if (tower.type === TowerType.MISSILE) {
        ctx.fillRect(-10, -10, 20, 20);
    } else {
        ctx.arc(0, 0, 8, 0, Math.PI*2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background
    // Deep Space Blue
    ctx.fillStyle = '#020617'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Animated Starfield
    terrainRef.current.stars.forEach(star => {
        const flicker = Math.random() * 0.2 + 0.8;
        ctx.globalAlpha = star.alpha * flicker;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI*2); ctx.fill();
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
    });
    ctx.globalAlpha = 1.0;

    // Tactical Grid
    ctx.strokeStyle = 'rgba(30, 64, 175, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // 2. Scanline Effect
    const scanY = terrainRef.current.scanline;
    const grad = ctx.createLinearGradient(0, scanY, 0, scanY + 40);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.1)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY, CANVAS_WIDTH, 40);

    // 3. Path with Glow
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
    ctx.strokeStyle = '#1e293b'; 
    ctx.lineWidth = 44; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
    for (let i = 1; i < currentMap.waypoints.length; i++) ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner path track
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 36;
    ctx.stroke();
    
    // Dashed guide
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 20]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 4. Towers
    towersRef.current.forEach(tower => {
        drawTower(ctx, tower);
        // Draw selection ring
        if (selectedPlacedTowerId === tower.id) {
            ctx.beginPath();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.arc(tower.position.x, tower.position.y, 24, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Pulse range
            const pulse = 1 + Math.sin(Date.now() / 200) * 0.05;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
            ctx.arc(tower.position.x, tower.position.y, tower.range * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });

    // 5. Enemies
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
        ctx.shadowBlur = 8;
        ctx.shadowColor = enemy.color;
        
        ctx.fillStyle = enemy.color;
        
        // Simple shape drawing based on type
        ctx.beginPath();
        if (enemy.type === EnemyType.BOSS) {
            ctx.arc(0, 0, enemy.radius, 0, Math.PI*2);
        } else if (enemy.type === EnemyType.FAST) {
             ctx.moveTo(enemy.radius, 0);
             ctx.lineTo(-enemy.radius, -enemy.radius/2);
             ctx.lineTo(-enemy.radius, enemy.radius/2);
        } else {
             ctx.arc(0, 0, enemy.radius, 0, Math.PI*2);
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Engine Trail effect
        if (gameStateRef.current.gameTime % 4 === 0) {
            // Add trail particle implicitly by drawing small dots behind
             ctx.fillStyle = 'rgba(255,255,255,0.5)';
             ctx.fillRect(-enemy.radius - 4, -2, 4, 4);
        }

        ctx.restore();

        // HP Bar (Floating)
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        if (hpPct < 1) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(enemy.position.x - 10, enemy.position.y - 20, 20, 3);
            ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : '#f87171';
            ctx.fillRect(enemy.position.x - 10, enemy.position.y - 20, 20 * hpPct, 3);
        }
        
        // Frozen indicator
        if (enemy.frozen > 0) {
            ctx.strokeStyle = '#67e8f9';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(enemy.position.x, enemy.position.y, enemy.radius + 2, 0, Math.PI * 2); ctx.stroke();
        }
    });

    // 6. Projectiles (Lasers/Tracers)
    projectilesRef.current.forEach(p => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.type === 'AOE' ? 4 : 2;
      
      // Draw tail
      const tailLen = p.speed * 1.5;
      const angle = Math.atan2(p.velocity.y, p.velocity.x);
      
      ctx.beginPath();
      ctx.moveTo(p.position.x, p.position.y);
      ctx.lineTo(p.position.x - Math.cos(angle) * tailLen, p.position.y - Math.sin(angle) * tailLen);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.type==='AOE'?3:1.5, 0, Math.PI*2); ctx.fill();
      
      ctx.restore();
    });

    // 7. Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      
      if (p.type === 'ring') {
          // Shockwave effect
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2 * p.life;
          ctx.beginPath();
          ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
      } else {
          // Standard particle
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    });

    // 8. Floating Text
    ctx.font = "bold 14px Orbitron";
    ctx.textAlign = "center";
    floatingTextsRef.current.forEach(ft => {
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.position.x, ft.position.y);
        ctx.shadowBlur = 0;
    });

    ctx.globalAlpha = 1.0;

    // 9. Preview
    if (mousePosRef.current && selectedTowerType) {
        const { x, y } = mousePosRef.current;
        const gx = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTowerType];
        const isValid = gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 25, currentMap.waypoints);
        
        ctx.beginPath();
        ctx.fillStyle = isValid ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.strokeStyle = isValid ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1;
        ctx.arc(gx, gy, config.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Scan radius effect
        if (isValid) {
            ctx.beginPath();
            ctx.moveTo(gx - 10, gy); ctx.lineTo(gx + 10, gy);
            ctx.moveTo(gx, gy - 10); ctx.lineTo(gx, gy + 10);
            ctx.stroke();
        }
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
          className="block bg-slate-950 rounded-xl shadow-2xl border border-slate-700/50 cursor-crosshair"
        />
        
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
                             <MapPreviewSVG map={currentMap} />
                             <div className="font-bold text-lg text-blue-400 font-display">{currentMap.name}</div>
                             <div className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${
                                 currentMap.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                 currentMap.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                             }`}>{currentMap.difficulty}</div>
                        </div>
                        <button onClick={() => changeMap('next')} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight /></button>
                    </div>

                    <button 
                      onClick={handleStartWave}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-all flex items-center justify-center gap-2 mx-auto text-sm tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    >
                        <Play size={18} /> INITIATE DROP
                    </button>
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
        {selectedTowerEntity && !uiState.isGameOver && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-blue-500/30 rounded-2xl p-3 flex gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-10 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex flex-col items-center border-r border-slate-700/50 pr-4 justify-center">
                     <span className="text-[10px] font-bold text-slate-400 mb-0.5 tracking-wider">LEVEL {selectedTowerEntity.level}</span>
                     <div className="font-display text-blue-300 font-bold text-sm">{TOWER_TYPES[selectedTowerEntity.type].name}</div>
                 </div>
                 
                 {selectedTowerEntity.level < 3 ? (
                     <button onClick={handleUpgradeTower} className="flex flex-col items-center justify-center gap-1 min-w-[60px] hover:bg-slate-800/50 rounded p-1 transition-colors group">
                        <div className="bg-yellow-500/10 p-2 rounded-full group-hover:bg-yellow-500/20 transition-colors border border-yellow-500/30">
                            <Zap size={16} className="text-yellow-400" />
                        </div>
                        <span className="text-[10px] font-bold text-yellow-400">-${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.8 * selectedTowerEntity.level)}</span>
                     </button>
                 ) : (
                     <div className="flex flex-col items-center justify-center min-w-[60px] opacity-50">
                         <span className="text-xs font-bold text-yellow-500">MAX</span>
                     </div>
                 )}

                 <button onClick={handleSellTower} className="flex flex-col items-center justify-center gap-1 min-w-[60px] hover:bg-slate-800/50 rounded p-1 transition-colors group">
                    <div className="bg-red-500/10 p-2 rounded-full group-hover:bg-red-500/20 transition-colors border border-red-500/30">
                        <Trash2 size={16} className="text-red-400" />
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

      <div className="flex-1 flex flex-col gap-2 lg:gap-4 overflow-y-auto pb-24 lg:pb-0 w-full min-w-0">
        <div className="bg-slate-900/60 backdrop-blur-xl p-3 lg:p-4 rounded-xl border border-slate-700/50 flex flex-col gap-2 lg:gap-4 w-full shadow-lg">
            <div className="flex justify-between items-center w-full">
                <div className="flex flex-col">
                  <h1 className="font-display text-lg lg:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-400 whitespace-nowrap drop-shadow-sm">
                    PLANET DEFENSE <span className="text-[10px] text-yellow-500 ml-1 font-mono align-top">v1.0</span>
                  </h1>
                  {userName && <span className="text-xs text-slate-400 font-mono truncate max-w-[200px] tracking-tight">Cmdr. {userName}</span>}
                </div>
                <button 
                  onClick={toggleGameSpeed}
                  className={`p-2 rounded flex items-center gap-1 font-bold text-xs transition-colors border ${uiState.gameSpeed === 2 ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                >
                    <FastForward size={16} /> {uiState.gameSpeed}x
                </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
                <div className="bg-slate-950/50 p-2 rounded border border-red-500/20 flex items-center gap-2 justify-center shadow-inner">
                    <Heart className="text-red-500 w-4 h-4 shrink-0 drop-shadow-[0_0_5px_currentColor]" />
                    <div className="text-sm font-bold text-red-100">{uiState.lives}</div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-yellow-500/20 flex items-center gap-2 justify-center shadow-inner">
                    <Coins className="text-yellow-400 w-4 h-4 shrink-0 drop-shadow-[0_0_5px_currentColor]" />
                    <div className="text-sm font-bold text-yellow-100">{uiState.money}</div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-blue-500/20 flex items-center gap-2 justify-center shadow-inner">
                    <Shield className="text-blue-400 w-4 h-4 shrink-0 drop-shadow-[0_0_5px_currentColor]" />
                    <div className="text-sm font-bold text-blue-100">{uiState.wave}</div>
                </div>
                <button 
                  onClick={handleStartWave}
                  disabled={uiState.isPlaying} 
                  className={`p-2 rounded flex items-center justify-center gap-2 font-bold transition-all relative overflow-hidden
                    ${uiState.isPlaying 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                        : uiState.autoStartTimer > 0 
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white animate-pulse border border-yellow-400/50' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                >
                    {uiState.autoStartTimer > 0 ? (
                        <span className="flex items-center gap-1"><Timer size={16} /> {Math.ceil(uiState.autoStartTimer / 60)}s</span>
                    ) : (
                        <Play size={18} />
                    )}
                </button>
            </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl p-2 lg:p-4 rounded-xl border border-slate-700/50 w-full min-w-0 shadow-lg">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-widest pl-1">Unit Deployment</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 w-full min-w-0 scrollbar-hide">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button
                        key={tower.type}
                        onClick={() => { 
                            setSelectedTowerType(selectedTowerType === tower.type ? null : tower.type); 
                            setSelectedPlacedTowerId(null); // Deselect placed tower
                            triggerHaptic('light'); 
                        }}
                        className={`min-w-[80px] p-2 rounded border flex flex-col items-center gap-2 transition-all shrink-0 relative
                            ${selectedTowerType === tower.type 
                                ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                                : 'border-slate-800 bg-slate-950/50 hover:bg-slate-900'}`}
                    >
                        <TowerIcon type={tower.type} color={tower.color} />
                        <div className="flex flex-col items-center">
                            <div className="text-[10px] font-bold text-center w-full truncate text-slate-300 font-display tracking-wide">
                                {tower.name}
                            </div>
                            <div className="text-[10px] text-yellow-500 font-mono">${tower.cost}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl p-3 lg:p-4 rounded-xl border border-slate-700/50 flex-1 min-h-[100px] w-full shadow-lg flex flex-col">
             <h3 className="text-blue-400 text-[10px] font-bold uppercase mb-2 flex items-center gap-2 tracking-widest pl-1"><Bot size={14} /> AI Command Uplink</h3>
             <div className="bg-slate-950/80 p-3 rounded border border-blue-500/20 text-xs lg:text-sm text-blue-200 font-mono mb-3 break-words shadow-inner flex-1">
                 <span className="text-blue-500 mr-2 animate-pulse">_</span>{advisorMessage}
             </div>
             <button onClick={handleConsultAI} disabled={isAdvisorLoading} className="w-full py-2.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-blue-300 rounded text-xs font-bold transition font-mono uppercase tracking-widest">
                 {isAdvisorLoading ? "ESTABLISHING UPLINK..." : "REQUEST TACTICAL DATA"}
             </button>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;