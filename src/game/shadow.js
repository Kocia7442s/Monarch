import { drawEnemy } from './enemy-sprite.js';
import { t } from '../systems/lang.js';

// Shadow soldier extracted from a defeated enemy. Keeps the enemy's body shape
// but its palette is blended toward purple. Follows the player via main.js's
// trail-replay; this entity just holds position and renders itself.
export function createShadow(source, x, y) {
  const monsterId = source.id;
  return {
    monsterId,
    name: t(`monster.${monsterId}.name`),
    type: source.type ?? 'humanoid',
    sprite: tintShadow(source.sprite),
    x, y,
    w: 16,
    h: 16,
    facing: 'down',
    moving: false,

    render(ctx, camera) {
      const sx = Math.floor(this.x - camera.x);
      const sy = Math.floor(this.y - camera.y);
      // Faint purple glow underfoot.
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#7040c0';
      ctx.beginPath();
      ctx.ellipse(sx + 8, sy + 15, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawEnemy(ctx, sx, sy, this.sprite, this.type, 1, this.facing);
    },
  };
}

function tintShadow(sprite) {
  return {
    body: blend(sprite.body, '#7040c0', 0.65),
    head: blend(sprite.head, '#7040c0', 0.55),
    eyes: '#c0a0ff',
    weapon: sprite.weapon ? blend(sprite.weapon, '#5030a0', 0.6) : null,
  };
}

function blend(hex1, hex2, t) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  const r = Math.round(a.r * (1 - t) + b.r * t);
  const g = Math.round(a.g * (1 - t) + b.g * t);
  const bl = Math.round(a.b * (1 - t) + b.b * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function toHex(n) {
  return n.toString(16).padStart(2, '0');
}
