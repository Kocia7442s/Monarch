// Named tiles -> { ground id, decoration id, solid }.
// The renderer's TILE_COLORS keys must include every g/d id used here.
const TILES = {
  grass:        { g: 1,  d: 0,  solid: false },
  darkgrass:    { g: 2,  d: 0,  solid: false },
  path:         { g: 3,  d: 0,  solid: false },
  stonepath:    { g: 8,  d: 0,  solid: false },
  wall:         { g: 4,  d: 0,  solid: true  },
  water:        { g: 5,  d: 0,  solid: true  },
  tree:         { g: 1,  d: 7,  solid: true  },
  buildingWall: { g: 1,  d: 10, solid: true  },
  roof:         { g: 1,  d: 11, solid: true  },
  door:         { g: 8,  d: 12, solid: true  },
  gateE:        { g: 3,  d: 15, solid: false },
  gateD:        { g: 3,  d: 16, solid: true  },
  flower:       { g: 1,  d: 14, solid: false },
  dungeonFloor: { g: 17, d: 0,  solid: false },
  dungeonWall:  { g: 18, d: 0,  solid: true  },
  dungeonExit:  { g: 17, d: 19, solid: false },
};

function placeAt(map, x, y, tileName) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
  const t = TILES[tileName];
  if (!t) { console.warn(`map-loader: unknown tile "${tileName}"`); return; }
  map.ground[y][x] = t.g;
  map.decoration[y][x] = t.d;
  map.collision[y][x] = t.solid ? 1 : 0;
}

function placeRect(map, x, y, w, h, tileName) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      placeAt(map, x + dx, y + dy, tileName);
}

// Manhattan path; diagonal endpoints become an L-shape.
function placeLine(map, x1, y1, x2, y2, tileName) {
  const sx = x1 <= x2 ? 1 : -1;
  const sy = y1 <= y2 ? 1 : -1;
  if (x1 === x2) {
    for (let y = y1; y !== y2 + sy; y += sy) placeAt(map, x1, y, tileName);
  } else if (y1 === y2) {
    for (let x = x1; x !== x2 + sx; x += sx) placeAt(map, x, y1, tileName);
  } else {
    for (let x = x1; x !== x2 + sx; x += sx) placeAt(map, x, y1, tileName);
    for (let y = y1; y !== y2 + sy; y += sy) placeAt(map, x2, y, tileName);
  }
}

export async function loadMap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`map-loader: failed to fetch ${url} (${res.status})`);
  const def = await res.json();

  const W = def.width;
  const H = def.height;
  const ts = def.tileSize ?? 16;
  const base = TILES[def.fill ?? 'grass'];

  const ground = [];
  const decoration = [];
  const collision = [];
  for (let y = 0; y < H; y++) {
    ground.push(new Array(W).fill(base.g));
    decoration.push(new Array(W).fill(base.d));
    collision.push(new Array(W).fill(base.solid ? 1 : 0));
  }
  const map = { width: W, height: H, tileSize: ts, ground, decoration, collision };

  if (def.border !== false) {
    const b = typeof def.border === 'string' ? def.border : 'wall';
    placeRect(map, 0, 0, W, 1, b);
    placeRect(map, 0, H - 1, W, 1, b);
    placeRect(map, 0, 0, 1, H, b);
    placeRect(map, W - 1, 0, 1, H, b);
  }

  for (const r of def.rects ?? []) placeRect(map, r.x, r.y, r.w, r.h, r.tile);
  for (const p of def.paths ?? []) placeLine(map, p.x1, p.y1, p.x2, p.y2, p.tile ?? 'stonepath');

  for (const b of def.buildings ?? []) {
    const roofH = Math.floor(b.h / 2);
    const wallH = b.h - roofH;
    placeRect(map, b.x, b.y, b.w, roofH, 'roof');
    placeRect(map, b.x, b.y + roofH, b.w, wallH, 'buildingWall');
    if (b.doorX !== undefined) placeAt(map, b.doorX, b.y + b.h - 1, 'door');
  }

  // Gates carve through the border wall and recolor it for the rank.
  for (const g of def.gates ?? []) {
    placeAt(map, g.x, g.y, g.rank === 'E' ? 'gateE' : 'gateD');
  }

  for (const d of def.decorations ?? []) {
    for (const [x, y] of d.positions) placeAt(map, x, y, d.tile);
  }

  map.spawn = def.spawn ?? { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  map.name = def.name ?? 'unnamed';
  map.npcs = def.npcs ?? [];
  map.enemies = def.enemies ?? [];
  map.warps = def.warps ?? [];
  return map;
}
