import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="p-2 rounded-full border border-slate-200 dark:border-panelBorder hover:border-solar transition-colors"
    >
      {dark ? <Sun size={16} className="text-solar" /> : <Moon size={16} className="text-ink" />}
    </button>
  );
}
