import { useSyncExternalStore } from 'react';

const key = 'trackit.theme';
const listeners = new Set();

function apply(value) {
  const root = document.documentElement;
  if (value === 'light' || value === 'dark') root.dataset.theme = value;
  else delete root.dataset.theme;
  for (const listener of listeners) listener();
}

window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) apply(event.newValue);
});

export function setTheme(value) {
  apply(value);
  try {
    if (value === 'system') localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* The choice still applies to the current tab. */ }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || 'system');
}
