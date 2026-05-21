import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel } from './panel.js';
import { addItem } from '../systems/inventory.js';
import { t } from '../systems/lang.js';

const FONT = '12px "Courier New", monospace';
const PANEL_W = 500;
const PANEL_H = 320;

export function createShop() {
  return {
    active: false,
    npcName: '',
    stock: [],
    selectedIndex: 0,
    flash: '',
    flashTimer: 0,

    open(npc) {
      this.active = true;
      this.npcName = npc.name;
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
          this.flash = t('ui.shop.notEnoughGold');
          this.flashTimer = 1.5;
          return;
        }
        player.stats.gold -= def.price;
        addItem(player, id, 1);
        this.flash = t('ui.shop.bought', { name: t(`item.${id}.name`) });
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
      ctx.fillText(t('ui.shop.title', { name: this.npcName }), x + 16, y + 14);
      ctx.fillStyle = '#ffd060';
      const goldText = t('ui.shop.gold', { amount: player.stats.gold });
      const goldW = ctx.measureText(goldText).width;
      ctx.fillText(goldText, x + PANEL_W - goldW - 16, y + 14);

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
        ctx.fillText(t(`item.${id}.name`), x + 32, row);
        ctx.fillStyle = player.stats.gold >= def.price ? '#ffd060' : '#a0606a';
        ctx.fillText(t('ui.shop.priceGold', { price: def.price }), x + 280, row);
        ctx.fillStyle = '#909090';
        ctx.fillText(t('ui.shop.owned', { qty: owned }), x + 360, row);
        row += 20;
      }

      ctx.strokeStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 220);
      ctx.lineTo(x + PANEL_W - 12, y + 220);
      ctx.stroke();

      const selId = this.stock[this.selectedIndex];
      if (selId) {
        ctx.fillStyle = '#a0a0b0';
        ctx.fillText(t(`item.${selId}.desc`), x + 18, y + 232);
      }

      if (this.flashTimer > 0) {
        ctx.fillStyle = this.flash === t('ui.shop.notEnoughGold') ? '#d04040' : '#80e0ff';
        ctx.fillText(this.flash, x + 18, y + 256);
      }

      ctx.fillStyle = '#9070d0';
      ctx.fillText(t('ui.shop.hint'), x + 18, y + PANEL_H - 24);
      ctx.restore();
    },
  };
}
