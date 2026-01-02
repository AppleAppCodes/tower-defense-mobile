// Sprite Service - Handles loading and rendering of tower sprites
// Simplified version for single static images

export interface StaticSprite {
  image: HTMLImageElement;
  loaded: boolean;
  width: number;
  height: number;
}

// Store loaded sprites
const sprites: Map<string, StaticSprite> = new Map();

// Base64 embedded sprites - paste your image data here!
// To convert an image to Base64: https://www.base64-image.de/
const EMBEDDED_SPRITES: Record<string, string> = {
  // Paste your Base64 data here like this:
  // 'AOE_0': 'data:image/png;base64,iVBORw0KGgo...',
};

// File-based sprites (alternative to Base64)
const FILE_SPRITES: Record<string, string> = {
  'AOE_0': '/sprites/rock-thrower.png',
  // Add more: 'BASIC_0': '/sprites/slinger.png',
};

class SpriteService {
  private initPromise: Promise<void> | null = null;

  // Initialize and load all sprites
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadAllSprites();
    return this.initPromise;
  }

  private async loadAllSprites(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    // Load embedded Base64 sprites first (higher priority)
    for (const [key, base64] of Object.entries(EMBEDDED_SPRITES)) {
      loadPromises.push(this.loadImage(key, base64));
    }

    // Load file-based sprites (only if not already embedded)
    for (const [key, path] of Object.entries(FILE_SPRITES)) {
      if (!EMBEDDED_SPRITES[key]) {
        loadPromises.push(this.loadImage(key, path));
      }
    }

    await Promise.all(loadPromises);
    console.log(`Loaded ${sprites.size} sprites`);
  }

  private loadImage(key: string, src: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        sprites.set(key, {
          image: img,
          loaded: true,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        console.log(`✓ Sprite loaded: ${key} (${img.naturalWidth}x${img.naturalHeight})`);
        resolve();
      };
      img.onerror = () => {
        console.warn(`✗ Failed to load sprite: ${key}`);
        sprites.set(key, { image: img, loaded: false, width: 0, height: 0 });
        resolve();
      };
      img.src = src;
    });
  }

  // Check if a sprite is available
  hasSprite(key: string): boolean {
    return sprites.get(key)?.loaded ?? false;
  }

  // Draw sprite centered at position
  // Returns true if drawn, false if fallback needed
  drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    size: number = 50 // Target size in pixels
  ): boolean {
    const sprite = sprites.get(key);
    if (!sprite?.loaded) return false;

    const { image, width, height } = sprite;

    // Calculate scale to fit target size (maintain aspect ratio)
    const scale = size / Math.max(width, height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;

    // Draw shadow first
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + drawHeight * 0.4, drawWidth * 0.35, drawHeight * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw sprite centered
    ctx.drawImage(
      image,
      x - drawWidth / 2,
      y - drawHeight / 2,
      drawWidth,
      drawHeight
    );

    return true;
  }

  // Add a sprite dynamically (for runtime loading)
  addBase64Sprite(key: string, base64Data: string): Promise<void> {
    return this.loadImage(key, base64Data);
  }
}

export const spriteService = new SpriteService();
