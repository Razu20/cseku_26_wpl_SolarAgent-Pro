import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { BANGLADESH_DIVISIONS, getDistrictsByDivision, getUpazilas } from '../data/bangladeshLocations';

type Mode = 'login' | 'signup';
type Profile = {
  fullName: string;
  contactNumber: string;
  division: string;
  district: string;
  upazila: string;
  village: string;
};

export function AuthPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'admin' | 'customer'>((params.get('role') as 'admin' | 'customer') || 'customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profile, setProfile] = useState<Profile>({
    fullName: '',
    contactNumber: '',
    division: '',
    district: '',
    upazila: '',
    village: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  const availableDistricts = profile.division ? getDistrictsByDivision(profile.division) : [];
  const availableUpazilas = profile.district ? getUpazilas(profile.district) : [];

  function onDivisionChange(div: string) {
    setProfile({
      ...profile,
      division: div,
      district: '',
      upazila: '',
    });
  }

  function onDistrictChange(dist: string) {
    setProfile({
      ...profile,
      district: dist,
      upazila: '',
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (isSignup) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!profile.division || !profile.district || !profile.upazila || !profile.village.trim()) {
        setError('Please complete the full Bangladesh administrative location hierarchy.');
        return;
      }
    }

    setLoading(true);
    try {
      const body = isSignup ? { email, password, confirmPassword, ...profile } : { email, password, role };
      const result = await api<{ token: string; user: { role: string; email: string; fullName?: string } }>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      localStorage.setItem('solaragent.token', result.token);
      localStorage.setItem('solaragent.role', result.user.role);
      localStorage.setItem('solaragent.user', JSON.stringify(result.user));

      router.push(result.user.role === 'admin' ? '/admin/dashboard' : '/customer');
    } catch (reason) {
      const msg = (reason as Error).message;
      if (msg === 'invalid_credentials') {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (msg === 'email_already_registered') {
        setError('This email address is already registered. Please sign in instead.');
      } else if (msg === 'account_deactivated_contact_support') {
        setError('Your account has been deactivated. Please contact SolarAgent Pro support.');
      } else {
        setError(msg || 'Authentication failed. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-art">
        <Link className="auth-brand" href="/">
          <span className="auth-brand-mark">SA</span>
          <span>SolarAgent Pro</span>
        </Link>
        <div className="auth-art-content">
          <span className="eyebrow">{isSignup ? 'Create your account' : 'Welcome back'}</span>
          <h1>{isSignup ? 'Build better energy decisions together.' : 'Your energy workspace, ready when you are.'}</h1>
          <p>
            {role === 'admin'
              ? 'Operate the full renewable-energy lifecycle from one controlled operations command center.'
              : 'Configure your customized Solar, Wind, or Hybrid system, review engineering estimates, and track verified installation.'}
          </p>
          <div className="auth-benefits">
            <span>✓ Smart system sizing</span>
            <span>✓ Verified installation support</span>
            <span>✓ One connected workspace</span>
          </div>
        </div>
        <div className="auth-art-note"><span>⚡</span> Auditable engineering · Bangladesh meteorological modeling · Turnkey delivery</div>
      </div>

      <section className="auth-card">
        <Link className="auth-mobile-brand" href="/">
          <span className="auth-brand-mark">SA</span>
          <span>SolarAgent Pro</span>
        </Link>
        <div className="auth-card-heading">
          <span className="eyebrow">{isSignup ? 'Join the energy workspace' : 'Secure workspace access'}</span>
          <h2>{isSignup ? 'Create customer account' : 'Sign in'}</h2>
          <p>{isSignup ? 'Provide your Bangladesh installation details to get started.' : 'Continue to your workspace.'}</p>
        </div>

        {!isSignup && (
          <div className="role-switch">
            <button className={role === 'customer' ? 'selected' : ''} onClick={() => setRole('customer')} type="button">
              Customer
            </button>
            <button className={role === 'admin' ? 'selected' : ''} onClick={() => setRole('admin')} type="button">
              Administrator
            </button>
          </div>
        )}

        <form className={`auth-form${isSignup ? ' auth-signup-form' : ''}`} onSubmit={submit}>
          {isSignup && (
            <>
              <label>
                Full Name
                <input
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="e.g., Tanvir Ahmed"
                  required
                />
              </label>

              <label>
                Contact Number (Bangladesh Phone)
                <input
                  type="tel"
                  value={profile.contactNumber}
                  onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}
                  placeholder="+8801700000000"
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Division
                  <select value={profile.division} onChange={(e) => onDivisionChange(e.target.value)} required>
                    <option value="">Select Division</option>
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  District
                  <select
                    value={profile.district}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    disabled={!profile.division}
                    required
                  >
                    <option value="">{profile.division ? 'Select District' : 'Choose Division first'}</option>
                    {availableDistricts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Upazila / Thana
                  <select
                    value={profile.upazila}
                    onChange={(e) => setProfile({ ...profile, upazila: e.target.value })}
                    disabled={!profile.district}
                    required
                  >
                    <option value="">{profile.district ? 'Select Upazila' : 'Choose District first'}</option>
                    {availableUpazilas.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Village / Area / Ward
                  <input
                    value={profile.village}
                    onChange={(e) => setProfile({ ...profile, village: e.target.value })}
                    placeholder="e.g., Road 8/A, Ward 4"
                    required
                  />
                </label>
              </div>
            </>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>

          {isSignup && (
            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                minLength={8}
                required
              />
            </label>
          )}

          {error && <div className="auth-error" role="alert"><span>!</span>{error}</div>}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Processing...' : isSignup ? 'Create Customer Account' : `Continue as ${role === 'admin' ? 'Administrator' : 'Customer'}`}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to SolarAgent Pro?'}{' '}
          <Link href={isSignup ? `/login?role=${role}` : `/signup?role=${role}`}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </main>
  );
}
