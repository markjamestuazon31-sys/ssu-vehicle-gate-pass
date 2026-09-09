import { useEffect, useMemo, useState } from 'react';
import { get, onValue, ref, update } from 'firebase/database';
import {
  BadgeCheck,
  Clock3,
  Eye,
  IdCard,
  ImageIcon,
  Search,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { PortalLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  ApplicantType,
  Role,
  StudentVerificationDocument,
  StudentVerificationStatus,
  UserProfile,
} from '../types';
import { formatDateTime } from '../utils/id';

type ManagedUser = UserProfile & { sourceKey: string };
type RoleFilter = 'all' | Role;

type IdReviewState = {
  user: ManagedUser;
  document: StudentVerificationDocument;
};

function normalizeVerificationStatus(
  value: Partial<UserProfile> | null,
  applicantType: ApplicantType,
): StudentVerificationStatus {
  if (
    value?.verificationStatus === 'pending' ||
    value?.verificationStatus === 'verified' ||
    value?.verificationStatus === 'not_required'
  ) {
    return value.verificationStatus;
  }

  if (applicantType === 'Student' && value?.studentId?.trim()) return 'pending';
  return 'not_required';
}

function normalizeUser(key: string, value: Partial<UserProfile> | null): ManagedUser {
  const role: Role = value?.role === 'admin' ? 'admin' : 'user';
  const applicantType: ApplicantType = value?.applicantType === 'Student' || value?.applicantType === 'Other'
    ? value.applicantType
    : 'SSU Personnel';

  const legacyPhotoSubmitted = value?.studentIdImageSubmitted === true;
  const frontSubmitted = value?.studentIdFrontImageSubmitted === true || legacyPhotoSubmitted;
  const backSubmitted = value?.studentIdBackImageSubmitted === true;

  return {
    sourceKey: key,
    uid: value?.uid || key,
    email: value?.email || '',
    fullName: value?.fullName || '',
    applicantType,
    role,
    createdAt: typeof value?.createdAt === 'number' ? value.createdAt : 0,
    studentId: typeof value?.studentId === 'string' && value.studentId.trim()
      ? value.studentId.trim().toUpperCase()
      : undefined,
    studentIdImageSubmitted: legacyPhotoSubmitted || (frontSubmitted && backSubmitted),
    studentIdFrontImageSubmitted: frontSubmitted,
    studentIdBackImageSubmitted: backSubmitted,
    verificationStatus: normalizeVerificationStatus(value, applicantType),
    verificationReviewedAt: typeof value?.verificationReviewedAt === 'number'
      ? value.verificationReviewedAt
      : undefined,
    verificationReviewedByUid: typeof value?.verificationReviewedByUid === 'string'
      ? value.verificationReviewedByUid
      : undefined,
  };
}

export function AdminUsersPage() {
  const { user: currentUser, profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [idReview, setIdReview] = useState<IdReviewState | null>(null);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    return onValue(
      usersRef,
      (snap) => {
        const rows: ManagedUser[] = [];
        snap.forEach((child) => {
          rows.push(normalizeUser(child.key!, child.val() as Partial<UserProfile>));
        });
        rows.sort((a, b) => {
          if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
          return (a.fullName || a.email || a.uid).localeCompare(b.fullName || b.email || b.uid);
        });
        setUsers(rows);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Unable to load users. Deploy the updated Realtime Database rules.');
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!idReview) return;
    const current = users.find((row) => row.uid === idReview.user.uid);
    if (current) setIdReview((previous) => previous ? { ...previous, user: current } : previous);
  }, [users]);

  useEffect(() => {
    if (!idReview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIdReview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [idReview]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((row) => {
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      const haystack = `${row.fullName} ${row.email} ${row.uid} ${row.applicantType} ${row.studentId || ''} ${row.verificationStatus || ''} ${row.role}`.toLowerCase();
      return matchesRole && (!q || haystack.includes(q));
    });
  }, [users, search, roleFilter]);

  const adminCount = users.filter((row) => row.role === 'admin').length;
  const userCount = users.filter((row) => row.role === 'user').length;
  const pendingStudentCount = users.filter(
    (row) => row.applicantType === 'Student' && row.verificationStatus === 'pending',
  ).length;
  const verifiedStudentCount = users.filter(
    (row) => row.applicantType === 'Student' && row.verificationStatus === 'verified',
  ).length;

  const reviewedFrontImage = idReview?.document.studentIdFrontImage ?? idReview?.document.studentIdImage;
  const reviewedBackImage = idReview?.document.studentIdBackImage;
  const reviewedHasBothSides = Boolean(reviewedFrontImage?.dataUrl && reviewedBackImage?.dataUrl);

  async function changeRole(target: ManagedUser, nextRole: Role) {
    setError('');
    setNotice('');

    if (!currentUser) return;
    if (target.uid === currentUser.uid) {
      setError('For safety, you cannot change your own administrator role while signed in.');
      return;
    }
    if (target.role === nextRole) return;

    const label = target.fullName || target.email || target.uid;
    const action = nextRole === 'admin' ? 'promote this account to Administrator' : 'demote this administrator to Applicant';
    if (!window.confirm(`Are you sure you want to ${action}?\n\n${label}`)) return;

    setBusyKey(`role:${target.uid}`);
    try {
      await update(ref(db, `users/${target.uid}`), { role: nextRole });
      setNotice(nextRole === 'admin'
        ? `${label} now has administrator access.`
        : `${label} is now an applicant account.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update this account.';
      setError(message);
    } finally {
      setBusyKey('');
    }
  }

  async function openStudentIdReview(target: ManagedUser) {
    setError('');
    setNotice('');

    if (target.applicantType !== 'Student') return;
    if (!target.studentIdFrontImageSubmitted && !target.studentIdBackImageSubmitted) {
      setError(`${target.fullName || target.email || 'This student'} has no Student ID photos submitted.`);
      return;
    }

    setBusyKey(`photo:${target.uid}`);
    try {
      const snap = await get(ref(db, `studentVerificationDocuments/${target.uid}`));
      if (!snap.exists()) {
        setError('The Student ID photo record could not be found. Ask the student to register again with front and back ID photos.');
        return;
      }

      const document = snap.val() as StudentVerificationDocument;
      const frontImage = document.studentIdFrontImage ?? document.studentIdImage;
      const backImage = document.studentIdBackImage;

      if (!frontImage?.dataUrl && !backImage?.dataUrl) {
        setError('The Student ID photo record is incomplete.');
        return;
      }

      setIdReview({ user: target, document });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load the Student ID photos.';
      setError(message);
    } finally {
      setBusyKey('');
    }
  }

  async function changeStudentVerification(
    target: ManagedUser,
    nextStatus: Extract<StudentVerificationStatus, 'pending' | 'verified'>,
  ) {
    setError('');
    setNotice('');

    if (!currentUser) return;
    if (target.applicantType !== 'Student') return;

    const label = target.fullName || target.email || target.uid;
    const studentId = target.studentId?.trim().toUpperCase();

    if (!studentId) {
      setError(`${label} has no Student ID number saved. The account cannot be verified yet.`);
      return;
    }
    if (nextStatus === 'verified') {
      if (!target.studentIdFrontImageSubmitted) {
        setError(`${label} has no front Student ID photo submitted. The account cannot be verified yet.`);
        return;
      }
      if (!target.studentIdBackImageSubmitted) {
        setError(`${label} has no back Student ID photo submitted. The account cannot be verified yet.`);
        return;
      }
      if (!reviewedHasBothSides) {
        setError('Both the front and back Student ID photos must be available before verification.');
        return;
      }

      const duplicate = users.find(
        (row) => row.uid !== target.uid
          && row.applicantType === 'Student'
          && row.verificationStatus === 'verified'
          && row.studentId?.trim().toUpperCase() === studentId,
      );

      if (duplicate) {
        const duplicateLabel = duplicate.fullName || duplicate.email || duplicate.uid;
        setError(`Student ID ${studentId} is already verified for ${duplicateLabel}.`);
        return;
      }

      if (!window.confirm(`Verify this student account after checking BOTH sides of the Student ID?\n\n${label}\nStudent ID: ${studentId}`)) return;
    } else if (!window.confirm(`Send this Student ID back to pending verification?\n\n${label}\nStudent ID: ${studentId}`)) {
      return;
    }

    setBusyKey(`verify:${target.uid}`);
    try {
      await update(ref(db, `users/${target.uid}`), {
        verificationStatus: nextStatus,
        verificationReviewedAt: Date.now(),
        verificationReviewedByUid: currentUser.uid,
      });
      setNotice(nextStatus === 'verified'
        ? `${label}'s Student ID has been verified.`
        : `${label}'s Student ID is pending verification again.`);
      setIdReview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update Student ID verification.';
      setError(message);
    } finally {
      setBusyKey('');
    }
  }

  return (
    <PortalLayout admin>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Manage Users</h1>
          <p>Review applicant accounts, compare Student ID details, and manage administrator access.</p>
        </div>
      </section>

      <section className="stats-grid five">
        <div className="stat-card"><UsersRound /><div><span>Total accounts</span><strong>{users.length}</strong></div></div>
        <div className="stat-card"><ShieldCheck /><div><span>Administrators</span><strong>{adminCount}</strong></div></div>
        <div className="stat-card"><UserRound /><div><span>Applicants</span><strong>{userCount}</strong></div></div>
        <div className="stat-card"><Clock3 /><div><span>Pending IDs</span><strong>{pendingStudentCount}</strong></div></div>
        <div className="stat-card"><BadgeCheck /><div><span>Verified students</span><strong>{verifiedStudentCount}</strong></div></div>
      </section>

      <section className="panel admin-security-note student-id-admin-note">
        <div className="admin-security-icon"><IdCard /></div>
        <div>
          <strong>Student ID verification</strong>
          <p>Review the front and back ID photos, compare the Student ID number and student name, then verify the account.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading responsive">
          <div>
            <h2>Portal accounts</h2>
            <p>Student ID photos are loaded only when an administrator clicks Review ID.</p>
          </div>
          <div className="filter-row">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or Student ID" /></label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}>
              <option value="all">All roles</option>
              <option value="admin">Administrators</option>
              <option value="user">Applicants</option>
            </select>
          </div>
        </div>

        {error && <div className="alert error-alert">{error}</div>}
        {notice && <div className="alert success-alert">{notice}</div>}

        {loading ? (
          <div className="empty-state">Loading portal accounts…</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table user-management-table student-verification-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Applicant type</th>
                  <th>Student ID</th>
                  <th>ID photos</th>
                  <th>Verification</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Role action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSelf = row.uid === currentUser?.uid;
                  const displayName = row.fullName || (isSelf ? profile?.fullName : '') || 'Portal account';
                  const verificationBusy = busyKey === `verify:${row.uid}`;
                  const photoBusy = busyKey === `photo:${row.uid}`;
                  const roleBusy = busyKey === `role:${row.uid}`;
                  const hasFront = row.studentIdFrontImageSubmitted === true;
                  const hasBack = row.studentIdBackImageSubmitted === true;
                  const hasAnyPhoto = hasFront || hasBack;
                  const hasBothPhotos = hasFront && hasBack;

                  return (
                    <tr key={row.uid}>
                      <td>
                        <strong>{displayName}{isSelf ? ' (You)' : ''}</strong>
                        <small>{row.email || row.uid}</small>
                      </td>
                      <td>{row.applicantType}</td>
                      <td>
                        {row.applicantType === 'Student' ? (
                          row.studentId ? <strong className="student-id-value">{row.studentId}</strong> : <span className="muted-value">Not provided</span>
                        ) : (
                          <span className="muted-value">—</span>
                        )}
                      </td>
                      <td>
                        {row.applicantType !== 'Student' ? (
                          <span className="muted-value">—</span>
                        ) : hasAnyPhoto ? (
                          <div className="student-id-photo-cell-stack">
                            <button
                              type="button"
                              className="secondary-btn compact student-id-review-btn"
                              disabled={photoBusy || verificationBusy}
                              onClick={() => openStudentIdReview(row)}
                            >
                              <Eye size={14} /> {photoBusy ? 'Loading…' : 'Review ID'}
                            </button>
                            <small className={hasBothPhotos ? 'student-id-sides-complete' : 'student-id-sides-incomplete'}>
                              {hasBothPhotos ? 'Front + back submitted' : hasFront ? 'Back photo missing' : 'Front photo missing'}
                            </small>
                          </div>
                        ) : (
                          <span className="verification-badge verification-missing"><ImageIcon size={13} /> Missing photos</span>
                        )}
                      </td>
                      <td>
                        {row.applicantType !== 'Student' ? (
                          <span className="verification-badge verification-na">Not required</span>
                        ) : row.verificationStatus === 'verified' ? (
                          <span className="verification-badge verification-verified"><BadgeCheck size={13} /> Verified</span>
                        ) : row.studentId && hasBothPhotos ? (
                          <span className="verification-badge verification-pending"><Clock3 size={13} /> Pending review</span>
                        ) : (
                          <span className="verification-badge verification-missing">Incomplete</span>
                        )}
                      </td>
                      <td>
                        <span className={`role-badge role-${row.role}`}>
                          {row.role === 'admin' ? <ShieldCheck size={13} /> : <UserRound size={13} />}
                          {row.role === 'admin' ? 'Administrator' : 'Applicant'}
                        </span>
                      </td>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>
                        {isSelf ? (
                          <span className="role-lock-note"><ShieldCheck size={14} /> Current admin</span>
                        ) : row.role === 'admin' ? (
                          <button className="secondary-btn compact role-action demote" disabled={roleBusy} onClick={() => changeRole(row, 'user')}>
                            <ShieldMinus size={15} /> {roleBusy ? 'Updating…' : 'Demote'}
                          </button>
                        ) : (
                          <button className="secondary-btn compact role-action promote" disabled={roleBusy} onClick={() => changeRole(row, 'admin')}>
                            <ShieldPlus size={15} /> {roleBusy ? 'Updating…' : 'Promote'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state">No matching portal accounts.</div>}
          </div>
        )}
      </section>

      {idReview && (
        <div className="student-id-review-modal" role="dialog" aria-modal="true" aria-label="Student ID verification review">
          <button className="student-id-review-backdrop" type="button" aria-label="Close Student ID review" onClick={() => setIdReview(null)} />
          <section className="student-id-review-panel student-id-review-panel-two-sided">
            <header className="student-id-review-header">
              <div>
                <span className="eyebrow">Student verification</span>
                <h2>Review Student ID</h2>
              </div>
              <button className="student-id-modal-close" type="button" onClick={() => setIdReview(null)} aria-label="Close">
                <X size={20} />
              </button>
            </header>

            <div className="student-id-review-content student-id-review-content-two-sided">
              <div className="student-id-photo-stage student-id-two-sided-stage">
                <div className={`student-id-side-card ${reviewedFrontImage?.dataUrl ? '' : 'missing'}`}>
                  <div className="student-id-side-label">
                    <strong>Front of ID</strong>
                    <span>{reviewedFrontImage?.dataUrl ? 'Submitted' : 'Missing'}</span>
                  </div>
                  {reviewedFrontImage?.dataUrl ? (
                    <img src={reviewedFrontImage.dataUrl} alt="Front of submitted Student ID" />
                  ) : (
                    <div className="student-id-side-missing"><ImageIcon size={28} /> Front photo not submitted</div>
                  )}
                </div>

                <div className={`student-id-side-card ${reviewedBackImage?.dataUrl ? '' : 'missing'}`}>
                  <div className="student-id-side-label">
                    <strong>Back of ID</strong>
                    <span>{reviewedBackImage?.dataUrl ? 'Submitted' : 'Missing'}</span>
                  </div>
                  {reviewedBackImage?.dataUrl ? (
                    <img src={reviewedBackImage.dataUrl} alt="Back of submitted Student ID" />
                  ) : (
                    <div className="student-id-side-missing"><ImageIcon size={28} /> Back photo not submitted</div>
                  )}
                </div>
              </div>

              <aside className="student-id-review-details">
                <div className="student-id-review-person">
                  <span className="student-id-review-icon"><IdCard size={21} /></span>
                  <div>
                    <small>Student</small>
                    <strong>{idReview.user.fullName || 'Unnamed student'}</strong>
                  </div>
                </div>

                <dl>
                  <div><dt>Student ID number</dt><dd>{idReview.user.studentId || 'Not provided'}</dd></div>
                  <div><dt>Email</dt><dd>{idReview.user.email || 'Not provided'}</dd></div>
                  <div><dt>ID photos submitted</dt><dd>{formatDateTime(idReview.document.submittedAt)}</dd></div>
                  <div><dt>Required sides</dt><dd>{reviewedHasBothSides ? 'Front and back complete' : 'Incomplete — both sides are required'}</dd></div>
                  <div><dt>Verification status</dt><dd>{idReview.user.verificationStatus === 'verified' ? 'Verified' : 'Pending review'}</dd></div>
                </dl>

                <div className="student-id-review-checklist">
                  <strong>Before verifying</strong>
                  <span>✓ Front and back photos are both present.</span>
                  <span>✓ Student name and ID number match the submitted ID.</span>
                  <span>✓ Both sides are clear and readable.</span>
                  <span>✓ Both photos show the same current Student ID.</span>
                </div>

                {!reviewedHasBothSides && (
                  <div className="student-id-incomplete-warning">
                    Verification is disabled until both the front and back ID photos are available.
                  </div>
                )}
              </aside>
            </div>

            <footer className="student-id-review-actions">
              <button type="button" className="secondary-btn" onClick={() => setIdReview(null)}>Close</button>
              {idReview.user.verificationStatus === 'verified' ? (
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busyKey === `verify:${idReview.user.uid}`}
                  onClick={() => changeStudentVerification(idReview.user, 'pending')}
                >
                  <Clock3 size={16} /> Mark for recheck
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!reviewedHasBothSides || busyKey === `verify:${idReview.user.uid}`}
                  onClick={() => changeStudentVerification(idReview.user, 'verified')}
                >
                  <BadgeCheck size={17} /> {busyKey === `verify:${idReview.user.uid}` ? 'Verifying…' : 'Verify student'}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </PortalLayout>
  );
}
