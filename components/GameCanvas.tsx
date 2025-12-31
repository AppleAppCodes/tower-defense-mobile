import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PATH_WAYPOINTS, TOWER_TYPES, ENEMY_STATS, GRID_SIZE, INITIAL_STATE } from '../constants';
import { getTacticalAdvice } from '../services/geminiService';
import { Zap, Heart, Coins, Shield, Bot, Play, RefreshCw, Info } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (wave: number) => void;
}

// Helper for path collision - defined outside component to be reused easily
const isPointOnPath = (x: number, y: number, width: number) => {
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const p1 = PATH_WAYPOINTS[i];
      const p2 = PATH_WAYPOINTS[i+1];
      
      // Dist point to line segment
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

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  
  // Mutable Game State (Refs for performance)
  const gameStateRef = useRef<GameState>({
    money: 120,
    lives: 20,
    wave: 1,
    isPlaying: false,
    isGameOver: false,
    gameTime: 0,
  });
  
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // React State for UI updates (updated less frequently)
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [advisorMessage, setAdvisorMessage] = useState<string>("Welcome Commander. Systems online.");
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [spawnQueue, setSpawnQueue] = useState<{ type: EnemyType; delay: number }[]>([]);

  // Helpers
  const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
  
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

  const startWave = (waveNum: number) => {
    // Simple difficulty scaling
    const count = 5 + Math.floor(waveNum * 1.5);
    const newQueue: { type: EnemyType; delay: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      let type = EnemyType.NORMAL;
      if (waveNum > 2 && i % 3 === 0) type = EnemyType.FAST;
      if (waveNum > 4 && i % 5 === 0) type = EnemyType.TANK;
      if (waveNum > 9 && i === count - 1) type = EnemyType.BOSS;
      
      newQueue.push({ type, delay: i * 60 }); // 60 frames = 1 sec gap approx
    }
    setSpawnQueue(newQueue);
  };

  // Game Loop
  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.isPlaying || state.isGameOver) return;

    state.gameTime++;

    // Spawning
    if (spawnQueue.length > 0) {
      // Check if it's time to spawn the next enemy based on global time or relative delay
      // Simplified: Just decrement delay of first item
      if (spawnQueue[0].delay <= 0) {
        const nextEnemy = spawnQueue.shift();
        if (nextEnemy) {
          const stats = ENEMY_STATS[nextEnemy.type];
          enemiesRef.current.push({
            id: Math.random().toString(36),
            position: { ...PATH_WAYPOINTS[0] },
            type: nextEnemy.type,
            hp: stats.maxHp + (state.wave * stats.maxHp * 0.2), // HP Scaling
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
       // Wave cleared
       state.wave++;
       state.money += 50; // Wave clear bonus
       startWave(state.wave);
       // Auto-save advice? Optional.
    }

    // Update Enemies
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      
      // Move towards next waypoint
      const target = PATH_WAYPOINTS[enemy.pathIndex + 1];
      if (!target) {
        // Reached end
        state.lives--;
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
        enemy.distanceTraveled += dist;
      } else {
        const dx = target.x - enemy.position.x;
        const dy = target.y - enemy.position.y;
        const angle = Math.atan2(dy, dx);
        enemy.position.x += Math.cos(angle) * moveSpeed;
        enemy.position.y += Math.sin(angle) * moveSpeed;
        enemy.distanceTraveled += moveSpeed;
      }
    }

    // Update Towers
    towersRef.current.forEach(tower => {
      if (tower.lastShotFrame + tower.cooldown <= state.gameTime) {
        // Find target
        let target: Enemy | null = null;
        let maxDist = -1;

        // Simple targeting: Furthest along path within range
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
          tower.lastShotFrame = state.gameTime;
          projectilesRef.current.push({
            id: Math.random().toString(),
            position: { ...tower.position },
            targetId: target.id,
            damage: tower.damage,
            speed: 10,
            color: TOWER_TYPES[tower.type].color,
            radius: 4,
            hasHit: false,
            type: tower.type === TowerType.AOE ? 'AOE' : 'SINGLE',
            blastRadius: tower.type === TowerType.AOE ? 60 : 0
          });
        }
      }
    });

    // Update Projectiles
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      const target = enemiesRef.current.find(e => e.id === p.targetId);

      if (!target) {
        // Target dead/gone, remove projectile
        projectilesRef.current.splice(i, 1);
        continue;
      }

      const dist = distance(p.position, target.position);
      if (dist <= p.speed) {
        // Hit
        if (p.type === 'AOE' && p.blastRadius) {
           // Area Damage
           spawnParticle(p.position, '#f59e0b', 10);
           enemiesRef.current.forEach(e => {
             if (distance(e.position, p.position) <= p.blastRadius!) {
               e.hp -= p.damage;
             }
           });
        } else {
           // Single Target
           target.hp -= p.damage;
           if (target.type === EnemyType.FAST) target.frozen = 30; // Ice/Slow effect logic could go here, added to sniper for now
           spawnParticle(p.position, p.color, 3);
        }
        
        projectilesRef.current.splice(i, 1);
      } else {
        // Move
        const dx = target.position.x - p.position.x;
        const dy = target.position.y - p.position.y;
        const angle = Math.atan2(dy, dx);
        p.position.x += Math.cos(angle) * p.speed;
        p.position.y += Math.sin(angle) * p.speed;
      }
    }

    // Clean up dead enemies
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      if (enemiesRef.current[i].hp <= 0) {
        state.money += enemiesRef.current[i].moneyReward;
        spawnParticle(enemiesRef.current[i].position, '#ffffff', 8);
        enemiesRef.current.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= 0.05;
      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
      }
    }

    // Sync UI (throttle this in a real large app, but fine for simple TD)
    if (state.gameTime % 5 === 0) {
      setUiState({ ...state });
    }

  }, [spawnQueue, onGameOver]);

  // Render Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid (Subtle)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw Path
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
    }
    ctx.stroke();

    // Draw Path Highlight (Center)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Towers
    towersRef.current.forEach(tower => {
      // Base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(tower.position.x, tower.position.y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Turret
      ctx.fillStyle = TOWER_TYPES[tower.type].color;
      ctx.beginPath();
      ctx.rect(tower.position.x - 10, tower.position.y - 10, 20, 20);
      ctx.fill();
      
      // Top Detail
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(tower.position.x, tower.position.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // HP Bar
      const hpPct = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'red';
      ctx.fillRect(enemy.position.x - 10, enemy.position.y - 20, 20, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(enemy.position.x - 10, enemy.position.y - 20, 20 * hpPct, 4);
    });

    // Draw Projectiles
    projectilesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Interaction: Hover & Placement Overlays
    if (mousePosRef.current) {
        const { x, y } = mousePosRef.current;
        
        if (selectedTower) {
             // PLACEMENT MODE
             const gx = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
             const gy = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
             const config = TOWER_TYPES[selectedTower];
             
             // Check validation
             const canAfford = gameStateRef.current.money >= config.cost;
             const onPath = isPointOnPath(gx, gy, 25);
             const overlapping = towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20);
             
             const isValid = canAfford && !onPath && !overlapping;

             // Draw Range
             ctx.beginPath();
             ctx.fillStyle = isValid ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 50, 50, 0.1)';
             ctx.strokeStyle = isValid ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 50, 50, 0.5)';
             ctx.lineWidth = 1;
             ctx.setLineDash([4, 4]);
             ctx.arc(gx, gy, config.range, 0, Math.PI * 2);
             ctx.fill();
             ctx.stroke();
             ctx.setLineDash([]);

             // Draw Ghost Tower
             ctx.globalAlpha = 0.6;
             ctx.fillStyle = isValid ? config.color : '#ef4444'; // Red if invalid
             ctx.beginPath();
             ctx.rect(gx - 10, gy - 10, 20, 20);
             ctx.fill();
             
             // Cross indicator if invalid
             if (!isValid) {
                 ctx.strokeStyle = '#7f1d1d';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(gx - 8, gy - 8);
                 ctx.lineTo(gx + 8, gy + 8);
                 ctx.moveTo(gx + 8, gy - 8);
                 ctx.lineTo(gx - 8, gy + 8);
                 ctx.stroke();
             }
             
             ctx.globalAlpha = 1.0;
        } else {
             // INSPECT MODE (Hover existing)
             // Check if mouse is near a tower
             const hoveredTower = towersRef.current.find(t => distance(t.position, {x, y}) < 20);
             if (hoveredTower) {
                 ctx.beginPath();
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                 ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                 ctx.lineWidth = 1;
                 ctx.arc(hoveredTower.position.x, hoveredTower.position.y, hoveredTower.range, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.stroke();
             }
        }
    }

  }, [selectedTower]);

  // Loop Controller
  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, draw]);

  // Coordinate Mapping Helper (Responsive Canvas)
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  // Mouse Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    mousePosRef.current = null;
  };

  // Touch Handlers for Mobile
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length > 0) {
          const touch = e.touches[0];
          mousePosRef.current = getCanvasCoordinates(touch.clientX, touch.clientY);
      }
  };

  const handleTouchEnd = () => {
      // Don't clear immediately to allow the 'click' (tap) event to fire with the last position if needed,
      // but usually we want to clear the ghost.
      // For now, let's delay clearing or just keep it until click handles it.
      setTimeout(() => { mousePosRef.current = null; }, 100);
  };

  // Click Handler (Building) - Works for both Mouse and Tap
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTower || gameStateRef.current.isGameOver) return;
    
    // Recalculate or use current ref
    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pos) return;
    const { x, y } = pos;
    
    // Snap to grid
    const gx = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gy = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    // Validation
    const config = TOWER_TYPES[selectedTower];
    const canAfford = gameStateRef.current.money >= config.cost;
    const onPath = isPointOnPath(gx, gy, 25);
    const existing = towersRef.current.find(t => distance(t.position, { x: gx, y: gy }) < 20);
    
    if (canAfford && !onPath && !existing) {
      // Build
      gameStateRef.current.money -= config.cost;
      towersRef.current.push({
        id: Math.random().toString(),
        position: { x: gx, y: gy },
        type: config.type,
        range: config.range,
        damage: config.damage,
        cooldown: config.cooldown,
        lastShotFrame: 0
      });
      setUiState({ ...gameStateRef.current });
      setSelectedTower(null); // Deselect after build
    }
  };

  // Initial Setup
  useEffect(() => {
    // Auto-start wave 1 logic could go here or await user interaction
    // startWave(1);
    // gameStateRef.current.isPlaying = true;
  }, []);

  const handleStartWave = () => {
    if (!gameStateRef.current.isPlaying) {
        gameStateRef.current.isPlaying = true;
        startWave(gameStateRef.current.wave);
    } else {
        // Force next wave logic if needed, or just pause toggle
        // gameStateRef.current.isPlaying = !gameStateRef.current.isPlaying;
    }
  };

  const handleConsultAI = async () => {
    setIsAdvisorLoading(true);
    const advice = await getTacticalAdvice(gameStateRef.current, towersRef.current);
    setAdvisorMessage(advice);
    setIsAdvisorLoading(false);
  };
  
  const resetGame = () => {
      gameStateRef.current = { ...INITIAL_STATE, isPlaying: false, isGameOver: false, gameTime: 0 };
      towersRef.current = [];
      enemiesRef.current = [];
      projectilesRef.current = [];
      particlesRef.current = [];
      setSpawnQueue([]);
      setUiState({...INITIAL_STATE, isPlaying: false, isGameOver: false, gameTime: 0});
      setAdvisorMessage("Systems reset. Awaiting command.");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 lg:p-4 max-w-7xl mx-auto h-full overflow-hidden">
      
      {/* Game Area */}
      <div className="relative group flex-shrink-0 mx-auto w-full lg:w-auto flex justify-center items-center">
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchMove} // Update position immediately on touch
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }} // Prevents scrolling while playing
          className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 cursor-crosshair max-w-full max-h-[60vh] lg:max-h-full object-contain"
        />
        
        {/* Overlay for Game Over */}
        {uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-xl z-20">
                <h2 className="text-3xl lg:text-5xl font-display text-red-500 mb-4 animate-pulse">GAME OVER</h2>
                <p className="text-slate-300 text-lg lg:text-xl mb-6">You survived {uiState.wave} waves</p>
                <button 
                  onClick={resetGame}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition flex items-center gap-2"
                >
                    <RefreshCw size={20} /> Restart Mission
                </button>
            </div>
        )}
      </div>

      {/* Sidebar / HUD - Adjusted for Mobile */}
      <div className="flex-1 flex flex-col gap-2 lg:gap-4 overflow-y-auto pb-4 lg:pb-0">
        
        {/* Stats Panel */}
        <div className="bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-700 flex flex-col gap-2 lg:gap-4">
            <div className="flex justify-between items-center">
                <h1 className="font-display text-lg lg:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    NEON DEFENSE
                </h1>
                <div className="text-xs text-slate-500 font-mono hidden lg:block">v1.0-MOBILE</div>
            </div>
            
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-4">
                <div className="bg-slate-900 p-2 lg:p-3 rounded-lg flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
                    <Heart className="text-red-500 w-4 h-4 lg:w-6 lg:h-6" />
                    <div>
                        <div className="hidden lg:block text-xs text-slate-400">LIVES</div>
                        <div className="text-sm lg:text-xl font-bold">{uiState.lives}</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-2 lg:p-3 rounded-lg flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
                    <Coins className="text-yellow-400 w-4 h-4 lg:w-6 lg:h-6" />
                    <div>
                        <div className="hidden lg:block text-xs text-slate-400">CREDITS</div>
                        <div className="text-sm lg:text-xl font-bold">{uiState.money}</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-2 lg:p-3 rounded-lg flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
                    <Shield className="text-emerald-400 w-4 h-4 lg:w-6 lg:h-6" />
                    <div>
                        <div className="hidden lg:block text-xs text-slate-400">WAVE</div>
                        <div className="text-sm lg:text-xl font-bold">{uiState.wave}</div>
                    </div>
                </div>
                <button 
                  onClick={handleStartWave}
                  disabled={uiState.isPlaying && enemiesRef.current.length > 0} 
                  className={`p-2 lg:p-3 rounded-lg flex items-center justify-center gap-2 font-bold transition text-xs lg:text-base
                    ${uiState.isPlaying && enemiesRef.current.length > 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'}`}
                >
                    {uiState.isPlaying && enemiesRef.current.length > 0 ? (
                         <div className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></div>
                    ) : (
                        <Play size={18} />
                    )}
                </button>
            </div>
        </div>

        {/* Build Menu - Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="bg-slate-800 p-2 lg:p-4 rounded-xl border border-slate-700 flex-shrink-0">
            <h3 className="text-slate-400 text-xs lg:text-sm font-bold uppercase mb-2">Arsenal</h3>
            <div className="flex overflow-x-auto lg:grid lg:grid-cols-1 gap-2 pb-2 lg:pb-0 snap-x">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button
                        key={tower.type}
                        onClick={() => setSelectedTower(selectedTower === tower.type ? null : tower.type)} // Toggle selection
                        className={`min-w-[140px] lg:min-w-0 p-2 lg:p-3 rounded-lg border flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 transition hover:bg-slate-700/50 snap-center
                            ${selectedTower === tower.type 
                                ? 'border-blue-500 bg-slate-700' 
                                : 'border-slate-700 bg-slate-900'}`}
                    >
                        <div 
                            className="w-8 h-8 lg:w-10 lg:h-10 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: tower.color }}
                        >
                            <Zap size={16} className="text-white mix-blend-overlay" />
                        </div>
                        <div className="text-center lg:text-left w-full">
                            <div className="font-bold text-xs lg:text-sm flex flex-col lg:flex-row lg:justify-between whitespace-nowrap">
                                {tower.name}
                                <span className={gameStateRef.current.money >= tower.cost ? 'text-yellow-400' : 'text-red-400'}>
                                    ${tower.cost}
                                </span>
                            </div>
                            <div className="text-[10px] lg:text-xs text-slate-400 truncate hidden lg:block">{tower.description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* AI Advisor Panel - Compact on Mobile */}
        <div className="bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-700 relative overflow-hidden flex-1 lg:flex-none">
             <div className="absolute top-0 right-0 p-4 opacity-10 hidden lg:block">
                 <Bot size={64} />
             </div>
             <h3 className="text-purple-400 text-xs lg:text-sm font-bold uppercase mb-2 flex items-center gap-2">
                 <Bot size={14} className="lg:w-4 lg:h-4" /> AI Tactical
             </h3>
             <div className="bg-slate-900/50 p-2 lg:p-3 rounded-lg text-xs lg:text-sm text-slate-300 min-h-[60px] lg:min-h-[80px] mb-2 lg:mb-3 overflow-y-auto max-h-24 lg:max-h-none">
                 {isAdvisorLoading ? (
                     <div className="flex items-center gap-2 animate-pulse">
                         <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                         Analyzing...
                     </div>
                 ) : (
                     <p className="italic">"{advisorMessage}"</p>
                 )}
             </div>
             <button 
                onClick={handleConsultAI}
                disabled={isAdvisorLoading}
                className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded text-xs lg:text-sm font-bold transition flex items-center justify-center gap-2"
             >
                 Request Analysis
             </button>
        </div>

      </div>
    </div>
  );
};

export default GameCanvas;