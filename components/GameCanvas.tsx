
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Vector2D, Tower, Enemy, Projectile, GameState, TowerType, EnemyType, Particle, MapDefinition, FloatingText, PerkDrop, ActivePerk, PerkType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS, TOWER_TYPES, ENEMY_STATS, PERK_STATS, GRID_SIZE, INITIAL_STATE, AUTO_START_DELAY, THEMES, ERA_DATA } from '../constants';
import { audioService } from '../services/audioService';
import { Heart, Coins, Shield, Play, RefreshCw, Timer, ChevronRight, ChevronLeft, Zap, Trash2, FastForward, AlertTriangle, Star, Palette, X, Check, ArrowUpCircle, Lock, HelpCircle } from 'lucide-react';

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

// UI COMPONENT FOR TOWER ICONS (React side) - HIGH FIDELITY
const TowerIcon = ({ type, era }: { type: TowerType; era: number }) => {
  
  // Define gradients and filters once
  const Defs = () => (
    <defs>
      <linearGradient id="gradWood" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#854d0e" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
      <linearGradient id="gradMetal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="gradSkin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
        <feOffset dx="0" dy="1" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  const RenderHighFidelity = () => {
    // --- ERA 0: STONE AGE (Characters) ---
    if (era === 0) {
        switch(type) {
            case TowerType.BASIC: // Slinger (Man winding up)
                return (
                    <g filter="url(#dropShadow)">
                        {/* Body */}
                        <path d="M14,32 L14,22 Q14,18 20,18 Q26,18 26,22 L26,32" fill="url(#gradWood)" stroke="#292524" strokeWidth="1"/>
                        {/* Head */}
                        <circle cx="20" cy="14" r="5" fill="url(#gradSkin)" />
                        {/* Arm Holding Sling */}
                        <path d="M26,22 Q32,20 34,14" stroke="url(#gradSkin)" strokeWidth="3" strokeLinecap="round" />
                        {/* Sling & Stone */}
                        <path d="M34,14 L36,10" stroke="#451a03" strokeWidth="1" />
                        <circle cx="36" cy="9" r="3" fill="#a8a29e" stroke="#292524" strokeWidth="1" />
                        {/* Other Arm */}
                        <path d="M14,22 Q8,24 8,18" stroke="url(#gradSkin)" strokeWidth="3" strokeLinecap="round" />
                    </g>
                );
            case TowerType.RAPID: // HUNTER (Primitive Archer)
                return (
                    <g filter="url(#dropShadow)">
                         {/* Body */}
                         <path d="M16,32 L16,22 Q16,18 20,18 Q24,18 24,22 L24,32" fill="url(#gradWood)" />
                         {/* Bow */}
                         <path d="M26,10 Q14,20 26,30" stroke="#5c2b08" strokeWidth="2" fill="none" />
                         <line x1="26" y1="10" x2="26" y2="30" stroke="#fff" strokeWidth="0.5" />
                         {/* Head */}
                         <circle cx="20" cy="14" r="5" fill="url(#gradSkin)" />
                    </g>
                );
            case TowerType.SNIPER: // Spearman (Hunter with Long Spear)
                return (
                    <g filter="url(#dropShadow)">
                         {/* Spear diagonally */}
                         <line x1="6" y1="34" x2="34" y2="6" stroke="#451a03" strokeWidth="3" />
                         <path d="M32,8 L36,4 L32,4 Z" fill="#9ca3af" /> 
                         {/* Body behind */}
                         <circle cx="16" cy="24" r="6" fill="url(#gradWood)" />
                         <circle cx="12" cy="18" r="4" fill="url(#gradSkin)" />
                    </g>
                );
            case TowerType.AOE: // Rock Trap (Hanging Log/Rock)
                return (
                    <g filter="url(#dropShadow)">
                        {/* Frame */}
                        <path d="M10,36 L10,6 L20,6 L30,6 L30,36" stroke="#451a03" strokeWidth="3" fill="none"/>
                        {/* Rope */}
                        <line x1="20" y1="6" x2="20" y2="18" stroke="#d6d3d1" strokeWidth="1" strokeDasharray="2,1" />
                        {/* Big Rock */}
                        <path d="M14,18 L26,18 L24,28 L16,28 Z" fill="#57534e" stroke="black" strokeWidth="1" />
                    </g>
                );
            default: return <circle cx="20" cy="20" r="10" fill="url(#gradWood)" />;
        }
    }
    // --- ERA 1: CASTLE AGE (Weapons/Heraldry) ---
    else if (era === 1) {
        switch(type) {
            case TowerType.BASIC: // Archer (Bow & Quiver)
                return (
                    <g filter="url(#dropShadow)">
                        {/* Bow */}
                        <path d="M10,10 Q30,20 10,30" stroke="#854d0e" strokeWidth="3" fill="none" />
                        <line x1="10" y1="10" x2="10" y2="30" stroke="#fff" strokeWidth="1" />
                        {/* Arrow */}
                        <line x1="10" y1="20" x2="34" y2="20" stroke="url(#gradMetal)" strokeWidth="2" />
                        <path d="M34,20 L30,17 L30,23 Z" fill="url(#gradMetal)" />
                    </g>
                );
            case TowerType.RAPID: // Crossbow
                return (
                    <g filter="url(#dropShadow)">
                         <path d="M12,12 L28,28" stroke="#57534e" strokeWidth="4" /> {/* Stock */}
                         <path d="M28,12 Q20,20 12,28" stroke="#cbd5e1" strokeWidth="3" fill="none" /> {/* Bow */}
                         <line x1="14" y1="14" x2="26" y2="26" stroke="black" strokeWidth="1" />
                    </g>
                );
            case TowerType.SNIPER: // Ballista (Heavy Bolt)
                return (
                    <g filter="url(#dropShadow)">
                        <rect x="16" y="8" width="8" height="24" fill="#451a03" rx="1" />
                        <path d="M12,28 L20,6 L28,28" fill="url(#gradMetal)" />
                    </g>
                );
            case TowerType.AOE: // Catapult (Bucket)
                return (
                    <g filter="url(#dropShadow)">
                        <rect x="8" y="26" width="24" height="6" fill="#451a03" />
                        <path d="M12,26 L26,10" stroke="#854d0e" strokeWidth="4" />
                        <circle cx="26" cy="10" r="5" fill="#1e293b" />
                    </g>
                );
            default: return <rect x="10" y="10" width="20" height="20" fill="url(#gradMetal)" />;
        }
    }
    // --- ERA 2: IMPERIAL AGE (Turrets) ---
    else {
        switch(type) {
            case TowerType.BASIC: // Sentry Gun
                return (
                    <g filter="url(#dropShadow)">
                        <circle cx="20" cy="20" r="12" fill="#1e293b" stroke="url(#gradMetal)" strokeWidth="2" />
                        <rect x="18" y="10" width="4" height="12" fill="black" />
                        <circle cx="20" cy="20" r="4" fill="#ef4444" /> {/* Red Eye */}
                    </g>
                );
            case TowerType.RAPID: // Gatling
                return (
                    <g filter="url(#dropShadow)">
                        <circle cx="20" cy="20" r="13" fill="#334155" />
                        <circle cx="20" cy="20" r="8" fill="none" stroke="url(#gradGold)" strokeWidth="2" strokeDasharray="3,2" />
                        <circle cx="20" cy="20" r="3" fill="black" />
                    </g>
                );
            case TowerType.SNIPER: // Sniper Scope
                return (
                    <g filter="url(#dropShadow)">
                        <circle cx="20" cy="20" r="14" fill="none" stroke="url(#gradMetal)" strokeWidth="2" />
                        <line x1="20" y1="6" x2="20" y2="14" stroke="#ef4444" strokeWidth="1" />
                        <line x1="20" y1="26" x2="20" y2="34" stroke="#ef4444" strokeWidth="1" />
                        <line x1="6" y1="20" x2="14" y2="20" stroke="#ef4444" strokeWidth="1" />
                        <line x1="26" y1="20" x2="34" y2="20" stroke="#ef4444" strokeWidth="1" />
                        <circle cx="20" cy="20" r="1" fill="#ef4444" />
                    </g>
                );
            case TowerType.AOE: // Mortar/Rocket
                return (
                    <g filter="url(#dropShadow)">
                        <path d="M14,30 L14,10 L26,10 L26,30 Z" fill="url(#gradWood)" /> {/* Olive Drab hint via wood grad reuse or custom */}
                        <path d="M14,30 L14,10 L26,10 L26,30 Z" fill="#14532d" /> 
                        <path d="M16,10 L24,10 L20,4 Z" fill="url(#gradGold)" /> {/* Warhead tip */}
                        <path d="M12,30 L28,30" stroke="black" strokeWidth="2" />
                    </g>
                );
            default: return <rect x="10" y="10" width="20" height="20" fill="url(#gradMetal)" rx="4" />;
        }
    }
  };

  return (
    <div className="w-full h-full p-1 drop-shadow-md">
        <svg viewBox="0 0 40 40" fill="none" className="w-full h-full filter drop-shadow-sm">
            <Defs />
            <RenderHighFidelity />
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
  
  // SCALE UP TOWERS VISUALLY (Chunkier look)
  ctx.save();
  ctx.scale(1.3, 1.3);

  // --- RECOIL / ANIMATION STATE CALCULATION ---
  const timeSinceShot = gameTime - tower.lastShotFrame;
  let recoil = 0;
  // Standard mechanical recoil for eras 1 & 2
  if (era > 0 && timeSinceShot < 10) {
      recoil = (10 - timeSinceShot) * 0.8; 
  }

  // --- 1. DRAW BASE (Static Foundation) ---
  if (era === 0) { // Stone Age - No Stone Tower, just dirt
      ctx.fillStyle = 'rgba(50, 40, 30, 0.4)'; // Subtle dirt patch
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();
  } else if (era === 1) { // Castle Age
      ctx.fillStyle = '#334155'; // Dark Slate Base
      ctx.fillRect(-14, -14, 28, 28);
      // Stone border
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth=2; ctx.strokeRect(-14, -14, 28, 28);
  } else { // Imperial Age
      ctx.fillStyle = '#111827'; // Dark Metal
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.stroke();
      // Tech lines
      ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,0, 12, 0, Math.PI*2); ctx.stroke();
  }

  // --- 2. DRAW UNIT / TURRET (Rotated) ---
  ctx.save();
  ctx.rotate(tower.rotation);
  
  if (era > 0) ctx.translate(-recoil, 0); // Apply simple recoil for later eras

  // --- ERA 0: STONE AGE (Fully Animated Characters) ---
  if (era === 0) {
      // Breathing / Bobbing for all units to feel alive
      const breath = Math.sin(gameTime * 0.1) * 1; 

      if (tower.type === TowerType.BASIC) {
          // ================== SLINGER (Animated) ==================
          // Animation: Idle = Hanging down. Attack = Whip motion.
          
          const isAttacking = timeSinceShot < 15;
          let slingAngle = 0;
          let armExtension = 0;

          if (isAttacking) {
              // Throwing motion (0 to 15 frames)
              // Fast wind up and release
              const t = timeSinceShot / 15;
              slingAngle = Math.PI - (t * Math.PI * 1.5); // Whip forward aggressively
              armExtension = 12;
          } else {
              // IDLE: Sling hangs down by side, swaying slightly with breath
              slingAngle = 1.8 + Math.sin(gameTime * 0.05) * 0.1; 
              armExtension = 5;
          }

          // Feet
          ctx.fillStyle = '#451a03';
          ctx.beginPath(); ctx.arc(-6, -4, 4, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(-6, 4, 4, 0, Math.PI*2); ctx.fill();

          // Body (Moves with breath)
          ctx.save();
          ctx.translate(0, breath * 0.5); 
          
          ctx.fillStyle = '#854d0e'; // Tunic
          ctx.beginPath(); ctx.ellipse(-2, 0, 7, 9, 0, 0, Math.PI*2); ctx.fill();
          
          // Head
          ctx.fillStyle = '#fcd34d'; // Skin
          ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI*2); ctx.fill();

          // Left Arm (Balance)
          ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-8, -10); ctx.stroke();

          // Right Arm (Slinging)
          ctx.save();
          ctx.translate(-2, 4); // Shoulder
          
          const handX = Math.cos(isAttacking ? 0 : 0.5) * armExtension;
          const handY = Math.sin(isAttacking ? 0 : 0.5) * armExtension;
          
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(handX, handY); ctx.stroke();
          
          // The Sling Rope
          ctx.translate(handX, handY);
          const ropeLen = isAttacking ? 14 : 10;
          const ropeX = Math.cos(slingAngle) * ropeLen;
          const ropeY = Math.sin(slingAngle) * ropeLen;

          ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(ropeX, ropeY); ctx.stroke();
          
          // The Stone (only visible if NOT just fired)
          if (!isAttacking || timeSinceShot > 5) {
            ctx.fillStyle = '#a8a29e';
            ctx.beginPath(); ctx.arc(ropeX, ropeY, 3, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore(); // End Arm
          ctx.restore(); // End Body

      } else if (tower.type === TowerType.RAPID) {
          // ================== HUNTER (Bow) ==================
          const isAttacking = timeSinceShot < 10;
          let drawString = 0;
          
          if (isAttacking) {
             // Released: String snaps forward
             const t = timeSinceShot / 10;
             drawString = (1-t) * 2; // Returns to neutral
          } else {
             // Idle: Bow relaxed, string vertical
             // Attacking (cooldown): Pulling back
             const cooldownPct = Math.min(1, timeSinceShot / tower.cooldown);
             if (cooldownPct > 0.5) {
                // Drawing back
                drawString = (cooldownPct - 0.5) * 2 * 6; // Max draw 6px
             }
          }

          // Feet
          ctx.fillStyle = '#451a03';
          ctx.beginPath(); ctx.arc(-6, -4, 4, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(-6, 4, 4, 0, Math.PI*2); ctx.fill();

          // Body with Breath
          ctx.save();
          ctx.translate(0, breath * 0.5);

          ctx.fillStyle = '#fcd34d'; // Shirtless
          ctx.beginPath(); ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI*2); ctx.fill();
          // Head
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();

          // Left Arm (Holding Bow)
          ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(12, -2); ctx.stroke();

          // Right Arm (Drawing String)
          ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(8 - drawString, 4); ctx.stroke();

          // THE BOW
          ctx.save();
          ctx.translate(14, 0); // Bow center
          ctx.rotate(Math.PI/2); // Vertical bow relative to facing right
          
          // Bow Stave
          ctx.strokeStyle = '#5c2b08'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-10, 0); 
          ctx.quadraticCurveTo(-drawString, 4, 10, 0); // Flexes slightly when drawn? Simplified: Static arc, moving string
          ctx.stroke();

          // String
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(0, -drawString); // Pulled back
          ctx.lineTo(10, 0);
          ctx.stroke();

          ctx.restore(); // End Bow
          
          ctx.restore(); // End Body

      } else if (tower.type === TowerType.SNIPER) {
          // ================== SPEARMAN (Animated) ==================
          const isAttacking = timeSinceShot < 20;
          let spearThrust = 0;
          
          if (isAttacking) {
              // Quick stab and retract
              const t = timeSinceShot / 20;
              if (t < 0.3) spearThrust = (t/0.3) * 15; // Fast Out
              else spearThrust = (1 - (t-0.3)/0.7) * 15; // Slow Back
          }

          // Feet
          ctx.fillStyle = '#451a03';
          ctx.beginPath(); ctx.arc(-4, -5, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(4, -5, 3, 0, Math.PI*2); ctx.fill(); // Stance

          // Body Breath
          ctx.save();
          ctx.translate(0, breath * 0.3);

          ctx.fillStyle = '#854d0e';
          ctx.beginPath(); ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI*2); ctx.fill();
          // Head
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
          // Headband
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0,0, 6, 0, Math.PI*2); ctx.stroke();

          // Spear Arm
          ctx.save();
          ctx.translate(spearThrust, 0);
          
          // Spear Shaft
          ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(20, 4); ctx.stroke();
          // Spear Tip
          ctx.fillStyle = '#e5e5e5';
          ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(26, 3); ctx.lineTo(20, 2); ctx.fill();
          
          // Hands
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath(); ctx.arc(-5, 6, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(5, 5, 2.5, 0, Math.PI*2); ctx.fill();
          
          ctx.restore();
          ctx.restore();

      } else {
          // ================== TRAP / AOE ==================
          // Log pile
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-10, -10, 20, 20);
          ctx.fillStyle = '#57534e'; // Big Rock
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
      }
  } 
  // --- ERA 1: CASTLE AGE (Archers/Siege) ---
  else if (era === 1) {
      if (tower.type === TowerType.BASIC) {
          // LONGBOW (Archer)
          // Hood
          ctx.fillStyle = '#1e3a8a'; 
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
          // Bow
          ctx.strokeStyle = '#854d0e'; ctx.lineWidth=3;
          ctx.beginPath(); ctx.arc(4, 0, 12, 0.5*Math.PI, 1.5*Math.PI, true); ctx.stroke();
          // Arrow
          ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(16,0); ctx.stroke();
      } else if (tower.type === TowerType.RAPID) {
          // CROSSBOW
           ctx.fillStyle = '#451a03'; // Stock
           ctx.fillRect(-8, -2, 16, 4);
           // Bow
           ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth=3;
           ctx.beginPath(); ctx.moveTo(6, -8); ctx.quadraticCurveTo(2, 0, 6, 8); ctx.stroke();
      } else if (tower.type === TowerType.SNIPER) {
          // BALLISTA
          ctx.fillStyle = '#57534e';
          ctx.fillRect(-8, -4, 16, 8); // Body
          // Bow Arms
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth=4;
          ctx.beginPath(); ctx.moveTo(4, -12); ctx.quadraticCurveTo(0, 0, 4, 12); ctx.stroke();
          // String
          ctx.strokeStyle = '#000'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(-6, 0); ctx.lineTo(4, 12); ctx.stroke();
      } else {
          // MANGONEL / CATAPULT
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-10, -8, 20, 16);
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(4, 0, 6, 0, Math.PI*2); ctx.fill(); // Payload
      }
  }
  // --- ERA 2: IMPERIAL AGE (Turrets) ---
  else {
      if (tower.type === TowerType.BASIC) {
          // SENTRY
          ctx.fillStyle = '#475569';
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#1e293b'; // Barrel
          ctx.fillRect(8, -3, 14, 6);
          ctx.fillStyle = '#ef4444'; // Light
          ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
      } else if (tower.type === TowerType.RAPID) {
          // GATLING
          ctx.fillStyle = '#334155';
          ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill();
          // Gold barrels
          ctx.fillStyle = '#fbbf24'; 
          ctx.fillRect(8, -5, 12, 2); ctx.fillRect(8, 0, 12, 2); ctx.fillRect(8, 5, 12, 2);
      } else if (tower.type === TowerType.SNIPER) {
          // SNIPER NEST
          ctx.fillStyle = '#3f6212'; // Camo Green
          ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(8, 0); ctx.lineTo(-6, 6); ctx.fill();
          // Long Barrel
          ctx.strokeStyle = '#000'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(26,0); ctx.stroke();
      } else {
          // MORTAR
          ctx.fillStyle = '#15803d';
          ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      }
  }
  ctx.restore();

  // 4. LEVEL INDICATOR STARS
  if (tower.level > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      const startX = -((tower.level - 1) * 8) / 2;
      for(let i=0; i<tower.level; i++) {
          ctx.beginPath();
          ctx.arc(startX + (i*8), -16, 3, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
      }
  }
  
  ctx.restore(); // END SCALE
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<Vector2D | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  
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
  
  // Handle Resize for Responsive Canvas
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    // Initial size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          // Important: Play sound based on NEW era
          audioService.playWaveStart(state.era); 
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
         // Pass current ERA to audio service for context-aware sound
         audioService.playWaveStart(gameStateRef.current.era);
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

  // CALCULATE SCALE & OFFSET FOR RESPONSIVE RENDERING
  const calculateTransform = () => {
      const { width, height } = canvasDimensions;
      const gameW = CANVAS_WIDTH;
      const gameH = CANVAS_HEIGHT;
      // Calculate scale to fit CONTAIN within the window
      const scale = Math.min(width / gameW, height / gameH);
      const offsetX = (width - gameW * scale) / 2;
      const offsetY = (height - gameH * scale) / 2;
      return { scale, offsetX, offsetY };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
    const { scale, offsetX, offsetY } = calculateTransform();

    // 1. CLEAR & FILL BACKGROUND (Full Screen)
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. APPLY TRANSFORM (Center the Game Board)
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw Game Board Background (Optional: slight darker rect to distinguish play area?)
    // ctx.fillStyle = 'rgba(0,0,0,0.1)';
    // ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
        ctx.lineWidth = 70; // Wider than inner path
        ctx.beginPath();
        ctx.moveTo(currentMap.waypoints[0].x, currentMap.waypoints[0].y);
        for (let i = 1; i < currentMap.waypoints.length; i++) { ctx.lineTo(currentMap.waypoints[i].x, currentMap.waypoints[i].y); }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Inner Path (Dirt/Sand)
        ctx.strokeStyle = theme.pathInner;
        ctx.lineWidth = 60; // Consistent width
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
        
        // 1. Range Indicator
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([4, 4]);
        ctx.arc(gx, gy, config.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);

        const isValid = gameStateRef.current.money >= config.cost 
                    && !isPointOnPath(gx, gy, 35, currentMap.waypoints) 
                    && !towersRef.current.some(t => distance(t.position, {x: gx, y: gy}) < 20);
        
        // 2. Draw Tower Preview (Sprite)
        ctx.save();
        ctx.translate(gx, gy);
        ctx.globalAlpha = 0.8;
        // Mock a tower object for drawing
        const mockTower: Tower = {
            id: 'preview', position: {x:gx, y:gy}, type: selectedTowerType, 
            level: 1, lastShotFrame: 0, range: config.range, damage: config.damage, cooldown: config.cooldown,
            rotation: -Math.PI/2, // Facing right/up
            eraBuilt: gameStateRef.current.era
        };
        drawTower(ctx, mockTower, gameStateRef.current.era, 0);
        ctx.restore();
        
        // 3. Validity Indicator (Circle base)
        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath(); ctx.arc(gx, gy, 20, 0, Math.PI * 2); ctx.fill();

        // 4. Floating Name Label
        ctx.save();
        ctx.translate(gx, gy - 40);
        // Background Pill
        const name = ERA_DATA[gameStateRef.current.era].towerNames[selectedTowerType];
        const textWidth = ctx.measureText(name).width;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.roundRect(-40, -14, 80, 28, 6);
        ctx.fill();
        ctx.strokeStyle = isValid ? '#22c55e' : '#ef4444'; ctx.lineWidth = 1;
        ctx.stroke();
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(name, 0, -4);
        ctx.fillStyle = isValid ? '#4ade80' : '#f87171';
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillText(`$${config.cost}`, 0, 8);
        ctx.restore();
    }
    
    ctx.restore(); // END TRANSFORM
  }, [activeThemeId, currentMap, selectedPlacedTowerId, selectedTowerType, canvasDimensions]);

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
      const { scale, offsetX, offsetY } = calculateTransform();
      
      return { 
          x: (clientX - rect.left - offsetX) / scale, 
          y: (clientY - rect.top - offsetY) / scale 
      };
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
                    && !isPointOnPath(gx, gy, 35, currentMap.waypoints) 
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
      <div 
        ref={containerRef}
        className="flex-1 relative group flex-shrink-0 mx-auto w-full h-full flex justify-center items-center overflow-hidden bg-black shadow-2xl"
      >
        <canvas 
            ref={canvasRef} 
            width={canvasDimensions.width} 
            height={canvasDimensions.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="block w-full h-full"
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
                {Object.values(TOWER_TYPES).map(tower => {
                    // Check availability in current Era
                    const currentEraData = ERA_DATA[uiState.era];
                    const isUnlocked = currentEraData.availableTowers ? currentEraData.availableTowers.includes(tower.type) : true;

                    if (!isUnlocked) {
                        return (
                            <div key={tower.type} className="min-w-[64px] h-[90%] rounded-md border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-1 shrink-0 opacity-50 cursor-not-allowed">
                                <HelpCircle size={20} className="text-slate-600" />
                                <div className="text-[9px] text-slate-600 font-mono font-bold">???</div>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={tower.type}
                            onClick={() => { setSelectedTowerType(selectedTowerType === tower.type ? null : tower.type); setSelectedPlacedTowerId(null); triggerHaptic('light'); }}
                            className={`min-w-[64px] h-[90%] rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 relative
                                ${selectedTowerType === tower.type ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-black/20 hover:bg-black/40'}`}
                        >
                            <div className="w-8 h-8"><TowerIcon type={tower.type} era={uiState.era} /></div>
                            <div className="text-[9px] text-[#fbbf24] font-mono font-bold">${tower.cost}</div>
                        </button>
                    );
                })}
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
