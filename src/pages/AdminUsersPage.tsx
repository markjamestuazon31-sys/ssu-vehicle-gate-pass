import { useEffect, useMemo, useState } from 'react';
import { onValue, ref, update } from 'firebase/database';
import { Search, ShieldCheck, ShieldMinus, ShieldPlus, UserRound, UsersRound } from 'lucide-react';
import { PortalLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ApplicantType, Role, UserProfile } from '../types';
import { formatDateTime } from '../utils/id';

type ManagedUser = UserProfile & { sourceKey: string };

type RoleFilter = 'all' | Role;

function normalizeUser(key: string, value: Partial<UserProfile> | null): ManagedUser {
  const role: Role = value?.role === 'admin' ? 'admin' : 'user';
  const applicantType: ApplicantType = value?.applicantType === 'Student' || value?.applicantType === 'Other'
    ? value.applicantType
    : 'SSU Personnel';

  return {
    sourceKey: key,
    uid: value?.uid || key,
    email: value?.email || '',
    fullName: value?.fullName || '',
    applicantType,
    role,
    createdAt: typeof value?.createdAt === 'number' ? value.createdAt : 0,
  };
}

export function AdminUsersPage() {
  const { user: currentUser, profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((row) => {
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      const haystack = `${row.fullName} ${row.email} ${row.uid} ${row.applicantType} ${row.role}`.toLowerCase();
      return matchesRole && (!q || haystack.includes(q));
    });
  }, [users, search, roleFilter]);

  const adminCount = users.filter((row) => row.role === 'admin').length;
  const userCount = users.filter((row) => row.role === 'user').length;

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

    setBusyUid(target.uid);
    try {
      await update(ref(db, `users/${target.uid}`), { role: nextRole });
      setNotice(nextRole === 'admin'
        ? `${label} now has administrator access.`
        : `${label} is now an applicant account.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update this account.';
      setError(message);
    } finally {
      setBusyUid('');
    }
  }

  return (
    <PortalLayout admin>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Manage Users</h1>
          <p>Review portal accounts and grant or remove administrator access.</p>
        </div>
      </section>

      <section className="stats-grid three">
        <div className="stat-card"><UsersRound /><div><span>Total accounts</span><strong>{users.length}</strong></div></div>
        <div className="stat-card"><ShieldCheck /><div><span>Administrators</span><strong>{adminCount}</strong></div></div>
        <div className="stat-card"><UserRound /><div><span>Applicants</span><strong>{userCount}</strong></div></div>
      </section>

      <section className="panel admin-security-note">
        <div className="admin-security-icon"><ShieldCheck /></div>
        <div>
          <strong>Administrator access is role-based</strong>
          <p>The first administrator is provisioned in Firebase Console. After that, signed-in administrators can promote or demote other portal accounts here. Your own admin role cannot be changed from this page.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading responsive">
          <div>
            <h2>Portal accounts</h2>
            <p>Only accounts with a profile under <code>users/</code> in Realtime Database appear here.</p>
          </div>
          <div className="filter-row">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" /></label>
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
            <table className="data-table user-management-table">
              <thead>
                <tr><th>User</th><th>Applicant type</th><th>Role</th><th>Created</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSelf = row.uid === currentUser?.uid;
                  const displayName = row.fullName || (isSelf ? profile?.fullName : '') || 'Portal account';
                  return (
                    <tr key={row.uid}>
                      <td>
                        <strong>{displayName}{isSelf ? ' (You)' : ''}</strong>
                        <small>{row.email || row.uid}</small>
                      </td>
                      <td>{row.applicantType}</td>
                      <td><span className={`role-badge role-${row.role}`}>{row.role === 'admin' ? <ShieldCheck size={13} /> : <UserRound size={13} />}{row.role === 'admin' ? 'Administrator' : 'Applicant'}</span></td>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>
                        {isSelf ? (
                          <span className="role-lock-note"><ShieldCheck size={14} /> Current admin</span>
                        ) : row.role === 'admin' ? (
                          <button className="secondary-btn compact role-action demote" disabled={busyUid === row.uid} onClick={() => changeRole(row, 'user')}>
                            <ShieldMinus size={15} /> {busyUid === row.uid ? 'Updating…' : 'Demote'}
                          </button>
                        ) : (
                          <button className="secondary-btn compact role-action promote" disabled={busyUid === row.uid} onClick={() => changeRole(row, 'admin')}>
                            <ShieldPlus size={15} /> {busyUid === row.uid ? 'Updating…' : 'Promote'}
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
    </PortalLayout>
  );
}
