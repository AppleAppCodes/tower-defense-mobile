
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle, MapDefinition, FloatingText, PerkDrop, ActivePerk, PerkType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, PERK_STATS, GRID_SIZE, INITIAL_STATE, AUTO_START_DELAY, THEMES, ERA_DATA } from '../constants';
import { audioService } from '../services/audioService';
import { Heart, Coins, Shield, Play, RefreshCw, Timer, ChevronRight, ChevronLeft, Zap, Trash2, FastForward, AlertTriangle, Star, Palette, X, Check, ArrowUpCircle } from 'lucide-react';

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

// UI COMPONENT FOR TOWER ICONS (React side) - NOW MATCHES IN-GAME GRAPHICS 1:1
const TowerIcon = ({ type, era }: { type: TowerType; era: number }) => {
  
  // Helper to render the specific SVG shapes that match the canvas drawing logic
  const RenderTower = () => {
    // STONE AGE
    if (era === 0) {
        const woodDark = '#451a03';
        const woodLight = '#78350f';
        const skin = '#fcd34d';
        
        switch(type) {
            case TowerType.BASIC: // Slinger
                return (
                    <g>
                        {/* Base */}
                        <circle cx="20" cy="20" r="14" fill="#57534e" stroke={woodDark} strokeWidth="2" />
                        <rect x="12" y="12" width="16" height="16" fill={woodLight} rx="4" />
                        {/* Unit */}
                        <circle cx="20" cy="20" r="6" fill={skin} stroke="#000" strokeWidth="1" />
                        {/* Sling */}
                        <path d="M24 20 L28 16" stroke={woodDark} strokeWidth="3" />
                    </g>
                );
            case TowerType.RAPID: // Thrower
                return (
                    <g>
                        <circle cx="20" cy="20" r="14" fill="#57534e" />
                        <circle cx="16" cy="16" r="4" fill="#a8a29e" />
                        <circle cx="24" cy="16" r="4" fill="#a8a29e" />
                        <circle cx="20" cy="24" r="4" fill="#a8a29e" />
                        <circle cx="20" cy="20" r="6" fill={skin} stroke="#000" strokeWidth="1" />
                    </g>
                );
            case TowerType.SNIPER: // Watchtower
                return (
                    <g>
                        <rect x="10" y="10" width="20" height="20" fill={woodDark} />
                        <rect x="14" y="14" width="12" height="12" fill="#a8a29e" />
                        <line x1="20" y1="20" x2="32" y2="20" stroke="#000" strokeWidth="2" /> {/* Spear */}
                    </g>
                );
            case TowerType.AOE: // Rock Trap
                return (
                    <g>
                        <rect x="8" y="8" width="24" height="24" fill="#292524" rx="2" />
                        <circle cx="14" cy="14" r="5" fill="#78716c" />
                        <circle cx="26" cy="14" r="5" fill="#78716c" />
                        <circle cx="14" cy="26" r="5" fill="#78716c" />
                        <circle cx="26" cy="26" r="5" fill="#78716c" />
                    </g>
                );
            default: return <circle cx="20" cy="20" r="12" fill={woodLight} />;
        }
    }
    // CASTLE AGE
    else if (era === 1) {
        const stone = '#475569';
        const stoneDark = '#1e293b';
        const blue = '#1d4ed8';
        
        switch(type) {
            case TowerType.BASIC: // Archer Tower
                return (
                    <g>
                        <rect x="10" y="10" width="20" height="20" fill={stone} stroke={stoneDark} strokeWidth="2" />
                        <circle cx="20" cy="20" r="7" fill={blue} stroke="#fff" strokeWidth="1" />
                        <path d="M24 20 Q 28 20, 24 24" stroke="#fff" strokeWidth="2" fill="none" />
                    </g>
                );
            case TowerType.RAPID: // Crossbow
                return (
                    <g>
                        <circle cx="20" cy="20" r="14" fill={stoneDark} />
                        <path d="M12 20 L28 20 M16 16 L16 24" stroke="#94a3b8" strokeWidth="3" />
                        <path d="M16 14 Q 28 20 16 26" stroke="#78350f" strokeWidth="2" fill="none" />
                    </g>
                );
            case TowerType.SNIPER: // Ballista
                return (
                    <g>
                        <rect x="12" y="8" width="16" height="24" fill="#78350f" rx="2" />
                        <path d="M10 12 L30 12" stroke="#cbd5e1" strokeWidth="3" />
                        <line x1="20" y1="12" x2="20" y2="30" stroke="#000" strokeWidth="1" />
                    </g>
                );
            case TowerType.AOE: // Catapult
                return (
                    <g>
                        <rect x="10" y="12" width="20" height="16" fill="#57534e" />
                        <rect x="18" y="10" width="4" height="20" fill="#78350f" />
                        <circle cx="20" cy="26" r="5" fill="#000" />
                    </g>
                );
            default: return <rect x="12" y="12" width="16" height="16" fill={stone} />;
        }
    }
    // IMPERIAL AGE
    else {
        const metal = '#374151';
        const darkMetal = '#111827';
        const camo = '#3f6212';
        
        switch(type) {
            case TowerType.BASIC: // Sentry
                return (
                    <g>
                        <rect x="8" y="8" width="24" height="24" fill={darkMetal} rx="4" />
                        <circle cx="20" cy="20" r="8" fill={metal} stroke="#000" strokeWidth="1" />
                        <rect x="20" y="18" width="12" height="4" fill="#000" />
                    </g>
                );
            case TowerType.RAPID: // Gatling
                return (
                    <g>
                        <circle cx="20" cy="20" r="14" fill={darkMetal} />
                        <rect x="20" y="16" width="10" height="2" fill="#fbbf24" />
                        <rect x="20" y="19" width="10" height="2" fill="#fbbf24" />
                        <rect x="20" y="22" width="10" height="2" fill="#fbbf24" />
                    </g>
                );
            case TowerType.SNIPER: // Sniper Nest
                return (
                    <g>
                        <circle cx="20" cy="20" r="14" fill={camo} stroke="#000" strokeWidth="1" />
                        <line x1="20" y1="20" x2="36" y2="20" stroke="#000" strokeWidth="3" />
                    </g>
                );
            case TowerType.AOE: // Mortar
                return (
                    <g>
                        <circle cx="20" cy="20" r="14" fill="#166534" />
                        <circle cx="20" cy="20" r="6" fill="#000" stroke="#4ade80" strokeWidth="1" />
                    </g>
                );
            default: return <rect x="10" y="10" width="20" height="20" fill={metal} />;
        }
    }
  }

  return (
    <div className="w-full h-full p-1 drop-shadow-md">
        <svg viewBox="0 0 40 40" fill="none" className="w-full h-full filter drop-shadow-sm">
            <RenderTower />
        </svg>
    </div>
  );
};

