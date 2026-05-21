import { setupCanvas, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './engine/canvas.js';
import { createInput } from './engine/input.js';
import { createCamera } from './engine/camera.js';
import { renderMap } from './maps/map-renderer.js';
import { loadMap } from './maps/map-loader.js';
import { createTransition, warpAt } from './maps/warp.js';
import { createPlayer } from './game/player.js';
import { createNPC, findInteractable } from './game/npc.js';
import { createEnemy, overlap } from './game/enemy.js';
import { createDialog } from './ui/dialog.js';
import { createBattle } from './systems/combat.js';
import { renderBattle } from './ui/battle-ui.js';
import { gainXP, rankColor } from './systems/progression.js';
import { createNotificationSystem } from './ui/notification.js';
import { createShop } from './ui/shop-ui.js';
import { createMenu } from './ui/menu.js';
import { createQuestLog } from './ui/quest-ui.js';
import {
  assignQuest, recordKill, recordLevel, recordMapClear,
} from './systems/quest.js';

async function start() {
  const canvas = document.getElementById('game');
  const ctx = setupCanvas(canvas);
  const input = createInput();
  const camera = createCamera();

  const [npcDefs, skillDefs, monsterDefs, itemDefs, questDefs] = await Promise.all([
    fetch('./src/data/npcs.json').then((r) => r.json()),
    fetch('./src/data/skills.json').then((r) => r.json()),
    fetch('./src/data/monsters.json').then((r) => r.json()),
    fetch('./src/data/items.json').then((r) => r.json()),
    fetch('./src/data/quests.json').then((r) => r.json()),
  ]);

  async function loadScene(name) {
    const m = await loadMap(`./src/data/maps/${name}.json`);
    return {
      map: m,
      npcs: m.npcs.map((inst) => {
        const def = npcDefs[inst.id];
        if (!def) throw new Error(`Unknown NPC id: ${inst.id}`);
        return createNPC(def, inst, m.tileSize);
      }),
      enemies: m.enemies.map((inst) => {
        const def = monsterDefs.monsters[inst.id];
        if (!def) throw new Error(`Unknown enemy id: ${inst.id}`);
        return createEnemy(def, inst, m.tileSize);
      }),
    };
  }

  let { map, npcs, enemies } = await loadScene('town');
  const player = createPlayer(map.spawn.x * map.tileSize, map.spawn.y * map.tileSize, skillDefs);
  const dialog = createDialog();
  const notifications = createNotificationSystem();
  const transition = createTransition();
  const shop = createShop();
  const menu = createMenu();
  const questLog = createQuestLog();

  // The System assigns daily quests on session start.
  const dailyQuests = ['killGoblins', 'reachLevel3', 'clearDungeonE'];
  for (const id of dailyQuests) {
    if (assignQuest(player, id)) {
      const def = questDefs[id];
      notifications.push({
        text: `New quest: ${def.name}`,
        color: '#a070ff',
        duration: 4,
      });
    }
  }

  camera.x = player.x + player.w / 2 - LOGICAL_WIDTH / 2;
  camera.y = player.y + player.h / 2 - LOGICAL_HEIGHT / 2;

  let state = 'overworld'; // 'overworld' | 'dialog' | 'battle' | 'transition' | 'menu' | 'shop' | 'quests'
  let battle = null;
  // Tracks the warp tile (as "x,y") the player is currently standing on so
  // we don't re-trigger every frame they remain on it.
  let currentWarpKey = null;
  // Remembered between starting an NPC dialog and the dialog ending, so we
  // can route to a follow-up action (open shop, etc.).
  let pendingNpcAction = null;

  // Each shadow reads a position from `i * OFFSET` fixed steps ago, so they
  // trace the player's path in a conga line. Empty history (after a teleport)
  // means everyone sits on the player until movement refills the buffer.
  const SHADOW_LAG_STEPS = 18;
  function updateShadowChain() {
    for (let i = 0; i < player.shadows.length; i++) {
      const idx = player.history.length - 1 - (i + 1) * SHADOW_LAG_STEPS;
      const s = player.shadows[i];
      if (idx >= 0) {
        const p = player.history[idx];
        s.x = p.x;
        s.y = p.y;
        s.facing = p.facing;
        s.moving = p.moving;
      } else {
        s.x = player.x;
        s.y = player.y;
      }
    }
  }

  function emitQuestComplete(ev) {
    notifications.push({
      text: `Quest complete: ${ev.name}! +${ev.xp} XP, +${ev.gold} gold.`,
      color: '#80e0ff',
      duration: 5,
    });
    if (ev.gold) player.stats.gold += ev.gold;
    if (ev.xp) applyXP(ev.xp); // recurses through level checks
  }

  // Single entry point for all XP grants (kills + quest rewards). Cascades
  // level-ups through gainXP, surfaces level/rank/skill notifications, then
  // re-checks level-based quests in case the new level satisfies them.
  function applyXP(amount) {
    const events = gainXP(player, amount, skillDefs);
    for (const ev of events) {
      if (ev.type === 'levelUp') {
        notifications.push({ text: `Level up! You are now Level ${ev.level}.` });
      } else if (ev.type === 'rankUp') {
        notifications.push({
          text: `Rank promotion! You are now ${ev.rank}-Rank.`,
          color: rankColor(ev.rank),
          duration: 4.5,
        });
      } else if (ev.type === 'skillUnlock') {
        notifications.push({ text: `New skill acquired: ${ev.name}`, color: '#80e0ff' });
      }
    }
    for (const qev of recordLevel(player, questDefs)) emitQuestComplete(qev);
  }

  function snapShadowsToPlayer() {
    player.history = [];
    for (const s of player.shadows) {
      s.x = player.x;
      s.y = player.y;
    }
  }

  function handleBattleEnd() {
    if (battle.outcome === 'victory') {
      battle.enemyOverworld.defeated = true;
      player.stats.gold += battle.enemy.goldReward;
      applyXP(battle.enemy.xpReward);

      for (const ev of recordKill(player, battle.enemyOverworld.id, questDefs)) {
        emitQuestComplete(ev);
      }
      const stillAlive = enemies.filter((e) => !e.defeated).length;
      for (const ev of recordMapClear(player, map.name, stillAlive, questDefs)) {
        emitQuestComplete(ev);
      }

      if (battle.shadowExtracted) {
        notifications.push({
          text: `${battle.shadowExtracted.name} joined your shadow army.`,
          color: '#a070ff',
          duration: 3.5,
        });
      }
    } else if (battle.outcome === 'defeat') {
      player.x = map.spawn.x * map.tileSize;
      player.y = map.spawn.y * map.tileSize;
      player.stats.hp = Math.max(1, Math.floor(player.stats.maxHp * 0.3));
      player.stats.mp = Math.floor(player.stats.maxMp * 0.3);
      camera.x = player.x + player.w / 2 - LOGICAL_WIDTH / 2;
      camera.y = player.y + player.h / 2 - LOGICAL_HEIGHT / 2;
      snapShadowsToPlayer();
    } else if (battle.outcome === 'run') {
      battle.enemyOverworld.disengaged = true;
    }
    battle = null;
  }

  async function triggerWarp(warp) {
    if (transition.isActive()) return;
    state = 'transition';
    transition.beginPending();
    const scene = await loadScene(warp.to);
    transition.beginFade(() => {
      map = scene.map;
      npcs = scene.npcs;
      enemies = scene.enemies;
      player.x = warp.spawnX * map.tileSize;
      player.y = warp.spawnY * map.tileSize;
      if (warp.facing) player.facing = warp.facing;
      // Mark the destination tile so we don't immediately re-trigger.
      currentWarpKey = `${warp.spawnX},${warp.spawnY}`;
      camera.x = player.x + player.w / 2 - LOGICAL_WIDTH / 2;
      camera.y = player.y + player.h / 2 - LOGICAL_HEIGHT / 2;
      snapShadowsToPlayer();
    });
  }

  const FIXED_DT = 1 / 60;
  const MAX_FRAME = 0.25;
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;
    acc += elapsed;

    while (acc >= FIXED_DT) {
      if (state === 'transition') {
        transition.update(FIXED_DT);
        if (transition.phase === 'idle') state = 'overworld';
      } else if (state === 'battle') {
        battle.update(FIXED_DT, input);
        if (battle.ended) {
          handleBattleEnd();
          state = 'overworld';
        }
      } else if (state === 'dialog') {
        dialog.update(FIXED_DT);
        if (input.interactPressed() || input.confirmPressed()) dialog.advance();
        if (!dialog.active) {
          if (pendingNpcAction?.kind === 'shop') {
            shop.open(pendingNpcAction);
            state = 'shop';
          } else {
            state = 'overworld';
          }
          pendingNpcAction = null;
        }
      } else if (state === 'shop') {
        shop.update(FIXED_DT, input, player, itemDefs);
        if (!shop.active) state = 'overworld';
      } else if (state === 'menu') {
        menu.update(FIXED_DT, input, player, itemDefs);
        if (!menu.active) state = 'overworld';
      } else if (state === 'quests') {
        questLog.update(FIXED_DT, input);
        if (!questLog.active) state = 'overworld';
      } else {
        player.update(FIXED_DT, input, map, npcs);
        camera.follow(player, map, FIXED_DT);
        updateShadowChain();

        for (const e of enemies) {
          if (e.disengaged && !overlap(player, e)) e.disengaged = false;
        }

        if (input.menuPressed()) {
          menu.open();
          state = 'menu';
        } else if (input.questPressed()) {
          questLog.open();
          state = 'quests';
        }

        if (state === 'overworld' && input.interactPressed()) {
          const npc = findInteractable(player, npcs, map.tileSize);
          if (npc) {
            npc.facePlayer(player);
            pendingNpcAction = npc;
            if (npc.kind === 'heal') {
              const beforeHp = player.stats.hp;
              const beforeMp = player.stats.mp;
              player.stats.hp = player.stats.maxHp;
              player.stats.mp = player.stats.maxMp;
              if (beforeHp < player.stats.maxHp || beforeMp < player.stats.maxMp) {
                notifications.push({ text: 'Healed to full.', color: '#80c0ff' });
              }
            }
            dialog.start(npc.name, npc.dialog, npc.speakerColor);
            state = 'dialog';
          }
        }

        // Warp detection (after movement so we react to where the player landed).
        if (state === 'overworld') {
          const warp = warpAt(player, map.warps, map.tileSize);
          const wkey = warp ? `${warp.x},${warp.y}` : null;
          if (wkey !== currentWarpKey) {
            currentWarpKey = wkey;
            if (warp) {
              if (warp.minLevel && player.stats.level < warp.minLevel) {
                dialog.start('System', [warp.blockedMessage ?? 'Locked.'], '#a070ff');
                state = 'dialog';
              } else {
                triggerWarp(warp);
              }
            }
          }
        }

        if (state === 'overworld') {
          const hit = enemies.find(
            (e) => !e.defeated && !e.disengaged && overlap(player, e),
          );
          if (hit) {
            battle = createBattle(player, hit, skillDefs, monsterDefs, itemDefs);
            state = 'battle';
          }
        }
      }

      notifications.update(FIXED_DT);
      input.endFrame();
      acc -= FIXED_DT;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (state === 'battle') {
      renderBattle(ctx, battle);
    } else {
      renderMap(ctx, map, camera);
      const liveEnemies = enemies.filter((e) => !e.defeated);
      const ents = [...npcs, ...liveEnemies, ...player.shadows, player].sort(
        (a, b) => (a.y + a.h) - (b.y + b.h),
      );
      for (const e of ents) e.render(ctx, camera);
      if (state === 'dialog') dialog.render(ctx);
      if (state === 'shop') shop.render(ctx, player, itemDefs);
      if (state === 'menu') menu.render(ctx, player, itemDefs);
      if (state === 'quests') questLog.render(ctx, player, questDefs);
    }

    transition.render(ctx);
    notifications.render(ctx);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
