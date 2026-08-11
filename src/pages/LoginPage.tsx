import { FormEvent, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function getErrorMessage(err: unknown) {
    console.error('Portal login error:', err);

    if (err instanceof FirebaseError) {
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          return 'Invalid email address or password.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/user-disabled':
          return 'This account has been disabled. Please contact the system administrator.';
        case 'auth/too-many-requests':
          return 'Too many unsuccessful attempts. Please wait and try again.';
        case 'auth/network-request-failed':
          return 'Unable to connect to Firebase. Please check your internet connection.';
        case 'auth/api-key-not-valid':
        case 'auth/invalid-api-key':
          return 'Firebase configuration error. Please check the Firebase API key.';
        case 'auth/operation-not-allowed':
          return 'Email/password sign-in is not enabled in Firebase Authentication.';
        default:
          return `Unable to sign in (${err.code}).`;
      }
    }

    return err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setBusy(true);

    try {
      const profile = await login(normalizedEmail, password);

      // ONE LOGIN FOR EVERY ACCOUNT:
      // administrators automatically go to /admin,
      // regular applicants automatically go to /dashboard.
      navigate(profile.role === 'admin' ? '/admin' : '/dashboard', {
        replace: true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <Link to="/" className="back-link"><ArrowLeft size={17} /> Back to portal</Link>
        <img className="auth-logo" src="/ssu-logo.png" alt="Samar State University seal" />
        <span className="eyebrow light">Samar State University</span>
        <h1>Vehicle Registration Portal</h1>
        <p>Students, personnel, and authorized administrators use the same secure sign-in page.</p>
        <div className="auth-feature">
          <ShieldCheck />
          <div>
            <strong>Automatic role-based access</strong>
            <span>Your account role determines the dashboard you can access after sign-in.</span>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-icon"><LockKeyhole /></div>
          <h2>Portal sign in</h2>
          <p>Enter your registered account credentials.</p>

          {error && <div className="alert error-alert" role="alert">{error}</div>}

          <label>
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="name@ssu.edu.ph"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="primary-btn full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-switch">
            No applicant account yet? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
