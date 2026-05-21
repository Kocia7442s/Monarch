import { canArise, shadowArmyFull, extractShadow } from './arise.js';
import { useItem, removeItem, effectiveStats } from './inventory.js';

// Turn-based combat. The battle owns a local copy of the enemy's mutable
// stats; the player ref is the real overworld player so HP/MP/XP changes
// persist after the fight.
//
// Outcomes: 'victory' | 'defeat' | 'run'.

const CRIT_CHANCE = 0.10;
const CRIT_MULT = 1.8;

export function createBattle(player, enemyOverworld, skillDefs, monsterDefs, itemDefs) {
  const enemyDef = monsterDefs.monsters[enemyOverworld.id];
  if (!enemyDef) throw new Error(`Unknown monster id: ${enemyOverworld.id}`);

  const battle = {
    player,
    enemyOverworld,
    enemy: {
      name: enemyDef.name,
      type: enemyDef.type ?? 'humanoid',
      sprite: enemyDef.sprite,
      hp: enemyDef.hp, maxHp: enemyDef.hp,
      atk: enemyDef.atk, def: enemyDef.def, spd: enemyDef.spd,
      moves: enemyDef.moves,
      xpReward: enemyDef.xp,
      goldReward: enemyDef.gold,
    },
    skillDefs,
    itemDefs,
    moveDefs: monsterDefs.moves,
    ended: false,
    outcome: null,

    phase: 'message', // message | menu | skills | items
    menuIndex: 0,
    subIndex: 0,

    pendingMessages: [],
    currentMessage: null,
    afterMessages: null,

    // Filled if the player extracts a shadow at victory; read by main.js.
    shadowExtracted: null,
  };

  showMessages(battle, [`A wild ${battle.enemy.name} appears!`], () => { battle.phase = 'menu'; });

  battle.update = (dt, input) => update(battle, dt, input);
  return battle;
}

function damageCalc(attacker, defender, power, crit) {
  let dmg = Math.max(1, attacker.atk + power - defender.def + Math.floor(Math.random() * 4));
  if (crit) dmg = Math.floor(dmg * CRIT_MULT);
  return dmg;
}

function rollCrit() { return Math.random() < CRIT_CHANCE; }

function showMessages(battle, msgs, after) {
  battle.phase = 'message';
  battle.pendingMessages = msgs.slice(1);
  battle.currentMessage = msgs[0] ?? null;
  battle.afterMessages = after ?? null;
}

function advanceMessage(battle) {
  if (battle.pendingMessages.length > 0) {
    battle.currentMessage = battle.pendingMessages.shift();
  } else {
    battle.currentMessage = null;
    const cb = battle.afterMessages;
    battle.afterMessages = null;
    if (cb) cb();
  }
}

function update(battle, _dt, input) {
  if (battle.ended) return;

  if (battle.phase === 'message') {
    if (input.interactPressed() || input.confirmPressed()) advanceMessage(battle);
    return;
  }

  if (battle.phase === 'menu') {
    if (input.upPressed() || input.downPressed()) battle.menuIndex ^= 0b10; // toggle row
    if (input.leftPressed() || input.rightPressed()) battle.menuIndex ^= 0b01; // toggle col
    if (input.interactPressed() || input.confirmPressed()) selectMenu(battle);
    return;
  }

  if (battle.phase === 'skills') {
    const skills = battle.player.skills.filter(
      (s) => s !== 'attack' && !battle.skillDefs[s].passive,
    );
    const optCount = skills.length + 1; // +1 for Cancel
    if (input.upPressed())   battle.subIndex = (battle.subIndex - 1 + optCount) % optCount;
    if (input.downPressed()) battle.subIndex = (battle.subIndex + 1) % optCount;
    if (input.cancelPressed()) { battle.phase = 'menu'; battle.subIndex = 0; return; }
    if (input.interactPressed() || input.confirmPressed()) {
      if (battle.subIndex === skills.length) {
        battle.phase = 'menu';
        battle.subIndex = 0;
      } else {
        playerUseSkill(battle, skills[battle.subIndex]);
      }
    }
    return;
  }

  if (battle.phase === 'items') {
    const consumables = battle.player.items.filter(
      (s) => battle.itemDefs[s.id]?.type === 'consumable',
    );
    const optCount = consumables.length + 1; // +1 for Cancel
    if (input.upPressed())   battle.subIndex = (battle.subIndex - 1 + optCount) % optCount;
    if (input.downPressed()) battle.subIndex = (battle.subIndex + 1) % optCount;
    if (input.cancelPressed()) { battle.phase = 'menu'; battle.subIndex = 0; return; }
    if (input.interactPressed() || input.confirmPressed()) {
      if (battle.subIndex === consumables.length || consumables.length === 0) {
        battle.phase = 'menu';
        battle.subIndex = 0;
      } else {
        playerUseItem(battle, consumables[battle.subIndex]);
      }
    }
    return;
  }

  if (battle.phase === 'arise-prompt') {
    if (input.upPressed() || input.downPressed()) battle.subIndex = 1 - battle.subIndex;
    if (input.cancelPressed()) { endBattle(battle, 'victory'); return; }
    if (input.interactPressed() || input.confirmPressed()) {
      if (battle.subIndex === 0) {
        const shadow = extractShadow(battle.player, battle.enemyOverworld);
        battle.shadowExtracted = shadow;
        showMessages(
          battle,
          [`Arise! ${shadow.name} rises as your shadow.`],
          () => endBattle(battle, 'victory'),
        );
      } else {
        endBattle(battle, 'victory');
      }
    }
  }
}

