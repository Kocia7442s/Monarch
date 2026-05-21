import { drawCharacter } from './character-sprite.js';

// def comes from npcs.json (name, dialog, sprite colors).
// instance comes from the map's "npcs" array (id, x, y, facing).
export function createNPC(def, instance, tileSize = 16) {
  return {
    id: instance.id,
    name: def.name,
    kind: def.kind ?? 'normal',
    shop: def.shop ?? null,
    speakerColor: def.speakerColor ?? '#a070ff',
    sprite: def.sprite,
    dialog: def.dialog ?? [],
    tileX: instance.x,
    tileY: instance.y,
    // Match the player's 12x14 hitbox centered in the 16x16 tile.
    x: instance.x * tileSize + 2,
    y: instance.y * tileSize + 2,
    w: 12,
    h: 14,
    facing: instance.facing ?? 'down',

    facePlayer(player) {
      const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
    },

    render(ctx, camera) {
      const sx = Math.floor(this.x - 2 - camera.x);
      const sy = Math.floor(this.y - 2 - camera.y);
      drawCharacter(ctx, sx, sy, this.sprite, this.facing, 0, false);
    },
  };
}

// Returns the NPC standing on the tile directly in front of the player, or null.
export function findInteractable(player, npcs, tileSize) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  let tx = Math.floor(px / tileSize);
  let ty = Math.floor(py / tileSize);
  if (player.facing === 'up') ty -= 1;
  else if (player.facing === 'down') ty += 1;
  else if (player.facing === 'left') tx -= 1;
  else if (player.facing === 'right') tx += 1;
  for (const npc of npcs) {
    if (npc.tileX === tx && npc.tileY === ty) return npc;
  }
  return null;
}
