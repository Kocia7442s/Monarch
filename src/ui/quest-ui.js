import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel } from './panel.js';
import { describeProgress } from '../systems/quest.js';

const FONT = '12px "Courier New", monospace';
const PANEL_W = 520;
const PANEL_H = 360;

export function createQuestLog() {
  return {
    active: false,
    open()  { this.active = true; },
    close() { this.active = false; },

    update(_dt, input) {
      if (!this.active) return;
      if (input.cancelPressed() || input.questPressed()) this.close();
    },

    render(ctx, player, questDefs) {
      if (!this.active) return;
      ctx.save();
      ctx.font = FONT;
      ctx.textBaseline = 'top';

      const x = Math.floor((LOGICAL_WIDTH - PANEL_W) / 2);
      const y = Math.floor((LOGICAL_HEIGHT - PANEL_H) / 2);
      drawPanel(ctx, x, y, PANEL_W, PANEL_H);

      ctx.fillStyle = '#c0c0d0';
      ctx.fillText('Quest Log', x + 16, y + 14);

      const active = player.quests.filter((q) => !q.complete);
      const done = player.quests.filter((q) => q.complete);

      ctx.fillStyle = '#909090';
      ctx.fillText('ACTIVE', x + 16, y + 42);
      let row = y + 62;
      if (active.length === 0) {
        ctx.fillStyle = '#808090';
        ctx.fillText('No active quests.', x + 32, row);
        row += 20;
      } else {
        for (const q of active) {
          const def = questDefs[q.id];
          if (!def) continue;
          ctx.fillStyle = '#a070ff';
          ctx.fillText('◆', x + 24, row);
          ctx.fillStyle = '#e8e8f0';
          ctx.fillText(def.name, x + 36, row);
          ctx.fillStyle = '#80e0ff';
          ctx.fillText(describeProgress(q, def, player), x + PANEL_W - 110, row);
          ctx.fillStyle = '#a0a0b0';
          ctx.fillText(def.desc ?? '', x + 36, row + 14);
          row += 36;
        }
      }

      ctx.strokeStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 232);
      ctx.lineTo(x + PANEL_W - 12, y + 232);
      ctx.stroke();

      ctx.fillStyle = '#909090';
      ctx.fillText('COMPLETED', x + 16, y + 244);
      row = y + 264;
      if (done.length === 0) {
        ctx.fillStyle = '#606070';
        ctx.fillText('None yet.', x + 32, row);
      } else {
        for (const q of done) {
          const def = questDefs[q.id];
          if (!def) continue;
          ctx.fillStyle = '#40d060';
          ctx.fillText('✓', x + 24, row);
          ctx.fillStyle = '#a0a0b0';
          ctx.fillText(def.name, x + 36, row);
          row += 18;
        }
      }

      ctx.fillStyle = '#9070d0';
      ctx.fillText('[Esc / Q] close', x + 16, y + PANEL_H - 24);
      ctx.restore();
    },
  };
}
