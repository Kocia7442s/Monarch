import { LOGICAL_WIDTH } from '../engine/canvas.js';
import { drawPanel } from './panel.js';
import { t } from '../systems/lang.js';

// "[SYSTEM]" toast: slides down from above on appear, holds, fades out.
// Toasts stack vertically. Rendered last so they overlay everything.

const FONT = '12px "Courier New", monospace';
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
      toasts.push({ text, color, duration, elapsed: 0 });
    },

    update(dt) {
      for (const toast of toasts) toast.elapsed += dt;
      while (toasts.length > 0 && toasts[0].elapsed >= toasts[0].duration) {
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
      const prefix = t('system.prefix');
      const prefixW = ctx.measureText(prefix + ' ').width;
      for (const toast of toasts) {
        const alpha = computeAlpha(toast);
        const yOffset = computeSlideOffset(toast);
        const drawY = y + yOffset;

        ctx.globalAlpha = alpha;
        drawPanel(ctx, baseX, drawY, TOAST_W, TOAST_H);

        ctx.fillStyle = PREFIX_COLOR;
        ctx.fillText(prefix, baseX + 10, drawY + 7);
        ctx.fillStyle = toast.color;
        ctx.fillText(toast.text, baseX + 10 + prefixW, drawY + 7);

        y += TOAST_H + STACK_GAP;
      }
      ctx.restore();
    },
  };
}

function computeAlpha(toast) {
  if (toast.elapsed < SLIDE) return toast.elapsed / SLIDE;
  if (toast.elapsed > toast.duration - FADE) return Math.max(0, (toast.duration - toast.elapsed) / FADE);
  return 1;
}

function computeSlideOffset(toast) {
  if (toast.elapsed < SLIDE) return Math.floor((1 - toast.elapsed / SLIDE) * -16);
  return 0;
}
