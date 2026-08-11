import { useEffect, useState } from 'react';
import { onValue, orderByChild, query, ref, equalTo } from 'firebase/database';
import { ArrowRight, BadgeCheck, CarFront, Clock3, FileCheck2, MapPin, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { VehicleApplication } from '../types';
import { PortalLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressTimeline } from '../components/ProgressTimeline';
import { formatDateTime } from '../utils/id';

const FALLBACK_PICKUP_LOCATION = 'SSU Security and Gate Pass Program / Auxiliary Services Office';

export function UserDashboard() {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<VehicleApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(ref(db, 'applications'), orderByChild('uid'), equalTo(user.uid));
    return onValue(q, (snap) => {
      const rows: VehicleApplication[] = [];
      snap.forEach((child) => rows.push({ ...child.val(), id: child.key! }));
      rows.sort((a, b) => b.submittedAt - a.submittedAt);
      setApplications(rows);
      setLoading(false);
    });
  }, [user]);

  const approved = applications.filter((a) => a.status === 'approved').length;
  const pending = applications.filter((a) => ['submitted', 'under_review', 'for_inspection'].includes(a.status)).length;

  return (
    <PortalLayout>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Applicant dashboard</span>
          <h1>Hello, {profile?.fullName}</h1>
          <p>Manage your vehicle registration applications and check gate pass status.</p>
        </div>
        <Link className="primary-btn" to="/apply"><PlusCircle size={18} /> New registration</Link>
      </section>

      <section className="stats-grid three">
        <div className="stat-card"><CarFront /><div><span>Total applications</span><strong>{applications.length}</strong></div></div>
        <div className="stat-card"><Clock3 /><div><span>In progress</span><strong>{pending}</strong></div></div>
        <div className="stat-card"><FileCheck2 /><div><span>Approved</span><strong>{approved}</strong></div></div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><h2>My applications</h2><p>Your latest submissions appear first.</p></div>
        </div>

        {loading ? (
          <div className="empty-state">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <CarFront size={38} />
            <h3>No vehicle registration yet</h3>
            <p>Start your first application using the online vehicle registration form.</p>
            <Link className="primary-btn" to="/apply">Register a vehicle</Link>
          </div>
        ) : (
          <div className="application-list">
            {applications.map((application) => (
              <article className="application-card" key={application.id}>
                <div className="application-card-top">
                  <div>
                    <span className="mono-label">{application.referenceNo}</span>
                    <h3>{application.vehicle.vehicleBrand} {application.vehicle.model}</h3>
                    <p>{application.vehicle.plateNo || 'No plate number'} • {application.vehicle.vehicleType}</p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>

                <ProgressTimeline status={application.status} />

                {application.status === 'approved' && (
                  <div className="sticker-ready-compact">
                    <BadgeCheck size={20} />
                    <div>
                      <strong>Approved — claim your vehicle sticker</strong>
                      <span><MapPin size={13} /> {application.admin?.stickerPickupLocation || FALLBACK_PICKUP_LOCATION}</span>
                      <small>Open the application to view the gate pass number, sticker validity, and complete pickup instructions.</small>
                    </div>
                  </div>
                )}

                <div className="application-meta">
                  <span>Submitted {formatDateTime(application.submittedAt)}</span>
                  {application.admin?.remarks && <span className="remarks-inline">Remark: {application.admin.remarks}</span>}
                </div>

                <Link className="text-action" to={`/application/${application.id}`}>View application <ArrowRight size={16} /></Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </PortalLayout>
  );
}
