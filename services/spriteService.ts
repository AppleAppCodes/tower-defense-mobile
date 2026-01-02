// Sprite Sheet Service - Handles loading and rendering of sprite sheets

export interface SpriteConfig {
  src: string;           // Path to sprite sheet
  frameWidth: number;    // Width of single frame
  frameHeight: number;   // Height of single frame
  totalFrames: number;   // Total frames in sheet
  columns: number;       // Frames per row (for grid layouts)
  type: 'rotation' | 'animation'; // rotation = select by angle, animation = play sequence
}

export interface LoadedSprite {
  image: HTMLImageElement;
  config: SpriteConfig;
  loaded: boolean;
}

// Sprite configurations for each tower type and era
export const SPRITE_CONFIGS: Record<string, SpriteConfig> = {
  // Stone Age (Era 0)
  'AOE_0': {
    src: '/sprites/rock-thrower.png',
    frameWidth: 512,
    frameHeight: 512,
    totalFrames: 43,
    columns: 43, // All frames in one row (horizontal strip)
    type: 'rotation'
  },
  // Add more sprites here as you create them:
  // 'BASIC_0': { src: '/sprites/slinger.png', ... },
  // 'RAPID_0': { src: '/sprites/hunter.png', ... },
};

class SpriteService {
  private sprites: Map<string, LoadedSprite> = new Map();
  private loadPromises: Map<string, Promise<LoadedSprite>> = new Map();

  // Load a sprite sheet
  async loadSprite(key: string): Promise<LoadedSprite | null> {
    // Already loaded?
    if (this.sprites.has(key)) {
      return this.sprites.get(key)!;
    }

    // Already loading?
    if (this.loadPromises.has(key)) {
      return this.loadPromises.get(key)!;
    }

    // Config exists?
    const config = SPRITE_CONFIGS[key];
    if (!config) {
      console.warn(`No sprite config for: ${key}`);
      return null;
    }

    // Start loading
    const loadPromise = new Promise<LoadedSprite>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const sprite: LoadedSprite = {
          image: img,
          config,
          loaded: true
        };
        this.sprites.set(key, sprite);
        this.loadPromises.delete(key);
        console.log(`Sprite loaded: ${key}`);
        resolve(sprite);
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${key} from ${config.src}`);
        this.loadPromises.delete(key);
        resolve({ image: img, config, loaded: false });
      };
      img.src = config.src;
    });

    this.loadPromises.set(key, loadPromise);
    return loadPromise;
  }

  // Preload all configured sprites
  async preloadAll(): Promise<void> {
    const keys = Object.keys(SPRITE_CONFIGS);
    await Promise.all(keys.map(key => this.loadSprite(key)));
    console.log(`Preloaded ${keys.length} sprites`);
  }

  // Get sprite if loaded (sync)
  getSprite(key: string): LoadedSprite | null {
    return this.sprites.get(key) || null;
  }

  // Check if sprite is available
  hasSprite(key: string): boolean {
    const sprite = this.sprites.get(key);
    return sprite?.loaded ?? false;
  }

  // Draw a sprite frame to canvas
  drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    rotation: number = 0, // Radians (for rotation type sprites)
    frame: number = 0,    // For animation type sprites
    scale: number = 1
  ): boolean {
    const sprite = this.sprites.get(key);
    if (!sprite?.loaded) {
      return false; // Sprite not loaded, caller should use fallback
    }

    const { image, config } = sprite;
    let frameIndex: number;

    if (config.type === 'rotation') {
      // Convert rotation (radians) to frame index
      // Normalize rotation to 0-2π
      let normalizedRotation = rotation % (Math.PI * 2);
      if (normalizedRotation < 0) normalizedRotation += Math.PI * 2;

      // Map to frame (0 = right, going clockwise)
      frameIndex = Math.floor((normalizedRotation / (Math.PI * 2)) * config.totalFrames);
      frameIndex = Math.min(frameIndex, config.totalFrames - 1);
    } else {
      // Animation - use provided frame
      frameIndex = frame % config.totalFrames;
    }

    // Calculate source position in sprite sheet
    const col = frameIndex % config.columns;
    const row = Math.floor(frameIndex / config.columns);
    const sx = col * config.frameWidth;
    const sy = row * config.frameHeight;

    // Draw centered at x, y
    const drawWidth = config.frameWidth * scale;
    const drawHeight = config.frameHeight * scale;

    ctx.drawImage(
      image,
      sx, sy, config.frameWidth, config.frameHeight,
      x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight
    );

    return true;
  }
}

export const spriteService = new SpriteService();
