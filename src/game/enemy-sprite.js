// Programmatic 16x16 enemy sprites. Each "type" has its own draw routine.
// Pass facing='left' to mirror horizontally (used so battle enemies face the
// player on the left side of the screen).
export function drawEnemy(ctx, sx, sy, sprite, type, scale = 1, facing = 'right') {
  if (facing === 'left') {
    ctx.save();
    ctx.translate(sx + 16 * scale, sy);
    ctx.scale(-1, 1);
    drawCore(ctx, 0, 0, sprite, type, scale);
    ctx.restore();
  } else {
    drawCore(ctx, sx, sy, sprite, type, scale);
  }
}

function drawCore(ctx, sx, sy, sp, type, scale) {
  if (type === 'humanoid') drawHumanoid(ctx, sx, sy, sp, scale);
  else if (type === 'quadruped') drawQuadruped(ctx, sx, sy, sp, scale);
  else drawHumanoid(ctx, sx, sy, sp, scale);
}

function px(ctx, sx, sy, ox, oy, w, h, s) {
  ctx.fillRect(sx + ox * s, sy + oy * s, w * s, h * s);
}

function drawHumanoid(ctx, sx, sy, sp, s) {
  ctx.fillStyle = sp.body;
  px(ctx, sx, sy, 4, 8, 8, 6, s);
  px(ctx, sx, sy, 5, 14, 2, 2, s);
  px(ctx, sx, sy, 9, 14, 2, 2, s);

  ctx.fillStyle = sp.head;
  px(ctx, sx, sy, 5, 2, 6, 6, s);
  // Pointy ears
  px(ctx, sx, sy, 4, 2, 1, 2, s);
  px(ctx, sx, sy, 11, 2, 1, 2, s);

  ctx.fillStyle = sp.eyes;
  px(ctx, sx, sy, 6, 5, 1, 1, s);
  px(ctx, sx, sy, 9, 5, 1, 1, s);

  if (sp.weapon) {
    ctx.fillStyle = sp.weapon;
    px(ctx, sx, sy, 12, 8, 1, 6, s);
    px(ctx, sx, sy, 11, 7, 3, 2, s); // club head
  }
}

function drawQuadruped(ctx, sx, sy, sp, s) {
  ctx.fillStyle = sp.body;
  px(ctx, sx, sy, 2, 8, 11, 4, s);   // body
  px(ctx, sx, sy, 1, 9, 1, 2, s);    // tail base
  // 4 legs
  px(ctx, sx, sy, 3, 12, 1, 3, s);
  px(ctx, sx, sy, 6, 12, 1, 3, s);
  px(ctx, sx, sy, 9, 12, 1, 3, s);
  px(ctx, sx, sy, 12, 12, 1, 3, s);

  ctx.fillStyle = sp.head;
  px(ctx, sx, sy, 11, 6, 4, 4, s);   // head
  px(ctx, sx, sy, 14, 8, 1, 2, s);   // snout
  px(ctx, sx, sy, 11, 5, 1, 1, s);   // ear
  px(ctx, sx, sy, 13, 5, 1, 1, s);   // ear

  ctx.fillStyle = sp.eyes;
  px(ctx, sx, sy, 13, 7, 1, 1, s);
}
