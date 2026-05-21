import { setupCanvas, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './engine/canvas.js';
import { createInput } from './engine/input.js';
import { createCamera } from './engine/camera.js';
import { renderMap } from './maps/map-renderer.js';
import { loadMap } from './maps/map-loader.js';
import { createTransition, warpAt } from './maps/warp.js';
import { createPlayer } from './game/player.js';
import { createNPC, findInteractable } from './game/npc.js';
import { createEnemy, overlap } from './game/enemy.js';
import { createShadow } from './game/shadow.js';
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
import { loadLang, t } from './systems/lang.js';
import { createLanding, hasSave } from './ui/landing.js';

const SAVE_KEY = 'shadowGate.save';
const LANG_KEY = 'shadowGate.lang';
const SAVE_VERSION = 1;

async function boot() {
  const canvas = document.getElementById('game');
  const ctx = setupCanvas(canvas);
  const input = createInput();

  let savedLang = 'fr';
  try { savedLang = localStorage.getItem(LANG_KEY) ?? 'fr'; } catch { /* ignore */ }
  await loadLang(savedLang);

  const action = await runLanding(ctx, input);
  await startGame(ctx, input, action);
}

function runLanding(ctx, input) {
  return new Promise((resolve) => {
    const landing = createLanding();
    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      landing.update(dt, input);
      landing.render(ctx);
      input.endFrame();
      if (landing.isReadyToExit()) resolve(landing.action);
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

async function startGame(ctx, input, mode) {
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

  // Tracks defeated enemy indices per map so a scene reload (warp out + back)
  // doesn't respawn enemies the player already cleared this session.
  const defeatedByMap = {};
  let map, npcs, enemies;
  const player = createPlayer(0, 0, skillDefs);
  const camera = createCamera();
  const dialog = createDialog();
  const notifications = createNotificationSystem();
  const transition = createTransition();
  const shop = createShop();
  const menu = createMenu();
  const questLog = createQuestLog();

  function applyDefeatedFor(mapName) {
    const idx = defeatedByMap[mapName] ?? [];
    for (const i of idx) if (enemies[i]) enemies[i].defeated = true;
  }
  function captureDefeatedFor(mapName) {
    defeatedByMap[mapName] = enemies
      .map((e, i) => (e.defeated ? i : -1))
      .filter((i) => i >= 0);
  }

  if (mode === 'continue' && hasSave()) {
    const saved = readSave();
    if (saved) await applySave(saved);
    else await beginNewGame();
  } else {
    await beginNewGame();
  }

  async function beginNewGame() {
    ({ map, npcs, enemies } = await loadScene('town'));
    player.x = map.spawn.x * map.tileSize;
    player.y = map.spawn.y * map.tileSize;
    player.facing = 'down';

    const dailyQuests = ['killGoblins', 'reachLevel3', 'clearDungeonE'];
    for (const id of dailyQuests) {
      if (assignQuest(player, id)) {
        notifications.push({
          text: t('system.newQuest', { name: t(`quest.${id}.name`) }),
          color: '#a070ff',
          duration: 4,
        });
      }
    }
  }

  async function applySave(saved) {
    ({ map, npcs, enemies } = await loadScene(saved.map ?? 'town'));
    for (const name in (saved.defeatedByMap ?? {})) {
      defeatedByMap[name] = [...saved.defeatedByMap[name]];
    }
    applyDefeatedFor(map.name);

    const p = saved.player ?? {};
    player.x = p.x ?? map.spawn.x * map.tileSize;
    player.y = p.y ?? map.spawn.y * map.tileSize;
    player.facing = p.facing ?? 'down';
    for (const key of ['level', 'xp', 'gold', 'hp', 'maxHp', 'mp', 'maxMp', 'atk', 'def', 'spd', 'int']) {
      if (p.stats && key in p.stats) player.stats[key] = p.stats[key];
    }
    player.skills = [...(p.skills ?? player.skills)];
    player.items = (p.items ?? []).map((s) => ({ id: s.id, qty: s.qty }));
    player.equipment = { weapon: null, armor: null, ...(p.equipment ?? {}) };
    player.quests = (p.quests ?? []).map((q) => ({ ...q }));
    player.shadows = (p.shadows ?? []).map((s) => {
      const md = monsterDefs.monsters[s.monsterId];
      if (!md) return null;
      return createShadow({ id: s.monsterId, type: md.type, sprite: md.sprite }, player.x, player.y);
    }).filter(Boolean);
    player.history = [];
  }

  function captureSave() {
    captureDefeatedFor(map.name);
    return {
      version: SAVE_VERSION,
      map: map.name,
      defeatedByMap: { ...defeatedByMap },
      player: {
        x: player.x,
        y: player.y,
        facing: player.facing,
        stats: {
          level: player.stats.level, xp: player.stats.xp, gold: player.stats.gold,
          hp: player.stats.hp, maxHp: player.stats.maxHp,
          mp: player.stats.mp, maxMp: player.stats.maxMp,
          atk: player.stats.atk, def: player.stats.def,
          spd: player.stats.spd, int: player.stats.int,
        },
        skills: [...player.skills],
        items: player.items.map((s) => ({ id: s.id, qty: s.qty })),
        equipment: { ...player.equipment },
        shadows: player.shadows.map((s) => ({ monsterId: s.monsterId })),
        quests: player.quests.map((q) => ({ id: q.id, progress: q.progress, complete: q.complete })),
      },
    };
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function saveNow() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(captureSave())); }
    catch { /* quota or disabled — ignore */ }
  }

  // Snap camera & shadows now that we have a player position.
  camera.x = player.x + player.w / 2 - LOGICAL_WIDTH / 2;
  camera.y = player.y + player.h / 2 - LOGICAL_HEIGHT / 2;
  for (const s of player.shadows) { s.x = player.x; s.y = player.y; }

  // Start in 'transition' so the post-landing fade-in actually animates;
  // it flips to 'overworld' when the fade completes.
  let state = 'transition';
  let battle = null;
  let currentWarpKey = null;
  let pendingNpcAction = null;

  function emitQuestComplete(ev) {
    notifications.push({
      text: t('system.questComplete', {
        name: t(`quest.${ev.id}.name`),
        xp: ev.xp,
        gold: ev.gold,
      }),
      color: '#80e0ff',
      duration: 5,
    });
    if (ev.gold) player.stats.gold += ev.gold;
    if (ev.xp) applyXP(ev.xp);
  }

  function applyXP(amount) {
    const events = gainXP(player, amount, skillDefs);
    for (const ev of events) {
      if (ev.type === 'levelUp') {
        notifications.push({ text: t('system.levelUp', { level: ev.level }) });
      } else if (ev.type === 'rankUp') {
        notifications.push({
          text: t('system.rankUp', { rank: ev.rank }),
          color: rankColor(ev.rank),
          duration: 4.5,
        });
      } else if (ev.type === 'skillUnlock') {
        notifications.push({
          text: t('system.skillUnlock', { name: t(`skill.${ev.key}.name`) }),
          color: '#80e0ff',
        });
      }
    }
    for (const qev of recordLevel(player, questDefs)) emitQuestComplete(qev);
  }

  const SHADOW_LAG_STEPS = 18;
  function updateShadowChain() {
    for (let i = 0; i < player.shadows.length; i++) {
      const idx = player.history.length - 1 - (i + 1) * SHADOW_LAG_STEPS;
      const s = player.shadows[i];
      if (idx >= 0) {
        const p = player.history[idx];
        s.x = p.x; s.y = p.y; s.facing = p.facing; s.moving = p.moving;
      } else {
        s.x = player.x; s.y = player.y;
      }
    }
  }
  function snapShadowsToPlayer() {
    player.history = [];
    for (const s of player.shadows) { s.x = player.x; s.y = player.y; }
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
          text: t('system.shadowJoined', { name: battle.shadowExtracted.name }),
          color: '#a070ff',
          duration: 3.5,
        });
      }
      saveNow();
    } else if (battle.outcome === 'defeat') {
      player.x = map.spawn.x * map.tileSize;
      player.y = map.spawn.y * map.tileSize;
      player.stats.hp = Math.max(1, Math.floor(player.stats.maxHp * 0.3));
      player.stats.mp = Math.floor(player.stats.maxMp * 0.3);
      camera.x = player.x + player.w / 2 - LOGICAL_WIDTH / 2;
      camera.y = player.y + player.h / 2 - LOGICAL_HEIGHT / 2;
      snapShadowsToPlayer();
      saveNow();
    } else if (battle.outcome === 'run') {
      battle.enemyOverworld.disengaged = true;
    }
    battle = null;
  }

  async function triggerWarp(warp) {
    if (transition.isActive()) return;
    state = 'transition';
    transition.beginPending();
    captureDefeatedFor(map.name);
    const scene = await loadScene(warp.to);
    transition.beginFade(() => {
      map = scene.map;
      npcs = scene.npcs;
      enemies = scene.enemies;
      applyDefeatedFor(map.name);
      player.x = warp.spawnX * map.tileSize;
      player.y = warp.spawnY * map.tileSize;
      if (warp.facing) player.facing = warp.facing;
      currentWarpKey = `${warp.spawnX},${warp.spawnY}`;
      camera.x = player.x + player.w / 2 - LOGICAL_WIDTH / 2;
      camera.y = player.y + player.h / 2 - LOGICAL_HEIGHT / 2;
      snapShadowsToPlayer();
      saveNow();
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
        if (!shop.active) { state = 'overworld'; saveNow(); }
      } else if (state === 'menu') {
        menu.update(FIXED_DT, input, player, itemDefs);
        if (!menu.active) { state = 'overworld'; saveNow(); }
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

        if (input.menuPressed()) { menu.open(); state = 'menu'; }
        else if (input.questPressed()) { questLog.open(); state = 'quests'; }

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
                notifications.push({ text: t('system.healedFull'), color: '#80c0ff' });
              }
            }
            dialog.start(npc.name, npc.dialog, npc.speakerColor);
            state = 'dialog';
          }
        }

        if (state === 'overworld') {
          const warp = warpAt(player, map.warps, map.tileSize);
          const wkey = warp ? `${warp.x},${warp.y}` : null;
          if (wkey !== currentWarpKey) {
            currentWarpKey = wkey;
            if (warp) {
              if (warp.minLevel && player.stats.level < warp.minLevel) {
                dialog.start('System', [warp.blockedMessage ?? t('dialog.locked')], '#a070ff');
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

  // Skip the pending/fade-out half and start the game fully black, fading in.
  transition.phase = 'fade-in';
  transition.alpha = 1;
  transition.t = 0;
  transition.pendingSwap = null;

  requestAnimationFrame(frame);
}

boot();
