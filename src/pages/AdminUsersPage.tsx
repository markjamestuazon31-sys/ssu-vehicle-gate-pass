import { useEffect, useMemo, useState } from 'react';
import { get, onValue, ref, update } from 'firebase/database';
import {
  BadgeCheck,
  ChevronRight,
  Clock3,
  Eye,
  IdCard,
  ImageIcon,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { PortalLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  ApplicantType,
  PersonnelVerificationDocument,
  Role,
  StoredImageDocument,
  StudentVerificationDocument,
  StudentVerificationStatus,
  UserProfile,
} from '../types';
import { formatDateTime } from '../utils/id';

type ManagedUser = UserProfile & { sourceKey: string };
type RoleFilter = 'all' | Role;
type ApplicantTypeFilter = 'all' | ApplicantType;
type VerificationFilter = 'all' | 'pending' | 'verified' | 'incomplete';
type SortMode = 'name' | 'newest' | 'oldest';
type QuickFilter = 'all' | 'students' | 'personnel' | 'pending' | 'admins' | 'custom';

type UserDetailState = {
  user: ManagedUser;
  frontImage?: StoredImageDocument;
  backImage?: StoredImageDocument;
  submittedAt?: number;
  documentError?: string;
};

function requiresIdentityReview(applicantType: ApplicantType) {
  return applicantType === 'Student' || applicantType === 'SSU Personnel';
}

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
  if (
    applicantType === 'SSU Personnel' &&
    (value?.personnelIdFrontImageSubmitted === true || value?.personnelIdBackImageSubmitted === true)
  ) {
    return 'pending';
  }
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
  const personnelFrontSubmitted = value?.personnelIdFrontImageSubmitted === true;
  const personnelBackSubmitted = value?.personnelIdBackImageSubmitted === true;

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
    personnelIdFrontImageSubmitted: personnelFrontSubmitted,
    personnelIdBackImageSubmitted: personnelBackSubmitted,
    verificationStatus: normalizeVerificationStatus(value, applicantType),
    verificationReviewedAt: typeof value?.verificationReviewedAt === 'number'
      ? value.verificationReviewedAt
      : undefined,
    verificationReviewedByUid: typeof value?.verificationReviewedByUid === 'string'
      ? value.verificationReviewedByUid
      : undefined,
  };
}

function idSubmissionFlags(user: ManagedUser) {
  if (user.applicantType === 'Student') {
    return {
      front: user.studentIdFrontImageSubmitted === true,
      back: user.studentIdBackImageSubmitted === true,
    };
  }
  if (user.applicantType === 'SSU Personnel') {
    return {
      front: user.personnelIdFrontImageSubmitted === true,
      back: user.personnelIdBackImageSubmitted === true,
    };
  }
  return { front: false, back: false };
}

