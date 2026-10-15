'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

export function RecoveryPage({ reset = false }: { reset?: boolean }) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (reset) {
      setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [reset]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (reset && password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const result = await api<{ message: string }>(`/auth/${reset ? 'reset-password' : 'forgot-password'}`, {
        method: 'POST', body: JSON.stringify(reset ? { token, newPassword: password } : { email }),
      });
      if (reset) for (const key of ['token', 'role', 'user']) localStorage.removeItem(`solaragent.${key}`);
      setMessage(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="recovery-page"><section className="auth-card">
    <Link href="/" className="auth-brand"><span className="auth-brand-mark">SA</span>SolarAgent Pro</Link>
    <div className="auth-card-heading"><span className="eyebrow">Account recovery</span><h1>{reset ? 'Choose a new password' : 'Forgot your password?'}</h1><p>{reset ? 'Use a strong password with at least 8 characters.' : 'We’ll email you a secure link to regain access.'}</p></div>
    {message ? <div role="status" className="notice">{message}</div> : <form className="auth-form" onSubmit={submit}>
      {reset ? <><label>New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>{!token && <p role="alert">This reset link is missing or invalid. Request a new link.</p>}</> : <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
      {error && <p className="notice" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy || (reset && !token)}>{busy ? 'Please wait…' : reset ? 'Update password' : 'Send reset link'}</button>
    </form>}
    <p className="auth-footer"><Link href="/login">Back to sign in</Link></p>
  </section></main>;
}
