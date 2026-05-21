import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel } from './panel.js';
import { t } from '../systems/lang.js';

const CHARS_PER_SEC = 50;
const PADDING = 8;
const BOX_HEIGHT = 96;
const FONT = '12px "Courier New", monospace';
const LINE_H = 14;

export function createDialog() {
  return {
    active: false,
    speaker: '',
    speakerColor: '#a070ff',
    pages: [],
    pageIndex: 0,
    elapsed: 0,

    start(speaker, pages, speakerColor = '#a070ff') {
      this.active = true;
      this.speaker = speaker;
      this.speakerColor = speakerColor;
      this.pages = Array.isArray(pages) ? pages : [pages];
      this.pageIndex = 0;
      this.elapsed = 0;
    },

    update(dt) {
      if (this.active) this.elapsed += dt;
    },

    currentPage() { return this.pages[this.pageIndex] ?? ''; },
    charsToShow() {
      return Math.min(this.currentPage().length, Math.floor(this.elapsed * CHARS_PER_SEC));
    },
    isPageComplete() { return this.charsToShow() >= this.currentPage().length; },

    advance() {
      if (!this.active) return;
      if (!this.isPageComplete()) {
        // First press finishes the typewriter on the current page.
        this.elapsed = this.currentPage().length / CHARS_PER_SEC + 0.01;
        return;
      }
      this.pageIndex++;
      this.elapsed = 0;
      if (this.pageIndex >= this.pages.length) this.active = false;
    },

    render(ctx) {
      if (!this.active) return;
      ctx.save();
      ctx.font = FONT;
      ctx.textBaseline = 'top';

      const x = PADDING;
      const y = LOGICAL_HEIGHT - BOX_HEIGHT - PADDING;
      const w = LOGICAL_WIDTH - PADDING * 2;
      const h = BOX_HEIGHT;

      drawPanel(ctx, x, y, w, h);

      ctx.fillStyle = this.speakerColor;
      ctx.fillText(this.speaker, x + 10, y + 8);

      // Wrap is computed from the FULL page so revealed text doesn't reflow.
      const lines = wrapLines(ctx, this.currentPage(), w - 20);
      let charsLeft = this.charsToShow();
      let cy = y + 28;
      ctx.fillStyle = '#e8e8f0';
      for (const line of lines) {
        if (charsLeft <= 0) break;
        const visible = line.substring(0, charsLeft);
        ctx.fillText(visible, x + 10, cy);
        charsLeft -= line.length + 1; // +1 accounts for the dropped space
        cy += LINE_H;
      }

      if (this.isPageComplete()) {
        const isLast = this.pageIndex >= this.pages.length - 1;
        const prompt = isLast ? t('ui.dialog.close') : t('ui.dialog.next');
        ctx.fillStyle = '#9070d0';
        const tw = ctx.measureText(prompt).width;
        ctx.fillText(prompt, x + w - tw - 10, y + h - 18);
      }

      ctx.restore();
    },
  };
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
