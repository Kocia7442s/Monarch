import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { t, tArray, loadLang, getCurrentLang } from '../systems/lang.js';

const FONT_TITLE = 'bold 56px "Courier New", monospace';
const FONT_TAG = '14px "Courier New", monospace';
const FONT_MENU = '18px "Courier New", monospace';
const FONT_SMALL = '12px "Courier New", monospace';
const FONT_HINT = '11px "Courier New", monospace';

const MAIN_ITEMS = ['newGame', 'continue', 'settings', 'credits'];
const SETTINGS_ITEMS = ['language', 'fullscreen', 'back'];

const PARTICLE_COUNT = 50;

export function createLanding() {
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle(true));

  return {
    screen: 'main',          // 'main' | 'settings' | 'credits'
    selectedIndex: 0,
    pulse: 0,
    particles,
    action: null,            // 'newGame' | 'continue' once user picks one
    fadeOutTime: 0,
    fadeOutDuration: 0.45,

    update(dt, input) {
      this.pulse = (this.pulse + dt) % (Math.PI * 2);

      for (const p of this.particles) {
        p.y -= p.vy * dt;
        p.x += p.vx * dt;
        p.life -= dt;
        if (p.life <= 0 || p.y < -10) Object.assign(p, spawnParticle(false));
      }

      if (this.action) {
        this.fadeOutTime += dt;
        return;
      }

      if (this.screen === 'main') this.updateMain(input);
      else if (this.screen === 'settings') this.updateSettings(input);
      else if (this.screen === 'credits') this.updateCredits(input);
    },

    updateMain(input) {
      if (input.upPressed()) this.selectedIndex = wrap(this.selectedIndex - 1, MAIN_ITEMS.length);
      if (input.downPressed()) this.selectedIndex = wrap(this.selectedIndex + 1, MAIN_ITEMS.length);
      if (input.interactPressed() || input.confirmPressed()) {
        const item = MAIN_ITEMS[this.selectedIndex];
        if (item === 'newGame') this.startGame('newGame');
        else if (item === 'continue') { if (hasSave()) this.startGame('continue'); }
        else if (item === 'settings') { this.screen = 'settings'; this.selectedIndex = 0; }
        else if (item === 'credits')  { this.screen = 'credits'; }
      }
    },

    updateSettings(input) {
      if (input.upPressed()) this.selectedIndex = wrap(this.selectedIndex - 1, SETTINGS_ITEMS.length);
      if (input.downPressed()) this.selectedIndex = wrap(this.selectedIndex + 1, SETTINGS_ITEMS.length);
      if (input.cancelPressed()) { this.screen = 'main'; this.selectedIndex = 0; return; }

      const item = SETTINGS_ITEMS[this.selectedIndex];
      if (item === 'back') {
        if (input.interactPressed() || input.confirmPressed()) {
          this.screen = 'main';
          this.selectedIndex = 0;
        }
        return;
      }
      const pressed = input.interactPressed() || input.confirmPressed()
        || input.leftPressed() || input.rightPressed();
      if (!pressed) return;
      if (item === 'language') toggleLanguage();
      else if (item === 'fullscreen') toggleFullscreen();
    },

    updateCredits(input) {
      if (input.cancelPressed() || input.interactPressed() || input.confirmPressed()) {
        this.screen = 'main';
        this.selectedIndex = 0;
      }
    },

    startGame(action) {
      this.action = action;
      this.fadeOutTime = 0;
    },

    isReadyToExit() {
      return this.action && this.fadeOutTime >= this.fadeOutDuration;
    },

    render(ctx) {
      // Background gradient
      ctx.fillStyle = '#06020f';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
      grad.addColorStop(0, 'rgba(60, 20, 100, 0.35)');
      grad.addColorStop(1, 'rgba(10, 5, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      for (const p of this.particles) {
        const a = (p.life / p.maxLife) * 0.7;
        ctx.fillStyle = `rgba(160, 112, 255, ${a.toFixed(3)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      ctx.save();
      if (this.screen === 'main') this.renderMain(ctx);
      else if (this.screen === 'settings') this.renderSettings(ctx);
      else if (this.screen === 'credits') this.renderCredits(ctx);
      ctx.restore();

      if (this.action) {
        const alpha = Math.min(1, this.fadeOutTime / this.fadeOutDuration);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      }
    },

    renderMain(ctx) {
      const glow = 14 + Math.sin(this.pulse) * 6;
      ctx.font = FONT_TITLE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#a070ff';
      ctx.shadowBlur = glow;
      ctx.fillStyle = '#d8c0ff';
      ctx.fillText(t('landing.title'), LOGICAL_WIDTH / 2, 120);
      ctx.shadowBlur = 0;

      ctx.font = FONT_TAG;
      ctx.fillStyle = '#9080a8';
      ctx.fillText(t('landing.tagline'), LOGICAL_WIDTH / 2, 168);

      ctx.font = FONT_MENU;
      for (let i = 0; i < MAIN_ITEMS.length; i++) {
        const key = MAIN_ITEMS[i];
        const enabled = key !== 'continue' || hasSave();
        const sel = i === this.selectedIndex;
        ctx.fillStyle = !enabled ? '#404050' : sel ? '#c0a0ff' : '#d0d0e0';
        const baseLabel = t(`landing.${key}`);
        let label = sel && enabled ? `◆ ${baseLabel} ◆` : `  ${baseLabel}  `;
        if (key === 'continue' && !enabled) label = `  ${baseLabel} ${t('landing.noSave')}  `;
        ctx.fillText(label, LOGICAL_WIDTH / 2, 240 + i * 36);
      }

      ctx.font = FONT_HINT;
      ctx.fillStyle = '#606070';
      ctx.fillText(t('landing.hint.navigate'), LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 30);
    },

    renderSettings(ctx) {
      ctx.font = FONT_TITLE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#a070ff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#d8c0ff';
      ctx.fillText(t('landing.settingsTitle'), LOGICAL_WIDTH / 2, 100);
      ctx.shadowBlur = 0;

      ctx.font = FONT_MENU;
      for (let i = 0; i < SETTINGS_ITEMS.length; i++) {
        const key = SETTINGS_ITEMS[i];
        const sel = i === this.selectedIndex;
        ctx.fillStyle = sel ? '#c0a0ff' : '#d0d0e0';

        let label;
        if (key === 'language') {
          const val = getCurrentLang() === 'fr' ? t('landing.langFr') : t('landing.langEn');
          label = `${t('landing.language')}  ◄ ${val} ►`;
        } else if (key === 'fullscreen') {
          const on = isFullscreen();
          const val = on ? t('landing.fullscreenOn') : t('landing.fullscreenOff');
          label = `${t('landing.fullscreen')}  ◄ ${val} ►`;
        } else {
          label = t('landing.back');
        }
        const prefix = sel ? '◆ ' : '  ';
        ctx.fillText(prefix + label, LOGICAL_WIDTH / 2, 230 + i * 38);
      }

      ctx.font = FONT_SMALL;
      ctx.fillStyle = '#808090';
      ctx.fillText(t('landing.toggleHint'), LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 50);
      ctx.font = FONT_HINT;
      ctx.fillStyle = '#606070';
      ctx.fillText(t('landing.hint.navigate'), LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 30);
    },

    renderCredits(ctx) {
      ctx.font = FONT_TITLE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#a070ff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#d8c0ff';
      ctx.fillText(t('landing.creditsTitle'), LOGICAL_WIDTH / 2, 100);
      ctx.shadowBlur = 0;

      ctx.font = FONT_MENU;
      const lines = tArray('landing.creditsText');
      let y = 200;
      for (const line of lines) {
        ctx.fillStyle = line ? '#a0a0b0' : '#606070';
        ctx.fillText(line, LOGICAL_WIDTH / 2, y);
        y += 26;
      }

      ctx.font = FONT_HINT;
      ctx.fillStyle = '#606070';
      ctx.fillText('[Esc / E] ' + t('landing.back'), LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 30);
    },
  };
}

function wrap(i, n) { return ((i % n) + n) % n; }

function spawnParticle(initial) {
  const life = 3 + Math.random() * 4;
  return {
    x: Math.random() * LOGICAL_WIDTH,
    y: initial ? Math.random() * LOGICAL_HEIGHT : LOGICAL_HEIGHT + Math.random() * 30,
    vx: (Math.random() - 0.5) * 6,
    vy: 10 + Math.random() * 28,
    size: 1 + Math.floor(Math.random() * 2),
    life,
    maxLife: life,
  };
}

export function hasSave() {
  try { return localStorage.getItem('shadowGate.save') !== null; }
  catch { return false; }
}

function toggleLanguage() {
  const next = getCurrentLang() === 'fr' ? 'en' : 'fr';
  loadLang(next).catch((e) => console.error('lang switch failed', e));
}

function isFullscreen() {
  return !!(document.fullscreenElement);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}