const MapPreviewSVG = ({ map, activeThemeId }: { map: MapDefinition, activeThemeId: string }) => {
    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
    const scaleX = 60 / CANVAS_WIDTH;
    const scaleY = 100 / CANVAS_HEIGHT;
    let pathData = `M ${map.waypoints[0].x * scaleX} ${map.waypoints[0].y * scaleY}`;
    for (let i = 1; i < map.waypoints.length; i++) {
        pathData += ` L ${map.waypoints[i].x * scaleX} ${map.waypoints[i].y * scaleY}`;
    }
    return (
        <svg width="60" height="100" viewBox="0 0 60 100" style={{ backgroundColor: theme.background }} className="rounded border border-white/20 shadow-inner">
            <path d={pathData} stroke={theme.pathInner} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

// --- CANVAS DRAWING HELPERS ---

const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower, era: number, gameTime: number) => {
  // We need to isolate the rotation for just the turret part, but the base should be static.
  // The passed context is translated to (x,y) but NOT rotated yet.
  
  // 1. DRAW BASE (Static)
  if (era === 0) { // Stone Age Base
      ctx.fillStyle = '#57534e'; // Stone Gray
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#451a03'; // Wood Dark
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeStyle = '#292524'; ctx.lineWidth = 1; ctx.strokeRect(-12, -12, 24, 24);
  } else if (era === 1) { // Castle Age Base
      ctx.fillStyle = '#334155'; // Dark Slate
      ctx.fillRect(-14, -14, 28, 28);
      // Bricks pattern
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
  } else { // Imperial Age Base
      ctx.fillStyle = '#111827'; // Black/Dark Metal
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.stroke();
      // Hazard stripes hint
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-10, -18, 20, 2); ctx.fillRect(-10, 16, 20, 2);
  }

  // 2. RECOIL CALCULATION
  const timeSinceShot = gameTime - tower.lastShotFrame;
  let recoil = 0;
  if (timeSinceShot < 10) {
      recoil = (10 - timeSinceShot) * 0.5; // Kick back pixels
  }

  // 3. DRAW TURRET (Rotated)
  ctx.save();
  ctx.rotate(tower.rotation);
  ctx.translate(-recoil, 0); // Recoil moves opposite to facing (which is 0 rads in local space? No, facing is +X usually)
  // Actually, rotation rotates the axes. Facing is usually 0 radians (Right).
  // If tower.rotation points to enemy, then drawing rightwards implies shooting direction.
  // So recoil should be negative X.

  // --- ERA 0: STONE AGE ---
  if (era === 0) {
      if (tower.type === TowerType.BASIC) {
          // Slinger: A guy standing there
          ctx.fillStyle = '#fcd34d'; // Skin
          ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill(); // Head
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
          // Hands holding sling
          ctx.fillStyle = '#78350f'; 
          ctx.beginPath(); ctx.arc(8, 4, 3, 0, Math.PI*2); ctx.fill(); 
          ctx.beginPath(); ctx.arc(8, -4, 3, 0, Math.PI*2); ctx.fill();
      } else if (tower.type === TowerType.RAPID) {
          // Thrower: 3 guys? or pile of rocks
          ctx.fillStyle = '#a8a29e'; // Rocks
          ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(-5, 5, 4, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(5, 0, 4, 0, Math.PI*2); ctx.fill();
          // Guy
          ctx.fillStyle = '#fcd34d'; 
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      } else if (tower.type === TowerType.SNIPER) {
          // Spearman
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
          // Long Spear
          ctx.strokeStyle = '#451a03'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(24, 0); ctx.stroke();
          ctx.fillStyle = '#9ca3af'; // Tip
          ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(28, -1); ctx.lineTo(28, 1); ctx.fill();
      } else {
          // Default/AoE
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-8, -8, 16, 16);
      }
  } 
  // --- ERA 1: CASTLE AGE ---
  else if (era === 1) {
      if (tower.type === TowerType.BASIC) {
          // Archer
          ctx.fillStyle = '#1e3a8a'; // Blue hood
          ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth=1; ctx.stroke();
          // Bow
          ctx.strokeStyle = '#a16207'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(4, 0, 10, 0.7*Math.PI, 1.3*Math.PI); ctx.stroke();
      } else if (tower.type === TowerType.RAPID) {
          // Crossbow
          ctx.fillStyle = '#57534e'; // Wood stand
          ctx.fillRect(-6, -6, 12, 12);
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke(); // Bow part
          ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); // Stock
      } else if (tower.type === TowerType.AOE) {
          // Catapult
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-10, -8, 20, 16);
          ctx.fillStyle = '#000'; // Bucket
          ctx.beginPath(); ctx.arc(5, 0, 6, 0, Math.PI*2); ctx.fill();
      } else {
          // Magic/Other
          ctx.fillStyle = '#1e40af';
          ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(10, 0); ctx.lineTo(-5, 5); ctx.fill();
      }
  }
  // --- ERA 2: IMPERIAL AGE ---
  else {
      // Modern Turrets
      ctx.shadowBlur = 0;
      if (tower.type === TowerType.BASIC) {
          // Sentry
          ctx.fillStyle = '#4b5563'; // Gun Metal
          ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000'; // Barrel
          ctx.fillRect(8, -3, 14, 6);
      } else if (tower.type === TowerType.RAPID) {
          // Gatling
          ctx.fillStyle = '#374151';
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#fbbf24'; // Gold barrels
          ctx.fillRect(8, -6, 12, 3); ctx.fillRect(8, -1, 14, 3); ctx.fillRect(8, 4, 12, 3);
      } else if (tower.type === TowerType.AOE) {
          // Mortar
          ctx.fillStyle = '#15803d';
          ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      } else if (tower.type === TowerType.SNIPER) {
          // Sniper Camo
          ctx.fillStyle = '#3f6212';
          ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(12, 0); ctx.lineTo(-8, 8); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(24,0); ctx.stroke();
      } else {
          // Generic
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-5, -5, 10, 10);
      }
  }
  ctx.restore();

  // 4. LEVEL INDICATOR
  if (tower.level > 1) {
      ctx.fillStyle = era === 2 ? '#fbbf24' : '#fff';
      for(let i=0; i<tower.level; i++) {
          ctx.beginPath();
          ctx.arc(-8 + (i*8), -12, 2, 0, Math.PI*2);
          ctx.fill();
      }
  }
};

