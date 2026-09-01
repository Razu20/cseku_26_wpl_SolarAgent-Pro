import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function strength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#DC2626', '#D97706', '#3D7A5A', '#059669'];

export default function RegisterPage({ onSwitchToLogin, onSuccess }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const pw_strength = strength(form.password);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) {
      setError('Email, username and password are required.'); return;
    }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.username)) {
      setError('Username: 3–30 chars, letters/digits/_ only.'); return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    setLoading(true); setError('');
    try {
      await register(form.email, form.username, form.password, form.full_name);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-2xl font-bold text-[#14192B] dark:text-white tracking-tight">SolarAgent</span>
            <span className="font-mono text-xs text-[#E8A93A] border border-[#E8A93A] px-1.5 py-0.5 rounded">PRO</span>
          </div>
          <p className="text-sm text-[#5C6478]">Create your free account</p>
        </div>

        <div className="bg-white dark:bg-[#161E33] rounded-2xl border border-slate-200 dark:border-[#2A3350] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[#5C6478] tracking-widest mb-1.5">FULL NAME (optional)</label>
              <input className={inp} placeholder="e.g. Razu Sarder"
                value={form.full_name} onChange={(e) => update('full_name', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[#5C6478] tracking-widest mb-1.5">EMAIL</label>
              <input type="email" className={inp} placeholder="you@example.com"
                value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[#5C6478] tracking-widest mb-1.5">USERNAME</label>
              <input className={inp} placeholder="letters, digits, _ (3–30 chars)"
                value={form.username} onChange={(e) => update('username', e.target.value)} />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[#5C6478] tracking-widest mb-1.5">PASSWORD</label>
              <input type="password" className={inp} placeholder="Min. 8 characters"
                value={form.password} onChange={(e) => update('password', e.target.value)} />
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                        style={{ backgroundColor: i <= pw_strength ? STRENGTH_COLORS[pw_strength] : '#E4E7EA' }} />
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: STRENGTH_COLORS[pw_strength] }}>
                    {STRENGTH_LABELS[pw_strength]}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E8A93A] text-[#14192B] font-bold text-sm
                         disabled:opacity-60 hover:bg-[#d49a2c] transition-colors mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#5C6478]">
              Already have an account?{' '}
              <button onClick={onSwitchToLogin} className="text-[#E8A93A] font-semibold hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
