import { createShadow } from '../game/shadow.js';

export function maxShadowCount(player) {
  return 2 + Math.floor(player.stats.level / 3);
}

export function canArise(player) {
  return player.skills.includes('arise') && player.shadows.length < maxShadowCount(player);
}

export function shadowArmyFull(player) {
  return player.skills.includes('arise') && player.shadows.length >= maxShadowCount(player);
}

// `source` needs: name, type, sprite. Both the overworld enemy entity and the
// battle's local enemy object satisfy this.
export function extractShadow(player, source) {
  const shadow = createShadow(source, player.x, player.y);
  player.shadows.push(shadow);
  return shadow;
}