const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, era: number, gameTime: number) => {
    // NOTE: Context is already translated, rotated, and optionally FLIPPED (scaled).
    // Just draw the body. Shadows and HP bars are drawn in Screen Space in the main loop to avoid artifacts.
    
    // Animation bob
    const bob = Math.sin(gameTime * 0.5) * 2;

    // ENEMY BODY
    // ERA 0: STONE AGE
    if (era === 0) {
        if (enemy.type === EnemyType.TANK) {
            // MAMMOTH - Rounder body to prevent squashed look during rotation
            ctx.fillStyle = '#57534e'; // Fur
            ctx.beginPath(); ctx.ellipse(0, 0, 14, 13, 0, 0, Math.PI*2); ctx.fill(); // Almost circle body
            ctx.fillStyle = '#78350f'; // Head
            ctx.beginPath(); ctx.arc(10, 0, 7, 0, Math.PI*2); ctx.fill();
            // Tusks
            ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(12, 3); ctx.quadraticCurveTo(18, 6, 18, -2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(12, -3); ctx.quadraticCurveTo(18, -6, 18, 2); ctx.stroke();
        } else if (enemy.type === EnemyType.FAST) {
            // RAPTOR - Taller body to avoid thin line look
            ctx.fillStyle = '#65a30d'; 
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(-6, -8); ctx.fill(); // Taller tail/back
            ctx.beginPath(); ctx.arc(8, 0, 4, 0, Math.PI*2); ctx.fill(); // Head
            // Legs moving
            ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 6 + bob); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-4, 6 - bob); ctx.stroke();
        } else {
            // CAVE MAN
            ctx.fillStyle = '#fcd34d'; // Skin
            ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
            // Shoulders - Rounder
            ctx.fillStyle = '#78350f'; // Fur
            ctx.beginPath(); ctx.ellipse(-2, 0, 8, 7, 0, 0, Math.PI*2); ctx.fill();
            // Club
            ctx.strokeStyle = '#5c2b08'; ctx.lineWidth=3;
            ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(10 + bob, 8); ctx.stroke();
        }
    }
    // ERA 1: CASTLE AGE
    else if (era === 1) {
        if (enemy.type === EnemyType.TANK) {
            // BATTERING RAM
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-14, -10, 28, 20); // Taller
            ctx.fillStyle = '#92400e'; 
            ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
            // Ram head
            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(14, 0, 6, 0, Math.PI*2); ctx.fill();
        } else if (enemy.type === EnemyType.FAST) {
            // HORSE - Rounder
            ctx.fillStyle = '#713f12'; 
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI*2); ctx.fill(); 
        } else {
            // KNIGHT
            ctx.fillStyle = '#94a3b8'; // Armor
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
            // Shield
            ctx.fillStyle = '#1d4ed8'; 
            ctx.fillRect(-2, -7, 6, 14);
        }
    }
    // ERA 2: IMPERIAL AGE
    else {
        if (enemy.type === EnemyType.TANK) {
            // TANK
            ctx.fillStyle = '#166534'; // Green
            ctx.fillRect(-14, -12, 28, 24); // Fatter
            ctx.fillStyle = '#064e3b'; // Turret
            ctx.beginPath(); ctx.arc(-2, 0, 9, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; // Barrel
            ctx.fillRect(0, -2, 18, 4);
        } else if (enemy.type === EnemyType.FAST) {
            // BUGGY
            ctx.fillStyle = '#d97706';
            ctx.fillRect(-8, -8, 16, 16); // Square-ish
            ctx.fillStyle = '#000'; // Wheels
            ctx.fillRect(-6, -8, 4, 2); ctx.fillRect(4, -8, 4, 2);
            ctx.fillRect(-6, 6, 4, 2); ctx.fillRect(4, 6, 4, 2);
        } else {
            // SOLDIER
            ctx.fillStyle = '#3f6212';
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#111827'; // Helmet
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
            // Gun
            ctx.strokeStyle = '#000'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(10, 2); ctx.stroke();
        }
    }
};

