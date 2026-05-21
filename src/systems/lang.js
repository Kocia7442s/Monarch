// Localization. Caller must `await loadLang(code)` before reading strings.
// `t(key, params)` returns a string with {placeholder} substitution.
// `tArray(key)` returns a string array (used for NPC dialog pages).

let currentLang = 'fr';
let langData = {};

const PLACEHOLDER = /\{(\w+)\}/g;

export async function loadLang(code) {
  const res = await fetch(`./src/data/lang/${code}.json`);
  if (!res.ok) throw new Error(`lang: failed to load ${code} (${res.status})`);
  langData = await res.json();
  currentLang = code;
  try { localStorage.setItem('shadowGate.lang', code); } catch { /* ignore */ }
}

export function getCurrentLang() { return currentLang; }

export function t(key, params) {
  const value = langData[key];
  if (value == null) return `[?${key}]`;
  if (typeof value !== 'string') return `[!${key}]`;
  if (!params) return value;
  return value.replace(PLACEHOLDER, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

export function tArray(key) {
  const value = langData[key];
  if (!Array.isArray(value)) return [];
  return value;
}
