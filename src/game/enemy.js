import { drawEnemy } from './enemy-sprite.js';
import { t } from '../systems/lang.js';

// def comes from monsters.json; instance comes from the map's "enemies" array.
export function createEnemy(def, instance, tileSize = 16) {
  return {
    id: instance.id,
    name: t(`monster.${instance.id}.name`),
    type: def.type ?? 'humanoid',
    sprite: def.sprite,
    stats: {
      hp: def.hp, maxHp: def.hp,
      mp: def.mp ?? 0, maxMp: def.mp ?? 0,
      atk: def.atk, def: def.def, spd: def.spd,
    },
    xpReward: def.xp,
    goldReward: def.gold,
    moves: def.moves,
    tileX: instance.x,
    tileY: instance.y,
    x: instance.x * tileSize,
    y: instance.y * tileSize,
    w: tileSize,
    h: tileSize,
    facing: instance.facing ?? 'right',
    defeated: false,
    // Set true after a successful run; cleared when the player walks off it,
    // so the same battle doesn't immediately re-trigger.
    disengaged: false,

    render(ctx, camera) {
      if (this.defeated) return;
      const sx = Math.floor(this.x - camera.x);
      const sy = Math.floor(this.y - camera.y);
      drawEnemy(ctx, sx, sy, this.sprite, this.type, 1, this.facing);
    },
  };
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
