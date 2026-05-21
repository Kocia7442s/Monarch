// XP, levels, ranks, and skill unlocks.
// Returned events drive the [SYSTEM] notifications shown by the UI.

const BASE_XP = 20;
const XP_SCALE = 1.35;

const RANK_THRESHOLDS = [
  { rank: 'S', level: 16 },
  { rank: 'A', level: 13 },
  { rank: 'B', level: 10 },
  { rank: 'C', level: 7  },
  { rank: 'D', level: 4  },
  { rank: 'E', level: 1  },
];

const RANK_COLORS = {
  E: '#40c060',
  D: '#4080d0',
  C: '#e0c040',
  B: '#e08040',
  A: '#d04040',
  S: '#a040ff',
};

export function xpForLevel(level) {
  return Math.floor(BASE_XP * Math.pow(XP_SCALE, level - 1));
}

export function rankOf(level) {
  for (const { rank, level: min } of RANK_THRESHOLDS) {
    if (level >= min) return rank;
  }
  return 'E';
}

export function rankColor(rank) {
  return RANK_COLORS[rank] ?? '#cccccc';
}

export function unlockedSkillKeys(skillDefs, level) {
  return Object.entries(skillDefs)
    .filter(([, def]) => (def.unlock ?? 0) <= level)
    .map(([key]) => key);
}

// Mutates player.stats and player.skills. Returns events to surface in UI.
// Events: { type: 'levelUp', level } | { type: 'rankUp', rank } | { type: 'skillUnlock', key, name }
export function gainXP(player, amount, skillDefs) {
  const events = [];
  player.stats.xp += amount;

  while (player.stats.xp >= xpForLevel(player.stats.level)) {
    player.stats.xp -= xpForLevel(player.stats.level);
    const oldRank = rankOf(player.stats.level);
    player.stats.level++;

    player.stats.atk   += 2;
    player.stats.def   += 1;
    player.stats.spd   += 1;
    player.stats.int   += 1;
    player.stats.maxHp += 8;
    player.stats.hp    += 8;
    player.stats.maxMp += 4;
    player.stats.mp    += 4;

    events.push({ type: 'levelUp', level: player.stats.level });

    const newRank = rankOf(player.stats.level);
    if (newRank !== oldRank) events.push({ type: 'rankUp', rank: newRank });

    const had = new Set(player.skills);
    player.skills = unlockedSkillKeys(skillDefs, player.stats.level);
    for (const key of player.skills) {
      if (!had.has(key)) {
        events.push({ type: 'skillUnlock', key });
      }
    }
  }

  return events;
}