function userInitials(user: ManagedUser) {
  const source = user.fullName?.trim() || user.email?.split('@')[0] || 'User';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

function isReadyForIdReview(user: ManagedUser) {
  const { front, back } = idSubmissionFlags(user);
  return requiresIdentityReview(user.applicantType)
    && user.verificationStatus === 'pending'
    && front
    && back;
}

function isIncompleteId(user: ManagedUser) {
  if (
    !requiresIdentityReview(user.applicantType)
    || user.verificationStatus === 'verified'
    || user.verificationStatus === 'not_required'
  ) return false;
  const { front, back } = idSubmissionFlags(user);
  return !front || !back;
}

export function AdminUsersPage() {
  const { user: currentUser, profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [applicantTypeFilter, setApplicantTypeFilter] = useState<ApplicantTypeFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [userDetail, setUserDetail] = useState<UserDetailState | null>(null);

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
    if (!userDetail) return;
    const current = users.find((row) => row.uid === userDetail.user.uid);
    if (current) setUserDetail((previous) => previous ? { ...previous, user: current } : previous);
  }, [users]);

  useEffect(() => {
    if (!userDetail) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserDetail(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [userDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.filter((row) => {
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      const matchesApplicantType = applicantTypeFilter === 'all' || row.applicantType === applicantTypeFilter;
      const matchesVerification = verificationFilter === 'all'
        || (verificationFilter === 'pending' && isReadyForIdReview(row))
        || (verificationFilter === 'verified' && row.verificationStatus === 'verified')
        || (verificationFilter === 'incomplete' && isIncompleteId(row));
      const haystack = `${row.fullName} ${row.email} ${row.uid} ${row.applicantType} ${row.studentId || ''} ${row.verificationStatus || ''} ${row.role}`.toLowerCase();
      return matchesRole && matchesApplicantType && matchesVerification && (!q || haystack.includes(q));
    });

    return [...rows].sort((a, b) => {
      if (sortMode === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortMode === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      return (a.fullName || a.email || a.uid).localeCompare(b.fullName || b.email || b.uid);
    });
  }, [users, search, roleFilter, applicantTypeFilter, verificationFilter, sortMode]);

  const adminCount = users.filter((row) => row.role === 'admin').length;
  const studentCount = users.filter((row) => row.applicantType === 'Student').length;
  const personnelCount = users.filter((row) => row.applicantType === 'SSU Personnel').length;
  const pendingIdCount = users.filter(isReadyForIdReview).length;
  const verifiedIdCount = users.filter(
    (row) => requiresIdentityReview(row.applicantType) && row.verificationStatus === 'verified',
  ).length;

  const reviewedHasBothSides = Boolean(userDetail?.frontImage?.dataUrl && userDetail?.backImage?.dataUrl);

  const activeQuickFilter: QuickFilter = useMemo(() => {
    if (search.trim() || sortMode !== 'name') return 'custom';
    if (applicantTypeFilter === 'all' && roleFilter === 'all' && verificationFilter === 'all') return 'all';
    if (applicantTypeFilter === 'Student' && roleFilter === 'all' && verificationFilter === 'all') return 'students';
    if (applicantTypeFilter === 'SSU Personnel' && roleFilter === 'all' && verificationFilter === 'all') return 'personnel';
    if (applicantTypeFilter === 'all' && roleFilter === 'all' && verificationFilter === 'pending') return 'pending';
    if (applicantTypeFilter === 'all' && roleFilter === 'admin' && verificationFilter === 'all') return 'admins';
    return 'custom';
  }, [applicantTypeFilter, roleFilter, verificationFilter, search, sortMode]);

  const hasActiveFilters = Boolean(
    search.trim()
      || applicantTypeFilter !== 'all'
      || roleFilter !== 'all'
      || verificationFilter !== 'all'
      || sortMode !== 'name',
  );

  function applyQuickFilter(filter: Exclude<QuickFilter, 'custom'>) {
    setSearch('');
    setSortMode('name');
    setApplicantTypeFilter('all');
    setRoleFilter('all');
    setVerificationFilter('all');

    if (filter === 'students') setApplicantTypeFilter('Student');
    if (filter === 'personnel') setApplicantTypeFilter('SSU Personnel');
    if (filter === 'pending') setVerificationFilter('pending');
    if (filter === 'admins') setRoleFilter('admin');
  }

  function clearFilters() {
    setSearch('');
    setApplicantTypeFilter('all');
    setRoleFilter('all');
    setVerificationFilter('all');
    setSortMode('name');
  }



  async function openUserDetails(target: ManagedUser) {
    setError('');
    setNotice('');

    if (!requiresIdentityReview(target.applicantType)) {
      setUserDetail({ user: target });
      return;
    }

    setBusyKey(`details:${target.uid}`);
    try {
      if (target.applicantType === 'Student') {
        const snap = await get(ref(db, `studentVerificationDocuments/${target.uid}`));
        if (!snap.exists()) {
          setUserDetail({
            user: target,
            documentError: 'No Student ID image record was found for this account.',
          });
          return;
        }

        const document = snap.val() as StudentVerificationDocument;
        setUserDetail({
          user: target,
          frontImage: document.studentIdFrontImage ?? document.studentIdImage,
          backImage: document.studentIdBackImage,
          submittedAt: document.submittedAt,
        });
        return;
      }

      const snap = await get(ref(db, `personnelVerificationDocuments/${target.uid}`));
      if (!snap.exists()) {
        setUserDetail({
          user: target,
          documentError: 'No Personnel ID image record was found for this account. Legacy personnel accounts may not have uploaded ID photos.',
        });
        return;
      }

      const document = snap.val() as PersonnelVerificationDocument;
      setUserDetail({
        user: target,
        frontImage: document.personnelIdFrontImage,
        backImage: document.personnelIdBackImage,
        submittedAt: document.submittedAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load the account details.';
      setUserDetail({ user: target, documentError: message });
    } finally {
      setBusyKey('');
    }
  }

  async function changeIdentityVerification(
    target: ManagedUser,
    nextStatus: Extract<StudentVerificationStatus, 'pending' | 'verified'>,
  ) {
    setError('');
    setNotice('');

    if (!currentUser || !requiresIdentityReview(target.applicantType)) return;

    const label = target.fullName || target.email || target.uid;
    const studentId = target.studentId?.trim().toUpperCase();

    if (nextStatus === 'verified') {
      if (!reviewedHasBothSides) {
        setError('Both the front and back ID photos must be available before verification.');
        return;
      }

      if (target.applicantType === 'Student') {
        if (!studentId) {
          setError(`${label} has no Student ID number saved. The account cannot be verified yet.`);
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
      }

      const verificationLabel = target.applicantType === 'Student'
        ? `Student ID: ${studentId}`
        : 'SSU Personnel ID: front and back photos submitted';
      if (!window.confirm(`Verify this ${target.applicantType} account after checking BOTH sides of the ID?\n\n${label}\n${verificationLabel}`)) return;
    } else if (!window.confirm(`Send this ${target.applicantType} ID back to pending verification?\n\n${label}`)) {
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
        ? `${label}'s ${target.applicantType === 'Student' ? 'Student' : 'Personnel'} ID has been verified.`
        : `${label}'s ID is pending verification again.`);
      setUserDetail(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update ID verification.';
      setError(message);
    } finally {
      setBusyKey('');
    }
  }

  return (
    <PortalLayout admin>
      <div className="admin-users-page">
        <section className="page-heading admin-users-page-heading">
          <div>
            <span className="eyebrow">User management</span>
            <h1>Portal accounts</h1>
            <p>Review students and personnel, verify university IDs, and open complete account details from one workspace.</p>
          </div>
          <button
            type="button"
            className="secondary-btn admin-users-reset-btn"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw size={17} /> Reset view
          </button>
        </section>

        <section className="admin-user-stat-grid" aria-label="Account quick filters">
          <button
            type="button"
            className={`admin-user-stat-card ${activeQuickFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => applyQuickFilter('all')}
            aria-pressed={activeQuickFilter === 'all'}
          >
            <span className="admin-user-stat-icon"><UsersRound size={20} /></span>
            <span className="admin-user-stat-copy"><small>All accounts</small><strong>{users.length}</strong></span>
            <ChevronRight className="admin-user-stat-arrow" size={17} />
          </button>
          <button
            type="button"
            className={`admin-user-stat-card ${activeQuickFilter === 'students' ? 'is-active' : ''}`}
            onClick={() => applyQuickFilter('students')}
            aria-pressed={activeQuickFilter === 'students'}
          >
            <span className="admin-user-stat-icon"><UserRound size={20} /></span>
            <span className="admin-user-stat-copy"><small>Students</small><strong>{studentCount}</strong></span>
            <ChevronRight className="admin-user-stat-arrow" size={17} />
          </button>
          <button
            type="button"
            className={`admin-user-stat-card ${activeQuickFilter === 'personnel' ? 'is-active' : ''}`}
            onClick={() => applyQuickFilter('personnel')}
            aria-pressed={activeQuickFilter === 'personnel'}
          >
            <span className="admin-user-stat-icon"><IdCard size={20} /></span>
            <span className="admin-user-stat-copy"><small>SSU Personnel</small><strong>{personnelCount}</strong></span>
            <ChevronRight className="admin-user-stat-arrow" size={17} />
          </button>
          <button
            type="button"
            className={`admin-user-stat-card pending ${activeQuickFilter === 'pending' ? 'is-active' : ''}`}
            onClick={() => applyQuickFilter('pending')}
            aria-pressed={activeQuickFilter === 'pending'}
          >
            <span className="admin-user-stat-icon"><Clock3 size={20} /></span>
            <span className="admin-user-stat-copy"><small>Pending ID review</small><strong>{pendingIdCount}</strong></span>
            <ChevronRight className="admin-user-stat-arrow" size={17} />
          </button>
          <button
            type="button"
            className={`admin-user-stat-card secure ${activeQuickFilter === 'admins' ? 'is-active' : ''}`}
            onClick={() => applyQuickFilter('admins')}
            aria-pressed={activeQuickFilter === 'admins'}
          >
            <span className="admin-user-stat-icon"><ShieldCheck size={20} /></span>
            <span className="admin-user-stat-copy"><small>Administrators</small><strong>{adminCount}</strong></span>
            <ChevronRight className="admin-user-stat-arrow" size={17} />
          </button>
        </section>

        <section className="admin-id-review-strip">
          <div className="admin-id-review-strip-icon"><IdCard size={20} /></div>
          <div className="admin-id-review-strip-copy">
            <strong>ID verification</strong>
            <span>Student and personnel accounts require front and back university ID images. Images load only when you open the account.</span>
          </div>
          <div className="admin-id-review-strip-status">
            <span>{pendingIdCount}</span>
            <small>{pendingIdCount === 1 ? 'ID ready for review' : 'IDs ready for review'}</small>
          </div>
        </section>

        <section className="panel admin-users-panel">
          <div className="admin-users-panel-heading">
            <div>
              <div className="admin-users-title-row">
                <h2>Account directory</h2>
                <span className="admin-users-result-count">{filtered.length} shown</span>
              </div>
              <p>Search and filter portal accounts. Open any record to review its complete details and uploaded ID.</p>
            </div>
            <div className="admin-users-verified-summary">
              <BadgeCheck size={17} />
              <span><strong>{verifiedIdCount}</strong> verified IDs</span>
            </div>
          </div>

          <div className="admin-users-toolbar">
            <label className="admin-users-search">
              <Search size={19} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, ID or UID"
                aria-label="Search portal accounts"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={17} />
                </button>
              )}
            </label>

            <div className="admin-users-filter-controls">
              <span className="admin-users-filter-icon" aria-hidden="true"><SlidersHorizontal size={18} /></span>
              <label className="admin-users-select-field">
                <span>Type</span>
                <select value={applicantTypeFilter} onChange={(e) => setApplicantTypeFilter(e.target.value as ApplicantTypeFilter)} aria-label="Filter by applicant type">
                  <option value="all">All types</option>
                  <option value="Student">Students</option>
                  <option value="SSU Personnel">SSU Personnel</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="admin-users-select-field">
                <span>ID status</span>
                <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as VerificationFilter)} aria-label="Filter by ID verification status">
                  <option value="all">All ID statuses</option>
                  <option value="pending">Pending review</option>
                  <option value="verified">Verified</option>
                  <option value="incomplete">Missing / incomplete</option>
                </select>
              </label>
              <label className="admin-users-select-field">
                <span>Role</span>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} aria-label="Filter by portal role">
                  <option value="all">All roles</option>
                  <option value="admin">Administrators</option>
                  <option value="user">Applicants</option>
                </select>
              </label>
              <label className="admin-users-select-field sort">
                <span>Sort</span>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort portal accounts">
                  <option value="name">Name A–Z</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="admin-users-active-filter-row">
              <span>Filtered view</span>
              <strong>{filtered.length} of {users.length} accounts</strong>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}

          {error && <div className="alert error-alert">{error}</div>}
          {notice && <div className="alert success-alert">{notice}</div>}

          {loading ? (
            <div className="admin-users-loading" aria-live="polite" aria-label="Loading portal accounts">
              {[0, 1, 2, 3, 4].map((item) => <span key={item} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="admin-users-empty">
              <UsersRound size={28} />
              <h3>No matching accounts</h3>
              <p>Try a different search or clear the current filters.</p>
              <button type="button" className="secondary-btn" onClick={clearFilters}><RotateCcw size={16} /> Reset filters</button>
            </div>
          ) : (
            <div className="table-wrap admin-users-table-wrap">
              <table className="data-table admin-users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Applicant type</th>
                    <th>ID reference</th>
                    <th>ID review</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const isSelf = row.uid === currentUser?.uid;
                    const displayName = row.fullName || (isSelf ? profile?.fullName : '') || 'Portal account';
                    const verificationBusy = busyKey === `verify:${row.uid}`;
                    const detailsBusy = busyKey === `details:${row.uid}`;
                    const { front: hasFront, back: hasBack } = idSubmissionFlags(row);
                    const hasAnyPhoto = hasFront || hasBack;
                    const hasBothPhotos = hasFront && hasBack;
                    const idRequired = requiresIdentityReview(row.applicantType);

                    return (
                      <tr key={row.uid}>
                        <td>
                          <div className="admin-user-identity">
                            <span className={`admin-user-avatar applicant-${row.applicantType.toLowerCase().replace(/\s+/g, '-')}`}>{userInitials(row)}</span>
                            <div>
                              <strong>{displayName}{isSelf ? ' (You)' : ''}</strong>
                              <small>{row.email || row.uid}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className={`applicant-type-pill applicant-type-${row.applicantType.toLowerCase().replace(/\s+/g, '-')}`}>{row.applicantType}</span></td>
                        <td>
                          {row.applicantType === 'Student' ? (
                            row.studentId ? <strong className="student-id-value">{row.studentId}</strong> : <span className="muted-value">Not provided</span>
                          ) : row.applicantType === 'SSU Personnel' ? (
                            <span className="muted-value">Personnel ID</span>
                          ) : (
                            <span className="muted-value">—</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-id-review-cell">
                            {!idRequired || row.verificationStatus === 'not_required' ? (
                              <span className="verification-badge verification-na">Not required</span>
                            ) : row.verificationStatus === 'verified' ? (
                              <span className="verification-badge verification-verified"><BadgeCheck size={14} /> Verified</span>
                            ) : hasBothPhotos ? (
                              <span className="verification-badge verification-pending"><Clock3 size={14} /> Pending review</span>
                            ) : (
                              <span className="verification-badge verification-missing"><ImageIcon size={14} /> Incomplete</span>
                            )}
                            {idRequired && (
                              <span className={`admin-id-side-copy ${hasBothPhotos ? 'complete' : hasAnyPhoto ? 'partial' : ''}`}>
                                {hasBothPhotos ? 'Front + back available' : hasFront ? 'Back photo missing' : hasBack ? 'Front photo missing' : 'No ID photos'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge role-${row.role}`}>
                            {row.role === 'admin' ? <ShieldCheck size={14} /> : <UserRound size={14} />}
                            {row.role === 'admin' ? 'Administrator' : 'Applicant'}
                          </span>
                        </td>
                        <td><span className="admin-user-created">{formatDateTime(row.createdAt)}</span></td>
                        <td>
                          <div className="admin-user-action-cell">
                            <button
                              type="button"
                              className="admin-user-open-btn"
                              disabled={detailsBusy || verificationBusy}
                              onClick={() => openUserDetails(row)}
                            >
                              <Eye size={16} />
                              <span>{detailsBusy ? 'Loading…' : 'Open details'}</span>
                              <ChevronRight size={16} />
                            </button>
                            {isSelf && <span className="admin-current-account-note"><ShieldCheck size={13} /> Current admin</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      {userDetail && (
        <div className="student-id-review-modal" role="dialog" aria-modal="true" aria-label="User account details">
          <button className="student-id-review-backdrop" type="button" aria-label="Close user details" onClick={() => setUserDetail(null)} />
          <section className="student-id-review-panel student-id-review-panel-two-sided user-detail-review-panel">
            <header className="student-id-review-header">
              <div>
                <span className="eyebrow">Account review</span>
                <h2>User Details &amp; ID</h2>
              </div>
              <button className="student-id-modal-close" type="button" onClick={() => setUserDetail(null)} aria-label="Close">
                <X size={20} />
              </button>
            </header>

            <div className="student-id-review-content student-id-review-content-two-sided">
              <div className="student-id-photo-stage student-id-two-sided-stage">
                {requiresIdentityReview(userDetail.user.applicantType) ? (
                  <>
                    <div className={`student-id-side-card ${userDetail.frontImage?.dataUrl ? '' : 'missing'}`}>
                      <div className="student-id-side-label">
                        <strong>Front of {userDetail.user.applicantType === 'Student' ? 'Student ID' : 'Personnel ID'}</strong>
                        <span>{userDetail.frontImage?.dataUrl ? 'Submitted' : 'Missing'}</span>
                      </div>
                      {userDetail.frontImage?.dataUrl ? (
                        <img src={userDetail.frontImage.dataUrl} alt={`Front of submitted ${userDetail.user.applicantType} ID`} />
                      ) : (
                        <div className="student-id-side-missing"><ImageIcon size={28} /> Front photo not available</div>
                      )}
                    </div>

                    <div className={`student-id-side-card ${userDetail.backImage?.dataUrl ? '' : 'missing'}`}>
                      <div className="student-id-side-label">
                        <strong>Back of {userDetail.user.applicantType === 'Student' ? 'Student ID' : 'Personnel ID'}</strong>
                        <span>{userDetail.backImage?.dataUrl ? 'Submitted' : 'Missing'}</span>
                      </div>
                      {userDetail.backImage?.dataUrl ? (
                        <img src={userDetail.backImage.dataUrl} alt={`Back of submitted ${userDetail.user.applicantType} ID`} />
                      ) : (
                        <div className="student-id-side-missing"><ImageIcon size={28} /> Back photo not available</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="no-id-required-card">
                    <IdCard size={34} />
                    <strong>No university ID required</strong>
                    <p>This account is registered as Other, so registration did not require Student or Personnel ID photos.</p>
                  </div>
                )}
              </div>

              <aside className="student-id-review-details user-account-detail-sidebar">
                <div className="student-id-review-person">
                  <span className="student-id-review-icon"><UserRound size={21} /></span>
                  <div>
                    <small>{userDetail.user.applicantType}</small>
                    <strong>{userDetail.user.fullName || 'Unnamed account'}</strong>
                  </div>
                </div>

                <dl>
                  <div><dt>Full name</dt><dd>{userDetail.user.fullName || 'Not provided'}</dd></div>
                  <div><dt>Email</dt><dd>{userDetail.user.email || 'Not provided'}</dd></div>
                  <div><dt>Applicant type</dt><dd>{userDetail.user.applicantType}</dd></div>
                  {userDetail.user.applicantType === 'Student' && <div><dt>Student ID number</dt><dd>{userDetail.user.studentId || 'Not provided'}</dd></div>}
                  <div><dt>Portal role</dt><dd>{userDetail.user.role === 'admin' ? 'Administrator' : 'Applicant'}</dd></div>
                  <div><dt>Account created</dt><dd>{formatDateTime(userDetail.user.createdAt)}</dd></div>
                  <div><dt>Account UID</dt><dd className="uid-detail-value">{userDetail.user.uid}</dd></div>
                  {requiresIdentityReview(userDetail.user.applicantType) && (
                    <>
                      <div><dt>ID photos submitted</dt><dd>{userDetail.submittedAt ? formatDateTime(userDetail.submittedAt) : 'Not available'}</dd></div>
                      <div><dt>Required sides</dt><dd>{reviewedHasBothSides ? 'Front and back complete' : 'Incomplete or unavailable'}</dd></div>
                      <div><dt>Verification status</dt><dd>{userDetail.user.verificationStatus === 'verified' ? 'Verified' : userDetail.user.verificationStatus === 'pending' ? 'Pending review' : 'Not required / legacy'}</dd></div>
                      <div><dt>Last reviewed</dt><dd>{userDetail.user.verificationReviewedAt ? formatDateTime(userDetail.user.verificationReviewedAt) : 'Not yet reviewed'}</dd></div>
                    </>
                  )}
                </dl>

                {userDetail.documentError && <div className="student-id-incomplete-warning">{userDetail.documentError}</div>}

                {requiresIdentityReview(userDetail.user.applicantType) && (
                  <div className="student-id-review-checklist">
                    <strong>Verification checklist</strong>
                    <span>✓ Front and back ID photos are both present.</span>
                    <span>✓ The account name is consistent with the submitted ID.</span>
                    {userDetail.user.applicantType === 'Student' && <span>✓ The Student ID number matches the number shown on the ID.</span>}
                    <span>✓ Both sides are clear, readable, and from the same current ID.</span>
                  </div>
                )}

                {requiresIdentityReview(userDetail.user.applicantType) && !reviewedHasBothSides && (
                  <div className="student-id-incomplete-warning">
                    Verification is disabled until both the front and back ID photos are available.
                  </div>
                )}
              </aside>
            </div>

            <footer className="student-id-review-actions">
              <button type="button" className="secondary-btn" onClick={() => setUserDetail(null)}>Close</button>
              {requiresIdentityReview(userDetail.user.applicantType) && userDetail.user.verificationStatus === 'verified' ? (
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busyKey === `verify:${userDetail.user.uid}`}
                  onClick={() => changeIdentityVerification(userDetail.user, 'pending')}
                >
                  <Clock3 size={16} /> Mark for recheck
                </button>
              ) : requiresIdentityReview(userDetail.user.applicantType) ? (
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!reviewedHasBothSides || busyKey === `verify:${userDetail.user.uid}`}
                  onClick={() => changeIdentityVerification(userDetail.user, 'verified')}
                >
                  <BadgeCheck size={17} /> {busyKey === `verify:${userDetail.user.uid}` ? 'Verifying…' : `Verify ${userDetail.user.applicantType === 'Student' ? 'student' : 'personnel'}`}
                </button>
              ) : null}
            </footer>
          </section>
        </div>
      )}
      </div>
    </PortalLayout>
  );
}
