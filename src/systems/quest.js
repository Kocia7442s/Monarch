// Quest tracking. Quest state lives on the player: `player.quests` is an array
// of { id, progress, complete }. Each `record*` call returns events the caller
// turns into [SYSTEM] notifications and reward applications.

export function assignQuest(player, id) {
  if (player.quests.some((q) => q.id === id)) return false;
  player.quests.push({ id, progress: 0, complete: false });
  return true;
}

export function recordKill(player, enemyId, questDefs) {
  const events = [];
  for (const q of player.quests) {
    if (q.complete) continue;
    const def = questDefs[q.id];
    if (def?.type !== 'kill' || def.target !== enemyId) continue;
    q.progress = Math.min(def.count, q.progress + 1);
    if (q.progress >= def.count) {
      q.complete = true;
      events.push(completeEvent(q.id, def));
    }
  }
  return events;
}

export function recordLevel(player, questDefs) {
  const events = [];
  for (const q of player.quests) {
    if (q.complete) continue;
    const def = questDefs[q.id];
    if (def?.type !== 'level') continue;
    if (player.stats.level >= def.level) {
      q.complete = true;
      events.push(completeEvent(q.id, def));
    }
  }
  return events;
}

// Call after each kill on `mapName` with the count of still-alive enemies.
export function recordMapClear(player, mapName, enemiesAlive, questDefs) {
  if (enemiesAlive > 0) return [];
  const events = [];
  for (const q of player.quests) {
    if (q.complete) continue;
    const def = questDefs[q.id];
    if (def?.type !== 'clear' || def.map !== mapName) continue;
    q.complete = true;
    events.push(completeEvent(q.id, def));
  }
  return events;
}

function completeEvent(id, def) {
  return {
    type: 'quest-complete',
    id,
    name: def.name,
    xp: def.rewardXp ?? 0,
    gold: def.rewardGold ?? 0,
  };
}

// Pretty-print quest status. Used by quest-ui.js.
export function describeProgress(q, def, player) {
  if (q.complete) return 'Complete';
  switch (def.type) {
    case 'kill':  return `${q.progress}/${def.count}`;
    case 'level': return `Lv ${player.stats.level} / Lv ${def.level}`;
    case 'clear': return 'In progress';
    default:      return '';
  }
}
