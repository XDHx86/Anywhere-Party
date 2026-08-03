/**
 * Ephemeral Overlay
 *
 * Manages transient visual elements (laser pointer trails) that are:
 * - NOT persisted
 * - NOT synced to other participants
 * - NOT part of the undo/redo stack
 * - Auto-expire after a configurable timeout
 *
 * Rendered in a separate DOM overlay layer with independent cleanup.
 */

export interface EphemeralTrail {
  id: string;
  points: Array<{ x: number; y: number; timestamp: number }>;
  color: string;
  createdAt: number;
}

export interface EphemeralOverlayConfig {
  /** How long each trail persists (ms) before fade starts */
  trailDuration: number;
  /** Fade-out duration (ms) */
  fadeDuration: number;
  /** Maximum number of concurrent trails */
  maxTrails: number;
  /** Stroke width for trail rendering */
  trailWidth: number;
}

const DEFAULT_CONFIG: EphemeralOverlayConfig = {
  trailDuration: 2000,
  fadeDuration: 500,
  maxTrails: 50,
  trailWidth: 3,
};

export class EphemeralOverlay {
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private trails: Map<string, EphemeralTrail> = new Map();
  private renderTimer: number | null = null;
  private config: EphemeralOverlayConfig;
  private nextId = 0;

  constructor(config?: Partial<EphemeralOverlayConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create the overlay DOM elements inside a parent container.
   */
  attach(parent: HTMLElement): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'ephemeral-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    // Set canvas size
    const rect = parent.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.ctx = this.canvas.getContext('2d');

    this.startRenderLoop();
  }

  /**
   * Remove overlay DOM elements and stop rendering.
   */
  detach(): void {
    this.stopRenderLoop();
    this.trails.clear();

    if (this.container) {
      this.container.remove();
      this.container = null;
      this.canvas = null;
      this.ctx = null;
    }
  }

  /**
   * Start a new laser pointer trail at the given position.
   */
  startTrail(x: number, y: number, color: string = '#ff0000'): string {
    // Enforce max trails
    if (this.trails.size >= this.config.maxTrails) {
      const oldest = this.trails.keys().next().value;
      if (oldest) this.trails.delete(oldest);
    }

    const id = `ephemeral_${this.nextId++}`;
    this.trails.set(id, {
      id,
      points: [{ x, y, timestamp: Date.now() }],
      color,
      createdAt: Date.now(),
    });
    return id;
  }

  /**
   * Continue an existing trail with a new point.
   */
  continueTrail(trailId: string, x: number, y: number): void {
    const trail = this.trails.get(trailId);
    if (!trail) return;

    trail.points.push({ x, y, timestamp: Date.now() });

    // Limit trail length to prevent memory growth
    if (trail.points.length > 200) {
      trail.points = trail.points.slice(-200);
    }
  }

  /**
   * Finish a trail (starts the fade timer).
   */
  finishTrail(_trailId: string): void {
    // Trail will auto-fade based on its createdAt + trailDuration
    // No explicit action needed — the render loop handles it
  }

  /**
   * Clear all trails immediately.
   */
  clearAll(): void {
    this.trails.clear();
  }

  // ─── Render Loop ───────────────────────────────────────

  private startRenderLoop(): void {
    this.stopRenderLoop();
    this.renderTimer = window.setInterval(() => this.render(), 16); // ~60fps
  }

  private stopRenderLoop(): void {
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const now = Date.now();

    for (const [id, trail] of this.trails) {
      const age = now - trail.createdAt;

      // Remove expired trails
      if (age > this.config.trailDuration + this.config.fadeDuration) {
        this.trails.delete(id);
        continue;
      }

      // Calculate alpha based on age
      let alpha = 1;
      if (age > this.config.trailDuration) {
        const fadeProgress = (age - this.config.trailDuration) / this.config.fadeDuration;
        alpha = Math.max(0, 1 - fadeProgress);
      }

      if (trail.points.length < 2) continue;

      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = trail.color;
      this.ctx.lineWidth = this.config.trailWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(trail.points[0].x, trail.points[0].y);

      for (let i = 1; i < trail.points.length; i++) {
        this.ctx.lineTo(trail.points[i].x, trail.points[i].y);
      }

      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;
  }
}
