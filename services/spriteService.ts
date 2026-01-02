// Sprite Service - Handles loading and rendering of animated sprite sheets

export interface SpriteConfig {
  src: string;           // Path to sprite sheet or Base64 data
  frameWidth: number;    // Width of single frame
  frameHeight: number;   // Height of single frame
  columns: number;       // Frames per row
  rows: number;          // Number of rows
  totalFrames: number;   // Total animation frames
}

export interface LoadedSprite {
  image: HTMLImageElement;
  config: SpriteConfig;
  loaded: boolean;
}

// Sprite configurations - add your sprites here!
const SPRITE_CONFIGS: Record<string, SpriteConfig> = {
  // Stone Age Rock Thrower (AOE tower in era 0)
  'AOE_0': {
    src: '/sprites/rock-thrower.png',
    frameWidth: 165,   // ~1000px / 6 columns
    frameHeight: 165,  // ~1155px / 7 rows
    columns: 6,
    rows: 7,
    totalFrames: 42    // 6x7 grid
  },
  // Add more sprites:
  // 'BASIC_0': { src: '/sprites/slinger.png', ... },
};

// Store loaded sprites
const sprites: Map<string, LoadedSprite> = new Map();

class SpriteService {
  private initPromise: Promise<void> | null = null;

  // Initialize and load all sprites
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.loadAllSprites();
    return this.initPromise;
  }

  private async loadAllSprites(): Promise<void> {
    const promises = Object.entries(SPRITE_CONFIGS).map(([key, config]) =>
      this.loadImage(key, config)
    );
    await Promise.all(promises);
    console.log(`Loaded ${sprites.size} sprite sheets`);
  }

  private loadImage(key: string, config: SpriteConfig): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        sprites.set(key, { image: img, config, loaded: true });
        console.log(`✓ Sprite loaded: ${key}`);
        resolve();
      };
      img.onerror = () => {
        console.warn(`✗ Failed to load: ${key} from ${config.src}`);
        sprites.set(key, { image: img, config, loaded: false });
        resolve();
      };
      img.src = config.src;
    });
  }

  // Check if sprite is available
  hasSprite(key: string): boolean {
    return sprites.get(key)?.loaded ?? false;
  }

  // Draw a specific animation frame
  // animationProgress: 0.0 to 1.0 (0 = start, 1 = end of animation)
  drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    size: number = 50,
    animationProgress: number = 0 // 0-1 for animation frame
  ): boolean {
    const sprite = sprites.get(key);
    if (!sprite?.loaded) return false;

    const { image, config } = sprite;

    // Calculate which frame to show based on animation progress
    const frameIndex = Math.min(
      Math.floor(animationProgress * config.totalFrames),
      config.totalFrames - 1
    );

    // Calculate position in sprite sheet
    const col = frameIndex % config.columns;
    const row = Math.floor(frameIndex / config.columns);
    const sx = col * config.frameWidth;
    const sy = row * config.frameHeight;

    // Calculate draw size (maintain aspect ratio)
    const scale = size / Math.max(config.frameWidth, config.frameHeight);
    const drawWidth = config.frameWidth * scale;
    const drawHeight = config.frameHeight * scale;

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + drawHeight * 0.35, drawWidth * 0.3, drawHeight * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw sprite frame
    ctx.drawImage(
      image,
      sx, sy, config.frameWidth, config.frameHeight,  // Source rectangle
      x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight  // Destination
    );

    return true;
  }
}

export const spriteService = new SpriteService();
