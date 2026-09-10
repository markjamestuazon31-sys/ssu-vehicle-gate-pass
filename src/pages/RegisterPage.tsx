import { FormEvent, useState } from 'react';
import { ArrowLeft, IdCard, LockKeyhole, UserRound, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../components/DocumentUploader';
import { useAuth } from '../context/AuthContext';
import { ApplicantType, StoredImageDocument } from '../types';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicantType, setApplicantType] = useState<ApplicantType>('Student');
  const [studentId, setStudentId] = useState('');
  const [studentIdFrontImage, setStudentIdFrontImage] = useState<StoredImageDocument | undefined>();
  const [studentIdBackImage, setStudentIdBackImage] = useState<StoredImageDocument | undefined>();
  const [personnelIdFrontImage, setPersonnelIdFrontImage] = useState<StoredImageDocument | undefined>();
  const [personnelIdBackImage, setPersonnelIdBackImage] = useState<StoredImageDocument | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (applicantType === 'Student' && !studentId.trim()) {
      return setError('Enter your official SSU Student ID.');
    }
    if (applicantType === 'Student' && !studentIdFrontImage) {
      return setError('Upload a clear photo of the FRONT of your Student ID.');
    }
    if (applicantType === 'Student' && !studentIdBackImage) {
      return setError('Upload a clear photo of the BACK of your Student ID.');
    }
    if (applicantType === 'SSU Personnel' && !personnelIdFrontImage) {
      return setError('Upload a clear photo of the FRONT of your SSU Personnel ID.');
    }
    if (applicantType === 'SSU Personnel' && !personnelIdBackImage) {
      return setError('Upload a clear photo of the BACK of your SSU Personnel ID.');
    }
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setError('');
    setBusy(true);
    try {
      await register({
        fullName,
        email,
        password,
        applicantType,
        studentId: applicantType === 'Student' ? studentId : undefined,
        studentIdFrontImage: applicantType === 'Student' ? studentIdFrontImage : undefined,
        studentIdBackImage: applicantType === 'Student' ? studentIdBackImage : undefined,
        personnelIdFrontImage: applicantType === 'SSU Personnel' ? personnelIdFrontImage : undefined,
        personnelIdBackImage: applicantType === 'SSU Personnel' ? personnelIdBackImage : undefined,
      });
      navigate(applicantType === 'Student' ? '/dashboard' : '/apply');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account creation failed.';
      setError(message.includes('email-already-in-use') ? 'An account already exists for this email.' : message);
    } finally {
      setBusy(false);
    }
  }

  function changeApplicantType(next: ApplicantType) {
    setApplicantType(next);
    setError('');

    if (next !== 'Student') {
      setStudentId('');
      setStudentIdFrontImage(undefined);
      setStudentIdBackImage(undefined);
    }

    if (next !== 'SSU Personnel') {
      setPersonnelIdFrontImage(undefined);
      setPersonnelIdBackImage(undefined);
    }
  }

  const requiresIdVerification = applicantType === 'Student' || applicantType === 'SSU Personnel';

  return (
    <div className="auth-page registration-auth-page">
      <div className="auth-brand-panel registration-brand-panel">
        <Link to="/" className="back-link"><ArrowLeft size={17} /> Back to portal</Link>
        <img className="auth-logo" src="/ssu-logo.png" alt="Samar State University seal" />
        <span className="eyebrow light">#WeAtSSU</span>
        <h1>Create your applicant account</h1>
        <p>Register once, submit your vehicle application, and track its status through the SSU portal.</p>
        <div className="registration-brand-note">
          <IdCard size={20} />
          <div>
            <strong>Identity verification</strong>
            <span>Students and SSU personnel must submit clear front and back photos of their current university ID.</span>
          </div>
        </div>
      </div>

      <div className="auth-form-panel registration-form-panel">
        <form className="auth-card registration-card" onSubmit={submit}>
          <div className="registration-card-header">
            <div className="auth-card-icon"><UserPlus /></div>
            <div>
              <span className="eyebrow">Applicant account</span>
              <h2>Applicant registration</h2>
              <p>Enter your information exactly as it appears in your official records.</p>
            </div>
          </div>

          {error && <div className="alert error-alert">{error}</div>}

          <section className="registration-section">
            <div className="registration-section-heading">
              <span><UserRound size={18} /></span>
              <div>
                <h3>Basic information</h3>
                <p>Tell us who is creating the account.</p>
              </div>
            </div>

            <div className="form-grid two registration-field-grid">
              <label>
                Full name
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </label>
              <label>
                Applicant type
                <select
                  value={applicantType}
                  onChange={(e) => changeApplicantType(e.target.value as ApplicantType)}
                >
                  <option>Student</option>
                  <option>SSU Personnel</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
          </section>

          {applicantType === 'Student' && (
            <section className="registration-section student-id-registration-section">
              <div className="registration-section-heading student-id-heading">
                <span><IdCard size={18} /></span>
                <div>
                  <h3>Student ID verification</h3>
                  <p>Your Student ID number and both ID photos will be sent to the administrator for verification.</p>
                </div>
                <span className="required-pill">Required</span>
              </div>

              <div className="student-id-number-card student-id-number-card-wide">
                <label>
                  Student ID number
                  <input
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    placeholder="Enter your official SSU Student ID"
                    autoComplete="off"
                  />
                </label>
                <div className="student-id-tip">
                  <IdCard size={17} />
                  <p>Use the same Student ID number shown on the ID photos. Upload the front and back of the same current Student ID.</p>
                </div>
              </div>

              <div className="student-id-photo-upload-grid">
                <DocumentUploader
                  label="Front of Student ID"
                  description="Upload a clear photo of the FRONT side of your current SSU Student ID."
                  value={studentIdFrontImage}
                  onChange={setStudentIdFrontImage}
                  required
                />

                <DocumentUploader
                  label="Back of Student ID"
                  description="Upload a clear photo of the BACK side of the same current SSU Student ID."
                  value={studentIdBackImage}
                  onChange={setStudentIdBackImage}
                  required
                />
              </div>

              <div className="student-id-two-photo-note">
                Both photos are required before you can create a student account.
              </div>
            </section>
          )}

          {applicantType === 'SSU Personnel' && (
            <section className="registration-section student-id-registration-section personnel-id-registration-section">
              <div className="registration-section-heading student-id-heading">
                <span><IdCard size={18} /></span>
                <div>
                  <h3>SSU Personnel ID verification</h3>
                  <p>Upload both sides of your current SSU Personnel ID so the administrator can review your account details.</p>
                </div>
                <span className="required-pill">Required</span>
              </div>

              <div className="student-id-photo-upload-grid">
                <DocumentUploader
                  label="Front of Personnel ID"
                  description="Upload a clear photo of the FRONT side of your current SSU Personnel ID."
                  value={personnelIdFrontImage}
                  onChange={setPersonnelIdFrontImage}
                  required
                />

                <DocumentUploader
                  label="Back of Personnel ID"
                  description="Upload a clear photo of the BACK side of the same current SSU Personnel ID."
                  value={personnelIdBackImage}
                  onChange={setPersonnelIdBackImage}
                  required
                />
              </div>

              <div className="student-id-two-photo-note">
                Both photos are required before you can create an SSU Personnel account.
              </div>
            </section>
          )}

          <section className="registration-section account-security-section">
            <div className="registration-section-heading">
              <span><LockKeyhole size={18} /></span>
              <div>
                <h3>Account login</h3>
                <p>Use an active email address and create your password.</p>
              </div>
            </div>

            <label>
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </label>

            <div className="form-grid two registration-field-grid">
              <label>
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </label>
            </div>
          </section>

          <div className="registration-submit-area">
            <button className="primary-btn full registration-submit-btn" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
            {requiresIdVerification && (
              <small>After registration, your university ID will show as Pending until an administrator reviews the front and back photos.</small>
            )}
          </div>

          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
