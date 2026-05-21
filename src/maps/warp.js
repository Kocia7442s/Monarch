import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';

const FADE_DURATION = 0.4;

// Phase flow:
//   idle   -> beginPending() -> pending      (waiting on async map load)
//   pending -> beginFade(cb) -> fade-out     (animating to black)
//   fade-out -> (cb fires at full black) -> fade-in
//   fade-in -> idle
export function createTransition() {
  return {
    phase: 'idle',
    alpha: 0,
    t: 0,
    duration: FADE_DURATION,
    pendingSwap: null,

    isActive() { return this.phase !== 'idle'; },

    beginPending() {
      this.phase = 'pending';
      this.alpha = 0;
      this.t = 0;
    },

    beginFade(swapCallback) {
      this.phase = 'fade-out';
      this.alpha = 0;
      this.t = 0;
      this.pendingSwap = swapCallback;
    },

    update(dt) {
      if (this.phase === 'idle' || this.phase === 'pending') return;
      this.t += dt;
      const progress = Math.min(1, this.t / this.duration);
      if (this.phase === 'fade-out') {
        this.alpha = progress;
        if (progress >= 1) {
          if (this.pendingSwap) {
            this.pendingSwap();
            this.pendingSwap = null;
          }
          this.phase = 'fade-in';
          this.t = 0;
        }
      } else if (this.phase === 'fade-in') {
        this.alpha = 1 - progress;
        if (progress >= 1) {
          this.phase = 'idle';
          this.alpha = 0;
        }
      }
    },

    render(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.restore();
    },
  };
}

export function warpAt(player, warps, tileSize) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const tx = Math.floor(px / tileSize);
  const ty = Math.floor(py / tileSize);
  for (const w of warps) {
    if (w.x === tx && w.y === ty) return w;
  }
  return null;
}
