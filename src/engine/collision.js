export function isBlocked(map, tileX, tileY) {
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return true;
  return map.collision[tileY][tileX] === 1;
}

// Axis-separated AABB sweep against the tile grid (and optional solid
// entities). Lets the player slide along walls instead of getting stuck
// when moving diagonally into a corner.
export function moveAndCollide(entity, dx, dy, map, solids = []) {
  entity.x += dx;
  resolveAxis(entity, map, 'x', dx, solids);
  entity.y += dy;
  resolveAxis(entity, map, 'y', dy, solids);
}

function resolveAxis(e, map, axis, delta, solids) {
  if (delta === 0) return;
  const ts = map.tileSize;
  const minX = Math.floor(e.x / ts);
  const minY = Math.floor(e.y / ts);
  const maxX = Math.floor((e.x + e.w - 1) / ts);
  const maxY = Math.floor((e.y + e.h - 1) / ts);

  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (!isBlocked(map, tx, ty)) continue;
      if (axis === 'x') {
        if (delta > 0) e.x = tx * ts - e.w;
        else e.x = (tx + 1) * ts;
      } else {
        if (delta > 0) e.y = ty * ts - e.h;
        else e.y = (ty + 1) * ts;
      }
      return;
    }
  }

  for (const o of solids) {
    if (o === e) continue;
    if (e.x + e.w <= o.x || o.x + o.w <= e.x) continue;
    if (e.y + e.h <= o.y || o.y + o.h <= e.y) continue;
    if (axis === 'x') {
      if (delta > 0) e.x = o.x - e.w;
      else e.x = o.x + o.w;
    } else {
      if (delta > 0) e.y = o.y - e.h;
      else e.y = o.y + o.h;
    }
    return;
  }
}
