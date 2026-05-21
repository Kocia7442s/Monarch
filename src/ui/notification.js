import { LOGICAL_WIDTH } from '../engine/canvas.js';
import { drawPanel } from './panel.js';

// "[SYSTEM]" toast: slides down from above on appear, holds, fades out.
// Toasts stack vertically. Rendered last so they overlay everything.

const FONT = '12px "Courier New", monospace';
const PREFIX = '[SYSTEM]';
const PREFIX_COLOR = '#a070ff';

const TOAST_W = 360;
const TOAST_H = 26;
const STACK_GAP = 4;
const SLIDE = 0.25;
const FADE = 0.5;
const DEFAULT_DURATION = 3.0;

export function createNotificationSystem() {
  const toasts = [];

  return {
    push({ text, color = '#e8e8f0', duration = DEFAULT_DURATION }) {
      toasts.push({ text, color, duration, t: 0 });
    },

    update(dt) {
      for (const t of toasts) t.t += dt;
      while (toasts.length > 0 && toasts[0].t >= toasts[0].duration) {
        toasts.shift();
      }
    },

    render(ctx) {
      if (toasts.length === 0) return;
      ctx.save();
      ctx.font = FONT;
      ctx.textBaseline = 'top';

      const baseX = Math.floor((LOGICAL_WIDTH - TOAST_W) / 2);
      let y = 10;
      for (const t of toasts) {
        const alpha = computeAlpha(t);
        const yOffset = computeSlideOffset(t);
        const drawY = y + yOffset;

        ctx.globalAlpha = alpha;
        drawPanel(ctx, baseX, drawY, TOAST_W, TOAST_H);

        ctx.fillStyle = PREFIX_COLOR;
        ctx.fillText(PREFIX, baseX + 10, drawY + 7);
        const prefixW = ctx.measureText(PREFIX + ' ').width;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, baseX + 10 + prefixW, drawY + 7);

        y += TOAST_H + STACK_GAP;
      }
      ctx.restore();
    },
  };
}

function computeAlpha(t) {
  if (t.t < SLIDE) return t.t / SLIDE;
  if (t.t > t.duration - FADE) return Math.max(0, (t.duration - t.t) / FADE);
  return 1;
}

function computeSlideOffset(t) {
  if (t.t < SLIDE) return Math.floor((1 - t.t / SLIDE) * -16);
  return 0;
}
