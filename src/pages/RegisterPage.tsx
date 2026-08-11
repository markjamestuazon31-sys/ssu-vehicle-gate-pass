import { FormEvent, useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApplicantType } from '../types';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicantType, setApplicantType] = useState<ApplicantType>('Student');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setError('');
    setBusy(true);
    try {
      await register({ fullName, email, password, applicantType });
      navigate('/apply');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account creation failed.';
      setError(message.includes('email-already-in-use') ? 'An account already exists for this email.' : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <Link to="/" className="back-link"><ArrowLeft size={17} /> Back to portal</Link>
        <img className="auth-logo" src="/ssu-logo.png" alt="Samar State University seal" />
        <span className="eyebrow light">#WeAtSSU</span>
        <h1>Create your applicant account</h1>
        <p>This account lets you submit and track your SSU vehicle registration and gate pass application.</p>
      </div>
      <div className="auth-form-panel">
        <form className="auth-card wider" onSubmit={submit}>
          <div className="auth-card-icon"><UserPlus /></div>
          <h2>Applicant registration</h2>
          <p>Use accurate information that matches your submitted vehicle records.</p>
          {error && <div className="alert error-alert">{error}</div>}
          <div className="form-grid two">
            <label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Applicant type<select value={applicantType} onChange={(e) => setApplicantType(e.target.value as ApplicantType)}><option>Student</option><option>SSU Personnel</option><option>Other</option></select></label>
          </div>
          <label>Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>
          <div className="form-grid two">
            <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <label>Confirm password<input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          </div>
          <button className="primary-btn full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
