export const LOGICAL_WIDTH = 680;
export const LOGICAL_HEIGHT = 440;

export function setupCanvas(canvas) {
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const scale = Math.max(
      1,
      Math.floor(Math.min(window.innerWidth / LOGICAL_WIDTH, window.innerHeight / LOGICAL_HEIGHT)),
    );
    canvas.style.width = `${LOGICAL_WIDTH * scale}px`;
    canvas.style.height = `${LOGICAL_HEIGHT * scale}px`;
  }

  resize();
  window.addEventListener('resize', resize);

  return ctx;
}
