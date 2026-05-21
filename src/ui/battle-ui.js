import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel, drawBar } from './panel.js';
import { drawCharacter } from '../game/character-sprite.js';
import { drawEnemy } from '../game/enemy-sprite.js';
import { PLAYER_COLORS } from '../game/player.js';
import { effectiveStats } from '../systems/inventory.js';
import { t } from '../systems/lang.js';

const FONT = '12px "Courier New", monospace';

export function renderBattle(ctx, battle) {
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Decorative arena floor
  ctx.fillStyle = '#1a1530';
  ctx.fillRect(0, 230, LOGICAL_WIDTH, 50);

  // Enemy: top-right, 3x scale (48x48)
  drawEnemy(ctx, 510, 100, battle.enemy.sprite, battle.enemy.type, 3, 'left');
  drawCombatantInfo(
    ctx, 430, 40, battle.enemy.name, null,
    battle.enemy.hp, battle.enemy.maxHp,
    null, null,
  );

  // Player: bottom-left, 2x scale (32x32). Sits on the arena floor strip.
  drawCharacter(ctx, 110, 220, PLAYER_COLORS, 'right', 0, false, 2);
  drawCombatantInfo(
    ctx, 30, 140, battle.player.stats.name, battle.player.stats.level,
    battle.player.stats.hp, battle.player.stats.maxHp,
    battle.player.stats.mp, battle.player.stats.maxMp,
  );

  // Bottom panel
  drawPanel(ctx, 10, 290, 660, 140);

  ctx.save();
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  if (battle.phase === 'message') drawMessage(ctx, battle);
  else if (battle.phase === 'menu') drawMenu(ctx, battle);
  else if (battle.phase === 'skills') drawSkills(ctx, battle);
  else if (battle.phase === 'items') drawItems(ctx, battle);
  else if (battle.phase === 'arise-prompt') drawArisePrompt(ctx, battle);
  ctx.restore();
}

function drawCombatantInfo(ctx, x, y, name, level, hp, maxHp, mp, maxMp) {
  ctx.save();
  drawPanel(ctx, x, y, 200, mp != null ? 64 : 44);
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e8f0';
  const label = level != null
    ? t('ui.battle.combatant.nameLevel', { name, level })
    : t('ui.battle.combatant.name', { name });
  ctx.fillText(label, x + 10, y + 8);
  drawBar(ctx, x + 10, y + 24, 180, 8, hp, maxHp, '#40d060', true);
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText(t('ui.battle.hpLabel', { hp, maxHp }), x + 10, y + 33);
  if (mp != null) {
    drawBar(ctx, x + 10, y + 46, 180, 6, mp, maxMp, '#6080d0', false);
    ctx.fillText(t('ui.battle.mpLabel', { mp, maxMp }), x + 10, y + 53);
  }
  ctx.restore();
}

function drawMessage(ctx, battle) {
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(battle.currentMessage ?? '', 28, 310);
  ctx.fillStyle = '#9070d0';
  const prompt = t('ui.battle.continue');
  const tw = ctx.measureText(prompt).width;
  ctx.fillText(prompt, 660 - tw - 4, 410);
}

function drawMenu(ctx, battle) {
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText(t('ui.battle.menu.prompt'), 28, 305);

  const options = [
    t('ui.battle.menu.attack'),
    t('ui.battle.menu.skills'),
    t('ui.battle.menu.items'),
    t('ui.battle.menu.run'),
  ];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * 140;
    const y = 335 + row * 26;
    const selected = i === battle.menuIndex;
    ctx.fillStyle = selected ? '#a070ff' : '#e8e8f0';
    ctx.fillText(selected ? `> ${options[i]}` : `  ${options[i]}`, x, y);
  }

  const sx = 380;
  ctx.fillStyle = '#a0a0b0';
  const s = battle.player.stats;
  const eff = effectiveStats(battle.player, battle.itemDefs);
  ctx.fillText(t('ui.battle.stats.line', { atk: eff.atk, def: eff.def, spd: eff.spd, int: eff.int }), sx, 335);
  ctx.fillText(t('ui.battle.hpLine', { hp: s.hp, maxHp: s.maxHp, mp: s.mp, maxMp: s.maxMp }), sx, 355);
  ctx.fillText(t('ui.battle.xpLine', { xp: s.xp, gold: s.gold }), sx, 375);
}

function drawSkills(ctx, battle) {
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText(t('ui.battle.skills.prompt'), 28, 305);

  const skills = battle.player.skills.filter(
    (s) => s !== 'attack' && !battle.skillDefs[s].passive,
  );

  let cy = 332;
  for (let i = 0; i < skills.length; i++) {
    const key = skills[i];
    const sel = i === battle.subIndex;
    ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
    const label = t('ui.battle.skillCost', { name: t(`skill.${key}.name`), mp: battle.skillDefs[key].mp });
    ctx.fillText(sel ? `> ${label}` : `  ${label}`, 40, cy);
    cy += 18;
  }
  const cancelSel = battle.subIndex === skills.length;
  ctx.fillStyle = cancelSel ? '#a070ff' : '#e8e8f0';
  ctx.fillText(cancelSel ? `> ${t('ui.battle.cancel')}` : `  ${t('ui.battle.cancel')}`, 40, cy);

  const selKey = skills[battle.subIndex];
  if (selKey) {
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(t(`skill.${selKey}.desc`), 340, 335);
  }
}

function drawItems(ctx, battle) {
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText(t('ui.battle.items.prompt'), 28, 305);

  const consumables = battle.player.items.filter(
    (s) => battle.itemDefs[s.id]?.type === 'consumable',
  );

  if (consumables.length === 0) {
    ctx.fillStyle = '#808090';
    ctx.fillText(t('ui.battle.items.empty'), 40, 340);
    ctx.fillStyle = '#9070d0';
    ctx.fillText(t('ui.battle.back'), 40, 400);
    return;
  }

  let cy = 332;
  for (let i = 0; i < consumables.length; i++) {
    const slot = consumables[i];
    const sel = i === battle.subIndex;
    ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
    ctx.fillText(sel ? '>' : ' ', 40, cy);
    ctx.fillText(t(`item.${slot.id}.name`), 56, cy);
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(t('ui.menu.itemQty', { qty: slot.qty }), 220, cy);
    cy += 18;
  }
  const cancelSel = battle.subIndex === consumables.length;
  ctx.fillStyle = cancelSel ? '#a070ff' : '#e8e8f0';
  ctx.fillText(cancelSel ? `> ${t('ui.battle.cancel')}` : `  ${t('ui.battle.cancel')}`, 40, cy);

  const sel = consumables[battle.subIndex];
  if (sel) {
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(t(`item.${sel.id}.desc`), 340, 335);
  }
}

function drawArisePrompt(ctx, battle) {
  ctx.fillStyle = '#c0a0ff';
  ctx.fillText(t('ui.battle.arise.prompt', { name: battle.enemy.name }), 28, 305);

  const options = [t('ui.battle.arise.yes'), t('ui.battle.arise.no')];
  for (let i = 0; i < 2; i++) {
    const sel = i === battle.subIndex;
    ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
    ctx.fillText(sel ? `> ${options[i]}` : `  ${options[i]}`, 40, 338 + i * 22);
  }

  ctx.fillStyle = '#808090';
  ctx.fillText(t('ui.battle.arise.hint'), 340, 338);
}
