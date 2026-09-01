import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, ChevronDown, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = ['SITE', 'LOAD', 'YOUR PLAN'];

export default function NavBar({ dark, onToggleDark, step, onStepClick }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="border-b border-slate-200 dark:border-[#2A3350] px-4 md:px-8 py-3
                       flex items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <span className="text-lg font-bold tracking-tight">SolarAgent</span>
        <span className="font-mono text-[10px] text-[#E8A93A] border border-[#E8A93A]
                         px-1.5 py-0.5 rounded">PRO</span>
      </div>

      {/* Step rail — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <React.Fragment key={label}>
              <button
                onClick={() => done && onStepClick && onStepClick(n)}
                className={`flex items-center gap-1.5 transition-opacity ${active ? 'opacity-100' : done ? 'opacity-80 cursor-pointer' : 'opacity-35 cursor-default'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${active || done ? 'bg-[#E8A93A] text-[#14192B]' : 'border border-slate-300 dark:border-[#2A3350]'}`}>
                  {`0${n}`}
                </span>
                <span>{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px bg-slate-200 dark:bg-[#2A3350]" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode */}
        <button onClick={onToggleDark} aria-label="Toggle theme"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2A3350]
                     hover:border-[#E8A93A] transition-colors">
          {dark
            ? <Sun size={15} className="text-[#E8A93A]" />
            : <Moon size={15} className="text-[#14192B]" />}
        </button>

        {/* User menu */}
        {user ? (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg
                         border border-slate-200 dark:border-[#2A3350]
                         hover:border-[#E8A93A] transition-colors text-sm font-medium">
              <div className="w-6 h-6 rounded-full bg-[#E8A93A] text-[#14192B] flex items-center
                              justify-center text-[11px] font-bold flex-shrink-0">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:block max-w-[100px] truncate">{user.username}</span>
              <ChevronDown size={12} className="text-[#5C6478]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-xl border border-slate-200
                              dark:border-[#2A3350] bg-white dark:bg-[#161E33] shadow-xl z-50 py-1">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-[#2A3350]">
                  <p className="text-xs text-[#5C6478]">Signed in as</p>
                  <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
                  <p className="text-xs text-[#5C6478] truncate">{user.email}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm
                                   hover:bg-slate-50 dark:hover:bg-[#1E2B45] text-left">
                  <User size={14} className="text-[#5C6478]" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm
                                   hover:bg-slate-50 dark:hover:bg-[#1E2B45] text-left">
                  <LayoutDashboard size={14} className="text-[#5C6478]" />
                  My Projects
                </button>
                <div className="border-t border-slate-100 dark:border-[#2A3350] mt-1 pt-1">
                  <button onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500
                               hover:bg-red-50 dark:hover:bg-red-950/20 text-left">
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="font-mono text-[10px] text-[#5C6478] hidden sm:block">
            DEMO MODE
          </div>
        )}
      </div>
    </header>
  );
}
