import { Monitor, Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '../theme';

const choices = [
  { value: 'light', label: 'Light Mode', icon: Sun },
  { value: 'dark', label: 'Dark Mode', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ThemePicker({ compact = false }) {
  const theme = useTheme();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-body">Appearance</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center rounded-xl border-2 font-bold
              ${compact ? 'flex-col gap-1 px-1 py-2 text-xs' : 'gap-2 p-3 text-sm'}
              ${theme === value ? 'bg-indigo-wash border-indigo-600 text-indigo-ink' : 'bg-surface border-divider text-secondary hover:border-outline'}`}>
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
