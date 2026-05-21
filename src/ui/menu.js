import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel } from './panel.js';
import { useItem, removeItem, equipItem } from '../systems/inventory.js';
import { t } from '../systems/lang.js';

const FONT = '12px "Courier New", monospace';
const PANEL_W = 500;
const PANEL_H = 360;

export function createMenu() {
  return {
    active: false,
    selectedIndex: 0,
    flash: '',
    flashTimer: 0,

    open() {
      this.active = true;
      this.selectedIndex = 0;
      this.flash = '';
      this.flashTimer = 0;
    },

    close() { this.active = false; },

    update(dt, input, player, itemDefs) {
      if (!this.active) return;
      if (this.flashTimer > 0) this.flashTimer -= dt;

      if (input.cancelPressed() || input.menuPressed()) { this.close(); return; }

      const items = player.items;
      if (items.length === 0) return;

      if (input.upPressed())   this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
      if (input.downPressed()) this.selectedIndex = (this.selectedIndex + 1) % items.length;

      if (input.interactPressed() || input.confirmPressed()) {
        const slot = items[this.selectedIndex];
        if (!slot) return;
        const def = itemDefs[slot.id];
        if (!def) return;
        if (def.type === 'consumable') {
          const result = useItem(player, def);
          if (result.ok) removeItem(player, slot.id, 1);
          this.flash = result.message;
          this.flashTimer = 1.5;
        } else if (def.type === 'weapon' || def.type === 'armor') {
          equipItem(player, slot.id, def);
          this.flash = t('ui.menu.equippedFlash', { name: t(`item.${slot.id}.name`) });
          this.flashTimer = 1.5;
        }
        if (this.selectedIndex >= player.items.length) {
          this.selectedIndex = Math.max(0, player.items.length - 1);
        }
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
      ctx.fillText(t('ui.menu.title'), x + 16, y + 14);
      ctx.fillStyle = '#ffd060';
      const goldText = t('ui.menu.gold', { amount: player.stats.gold });
      const goldW = ctx.measureText(goldText).width;
      ctx.fillText(goldText, x + PANEL_W - goldW - 16, y + 14);

      ctx.fillStyle = '#909090';
      ctx.fillText(t('ui.menu.equipped'), x + 16, y + 42);
      const eq = player.equipment;
      const weaponName = eq.weapon ? t(`item.${eq.weapon}.name`) : t('ui.menu.none');
      const armorName = eq.armor ? t(`item.${eq.armor}.name`) : t('ui.menu.none');
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(t('ui.menu.weapon', { name: weaponName }), x + 32, y + 60);
      ctx.fillText(t('ui.menu.armor', { name: armorName }), x + 32, y + 78);

      ctx.fillStyle = '#909090';
      ctx.fillText(t('ui.menu.items'), x + 16, y + 108);
      let row = y + 126;
      if (player.items.length === 0) {
        ctx.fillStyle = '#808090';
        ctx.fillText(t('ui.menu.empty'), x + 32, row);
      } else {
        for (let i = 0; i < player.items.length; i++) {
          const slot = player.items[i];
          const def = itemDefs[slot.id];
          const sel = i === this.selectedIndex;
          ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
          ctx.fillText(sel ? '>' : ' ', x + 18, row);
          ctx.fillText(t(`item.${slot.id}.name`), x + 32, row);
          ctx.fillStyle = '#a0a0b0';
          ctx.fillText(t('ui.menu.itemQty', { qty: slot.qty }), x + 240, row);
          const tag = def?.type === 'weapon'
            ? t('ui.menu.weaponTag')
            : def?.type === 'armor'
              ? t('ui.menu.armorTag')
              : '';
          if (tag) {
            ctx.fillStyle = '#80a0c0';
            ctx.fillText(tag, x + 290, row);
          }
          row += 18;
        }
      }

      const sel = player.items[this.selectedIndex];
      if (sel) {
        ctx.fillStyle = '#a0a0b0';
        ctx.fillText(t(`item.${sel.id}.desc`), x + 18, y + PANEL_H - 70);
      }

      if (this.flashTimer > 0) {
        ctx.fillStyle = '#80e0ff';
        ctx.fillText(this.flash, x + 18, y + PANEL_H - 50);
      }

      ctx.fillStyle = '#9070d0';
      ctx.fillText(t('ui.menu.hint'), x + 18, y + PANEL_H - 24);
      ctx.restore();
    },
  };
}
