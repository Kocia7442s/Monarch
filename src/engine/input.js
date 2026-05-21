// Uses KeyboardEvent.code so AZERTY (ZQSD) and QWERTY (WASD) map to the
// same physical keys without per-layout branching.
const UP = new Set(['KeyW', 'ArrowUp']);
const DOWN = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const INTERACT = new Set(['KeyE', 'Enter']);
const CANCEL = new Set(['Escape']);
const CONFIRM = new Set(['Space']);
const MENU = new Set(['KeyI', 'Tab']);
const QUESTS = new Set(['KeyQ']);

export function createInput() {
  const held = new Set();
  const pressedThisFrame = new Set();

  // Tab, arrows, space all have default browser behavior (focus shift,
  // scrolling) that would conflict with gameplay. Swallow it for our keys.
  const ALL_GAME_KEYS = new Set([
    ...UP, ...DOWN, ...LEFT, ...RIGHT,
    ...INTERACT, ...CANCEL, ...CONFIRM, ...MENU, ...QUESTS,
  ]);

  function onDown(e) {
    if (ALL_GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    pressedThisFrame.add(e.code);
  }
  function onUp(e) {
    held.delete(e.code);
  }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  const anyHeld = (set) => {
    for (const k of set) if (held.has(k)) return true;
    return false;
  };
  const anyPressed = (set) => {
    for (const k of set) if (pressedThisFrame.has(k)) return true;
    return false;
  };

  return {
    get up() { return anyHeld(UP); },
    get down() { return anyHeld(DOWN); },
    get left() { return anyHeld(LEFT); },
    get right() { return anyHeld(RIGHT); },
    upPressed:    () => anyPressed(UP),
    downPressed:  () => anyPressed(DOWN),
    leftPressed:  () => anyPressed(LEFT),
    rightPressed: () => anyPressed(RIGHT),
    interactPressed: () => anyPressed(INTERACT),
    cancelPressed: () => anyPressed(CANCEL),
    confirmPressed: () => anyPressed(CONFIRM),
    menuPressed: () => anyPressed(MENU),
    questPressed: () => anyPressed(QUESTS),
    // Call once per frame after update() consumed edge-triggered events.
    endFrame: () => pressedThisFrame.clear(),
  };
}
