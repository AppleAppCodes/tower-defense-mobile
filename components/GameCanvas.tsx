import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PATH_WAYPOINTS, TOWER_TYPES, ENEMY_STATS, GRID_SIZE, INITIAL_STATE } from '../constants';
import { getTacticalAdvice } from '../services/geminiService';
import { Zap, Heart, Coins, Shield, Bot, Play, RefreshCw, Info, Rocket } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (wave: number) => void;
}

// Helper for path collision
const isPointOnPath = (x: number, y: number, width: number) => {
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const p1 = PATH_WAYPOINTS[i];
      const p2 = PATH_WAYPOINTS[i+1];
      
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
  
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [advisorMessage, setAdvisorMessage] = useState<string>("Welcome Commander. Build turrets to defend the path.");
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [spawnQueue, setSpawnQueue] = useState<{ type: EnemyType; delay: number }[]>([]);
  const [userName, setUserName] = useState<string>("");

  const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
  
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'error' | 'success') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'error' || type === 'success') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
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
    const count = 5 + Math.floor(waveNum * 1.5);
    const newQueue: { type: EnemyType; delay: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      let type = EnemyType.NORMAL;
      if (waveNum > 2 && i % 3 === 0) type = EnemyType.FAST;
      if (waveNum > 4 && i % 5 === 0) type = EnemyType.TANK;
      if (waveNum > 9 && i === count - 1) type = EnemyType.BOSS;
      
      newQueue.push({ type, delay: i * 60 });
    }
    setSpawnQueue(newQueue);
  }, []);

  const handleStartWave = useCallback(() => {
    if (!gameStateRef.current.isPlaying) {
        gameStateRef.current.isPlaying = true;
        startWave(gameStateRef.current.wave);
        triggerHaptic('medium');
        setUiState(prev => ({ ...prev, isPlaying: true }));
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
      } else if (!uiState.isPlaying) {
        mainBtn.setText(`START WAVE ${uiState.wave}`);
        mainBtn.color = "#22c55e";
        mainBtn.show();
      } else {
        mainBtn.hide();
      }
    };

    updateMainButton();

    const onMainBtnClick = () => {
      if (uiState.isGameOver) {
        resetGame();
      } else {
        handleStartWave();
      }
    };

    mainBtn.onClick(onMainBtnClick);
    return () => {
      mainBtn.offClick(onMainBtnClick);
      mainBtn.hide();
    };
  }, [uiState.isPlaying, uiState.isGameOver, uiState.wave, handleStartWave]);

  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.isPlaying || state.isGameOver) return;

    state.gameTime++;

    if (spawnQueue.length > 0) {
      if (spawnQueue[0].delay <= 0) {
        const nextEnemy = spawnQueue.shift();
        if (nextEnemy) {
          const stats = ENEMY_STATS[nextEnemy.type];
          enemiesRef.current.push({
            id: Math.random().toString(36),
            position: { ...PATH_WAYPOINTS[0] },
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
       state.money += 50;
       triggerHaptic('success');
       setUiState(prev => ({ ...prev, isPlaying: false, wave: state.wave, money: state.money }));
    }

    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      const target = PATH_WAYPOINTS[enemy.pathIndex + 1];
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
      if (tower.lastShotFrame + tower.cooldown <= state.gameTime) {
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

    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      const target = enemiesRef.current.find(e => e.id === p.targetId);
      if (!target) {
        projectilesRef.current.splice(i, 1);
        continue;
      }
      const dist = distance(p.position, target.position);
      if (dist <= p.speed) {
        if (p.type === 'AOE' && p.blastRadius) {
           spawnParticle(p.position, '#f59e0b', 10);
           enemiesRef.current.forEach(e => {
             if (distance(e.position, p.position) <= p.blastRadius!) e.hp -= p.damage;
           });
        } else {
           target.hp -= p.damage;
           if (target.type === EnemyType.FAST) target.frozen = 30; 
           spawnParticle(p.position, p.color, 3);
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
        spawnParticle(enemiesRef.current[i].position, '#ffffff', 8);
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

    if (state.gameTime % 5 === 0) {
      setUiState({ ...state });
    }
  }, [spawnQueue, onGameOver]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#3b82f6';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
    ctx.stroke();
    ctx.restore();

    towersRef.current.forEach(tower => {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = TOWER_TYPES[tower.type].color;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(tower.position.x, tower.position.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = TOWER_TYPES[tower.type].color;
      ctx.fillRect(tower.position.x - 10, tower.position.y - 10, 20, 20);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(tower.position.x, tower.position.y, 6, 0, Math.PI * 2); ctx.fill();
    });

    enemiesRef.current.forEach(enemy => {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = enemy.color;
      ctx.fillStyle = enemy.color;
      ctx.beginPath(); ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(enemy.position.x - 12, enemy.position.y - 24, 24, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(enemy.position.x - 12, enemy.position.y - 24, 24 * hpPct, 4);
    });

    projectilesRef.current.forEach(p => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2); ctx.fill();
    });

    if (mousePosRef.current && selectedTower) {
        const { x, y } = mousePosRef.current;
        const gx = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTower];
        const isValid = gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 25);
        ctx.beginPath();
        ctx.fillStyle = isValid ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        ctx.arc(gx, gy, config.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isValid ? config.color : '#ef4444';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(gx - 10, gy - 10, 20, 20);
        ctx.globalAlpha = 1.0;
    }
  }, [selectedTower]);

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTower || gameStateRef.current.isGameOver) return;
    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pos) return;
    const gx = Math.floor(pos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gy = Math.floor(pos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const config = TOWER_TYPES[selectedTower];
    if (gameStateRef.current.money >= config.cost && !isPointOnPath(gx, gy, 25) && !towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20)) {
      gameStateRef.current.money -= config.cost;
      towersRef.current.push({
        id: Math.random().toString(), position: { x: gx, y: gy }, type: config.type,
        range: config.range, damage: config.damage, cooldown: config.cooldown, lastShotFrame: 0
      });
      triggerHaptic('light');
      setUiState({ ...gameStateRef.current });
      setSelectedTower(null); 
    } else {
      triggerHaptic('error');
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
      gameStateRef.current = { ...INITIAL_STATE, isPlaying: false, isGameOver: false, gameTime: 0 };
      towersRef.current = []; enemiesRef.current = []; projectilesRef.current = []; particlesRef.current = [];
      setSpawnQueue([]);
      setUiState({...gameStateRef.current});
      setAdvisorMessage("Systems reset. Awaiting command.");
      triggerHaptic('medium');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 lg:p-4 w-full max-w-[100vw] mx-auto h-full overflow-hidden box-border">
      <div className="relative group flex-shrink-0 mx-auto w-full lg:w-auto flex justify-center items-center overflow-hidden">
        <canvas 
          ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onMouseMove={(e) => mousePosRef.current = getCanvasCoordinates(e.clientX, e.clientY)}
          onMouseLeave={() => mousePosRef.current = null}
          style={{ width: '100%', height: 'auto', maxHeight: '55vh', objectFit: 'contain' }}
          className="block bg-slate-950 rounded-xl shadow-2xl border border-slate-800 cursor-crosshair"
        />
        
        {!uiState.isPlaying && !uiState.isGameOver && uiState.wave === 1 && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-[2px]">
                <div className="bg-slate-900/90 p-6 rounded-2xl border border-blue-500/50 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)] max-w-[90%]">
                    <Rocket size={40} className="text-blue-400 mx-auto mb-3 animate-bounce" />
                    <h2 className="text-xl font-display text-white mb-2">READY?</h2>
                    <button 
                      onClick={handleStartWave}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold transition-all transform hover:scale-105 flex items-center gap-2 mx-auto text-sm"
                    >
                        <Play size={18} /> START
                    </button>
                </div>
            </div>
        )}

        {uiState.isGameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-xl z-20">
                <h2 className="text-3xl lg:text-5xl font-display text-red-500 mb-4 animate-pulse">GAME OVER</h2>
                <p className="text-slate-300 text-lg lg:text-xl mb-6">You survived {uiState.wave} waves</p>
                <button onClick={resetGame} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition flex items-center gap-2">
                    <RefreshCw size={20} /> Restart Mission
                </button>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 lg:gap-4 overflow-y-auto pb-24 lg:pb-0 w-full min-w-0">
        <div className="bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-700 flex flex-col gap-2 lg:gap-4 w-full">
            <div className="flex justify-between items-center w-full">
                <div className="flex flex-col">
                  <h1 className="font-display text-lg lg:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 whitespace-nowrap">
                    NEON DEFENSE <span className="text-[10px] text-slate-500 ml-1 font-mono">v1.3</span>
                  </h1>
                  {userName && <span className="text-xs text-blue-400 font-mono truncate max-w-[200px]">Cmdr. {userName}</span>}
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
                <div className="bg-slate-900 p-2 rounded-lg flex items-center gap-2 justify-center">
                    <Heart className="text-red-500 w-4 h-4 shrink-0" />
                    <div className="text-sm font-bold">{uiState.lives}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg flex items-center gap-2 justify-center">
                    <Coins className="text-yellow-400 w-4 h-4 shrink-0" />
                    <div className="text-sm font-bold">{uiState.money}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg flex items-center gap-2 justify-center">
                    <Shield className="text-emerald-400 w-4 h-4 shrink-0" />
                    <div className="text-sm font-bold">{uiState.wave}</div>
                </div>
                <button 
                  onClick={handleStartWave}
                  disabled={uiState.isPlaying} 
                  className={`p-2 rounded-lg flex items-center justify-center gap-2 font-bold transition
                    ${uiState.isPlaying ? 'bg-slate-700 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'}`}
                >
                    <Play size={18} />
                </button>
            </div>
        </div>

        <div className="bg-slate-800 p-2 lg:p-4 rounded-xl border border-slate-700 w-full min-w-0">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Arsenal</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 w-full min-w-0 scrollbar-hide">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button
                        key={tower.type}
                        onClick={() => { setSelectedTower(selectedTower === tower.type ? null : tower.type); triggerHaptic('light'); }}
                        className={`min-w-[100px] p-2 rounded-lg border flex flex-col items-center gap-1 transition shrink-0
                            ${selectedTower === tower.type ? 'border-blue-500 bg-slate-700' : 'border-slate-700 bg-slate-900'}`}
                    >
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: tower.color }} />
                        <div className="text-xs font-bold text-center w-full truncate">
                            {tower.name}
                        </div>
                        <div className="text-xs text-yellow-400">${tower.cost}</div>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-700 flex-1 min-h-[100px] w-full">
             <h3 className="text-purple-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Bot size={14} /> AI Advisor</h3>
             <div className="bg-slate-900/50 p-2 rounded-lg text-xs lg:text-sm text-slate-300 italic mb-2 break-words">"{advisorMessage}"</div>
             <button onClick={handleConsultAI} disabled={isAdvisorLoading} className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded text-xs font-bold transition">
                 {isAdvisorLoading ? "Analyzing..." : "Request Analysis"}
             </button>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;