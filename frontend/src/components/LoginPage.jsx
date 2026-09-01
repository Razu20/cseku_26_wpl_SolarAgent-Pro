import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage({ onSwitchToRegister, onSuccess }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Both fields are required.'); return; }
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  const inp = 'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all ' +
              'border-slate-300 dark:border-[#2A3350] bg-white dark:bg-[#0D1424] ' +
              'text-[#14192B] dark:text-slate-100 focus:border-[#E8A93A]';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F5F5] dark:bg-[#10182B] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-2xl font-bold text-[#14192B] dark:text-white tracking-tight">SolarAgent</span>
            <span className="font-mono text-xs text-[#E8A93A] border border-[#E8A93A] px-1.5 py-0.5 rounded">PRO</span>
          </div>
          <p className="text-sm text-[#5C6478]">Sign in to your account</p>
        </div>

        <div className="bg-white dark:bg-[#161E33] rounded-2xl border border-slate-200 dark:border-[#2A3350] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[#5C6478] tracking-widest mb-1.5">EMAIL</label>
              <input type="email" className={inp} placeholder="you@example.com"
                value={form.email} onChange={(e) => update('email', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[#5C6478] tracking-widest mb-1.5">PASSWORD</label>
              <input type="password" className={inp} placeholder="••••••••"
                value={form.password} onChange={(e) => update('password', e.target.value)} />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E8A93A] text-[#14192B] font-bold text-sm
                         disabled:opacity-60 hover:bg-[#d49a2c] transition-colors mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#5C6478]">
              Don't have an account?{' '}
              <button onClick={onSwitchToRegister}
                className="text-[#E8A93A] font-semibold hover:underline">
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
