// Inventory state lives on the player: `items: [{id, qty}]` and
// `equipment: { weapon, armor }`. Items here use string IDs that resolve
// against the items.json defs the caller passes in.

export function addItem(player, itemId, qty = 1) {
  const slot = player.items.find((s) => s.id === itemId);
  if (slot) slot.qty += qty;
  else player.items.push({ id: itemId, qty });
}

export function removeItem(player, itemId, qty = 1) {
  const idx = player.items.findIndex((s) => s.id === itemId);
  if (idx < 0) return false;
  player.items[idx].qty -= qty;
  if (player.items[idx].qty <= 0) player.items.splice(idx, 1);
  return true;
}

export function useItem(player, def) {
  switch (def.effect) {
    case 'heal-hp': {
      const before = player.stats.hp;
      player.stats.hp = Math.min(player.stats.maxHp, before + def.amount);
      const healed = player.stats.hp - before;
      return { ok: true, message: healed > 0 ? `Recovered ${healed} HP.` : 'HP is already full.' };
    }
    case 'heal-mp': {
      const before = player.stats.mp;
      player.stats.mp = Math.min(player.stats.maxMp, before + def.amount);
      const healed = player.stats.mp - before;
      return { ok: true, message: healed > 0 ? `Recovered ${healed} MP.` : 'MP is already full.' };
    }
    case 'cure-poison':
      return { ok: true, message: 'Nothing to cure.' };
    default:
      return { ok: false, message: 'Cannot use this item.' };
  }
}

// Equip an item from inventory. The currently equipped piece (if any) returns
// to inventory. Returns true on success.
export function equipItem(player, itemId, def) {
  const slot = def.type === 'weapon' ? 'weapon' : def.type === 'armor' ? 'armor' : null;
  if (!slot) return false;
  const current = player.equipment[slot];
  if (current) addItem(player, current, 1);
  removeItem(player, itemId, 1);
  player.equipment[slot] = itemId;
  return true;
}

export function equipmentBonus(player, itemDefs) {
  let atk = 0, def = 0;
  for (const slot of ['weapon', 'armor']) {
    const id = player.equipment[slot];
    if (!id) continue;
    const d = itemDefs[id];
    if (d?.bonus) {
      atk += d.bonus.atk ?? 0;
      def += d.bonus.def ?? 0;
    }
  }
  return { atk, def };
}

// A frozen snapshot of player stats with equipment bonuses folded in.
// Used by combat damage calc and battle-ui display.
export function effectiveStats(player, itemDefs) {
  const b = equipmentBonus(player, itemDefs);
  return { ...player.stats, atk: player.stats.atk + b.atk, def: player.stats.def + b.def };
}