function selectMenu(battle) {
  switch (battle.menuIndex) {
    case 0: playerAttack(battle); break;
    case 1: battle.phase = 'skills'; battle.subIndex = 0; break;
    case 2: battle.phase = 'items'; break;
    case 3: tryRun(battle); break;
  }
}

function playerStats(battle) {
  return effectiveStats(battle.player, battle.itemDefs);
}

function playerAttack(battle) {
  const crit = rollCrit();
  const dmg = damageCalc(playerStats(battle), battle.enemy, 0, crit);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  const msgs = [`${battle.player.stats.name} attacks!`];
  if (crit) msgs.push('Critical hit!');
  msgs.push(`${battle.enemy.name} took ${dmg} damage.`);
  showMessages(battle, msgs, () => afterPlayerAction(battle));
}

function playerUseItem(battle, slot) {
  const def = battle.itemDefs[slot.id];
  const result = useItem(battle.player, def);
  if (!result.ok) {
    showMessages(battle, [result.message], () => { battle.phase = 'items'; battle.subIndex = 0; });
    return;
  }
  removeItem(battle.player, slot.id, 1);
  showMessages(
    battle,
    [`${battle.player.stats.name} used ${def.name}.`, result.message],
    () => afterPlayerAction(battle),
  );
}

function playerUseSkill(battle, key) {
  const skill = battle.skillDefs[key];
  if (battle.player.stats.mp < skill.mp) {
    showMessages(battle, ['Not enough MP!'], () => { battle.phase = 'skills'; });
    return;
  }
  battle.player.stats.mp -= skill.mp;

  if (skill.effect === 'heal') {
    const before = battle.player.stats.hp;
    battle.player.stats.hp = Math.min(battle.player.stats.maxHp, before + skill.amount);
    const healed = battle.player.stats.hp - before;
    showMessages(battle, [
      `${battle.player.stats.name} uses ${skill.name}!`,
      `Recovered ${healed} HP.`,
    ], () => afterPlayerAction(battle));
    return;
  }

  const crit = rollCrit();
  const dmg = damageCalc(playerStats(battle), battle.enemy, skill.power, crit);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  const msgs = [`${battle.player.stats.name} uses ${skill.name}!`];
  if (crit) msgs.push('Critical hit!');
  msgs.push(`${battle.enemy.name} took ${dmg} damage.`);
  showMessages(battle, msgs, () => afterPlayerAction(battle));
}

function tryRun(battle) {
  const ratio = battle.player.stats.spd / Math.max(1, battle.enemy.spd);
  const chance = Math.max(0.25, Math.min(0.95, 0.5 * ratio));
  if (Math.random() < chance) {
    showMessages(battle, [`${battle.player.stats.name} fled the battle!`], () => endBattle(battle, 'run'));
  } else {
    showMessages(battle, ['Failed to escape!'], () => enemyTurn(battle));
  }
}

function afterPlayerAction(battle) {
  if (battle.enemy.hp <= 0) {
    showMessages(battle, [
      `${battle.enemy.name} defeated!`,
      `+${battle.enemy.xpReward} XP, +${battle.enemy.goldReward} gold.`,
    ], () => promptOrEndVictory(battle));
    return;
  }
  enemyTurn(battle);
}

function promptOrEndVictory(battle) {
  if (canArise(battle.player)) {
    battle.phase = 'arise-prompt';
    battle.subIndex = 0;
    return;
  }
  if (shadowArmyFull(battle.player)) {
    showMessages(battle, ['Your shadow army is at capacity.'], () => endBattle(battle, 'victory'));
    return;
  }
  endBattle(battle, 'victory');
}

function enemyTurn(battle) {
  const moveKey = battle.enemy.moves[Math.floor(Math.random() * battle.enemy.moves.length)];
  const move = battle.moveDefs[moveKey];
  const crit = rollCrit();
  const dmg = damageCalc(battle.enemy, playerStats(battle), move.power, crit);
  battle.player.stats.hp = Math.max(0, battle.player.stats.hp - dmg);
  const msgs = [`${battle.enemy.name} uses ${move.name}!`];
  if (crit) msgs.push('Critical hit!');
  msgs.push(`${battle.player.stats.name} took ${dmg} damage.`);
  showMessages(battle, msgs, () => afterEnemyAction(battle));
}

function afterEnemyAction(battle) {
  if (battle.player.stats.hp <= 0) {
    showMessages(battle, [`${battle.player.stats.name} was defeated...`], () => endBattle(battle, 'defeat'));
    return;
  }
  battle.phase = 'menu';
}

function endBattle(battle, outcome) {
  battle.ended = true;
  battle.outcome = outcome;
}
