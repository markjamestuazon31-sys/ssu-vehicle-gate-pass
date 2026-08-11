import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { ArrowLeft, BadgeCheck, CalendarCheck2, MapPin, Printer, TicketCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApplicationDocumentsView } from '../components/ApplicationDocumentsView';
import { PortalLayout } from '../components/Layout';
import { ApplicationSummary } from '../components/ApplicationSummary';
import { ProgressTimeline } from '../components/ProgressTimeline';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ApplicationDocuments, VehicleApplication } from '../types';
import { formatDateTime } from '../utils/id';

const FALLBACK_PICKUP_LOCATION = 'SSU Security and Gate Pass Program / Auxiliary Services Office';
const FALLBACK_PICKUP_INSTRUCTIONS = 'Your vehicle registration has been approved. Please proceed to the designated SSU office to claim your vehicle sticker and gate pass. Bring a valid ID and the original Driver\'s License, Certificate of Registration (CR), and Official Receipt (OR) for verification.';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState<VehicleApplication | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocuments | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      get(ref(db, `applications/${id}`)),
      get(ref(db, `applicationDocuments/${user.uid}/${id}`)),
    ]).then(([applicationSnap, documentsSnap]) => {
      if (applicationSnap.exists() && applicationSnap.val().uid === user.uid) {
        setApplication({ ...applicationSnap.val(), id });
        if (documentsSnap.exists() && documentsSnap.val().uid === user.uid) setDocuments(documentsSnap.val());
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, user]);

  return (
    <PortalLayout>
      <div className="detail-toolbar no-print">
        <Link className="back-link dark" to="/dashboard"><ArrowLeft size={17} /> Back to dashboard</Link>
        <button className="secondary-btn" onClick={() => window.print()}><Printer size={17} /> Print</button>
      </div>

      {loading ? (
        <div className="panel empty-state">Loading application…</div>
      ) : !application ? (
        <div className="panel empty-state"><h2>Application not found</h2></div>
      ) : (
        <article className="print-sheet">
          <div className="print-header">
            <img src="/ssu-logo.png" alt="SSU" />
            <div>
              <strong>SAMAR STATE UNIVERSITY</strong>
              <span>Security and Gate Pass Program</span>
              <h1>VEHICLE REGISTRATION APPLICATION</h1>
            </div>
            <StatusBadge status={application.status} />
          </div>

          <div className="print-meta">
            <span>Reference: <strong>{application.referenceNo}</strong></span>
            <span>Submitted: <strong>{formatDateTime(application.submittedAt)}</strong></span>
          </div>

          <ProgressTimeline status={application.status} />

          {application.status === 'approved' && (
            <section className="sticker-pickup-banner">
              <div className="sticker-pickup-banner-icon"><BadgeCheck size={30} /></div>
              <div className="sticker-pickup-banner-content">
                <span className="sticker-pickup-kicker">Approval notice</span>
                <h2>Your application is approved — please claim your vehicle sticker</h2>
                <p>{application.admin?.stickerPickupInstructions || FALLBACK_PICKUP_INSTRUCTIONS}</p>

                <div className="sticker-pickup-details">
                  <div><MapPin size={18} /><span>Pickup location<strong>{application.admin?.stickerPickupLocation || FALLBACK_PICKUP_LOCATION}</strong></span></div>
                  <div><TicketCheck size={18} /><span>Vehicle Gate Pass No.<strong>{application.admin?.vehicleGatePassNo || 'Assigned by SSU'}</strong></span></div>
                  <div><CalendarCheck2 size={18} /><span>Sticker validity<strong>{application.admin?.vehicleStickerValidity || 'See administrator'}</strong></span></div>
                </div>

                {application.admin?.approvalNoticeSentAt && (
                  <small>Approval notice posted {formatDateTime(application.admin.approvalNoticeSentAt)}</small>
                )}
              </div>
            </section>
          )}

          {application.admin?.remarks && (
            <div className="notice-box">
              <strong>Administrative remarks</strong>
              <p>{application.admin.remarks}</p>
            </div>
          )}

          <h2 className="sheet-section-title">Application information</h2>
          <ApplicationSummary application={application} />

          <h2 className="sheet-section-title">Uploaded supporting documents</h2>
          <p className="document-view-tip no-print">Click any uploaded image to view it full screen.</p>
          <ApplicationDocumentsView documents={documents} />

          <h2 className="sheet-section-title">Administrative processing</h2>
          <div className="summary-grid">
            <div className="summary-item"><span>Inspected by</span><strong>{application.admin?.inspectedBy || 'Pending'}</strong></div>
            <div className="summary-item"><span>Inspection date</span><strong>{application.admin?.inspectionDate || 'Pending'}</strong></div>
            <div className="summary-item"><span>SSU OR No.</span><strong>{application.admin?.ssuOrNo || 'Pending'}</strong></div>
            <div className="summary-item"><span>Amount</span><strong>{application.admin?.amount || 'Pending'}</strong></div>
            <div className="summary-item"><span>Vehicle Gate Pass No.</span><strong>{application.admin?.vehicleGatePassNo || 'Pending'}</strong></div>
            <div className="summary-item"><span>Sticker validity</span><strong>{application.admin?.vehicleStickerValidity || 'Pending'}</strong></div>
            <div className="summary-item"><span>Certified by</span><strong>{application.admin?.certifiedBy || 'Pending'}</strong></div>
            <div className="summary-item"><span>Approved by</span><strong>{application.admin?.approvedBy || 'Pending'}</strong></div>
          </div>

          <div className="declaration-box">I certify that the information and supporting document images submitted in this application are true and correct and acknowledge the applicable university guidelines and data privacy requirements.</div>
        </article>
      )}
    </PortalLayout>
  );
}
