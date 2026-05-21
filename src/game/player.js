import { moveAndCollide } from '../engine/collision.js';
import { drawCharacter } from './character-sprite.js';
import { unlockedSkillKeys } from '../systems/progression.js';

const SPEED = 90; // pixels per second
const WALK_FRAME_TIME = 0.14;

export const PLAYER_COLORS = {
  hair: '#1a1a2e',
  skin: '#e8c8a8',
  body: '#1a1a2e',
  legs: '#2a2a3e',
  eyes: '#a070ff',
};

export function createPlayer(x, y, skillDefs) {
  return {
    x,
    y,
    // Hitbox is slightly narrower than the 16x16 sprite so the player can
    // slip into 1-tile-wide gaps without scraping the edges.
    w: 12,
    h: 14,
    facing: 'down',
    moving: false,
    walkTime: 0,
    stats: {
      name: 'Hunter',
      level: 1,
      xp: 0,
      gold: 0,
      hp: 30, maxHp: 30,
      mp: 10, maxMp: 10,
      atk: 5, def: 3, spd: 4, int: 3,
    },
    skills: unlockedSkillKeys(skillDefs, 1),
    items: [],
    equipment: { weapon: null, armor: null },
    shadows: [],
    quests: [],
    // Position history for shadow trail-replay. Capped in update().
    history: [],

    update(dt, input, map, entities = []) {
      let dx = 0;
      let dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.sqrt(2);
        dx *= inv;
        dy *= inv;
      }

      this.moving = dx !== 0 || dy !== 0;
      if (this.moving) {
        if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
        else this.facing = dy > 0 ? 'down' : 'up';
        this.walkTime += dt;
      } else {
        this.walkTime = 0;
      }

      moveAndCollide(this, dx * SPEED * dt, dy * SPEED * dt, map, entities);

      this.history.push({ x: this.x, y: this.y, facing: this.facing, moving: this.moving });
      if (this.history.length > 200) this.history.shift();
    },

    render(ctx, camera) {
      const sx = Math.floor(this.x - 2 - camera.x);
      const sy = Math.floor(this.y - 2 - camera.y);
      const frame = Math.floor(this.walkTime / WALK_FRAME_TIME) % 2;
      drawCharacter(ctx, sx, sy, PLAYER_COLORS, this.facing, frame, this.moving);
    },
  };
}
