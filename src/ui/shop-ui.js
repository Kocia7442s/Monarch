import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel } from './panel.js';
import { addItem } from '../systems/inventory.js';

const FONT = '12px "Courier New", monospace';
const PANEL_W = 500;
const PANEL_H = 320;

export function createShop() {
  return {
    active: false,
    title: '',
    stock: [],         // array of item ids
    selectedIndex: 0,
    flash: '',         // transient feedback
    flashTimer: 0,

    open(npc) {
      this.active = true;
      this.title = `${npc.name}'s Shop`;
      this.stock = npc.shop ?? [];
      this.selectedIndex = 0;
      this.flash = '';
      this.flashTimer = 0;
    },

    close() { this.active = false; },

    update(dt, input, player, itemDefs) {
      if (!this.active) return;
      if (this.flashTimer > 0) this.flashTimer -= dt;

      if (this.stock.length === 0) {
        if (input.cancelPressed()) this.close();
        return;
      }
      if (input.upPressed())
        this.selectedIndex = (this.selectedIndex - 1 + this.stock.length) % this.stock.length;
      if (input.downPressed())
        this.selectedIndex = (this.selectedIndex + 1) % this.stock.length;
      if (input.cancelPressed()) { this.close(); return; }
      if (input.interactPressed() || input.confirmPressed()) {
        const id = this.stock[this.selectedIndex];
        const def = itemDefs[id];
        if (!def) return;
        if (player.stats.gold < def.price) {
          this.flash = 'Not enough gold.';
          this.flashTimer = 1.5;
          return;
        }
        player.stats.gold -= def.price;
        addItem(player, id, 1);
        this.flash = `Bought ${def.name}.`;
        this.flashTimer = 1.5;
      }
    },

    render(ctx, player, itemDefs) {
      if (!this.active) return;
      ctx.save();
      ctx.font = FONT;
      ctx.textBaseline = 'top';

      const x = Math.floor((LOGICAL_WIDTH - PANEL_W) / 2);
      const y = Math.floor((LOGICAL_HEIGHT - PANEL_H) / 2);
      drawPanel(ctx, x, y, PANEL_W, PANEL_H);

      ctx.fillStyle = '#c0c0d0';
      ctx.fillText(this.title, x + 16, y + 14);
      ctx.fillStyle = '#ffd060';
      ctx.fillText(`Gold: ${player.stats.gold}`, x + PANEL_W - 110, y + 14);

      ctx.strokeStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 36);
      ctx.lineTo(x + PANEL_W - 12, y + 36);
      ctx.stroke();

      let row = y + 50;
      for (let i = 0; i < this.stock.length; i++) {
        const id = this.stock[i];
        const def = itemDefs[id];
        if (!def) continue;
        const owned = player.items.find((s) => s.id === id)?.qty ?? 0;
        const sel = i === this.selectedIndex;
        ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
        ctx.fillText(sel ? '>' : ' ', x + 18, row);
        ctx.fillText(def.name, x + 32, row);
        ctx.fillStyle = player.stats.gold >= def.price ? '#ffd060' : '#a0606a';
        ctx.fillText(`${def.price}g`, x + 280, row);
        ctx.fillStyle = '#909090';
        ctx.fillText(`owned: ${owned}`, x + 360, row);
        row += 20;
      }

      ctx.strokeStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 220);
      ctx.lineTo(x + PANEL_W - 12, y + 220);
      ctx.stroke();

      const selDef = itemDefs[this.stock[this.selectedIndex]];
      if (selDef) {
        ctx.fillStyle = '#a0a0b0';
        ctx.fillText(selDef.desc ?? '', x + 18, y + 232);
      }

      if (this.flashTimer > 0) {
        ctx.fillStyle = this.flash.startsWith('Not') ? '#d04040' : '#80e0ff';
        ctx.fillText(this.flash, x + 18, y + 256);
      }

      ctx.fillStyle = '#9070d0';
      ctx.fillText('[E] buy   [Esc] leave', x + 18, y + PANEL_H - 24);
      ctx.restore();
    },
  };
}
