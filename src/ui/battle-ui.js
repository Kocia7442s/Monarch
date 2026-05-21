import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/canvas.js';
import { drawPanel, drawBar } from './panel.js';
import { drawCharacter } from '../game/character-sprite.js';
import { drawEnemy } from '../game/enemy-sprite.js';
import { PLAYER_COLORS } from '../game/player.js';
import { effectiveStats } from '../systems/inventory.js';

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

function drawArisePrompt(ctx, battle) {
  ctx.fillStyle = '#c0a0ff';
  ctx.fillText(`A shadow stirs... Arise ${battle.enemy.name}?`, 28, 305);

  const options = ['Yes', 'No'];
  for (let i = 0; i < 2; i++) {
    const sel = i === battle.subIndex;
    ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
    ctx.fillText(sel ? `> ${options[i]}` : `  ${options[i]}`, 40, 338 + i * 22);
  }

  ctx.fillStyle = '#808090';
  ctx.fillText('Extracted shadows follow you across maps.', 340, 338);
}

function drawCombatantInfo(ctx, x, y, name, level, hp, maxHp, mp, maxMp) {
  ctx.save();
  drawPanel(ctx, x, y, 200, mp != null ? 64 : 44);
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e8f0';
  const label = level != null ? `${name}  Lv${level}` : name;
  ctx.fillText(label, x + 10, y + 8);
  drawBar(ctx, x + 10, y + 24, 180, 8, hp, maxHp, '#40d060', true);
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText(`HP ${hp}/${maxHp}`, x + 10, y + 33);
  if (mp != null) {
    drawBar(ctx, x + 10, y + 46, 180, 6, mp, maxMp, '#6080d0', false);
    ctx.fillText(`MP ${mp}/${maxMp}`, x + 10, y + 53);
  }
  ctx.restore();
}

function drawMessage(ctx, battle) {
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(battle.currentMessage ?? '', 28, 310);
  ctx.fillStyle = '#9070d0';
  const prompt = '[E] continue';
  const tw = ctx.measureText(prompt).width;
  ctx.fillText(prompt, 660 - tw - 4, 410);
}

function drawMenu(ctx, battle) {
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText('What will you do?', 28, 305);

  const options = ['Attack', 'Skills', 'Items', 'Run'];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * 140;
    const y = 335 + row * 26;
    const selected = i === battle.menuIndex;
    ctx.fillStyle = selected ? '#a070ff' : '#e8e8f0';
    ctx.fillText(selected ? `> ${options[i]}` : `  ${options[i]}`, x, y);
  }

  // Right-side summary (effective stats include equipment bonuses)
  const sx = 380;
  ctx.fillStyle = '#a0a0b0';
  const s = battle.player.stats;
  const eff = effectiveStats(battle.player, battle.itemDefs);
  ctx.fillText(`ATK ${eff.atk}   DEF ${eff.def}   SPD ${eff.spd}   INT ${eff.int}`, sx, 335);
  ctx.fillText(`HP ${s.hp}/${s.maxHp}    MP ${s.mp}/${s.maxMp}`, sx, 355);
  ctx.fillText(`XP ${s.xp}    Gold ${s.gold}`, sx, 375);
}

function drawSkills(ctx, battle) {
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText('Choose a skill:', 28, 305);

  const skills = battle.player.skills.filter((s) => s !== 'attack');
  const options = [...skills.map((k) => battle.skillDefs[k]), null]; // null = Cancel

  let cy = 332;
  for (let i = 0; i < options.length; i++) {
    const sel = i === battle.subIndex;
    ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
    let label;
    if (options[i] === null) {
      label = 'Cancel';
    } else {
      label = `${options[i].name}  (${options[i].mp} MP)`;
    }
    ctx.fillText(sel ? `> ${label}` : `  ${label}`, 40, cy);
    cy += 18;
  }

  // Description on the right
  const sel = options[battle.subIndex];
  if (sel) {
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(sel.desc ?? '', 340, 335);
  }
}

function drawItems(ctx, battle) {
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText('Use an item:', 28, 305);

  const consumables = battle.player.items.filter(
    (s) => battle.itemDefs[s.id]?.type === 'consumable',
  );

  if (consumables.length === 0) {
    ctx.fillStyle = '#808090';
    ctx.fillText('No usable items.', 40, 340);
    ctx.fillStyle = '#9070d0';
    ctx.fillText('[Esc] back', 40, 400);
    return;
  }

  let cy = 332;
  for (let i = 0; i < consumables.length; i++) {
    const slot = consumables[i];
    const def = battle.itemDefs[slot.id];
    const sel = i === battle.subIndex;
    ctx.fillStyle = sel ? '#a070ff' : '#e8e8f0';
    ctx.fillText(sel ? '>' : ' ', 40, cy);
    ctx.fillText(def.name, 56, cy);
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`x${slot.qty}`, 220, cy);
    cy += 18;
  }
  const cancelSel = battle.subIndex === consumables.length;
  ctx.fillStyle = cancelSel ? '#a070ff' : '#e8e8f0';
  ctx.fillText(cancelSel ? '> Cancel' : '  Cancel', 40, cy);

  const sel = consumables[battle.subIndex];
  if (sel) {
    const def = battle.itemDefs[sel.id];
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(def.desc ?? '', 340, 335);
  }
}
