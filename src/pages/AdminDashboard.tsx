import { useEffect, useMemo, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { CarFront, CheckCircle2, Clock3, Search, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { db } from '../firebase';
import { ApplicationStatus, VehicleApplication } from '../types';
import { formatDateTime } from '../utils/id';

export function AdminDashboard() {
  const [applications, setApplications] = useState<VehicleApplication[]>([]);
  const [status, setStatus] = useState<'all' | ApplicationStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => onValue(ref(db, 'applications'), (snap) => {
    const rows: VehicleApplication[] = [];
    snap.forEach((child) => rows.push({ ...child.val(), id: child.key! }));
    rows.sort((a, b) => b.submittedAt - a.submittedAt);
    setApplications(rows);
    setLoading(false);
  }), []);

  const filtered = useMemo(() => applications.filter((a) => {
    const matchesStatus = status === 'all' || a.status === status;
    const q = search.trim().toLowerCase();
    const haystack = `${a.referenceNo} ${a.admin?.vrfNo ?? ''} ${a.applicant.fullName} ${a.vehicle.plateNo} ${a.vehicle.vehicleBrand} ${a.vehicle.model}`.toLowerCase();
    return matchesStatus && (!q || haystack.includes(q));
  }), [applications, status, search]);

  const count = (s: ApplicationStatus) => applications.filter((a) => a.status === s).length;

  return <PortalLayout admin>
    <section className="page-heading"><div><span className="eyebrow">Administration</span><h1>Vehicle Registration Dashboard</h1><p>Review applications, record inspections, and issue gate pass information.</p></div></section>
    <section className="stats-grid five">
      <div className="stat-card"><CarFront /><div><span>Total</span><strong>{applications.length}</strong></div></div>
      <div className="stat-card"><Clock3 /><div><span>Submitted</span><strong>{count('submitted')}</strong></div></div>
      <div className="stat-card"><ShieldAlert /><div><span>For inspection</span><strong>{count('for_inspection')}</strong></div></div>
      <div className="stat-card"><CheckCircle2 /><div><span>Approved</span><strong>{count('approved')}</strong></div></div>
      <div className="stat-card"><ShieldAlert /><div><span>Rejected</span><strong>{count('rejected')}</strong></div></div>
    </section>

    <section className="panel">
      <div className="panel-heading responsive"><div><h2>Applications</h2><p>Search by applicant, plate number, reference, or vehicle.</p></div><div className="filter-row"><label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications" /></label><select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="for_inspection">For Inspection</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></div>
      {loading ? <div className="empty-state">Loading applications…</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Reference</th><th>Applicant</th><th>Vehicle</th><th>Plate</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>{filtered.map((a) => <tr key={a.id}><td><strong>{a.referenceNo}</strong><small>{a.admin?.vrfNo || 'No official VRF yet'}</small></td><td>{a.applicant.fullName}<small>{a.applicant.applicantType}</small></td><td>{a.vehicle.vehicleBrand} {a.vehicle.model}<small>{a.vehicle.vehicleType}</small></td><td>{a.vehicle.plateNo}</td><td><StatusBadge status={a.status} /></td><td>{formatDateTime(a.submittedAt)}</td><td><Link className="text-action" to={`/admin/application/${a.id}`}>Review</Link></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">No matching applications.</div>}</div>}
    </section>
  </PortalLayout>;
}
