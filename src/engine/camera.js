import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './canvas.js';

export function createCamera() {
  return {
    x: 0,
    y: 0,

    follow(target, map, dt) {
      const desiredX = target.x + target.w / 2 - LOGICAL_WIDTH / 2;
      const desiredY = target.y + target.h / 2 - LOGICAL_HEIGHT / 2;

      // Smooth lerp. Higher = snappier. dt-scaled so framerate doesn't change feel.
      const k = 1 - Math.exp(-12 * dt);
      this.x += (desiredX - this.x) * k;
      this.y += (desiredY - this.y) * k;

      const mapW = map.width * map.tileSize;
      const mapH = map.height * map.tileSize;
      const maxX = Math.max(0, mapW - LOGICAL_WIDTH);
      const maxY = Math.max(0, mapH - LOGICAL_HEIGHT);
      if (this.x < 0) this.x = 0;
      if (this.y < 0) this.y = 0;
      if (this.x > maxX) this.x = maxX;
      if (this.y > maxY) this.y = maxY;
    },
  };
}
