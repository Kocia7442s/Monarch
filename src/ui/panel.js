// Shared "System window" styling used by dialog box, battle UI, menus.
export function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 4, 24, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#7050c0';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = '#3020a0';
  ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
}

// HP/MP bar. dynamicColor=true shifts to yellow/red as the ratio drops.
export function drawBar(ctx, x, y, w, h, value, max, baseColor, dynamicColor = false) {
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a2040';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fillW = Math.floor((w - 2) * ratio);
  let c = baseColor;
  if (dynamicColor) {
    if (ratio <= 0.25) c = '#d04040';
    else if (ratio <= 0.5) c = '#d0a040';
  }
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y + 1, fillW, h - 2);
}
