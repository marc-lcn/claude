// Local persistence layer for the standalone (Capacitor / browser) build.
//
// The app's UI code (App.jsx) was originally written against Claude's artifact
// storage API (`window.storage.get/set/delete/list`). Rather than rewriting every
// call site, this module re-implements that exact interface on top of `localStorage`,
// which is available both in a normal browser and inside a Capacitor Android WebView.
//
// This is intentionally simple for V1. If you later want storage that survives an
// app *uninstall/reinstall* or syncs across devices, swap the implementation here
// for `@capacitor/preferences` (native) or a real backend — nothing in App.jsx
// needs to change, since it only ever talks to `window.storage`.

const PREFIX = 'spartan365:';

function fullKey(key) {
  return PREFIX + key;
}

async function get(key /*, shared */) {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (raw === null) return null;
    return { key, value: raw, shared: false };
  } catch (e) {
    return null;
  }
}

async function set(key, value /*, shared */) {
  try {
    localStorage.setItem(fullKey(key), value);
    return { key, value, shared: false };
  } catch (e) {
    return null;
  }
}

async function del(key /*, shared */) {
  try {
    localStorage.removeItem(fullKey(key));
    return { key, deleted: true, shared: false };
  } catch (e) {
    return null;
  }
}

async function list(prefix = '' /*, shared */) {
  try {
    const keys = [];
    const searchPrefix = PREFIX + prefix;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(searchPrefix)) {
        keys.push(k.slice(PREFIX.length));
      }
    }
    return { keys, prefix, shared: false };
  } catch (e) {
    return null;
  }
}

export function installStorage() {
  if (typeof window !== 'undefined' && !window.storage) {
    window.storage = { get, set, delete: del, list };
  }
}