const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile, era: number) => {
    ctx.save();
    ctx.translate(proj.position.x, proj.position.y);
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x);
    ctx.rotate(angle);

    if (era === 0) {
        // Rock / Spear
        if (proj.type === 'AOE') {
            ctx.fillStyle = '#57534e';
            ctx.beginPath(); 
            // Rough rock shape
            ctx.moveTo(-4, -2); ctx.lineTo(2, -4); ctx.lineTo(4, 2); ctx.lineTo(-2, 4); 
            ctx.fill();
        } else {
            // Stone
            ctx.fillStyle = '#a8a29e';
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        }
    } else if (era === 1) {
        // Arrow
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-6, -1, 12, 2); // Shaft
        ctx.fillStyle = '#cbd5e1'; 
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(9, 0); ctx.lineTo(6, 2); ctx.fill(); // Tip
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-9, 0); ctx.lineTo(-6, 2); ctx.fill(); // Feathers
    } else {
        // Bullet / Rocket
        if (proj.type === 'AOE') {
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-6, -2, 12, 4);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(10, 0); ctx.lineTo(6, 2); ctx.fill();
            // Flame trail
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(-6, 0, 2 + Math.random()*2, 0, Math.PI*2); ctx.fill();
        } else {
            // Tracer
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(-4, -1, 8, 2);
        }
    }
    ctx.restore();
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  
  const lastFrameTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(['default']);
  const [activeThemeId, setActiveThemeId] = useState<string>('default');
  
  // Scenery (Trees, Rocks) - Add more variety
  const sceneryRef = useRef<{x: number, y: number, r: number, type: 'tree' | 'rock' | 'bush' | 'grass'}[]>([]);

  const gameStateRef = useRef<GameState>({
    ...INITIAL_STATE,
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
  const [activePerks, setActivePerks] = useState<ActivePerk[]>([]);
  
  const [perkInventory, setPerkInventory] = useState<Record<PerkType, number>>({
      [PerkType.DAMAGE]: 0,
      [PerkType.SPEED]: 0,
      [PerkType.MONEY]: 0,
      [PerkType.FREEZE]: 0,
  });
  
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{title: string, subtitle?: string, color: string, type: 'info' | 'boss' | 'evolve'} | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  
  const spawnQueueRef = useRef<{ type: EnemyType; delay: number }[]>([]);
  
  const [userName, setUserName] = useState<string>("");
  const [currentMap, setCurrentMap] = useState<MapDefinition>(MAPS[0]);
  const [hasStartedGame, setHasStartedGame] = useState(false);

  const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
  
  // Initialize Scenery
  useEffect(() => {
    if (sceneryRef.current.length === 0) {
        for (let i = 0; i < 60; i++) {
            const r = Math.random();
            let type: 'tree' | 'rock' | 'bush' | 'grass' = 'grass';
            if (r > 0.9) type = 'rock';
            else if (r > 0.7) type = 'tree';
            else if (r > 0.5) type = 'bush';

            sceneryRef.current.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                r: Math.random() * 10 + 5,
                type: type
            });
        }
    }
  }, []);

  // Audio & Haptic Helper
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

  const spawnParticle = (pos: Vector2D, color: string, count: number = 5, type: 'circle' | 'ring' | 'debris' = 'circle') => {
    if (type === 'ring') {
         particlesRef.current.push({
            id: Math.random().toString(36),
            position: { ...pos },
            velocity: { x: 0, y: 0 },
            life: 1.0,
            maxLife: 1.0,
            color: color,
            size: 1, 
            type: 'ring'
        });
        return;
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1; 
      particlesRef.current.push({
        id: Math.random().toString(36),
        position: { ...pos },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 3 + 1,
        type: type
      });
    }
  };

  const handleEnemyDeath = (enemy: Enemy) => {
      const state = gameStateRef.current;
      
      // Grant EXP
      state.exp += enemy.expReward;
      if (state.exp > state.maxExp && state.era < 2) {
          state.exp = state.maxExp; // Cap it until evolution
      }

      // Drop Chance
      const chance = enemy.type === EnemyType.BOSS ? 1.0 : 0.05;
      if (Math.random() < chance) {
          const types = [PerkType.DAMAGE, PerkType.SPEED, PerkType.MONEY, PerkType.FREEZE];
          const randType = types[Math.floor(Math.random() * types.length)];
          
          perkDropsRef.current.push({
              id: Math.random().toString(),
              position: { ...enemy.position },
              type: randType,
              life: 300, 
              maxLife: 300
          });
          audioService.playBuild(); 
      }
  };

  const evolveEra = () => {
      const state = gameStateRef.current;
      if (state.era < 2 && state.exp >= state.maxExp) {
          state.era++;
          state.exp = 0;
          state.maxExp = ERA_DATA[state.era].maxExp;
          // Heal lives a bit
          state.lives += 5;
          
          triggerHaptic('success');
          audioService.playWaveStart(); // Fanfare
          setNotification({
              title: "AGE ADVANCED",
              subtitle: `WELCOME TO THE ${ERA_DATA[state.era].name}`,
              color: "text-yellow-400",
              type: 'evolve'
          });
          setTimeout(() => setNotification(null), 4000);
          
          setUiState({...state});
      }
  };

  const activatePerk = (type: PerkType) => {
    if (perkInventory[type] <= 0) return;

    setPerkInventory(prev => ({
        ...prev,
        [type]: Math.max(0, prev[type] - 1)
    }));

    if (type === PerkType.MONEY) {
        gameStateRef.current.money += 200; 
        spawnFloatingText({x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2}, "+$200", "#22c55e");
        audioService.playBuild(); 
    } else if (type === PerkType.FREEZE) {
        enemiesRef.current.forEach(e => e.frozen = 240); 
        for(let i=0; i<5; i++) {
            spawnParticle({
                x: Math.random() * CANVAS_WIDTH, 
                y: Math.random() * CANVAS_HEIGHT
            }, '#06b6d4', 5, 'ring');
        }
        audioService.playShoot('LASER', 2);
    } else {
        const duration = PERK_STATS[type].duration;
        const newPerk: ActivePerk = {
            type: type,
            endTime: gameStateRef.current.gameTime + duration,
            duration: duration
        };
        const filtered = activePerksRef.current.filter(p => p.type !== type);
        activePerksRef.current = [...filtered, newPerk];
        setActivePerks([...activePerksRef.current]);
        audioService.playAlarm(); 
    }
    triggerHaptic('success');
  };

  const startWave = useCallback((waveNum: number) => {
    const isBossWave = waveNum > 0 && waveNum % 5 === 0;
    
    if (isBossWave) {
         audioService.playAlarm();
         triggerHaptic('heavy');
         setNotification({
             title: "BOSS INCOMING",
             subtitle: "DEFEND THE VILLAGE",
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
      let interval = 30; 

      if (waveNum > 2 && i % 3 === 0) {
          type = EnemyType.FAST;
          interval = 15; 
      }
      if (waveNum > 4 && i % 6 === 0) {
          type = EnemyType.TANK;
          interval = 60; 
      }
      if (isBossWave && i === count - 1) {
          type = EnemyType.BOSS;
          interval = 120;
      }
      if (i === 0) interval = 0;
      newQueue.push({ type, delay: interval });
    }
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
      gameStateRef.current.autoStartTimer = 600;
      gameStateRef.current.isPlaying = false; 
      setUiState(prev => ({ ...prev, autoStartTimer: 600 }));
      triggerHaptic('medium');
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    setUserName(tg.initDataUnsafe?.user?.first_name || "Chief");
    const mainBtn = tg.MainButton;
    
    const updateMainButton = () => {
      if (uiState.isGameOver) {
        mainBtn.setText("TRY AGAIN");
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
        
        const now = state.gameTime;
        const previousLength = activePerksRef.current.length;
        activePerksRef.current = activePerksRef.current.filter(p => now < p.endTime);
        if (activePerksRef.current.length !== previousLength) {
             setActivePerks([...activePerksRef.current]);
        }

        // Perk Drops
        for (let i = perkDropsRef.current.length - 1; i >= 0; i--) {
            perkDropsRef.current[i].life--;
            if (perkDropsRef.current[i].life <= 0) {
                perkDropsRef.current.splice(i, 1);
            }
        }

        // Projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const target = enemiesRef.current.find(e => e.id === p.targetId);
          
          if (!target) {
            p.position.x += p.velocity.x;
            p.position.y += p.velocity.y;
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
               spawnParticle(p.position, '#ca8a04', 1, 'ring'); // Dirt ring
               spawnParticle(p.position, '#a8a29e', 8, 'debris'); // Rocks
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

        // Particles
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

        // Floating Text
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
           const ft = floatingTextsRef.current[i];
           ft.life -= 0.02;
           ft.position.x += ft.velocity.x;
           ft.position.y += ft.velocity.y;
           if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
        }

        // Auto Start Logic
        if (!state.isPlaying) {
             if (state.autoStartTimer > 0) {
                if ([180, 120, 60].includes(state.autoStartTimer)) audioService.playTick();
                state.autoStartTimer--;
                if (state.autoStartTimer === 0) handleStartWave();
                if (state.autoStartTimer % 60 === 0 && loop === 0) setUiState({ ...state });
             }
             continue; 
        }

        // Spawn
        const queue = spawnQueueRef.current;
        if (queue.length > 0) {
          if (queue[0].delay <= 0) {
            const nextEnemy = queue.shift();
            if (nextEnemy) {
              const stats = ENEMY_STATS[nextEnemy.type];
              // Era Difficulty Scaling + Wave Scaling
              const eraMult = 1 + (state.era * 0.5);
              const waveMult = 1 + (state.wave * 0.2);
              
              enemiesRef.current.push({
                id: Math.random().toString(36),
                position: { ...currentMap.waypoints[0] }, 
                type: nextEnemy.type,
                hp: stats.maxHp * eraMult * waveMult,
                maxHp: stats.maxHp * eraMult * waveMult,
                speed: stats.speed,
                pathIndex: 0,
                distanceTraveled: 0,
                frozen: 0,
                moneyReward: stats.reward,
                expReward: stats.expReward,
                color: stats.color,
                radius: stats.radius
              });
            }
          } else {
            queue[0].delay--;
          }
        } else if (enemiesRef.current.length === 0 && state.lives > 0) {
           // WAVE CLEAR
           state.isPlaying = false;
           state.wave++;
           state.money += 50 + (state.wave * 10);
           state.autoStartTimer = AUTO_START_DELAY; 
           triggerHaptic('success');
           setUiState(prev => ({ ...prev, isPlaying: false, wave: state.wave, money: state.money, autoStartTimer: state.autoStartTimer }));
           continue; 
        }

        // Enemies Move
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          const target = currentMap.waypoints[enemy.pathIndex + 1]; 
          if (!target) {
            state.lives--;
            triggerHaptic('error');
            audioService.playDamage(); // Enable damage sound
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

        // Towers Shoot
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

          const isRapid = activePerksRef.current.some(p => p.type === PerkType.SPEED);
          const activeCooldown = isRapid ? tower.cooldown / 2 : tower.cooldown;

          if (tower.lastShotFrame + activeCooldown <= state.gameTime) {
            if (target) {
              tower.lastShotFrame = state.gameTime;
              const isDoubleDmg = activePerksRef.current.some(p => p.type === PerkType.DAMAGE);
              const eraDmgMult = 1 + (state.era * 0.8);
              const activeDmg = (isDoubleDmg ? tower.damage * 2 : tower.damage) * eraDmgMult;

              let pType: 'SINGLE' | 'AOE' = 'SINGLE';
              let blast = 0;
              let effect: 'FREEZE' | 'SHOCK' | undefined = undefined;
              let speed = 12; 
              let color = '#000';
              let soundType: 'LASER' | 'HEAVY' | 'NORMAL' = 'NORMAL';

              if (tower.type === TowerType.AOE) { pType = 'AOE'; blast = 60 + (tower.level * 10); soundType = 'HEAVY'; speed = 8; }
              if (tower.type === TowerType.MISSILE) { pType = 'AOE'; blast = 80 + (tower.level * 15); speed = 6; soundType = 'HEAVY'; }
              if (tower.type === TowerType.LASER) { speed = 25; soundType = 'LASER'; }
              if (tower.type === TowerType.FROST) { effect = 'FREEZE'; soundType = 'LASER'; }
              if (tower.type === TowerType.SHOCK) { effect = 'SHOCK'; soundType = 'LASER'; }
              
              if (loop === 0) audioService.playShoot(soundType, state.era); 

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
                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                visualType: 'ARROW' 
              });
            }
          }
        });

        // Dead Enemies
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          if (enemiesRef.current[i].hp <= 0) {
            state.money += enemiesRef.current[i].moneyReward;
            if (loop === 0) handleEnemyDeath(enemiesRef.current[i]);
            spawnFloatingText(enemiesRef.current[i].position, `+$${enemiesRef.current[i].moneyReward}`, '#fbbf24');
            spawnParticle(enemiesRef.current[i].position, '#fff', 1, 'ring'); 
            spawnParticle(enemiesRef.current[i].position, enemiesRef.current[i].color, 8, 'circle');
            enemiesRef.current.splice(i, 1);
          }
        }
    }

    if (state.gameTime % 5 === 0) {
      setUiState({ ...state });
    }
  }, [onGameOver, handleStartWave, currentMap]); 

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

    // Background (Terrain)
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Scenery (Trees/Rocks)
    sceneryRef.current.forEach(item => {
        if (item.type === 'tree') {
            ctx.fillStyle = '#14532d'; // Dark Green
            ctx.beginPath(); ctx.arc(item.x, item.y, item.r, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#166534'; // Lighter Green
            ctx.beginPath(); ctx.arc(item.x - 2, item.y - 2, item.r * 0.7, 0, Math.PI*2); ctx.fill();
        } else if (item.type === 'rock') {
            ctx.fillStyle = '#57534e'; // Stone
            ctx.beginPath(); ctx.arc(item.x, item.y, item.r * 0.6, 0, Math.PI*2); ctx.fill();
        } else if (item.type === 'bush') {
            ctx.fillStyle = '#3f6212';
            ctx.beginPath(); ctx.arc(item.x, item.y, item.r * 0.5, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(item.x, item.y, 2, 2);
        }
    });

    // Path
    if (currentMap.waypoints.length > 0) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // 1. Path Border (Darker/Wider) to define width clearly
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.strokeStyle = '#292524'; // Darker "kerb"
        ctx.lineWidth = 48; // Wider than inner path
        ctx.beginPath();
        ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
        for (let i = 1; i < currentMap.waypoints.length; i++) { ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y); }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Inner Path (Dirt/Sand)
        ctx.strokeStyle = theme.pathInner;
        ctx.lineWidth = 40; // Consistent width
        ctx.stroke();
        
        // 3. Optional: Path Texture (Dotted center line or stones)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]); // Dashed line in center for detail
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Reset stroke style
        ctx.strokeStyle = 'transparent';
        ctx.setLineDash([]);
    }

    // Drops
    perkDropsRef.current.forEach(perk => {
        const info = PERK_STATS[perk.type];
        const pulse = 1 + Math.sin(gameStateRef.current.gameTime * 0.1) * 0.2;
        ctx.save();
        ctx.translate(perk.position.x, perk.position.y);
        ctx.shadowBlur = 10; ctx.shadowColor = info.color;
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0; ctx.fillText(info.icon, 0, 0);
        ctx.restore();
    });

    // Towers
    towersRef.current.forEach(tower => {
        ctx.save();
        ctx.translate(tower.position.x, tower.position.y);
        // DrawTower handles rotation internally for turret
        drawTower(ctx, tower, gameStateRef.current.era, gameStateRef.current.gameTime);
        ctx.restore();

        // Selection
        if (selectedPlacedTowerId === tower.id) {
            ctx.beginPath(); ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 4]);
            ctx.arc(tower.position.x, tower.position.y, tower.range, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    // Enemies
    enemiesRef.current.forEach(enemy => {
        // Find rotation based on next waypoint
        const target = currentMap.waypoints[enemy.pathIndex + 1];
        let rotation = 0;
        if (target) {
            rotation = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
        }

        // Draw Shadow in Screen Space to avoid artifacts
        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y + 4);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius, enemy.radius*0.6, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Draw Enemy Body (Rotated and Flipped)
        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y);
        ctx.rotate(rotation);
        
        // FLIP IF MOVING LEFT (Avoid upside down sprites)
        // Check if rotation is in the left quadrants (>90 deg or <-90 deg)
        if (Math.abs(rotation) > Math.PI / 2) {
            ctx.scale(1, -1);
        }

        drawEnemySprite(ctx, enemy, gameStateRef.current.era, gameStateRef.current.gameTime);
        ctx.restore();

        // HP Bar (Screen Space, above enemy)
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        if (hpPct < 1) {
            ctx.save();
            ctx.translate(enemy.position.x, enemy.position.y - 12);
            ctx.fillStyle = '#000';
            ctx.fillRect(-10, 0, 20, 3);
            ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(-10, 0, 20 * hpPct, 3);
            ctx.restore();
        }
    });

    // Projectiles
    projectilesRef.current.forEach(proj => {
        drawProjectile(ctx, proj, gameStateRef.current.era);
    });

    // Particles
    particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        if (p.type === 'ring') {
            ctx.strokeStyle = p.color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2); ctx.stroke();
        } else if (p.type === 'debris') {
            ctx.fillRect(p.position.x, p.position.y, p.size, p.size);
        } else {
            ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    // Floating Text
    floatingTextsRef.current.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.position.x, ft.position.y);
        ctx.fillText(ft.text, ft.position.x, ft.position.y);
        ctx.restore();
    });

    // Preview
    if (mousePosRef.current && selectedTowerType) {
        const gx = Math.floor(mousePosRef.current.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(mousePosRef.current.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const config = TOWER_TYPES[selectedTowerType];
        
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.arc(gx, gy, config.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);

        const isValid = gameStateRef.current.money >= config.cost 
                    && !isPointOnPath(gx, gy, 25, currentMap.waypoints) 
                    && !towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20);
        
        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        ctx.beginPath(); ctx.arc(gx, gy, 16, 0, Math.PI * 2); ctx.fill();
    }
  }, [activeThemeId, currentMap, selectedPlacedTowerId, selectedTowerType]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const loop = (timestamp: number) => {
        if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
        const deltaTime = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;
        accumulatorRef.current += deltaTime;
        if (accumulatorRef.current > 250) accumulatorRef.current = 250; 
        const FIXED_TIME_STEP = 1000 / 60;
        while (accumulatorRef.current >= FIXED_TIME_STEP) {
            update();
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

  // Input Handling
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
    
    // Perk Pickup
    const clickedPerkIndex = perkDropsRef.current.findIndex(p => distance(p.position, pos) < 30);
    if (clickedPerkIndex !== -1) {
        const perk = perkDropsRef.current[clickedPerkIndex];
        setPerkInventory(prev => ({ ...prev, [perk.type]: prev[perk.type] + 1 }));
        spawnFloatingText(perk.position, "GOT IT!", "#fff");
        spawnParticle(perk.position, '#fff', 10, 'circle');
        perkDropsRef.current.splice(clickedPerkIndex, 1);
        audioService.playBuild(); 
        triggerHaptic('success');
        return;
    }
    
    // Tower Select/Place
    const clickedTower = towersRef.current.find(t => distance(t.position, pos) < 20);
    if (clickedTower) {
        setSelectedPlacedTowerId(clickedTower.id);
        setSelectedTowerType(null); 
        triggerHaptic('selection');
        return;
    } else {
        if (!selectedTowerType) setSelectedPlacedTowerId(null);
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
        range: config.range, damage: config.damage, cooldown: config.cooldown, lastShotFrame: 0, rotation: 0, level: 1, eraBuilt: gameStateRef.current.era
      });
      triggerHaptic('light');
      setUiState({ ...gameStateRef.current });
      setSelectedTowerType(null); 
    } else {
      triggerHaptic('error');
    }
  };
  
  const handlePointerLeave = () => { if (!isPointerDownRef.current) mousePosRef.current = null; };
  
  const resetGame = () => {
      gameStateRef.current = { ...INITIAL_STATE, isPlaying: false, isGameOver: false, gameTime: 0, autoStartTimer: -1, gameSpeed: 1, era: 0, exp: 0, maxExp: ERA_DATA[0].maxExp };
      setHasStartedGame(false); 
      towersRef.current = []; enemiesRef.current = []; projectilesRef.current = []; particlesRef.current = []; floatingTextsRef.current = [];
      perkDropsRef.current = []; 
      setActivePerks([]); activePerksRef.current = [];
      setPerkInventory({ [PerkType.DAMAGE]: 0, [PerkType.SPEED]: 0, [PerkType.MONEY]: 0, [PerkType.FREEZE]: 0 });
      spawnQueueRef.current = [];
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

  // Helper logic for Upgrade/Sell omitted for brevity, using same logic as before but with updated cost checks if needed.
  const getSelectedTower = () => towersRef.current.find(t => t.id === selectedPlacedTowerId);
  const selectedTowerEntity = getSelectedTower();
  const handleUpgradeTower = () => {
    if (!selectedTowerEntity) return;
    const upgradeCost = Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.8 * selectedTowerEntity.level);
    if (gameStateRef.current.money >= upgradeCost && selectedTowerEntity.level < 3) {
        gameStateRef.current.money -= upgradeCost;
        selectedTowerEntity.level++;
        selectedTowerEntity.damage *= 1.3; selectedTowerEntity.range *= 1.1; 
        audioService.playBuild(); triggerHaptic('success');
        spawnFloatingText(selectedTowerEntity.position, "UPGRADED!", "#fbbf24");
        setUiState({...gameStateRef.current});
    }
  };
  const handleSellTower = () => {
    if (!selectedTowerEntity) return;
    const sellValue = Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.7 * selectedTowerEntity.level);
    gameStateRef.current.money += sellValue;
    towersRef.current = towersRef.current.filter(t => t.id !== selectedPlacedTowerId);
    audioService.playBuild(); spawnFloatingText(selectedTowerEntity.position, `+$${sellValue}`, "#fbbf24");
    setSelectedPlacedTowerId(null); setUiState({...gameStateRef.current});
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col gap-2 w-full h-full overflow-hidden box-border bg-[#1c1917]"> {/* Dark Brown BG */}
      {/* 1. GAME CANVAS AREA */}
      <div className="flex-1 relative group flex-shrink-0 mx-auto w-full h-full flex justify-center items-center overflow-hidden bg-black shadow-2xl">
        {/* WRAPPER FOR ASPECT RATIO FIX: Ensures canvas is exactly 1:2 ratio within available space */}
        <div className="relative w-full h-full max-w-full max-h-full flex justify-center items-center" style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}>
            <canvas 
            ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="w-full h-full block object-contain"
            style={{ touchAction: 'none' }}
            />

            {/* ERA UI (Top) */}
            {hasStartedGame && !uiState.isGameOver && (
                <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start pointer-events-none">
                    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-xs font-bold text-white shadow-lg flex items-center gap-2">
                        <span style={{ color: ERA_DATA[uiState.era].color }}>{ERA_DATA[uiState.era].name}</span>
                        <span className="text-slate-500">|</span>
                        <span>WAVE {uiState.wave}</span>
                    </div>
                    
                    {/* EXP BAR */}
                    <div className="flex flex-col items-end gap-1 w-1/2">
                        {uiState.era < 2 && uiState.exp >= uiState.maxExp ? (
                            <button 
                                onClick={evolveEra}
                                className="pointer-events-auto animate-bounce bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs px-4 py-2 rounded-full shadow-xl border-2 border-yellow-200 flex items-center gap-1"
                            >
                                <ArrowUpCircle size={16} /> EVOLVE AGE
                            </button>
                        ) : (
                        <div className="w-full bg-slate-900/80 backdrop-blur-md h-3 rounded-full border border-slate-700 overflow-hidden relative">
                            <div 
                                className="h-full transition-all duration-500"
                                style={{ width: `${(uiState.exp / uiState.maxExp) * 100}%`, backgroundColor: ERA_DATA[uiState.era].color }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-md">
                                {Math.floor(uiState.exp)} / {uiState.maxExp} XP
                            </span>
                        </div>
                        )}
                    </div>
                </div>
            )}

            {/* ACTIVE PERKS UI */}
            <div className="absolute top-12 right-2 flex flex-col gap-2 pointer-events-none">
                {activePerks.map(perk => {
                    const info = PERK_STATS[perk.type];
                    const remaining = perk.endTime - uiState.gameTime;
                    const pct = Math.max(0, Math.min(1, remaining / perk.duration));
                    return (
                        <div key={perk.type} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg p-1.5 flex items-center gap-2 shadow-lg min-w-[100px]">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-inner" style={{backgroundColor: info.color + '40'}}>
                                {info.icon}
                            </div>
                            <div className="flex-1">
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-100 ease-linear" style={{ width: `${pct * 100}%`, backgroundColor: info.color }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* START SCREEN */}
            {!hasStartedGame && !uiState.isPlaying && !uiState.isGameOver && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-md">
                    <div className="bg-[#292524] p-6 rounded-2xl border border-[#78350f] text-center shadow-2xl w-[320px]">
                        <h2 className="text-xl font-display text-[#fcd34d] mb-1 tracking-widest">CHOOSE BATTLEFIELD</h2>
                        <p className="text-[#a8a29e] mb-4 text-xs uppercase">Conquer the Ages</p>
                        
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => changeMap('prev')} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft /></button>
                            <div className="flex flex-col items-center gap-2">
                                <MapPreviewSVG map={currentMap} activeThemeId={activeThemeId} />
                                <div className="font-bold text-lg text-white font-display">{currentMap.name}</div>
                                <div className="text-[10px] px-2 py-0.5 rounded font-bold bg-black/30 text-[#a8a29e]">{currentMap.difficulty}</div>
                            </div>
                            <button onClick={() => changeMap('next')} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight /></button>
                        </div>

                        <button 
                        onClick={initializeGame}
                        className="w-full px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded font-bold transition-all flex items-center justify-center gap-2 mx-auto text-sm tracking-widest shadow-lg"
                        >
                            <Play size={18} /> START CONQUEST
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
                    {notification.subtitle && (
                        <div className="bg-black/60 text-white px-4 py-1 rounded-full text-xs font-mono border border-white/20 mt-2 backdrop-blur-md">
                            {notification.subtitle}
                        </div>
                    )}
                </div>
            )}

            {/* UPGRADE MENU */}
            {selectedTowerEntity && !uiState.isGameOver && !isStoreOpen && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#292524] border border-[#78350f] rounded-xl p-2 flex gap-4 shadow-xl z-10">
                    <div className="flex flex-col items-center border-r border-white/10 pr-4 justify-center">
                        <span className="text-[10px] font-bold text-[#a8a29e] mb-0.5">LVL {selectedTowerEntity.level}</span>
                        {/* Dynamic Name based on Era */}
                        <div className="font-display text-[#fcd34d] font-bold text-xs">
                            {ERA_DATA[uiState.era].towerNames[selectedTowerEntity.type]}
                        </div>
                    </div>
                    {selectedTowerEntity.level < 3 ? (
                        <button onClick={handleUpgradeTower} className="flex flex-col items-center justify-center gap-1 min-w-[50px] hover:bg-white/5 rounded p-1 transition-colors group">
                            <div className="bg-yellow-500/10 p-1.5 rounded-full border border-yellow-500/30"><Zap size={14} className="text-yellow-400" /></div>
                            <span className="text-[10px] font-bold text-yellow-400">-${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.8 * selectedTowerEntity.level)}</span>
                        </button>
                    ) : <div className="min-w-[50px] flex items-center justify-center text-xs text-slate-500 font-bold">MAX</div>}
                    <button onClick={handleSellTower} className="flex flex-col items-center justify-center gap-1 min-w-[50px] hover:bg-white/5 rounded p-1 transition-colors group">
                        <div className="bg-red-500/10 p-1.5 rounded-full border border-red-500/30"><Trash2 size={14} className="text-red-400" /></div>
                        <span className="text-[10px] font-bold text-red-400">+${Math.floor(TOWER_TYPES[selectedTowerEntity.type].cost * 0.7 * selectedTowerEntity.level)}</span>
                    </button>
                </div>
            )}

            {uiState.isGameOver && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-sm">
                    <h2 className="text-4xl font-display text-red-600 mb-2">DEFEAT</h2>
                    <p className="text-slate-400 text-lg mb-8">Empire fell at Wave {uiState.wave}</p>
                    <button onClick={resetGame} className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded font-bold flex items-center gap-2">
                        <RefreshCw size={18} /> TRY AGAIN
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* 2. MENU */}
      <div className="shrink-0 flex flex-col gap-1 w-full min-w-0 pb-1 px-2 relative bg-[#1c1917]">
        {/* STATS */}
        <div className="bg-[#292524] px-3 py-1.5 rounded-lg border border-[#44403c] flex items-center justify-between w-full shadow-lg h-10">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><Heart className="text-red-500 w-3.5 h-3.5" /><span className="text-sm font-bold text-red-100">{uiState.lives}</span></div>
                <div className="flex items-center gap-1.5"><Coins className="text-yellow-400 w-3.5 h-3.5" /><span className="text-sm font-bold text-yellow-100">{uiState.money}</span></div>
             </div>
             <button onClick={toggleGameSpeed} className={`p-1 px-2 rounded flex items-center gap-1 font-bold text-[10px] transition-colors border ${uiState.gameSpeed === 2 ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                <FastForward size={12} /> {uiState.gameSpeed}x
            </button>
        </div>

        {/* TOWERS */}
        <div className="bg-[#292524] p-1 rounded-lg border border-[#44403c] flex gap-2 w-full shadow-lg h-20 items-center overflow-hidden">
             <button 
                  onClick={handleStartWave}
                  disabled={uiState.isPlaying} 
                  className={`h-full aspect-square rounded-md flex flex-col items-center justify-center gap-1 font-bold transition-all relative overflow-hidden flex-shrink-0
                    ${uiState.isPlaying ? 'bg-black/50 text-slate-500 cursor-not-allowed' : uiState.autoStartTimer > 0 ? 'bg-yellow-600 text-white animate-pulse' : 'bg-[#ea580c] text-white'}`}
                >
                    {uiState.autoStartTimer > 0 ? <><Timer size={20} /><span className="text-[10px]">{Math.ceil(uiState.autoStartTimer/60)}s</span></> : <Play size={24} fill="currentColor" />}
            </button>
            <div className="w-[1px] h-[80%] bg-white/10" />
            <div className="flex gap-1 overflow-x-auto h-full items-center scrollbar-hide px-1 w-full">
                {Object.values(TOWER_TYPES).map(tower => (
                    <button
                        key={tower.type}
                        onClick={() => { setSelectedTowerType(selectedTowerType === tower.type ? null : tower.type); setSelectedPlacedTowerId(null); triggerHaptic('light'); }}
                        className={`min-w-[64px] h-[90%] rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 relative
                            ${selectedTowerType === tower.type ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-black/20 hover:bg-black/40'}`}
                    >
                        <div className="w-8 h-8"><TowerIcon type={tower.type} era={uiState.era} /></div>
                        <div className="text-[9px] text-[#fbbf24] font-mono font-bold">${tower.cost}</div>
                    </button>
                ))}
            </div>
        </div>

        {/* PERKS */}
        <div className="bg-[#292524] px-2 py-1 rounded-lg border border-[#44403c] flex gap-2 w-full shadow-lg h-14 items-center justify-between">
             {Object.entries(PERK_STATS).map(([type, stats]) => {
                 const count = perkInventory[type as PerkType];
                 return (
                     <button
                        key={type}
                        onClick={() => activatePerk(type as PerkType)}
                        disabled={count <= 0}
                        className={`flex-1 h-full rounded border flex flex-col items-center justify-center relative transition-all active:scale-95
                            ${count > 0 ? 'bg-white/10 hover:bg-white/20 border-white/20 cursor-pointer' : 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'}
                        `}
                        style={{ borderColor: count > 0 ? stats.color : undefined }}
                     >
                         <div className="text-xl leading-none mb-1">{stats.icon}</div>
                         <div className="text-[8px] font-bold leading-none" style={{ color: count > 0 ? stats.color : '#64748b' }}>{stats.name}</div>
                         {count > 0 && <div className="absolute -top-1.5 -right-1.5 bg-white text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{count}</div>}
                     </button>
                 );
             })}
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
