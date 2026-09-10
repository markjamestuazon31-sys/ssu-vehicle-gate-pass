import { FormEvent, useEffect, useState } from 'react';
import { get, ref, update } from 'firebase/database';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Printer,
  Save,
  Send,
} from 'lucide-react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { ApplicationDocumentsView } from '../components/ApplicationDocumentsView';
import { ApplicationSummary } from '../components/ApplicationSummary';
import { PortalLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

import {
  AdminProcessing,
  ApplicationDocuments,
  ApplicationStatus,
  VehicleApplication,
} from '../types';

import { formatDateTime } from '../utils/id';

const DEFAULT_PICKUP_LOCATION =
  'SSU Security and Gate Pass Program / Auxiliary Services Office';

const DEFAULT_PICKUP_INSTRUCTIONS =
  "Your vehicle registration has been approved. Please proceed to the office to claim your vehicle sticker and gate pass. Bring a valid ID and the original Driver's License, Certificate of Registration (CR), and Official Receipt (OR) for verification.";

export function AdminApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] =
    useState<VehicleApplication | null>(null);

  const [documents, setDocuments] =
    useState<ApplicationDocuments | null>(null);

  const [status, setStatus] =
    useState<ApplicationStatus>('submitted');

  const [admin, setAdmin] =
    useState<AdminProcessing>({});

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  async function load() {
    if (!id) {
      return;
    }

    try {
      const applicationSnap = await get(
        ref(db, `applications/${id}`),
      );

      if (!applicationSnap.exists()) {
        setApplication(null);
        return;
      }

      const data = {
        ...applicationSnap.val(),
        id,
      } as VehicleApplication;

      setApplication(data);
      setStatus(data.status);
      setAdmin(data.admin ?? {});

      const documentsSnap = await get(
        ref(
          db,
          `applicationDocuments/${data.uid}/${id}`,
        ),
      );

      setDocuments(
        documentsSnap.exists()
          ? documentsSnap.val()
          : null,
      );
    } catch (err) {
      console.error(
        'Unable to load application:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load application.',
      );
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function setAdminField<
    K extends keyof AdminProcessing,
  >(
    key: K,
    value: AdminProcessing[K],
  ) {
    setAdmin((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function changeStatus(
    nextStatus: ApplicationStatus,
  ) {
    setStatus(nextStatus);
    setError('');
    setMessage('');

    if (nextStatus === 'approved') {
      setAdmin((prev) => ({
        ...prev,

        stickerPickupLocation:
          prev.stickerPickupLocation?.trim() ||
          DEFAULT_PICKUP_LOCATION,

        stickerPickupInstructions:
          prev.stickerPickupInstructions?.trim() ||
          DEFAULT_PICKUP_INSTRUCTIONS,
      }));
    }
  }

  async function save(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!id || !user || busy) {
      return;
    }

    setError('');
    setMessage('');

    /*
     * APPROVAL VALIDATION
     */
    if (status === 'approved') {
      if (
        !admin.vehicleGatePassNo?.trim()
      ) {
        setError(
          'Vehicle Gate Pass No. is required before approving the application.',
        );
        return;
      }

      if (
        !admin.vehicleStickerValidity?.trim()
      ) {
        setError(
          'Vehicle Sticker Validity is required before approving the application.',
        );
        return;
      }

      if (
        !admin.stickerPickupLocation?.trim()
      ) {
        setError(
          'Please provide the sticker pickup location before approving the application.',
        );
        return;
      }

      if (
        !admin.stickerPickupInstructions?.trim()
      ) {
        setError(
          'Please provide pickup instructions for the applicant before approving the application.',
        );
        return;
      }
    }

    setBusy(true);

    try {
      const now = Date.now();

      const nextAdmin: AdminProcessing = {
        ...admin,
        processedAt: now,
        processedByUid: user.uid,
      };

      /*
       * When approved, store the time when the
       * applicant approval notice becomes active.
       */
      if (status === 'approved') {
        nextAdmin.approvalNoticeSentAt =
          admin.approvalNoticeSentAt ??
          now;
      }

      /*
       * SAVE TO FIREBASE REALTIME DATABASE
       */
      await update(
        ref(db, `applications/${id}`),
        {
          status,
          admin: nextAdmin,
          updatedAt: now,
        },
      );

      /*
       * APPROVED:
       * Save first, then automatically return
       * administrator to Admin Dashboard.
       */
      if (status === 'approved') {
        navigate('/admin', {
          replace: true,
        });

        return;
      }

      /*
       * For Under Review / For Inspection /
       * Rejected / Submitted, remain on page.
       */
      setMessage(
        'Application updated successfully.',
      );

      await load();
    } catch (err) {
      console.error(
        'Unable to save application:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save changes.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalLayout admin>
      <div className="detail-toolbar no-print">
        <Link
          className="back-link dark"
          to="/admin"
        >
          <ArrowLeft size={17} />
          Back to applications
        </Link>

        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            window.print()
          }
        >
          <Printer size={17} />
          Print record
        </button>
      </div>

      {!application ? (
        <div className="panel empty-state">
          Loading application…
        </div>
      ) : (
        <>
          <section className="panel admin-review-header">
            <div>
              <span className="mono-label">
                {application.referenceNo}
              </span>

              <h1>
                {
                  application.applicant
                    .fullName
                }
              </h1>

              <p>
                {
                  application.vehicle
                    .vehicleBrand
                }{' '}
                {
                  application.vehicle
                    .model
                }
                {' • '}
                {
                  application.vehicle
                    .plateNo
                }
              </p>
            </div>

            <StatusBadge
              status={
                application.status
              }
            />
          </section>

          <div className="admin-review-grid">
            {/* LEFT SIDE */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Submitted information
                  </h2>

                  <p>
                    Received{' '}
                    {formatDateTime(
                      application.submittedAt,
                    )}
                  </p>
                </div>
              </div>

              <ApplicationSummary
                application={
                  application
                }
              />

              <div className="review-block">
                <h3>
                  Complete address
                </h3>

                <p>
                  {
                    application.applicant
                      .completeAddress
                  }
                </p>
              </div>

              <div className="panel-heading documents-heading">
                <div>
                  <h2>
                    Uploaded document
                    images
                  </h2>

                  <p>
                    Click any image to
                    view it full screen
                    and inspect
                    readability.
                  </p>
                </div>
              </div>

              <ApplicationDocumentsView
                documents={documents}
              />
            </section>

            {/* RIGHT SIDE */}
            <form
              className="panel admin-form"
              onSubmit={save}
            >
              <div className="panel-heading">
                <div>
                  <h2>
                    Administrative
                    processing
                  </h2>

                  <p>
                    For authorized SSU
                    personnel.
                  </p>
                </div>
              </div>

              {message && (
                <div className="alert success-alert">
                  {message}
                </div>
              )}

              {error && (
                <div
                  className="alert error-alert"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <fieldset className="admin-status-picker">
                <legend>Application status</legend>

                <p>
                  Select the current processing stage. Approval and rejection are kept visually distinct to reduce accidental decisions.
                </p>

                <div className="admin-status-choice-grid" role="group" aria-label="Application status">
                  <button
                    type="button"
                    className={`admin-status-choice choice-submitted ${status === 'submitted' ? 'is-selected' : ''}`}
                    disabled={busy}
                    aria-pressed={status === 'submitted'}
                    onClick={() => changeStatus('submitted')}
                  >
                    <span className="admin-status-choice-dot" />
                    Submitted
                  </button>

                  <button
                    type="button"
                    className={`admin-status-choice choice-under-review ${status === 'under_review' ? 'is-selected' : ''}`}
                    disabled={busy}
                    aria-pressed={status === 'under_review'}
                    onClick={() => changeStatus('under_review')}
                  >
                    <span className="admin-status-choice-dot" />
                    Under Review
                  </button>

                  <button
                    type="button"
                    className={`admin-status-choice choice-inspection ${status === 'for_inspection' ? 'is-selected' : ''}`}
                    disabled={busy}
                    aria-pressed={status === 'for_inspection'}
                    onClick={() => changeStatus('for_inspection')}
                  >
                    <span className="admin-status-choice-dot" />
                    For Inspection
                  </button>

                  <button
                    type="button"
                    className={`admin-status-choice choice-approved ${status === 'approved' ? 'is-selected' : ''}`}
                    disabled={busy}
                    aria-pressed={status === 'approved'}
                    onClick={() => changeStatus('approved')}
                  >
                    <span className="admin-status-choice-dot" />
                    Approved
                  </button>

                  <button
                    type="button"
                    className={`admin-status-choice choice-rejected ${status === 'rejected' ? 'is-selected' : ''}`}
                    disabled={busy}
                    aria-pressed={status === 'rejected'}
                    onClick={() => changeStatus('rejected')}
                  >
                    <span className="admin-status-choice-dot" />
                    Rejected
                  </button>
                </div>
              </fieldset>

              <div className="form-grid two">
                <label>
                  Official VRF No.

                  <input
                    value={
                      admin.vrfNo ?? ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'vrfNo',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Vehicle Gate Pass No.

                  <input
                    value={
                      admin.vehicleGatePassNo ??
                      ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'vehicleGatePassNo',
                        e.target.value,
                      )
                    }
                    placeholder="Enter gate pass number"
                  />
                </label>

                <label>
                  Inspected by

                  <input
                    value={
                      admin.inspectedBy ??
                      ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'inspectedBy',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Inspection date

                  <input
                    type="date"
                    value={
                      admin.inspectionDate ??
                      ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'inspectionDate',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  SSU OR No.

                  <input
                    value={
                      admin.ssuOrNo ?? ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'ssuOrNo',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  OR date

                  <input
                    type="date"
                    value={
                      admin.orDate ?? ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'orDate',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Amount

                  <input
                    value={
                      admin.amount ?? ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'amount',
                        e.target.value,
                      )
                    }
                    placeholder="e.g. 100.00"
                  />
                </label>

                <label>
                  Sticker validity

                  <input
                    value={
                      admin.vehicleStickerValidity ??
                      ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'vehicleStickerValidity',
                        e.target.value,
                      )
                    }
                    placeholder="e.g. SY 2026–2027"
                  />
                </label>

                <label>
                  Certified by

                  <input
                    value={
                      admin.certifiedBy ??
                      ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'certifiedBy',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Approved by

                  <input
                    value={
                      admin.approvedBy ??
                      ''
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setAdminField(
                        'approvedBy',
                        e.target.value,
                      )
                    }
                  />
                </label>
              </div>

              {/* APPROVAL PICKUP NOTICE */}
              {status ===
                'approved' && (
                <section className="sticker-pickup-admin-box">
                  <div className="sticker-pickup-admin-heading">
                    <div className="sticker-pickup-icon">
                      <Send
                        size={19}
                      />
                    </div>

                    <div>
                      <strong>
                        Applicant sticker
                        pickup notice
                      </strong>

                      <p>
                        Approving this
                        application will
                        immediately show
                        this notice in the
                        applicant portal.
                      </p>
                    </div>
                  </div>

                  <label>
                    Sticker pickup
                    location

                    <div className="input-with-icon">
                      <MapPin
                        size={17}
                      />

                      <input
                        value={
                          admin.stickerPickupLocation ??
                          ''
                        }
                        disabled={busy}
                        onChange={(e) =>
                          setAdminField(
                            'stickerPickupLocation',
                            e.target.value,
                          )
                        }
                        placeholder="Office where the applicant should claim the sticker"
                      />
                    </div>
                  </label>

                  <label>
                    Pickup instructions

                    <textarea
                      rows={5}
                      value={
                        admin.stickerPickupInstructions ??
                        ''
                      }
                      disabled={busy}
                      onChange={(e) =>
                        setAdminField(
                          'stickerPickupInstructions',
                          e.target.value,
                        )
                      }
                      placeholder="Tell the applicant where to go and what documents to bring."
                    />
                  </label>

                  <div className="approval-send-preview">
                    <BadgeCheck
                      size={18}
                    />

                    <div>
                      <strong>
                        What the applicant
                        will see
                      </strong>

                      <span>
                        Approved — please
                        proceed to the
                        designated SSU
                        office to claim
                        your vehicle
                        sticker and gate
                        pass.
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <label>
                Remarks

                <textarea
                  rows={4}
                  value={
                    admin.remarks ?? ''
                  }
                  disabled={busy}
                  onChange={(e) =>
                    setAdminField(
                      'remarks',
                      e.target.value,
                    )
                  }
                  placeholder="Enter missing requirements, inspection instructions, or approval notes."
                />
              </label>

              <div className="notice-box">
                <strong>
                  Approval safeguard
                </strong>

                <p>
                  Approved applications
                  require a Gate Pass
                  No., sticker validity,
                  pickup location, and
                  applicant pickup
                  instructions.
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busy}
                  onClick={() =>
                    navigate('/admin')
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={busy}
                >
                  <Save size={17} />

                  {busy
                    ? status ===
                      'approved'
                      ? 'Approving…'
                      : 'Saving…'
                    : status ===
                        'approved'
                      ? 'Approve & notify applicant'
                      : 'Save review'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </PortalLayout>
  );
}