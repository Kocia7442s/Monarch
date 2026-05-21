import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';

// Programmatic tile palette. Real tilesets drop in here later.
const TILE_COLORS = {
  0: '#1a1f2e', // void / out of bounds
  1: '#3a6b3a', // grass
  2: '#2a4a2a', // dark grass
  3: '#6b5a3a', // dirt path
  4: '#4a4a5a', // outer stone wall
  5: '#2a5a7a', // water
  6: '#5a3a2a', // tree trunk (unused for now)
  7: '#1f4a1f', // tree foliage
  8: '#7a7a8a', // stone path
  10: '#4a3a4a', // building wall
  11: '#6b3030', // roof
  12: '#8b5a2b', // door
  13: '#c8b890', // sand
  14: '#d070a0', // flower
  15: '#40c060', // E-rank gate
  16: '#4080d0', // D-rank gate
  17: '#2a2638', // dungeon floor
  18: '#0d0a1a', // dungeon wall
  19: '#a040ff', // dungeon exit portal
};

export function renderMap(ctx, map, camera) {
  const ts = map.tileSize;

  const startX = Math.max(0, Math.floor(camera.x / ts));
  const startY = Math.max(0, Math.floor(camera.y / ts));
  const endX = Math.min(map.width, Math.ceil((camera.x + LOGICAL_WIDTH) / ts));
  const endY = Math.min(map.height, Math.ceil((camera.y + LOGICAL_HEIGHT) / ts));

  for (let ty = startY; ty < endY; ty++) {
    for (let tx = startX; tx < endX; tx++) {
      const id = map.ground[ty][tx];
      ctx.fillStyle = TILE_COLORS[id] ?? '#000';
      ctx.fillRect(
        Math.floor(tx * ts - camera.x),
        Math.floor(ty * ts - camera.y),
        ts,
        ts,
      );
      const deco = map.decoration?.[ty]?.[tx];
      if (deco) {
        ctx.fillStyle = TILE_COLORS[deco] ?? '#f0f';
        ctx.fillRect(
          Math.floor(tx * ts - camera.x),
          Math.floor(ty * ts - camera.y),
          ts,
          ts,
        );
      }
    }
  }
}
