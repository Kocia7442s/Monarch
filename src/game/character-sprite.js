// Programmatic 16x16 character sprite. Replaced by spritesheet sampling later.
// (sx, sy) is the top-left screen pixel of the sprite box. scale multiplies
// pixel sizes so the same sprite can be drawn larger in the battle screen.
export function drawCharacter(ctx, sx, sy, colors, facing, frame, moving, scale = 1) {
  const s = scale;
  const bob = moving && frame === 1 ? 1 : 0;

  ctx.fillStyle = colors.body;
  ctx.fillRect(sx + 4 * s, sy + (8 - bob) * s, 8 * s, 6 * s);

  ctx.fillStyle = colors.skin;
  ctx.fillRect(sx + 5 * s, sy + 2 * s, 6 * s, 6 * s);

  ctx.fillStyle = colors.hair;
  ctx.fillRect(sx + 5 * s, sy + 2 * s, 6 * s, 2 * s);

  ctx.fillStyle = colors.legs ?? colors.body;
  if (frame === 0 || !moving) {
    ctx.fillRect(sx + 5 * s, sy + 14 * s, 2 * s, 2 * s);
    ctx.fillRect(sx + 9 * s, sy + 14 * s, 2 * s, 2 * s);
  } else {
    ctx.fillRect(sx + 4 * s, sy + 14 * s, 2 * s, 2 * s);
    ctx.fillRect(sx + 10 * s, sy + 14 * s, 2 * s, 2 * s);
  }

  ctx.fillStyle = colors.eyes;
  switch (facing) {
    case 'up':    ctx.fillRect(sx + 7 * s, sy + 4 * s, 2 * s, 1 * s); break;
    case 'down':  ctx.fillRect(sx + 7 * s, sy + 6 * s, 2 * s, 1 * s); break;
    case 'left':  ctx.fillRect(sx + 5 * s, sy + 5 * s, 1 * s, 2 * s); break;
    case 'right': ctx.fillRect(sx + 10 * s, sy + 5 * s, 1 * s, 2 * s); break;
  }
}
