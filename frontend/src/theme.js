import { useSyncExternalStore } from 'react';

const key = 'trackit.theme';
const listeners = new Set();

function apply(value) {
  const root = document.documentElement;
  if (value === 'light' || value === 'dark') root.dataset.theme = value;
  else root.dataset.theme = 'light'; // Default to light instead of deleting dataset.theme
  for (const listener of listeners) listener();
}

// Initialize theme on first page load (defaults to 'light' if nothing is in localStorage)
try {
  apply(localStorage.getItem(key) || 'light');
} catch {
  apply('light');
}

window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) apply(event.newValue || 'light');
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
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || 'light');
}