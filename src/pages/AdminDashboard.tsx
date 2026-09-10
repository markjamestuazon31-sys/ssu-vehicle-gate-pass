import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  onValue,
  ref,
} from 'firebase/database';

import {
  CarFront,
  CheckCircle2,
  Clock3,
  Eye,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

import { Link, useSearchParams } from 'react-router-dom';

import { PortalLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';

import { db } from '../firebase';

import {
  ApplicationStatus,
  VehicleApplication,
} from '../types';

import { formatDateTime } from '../utils/id';

const VALID_STATUSES: ApplicationStatus[] = [
  'submitted',
  'under_review',
  'for_inspection',
  'approved',
  'rejected',
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  for_inspection: 'For Inspection',
  approved: 'Approved',
  rejected: 'Rejected',
};

function getStatusFilter(rawStatus: string | null): 'all' | ApplicationStatus {
  if (rawStatus && VALID_STATUSES.includes(rawStatus as ApplicationStatus)) {
    return rawStatus as ApplicationStatus;
  }

  return 'all';
}

export function AdminDashboard() {
  const [applications, setApplications] =
    useState<VehicleApplication[]>([]);

  const [searchParams] = useSearchParams();
  const status = getStatusFilter(searchParams.get('status'));

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    setLoading(true);

    const applicationsRef = ref(
      db,
      'applications',
    );

    const unsubscribe = onValue(
      applicationsRef,
      (snapshot) => {
        const rows: VehicleApplication[] =
          [];

        snapshot.forEach((child) => {
          rows.push({
            ...child.val(),
            id: child.key ?? '',
          });
        });

        rows.sort(
          (a, b) =>
            b.submittedAt - a.submittedAt,
        );

        setApplications(rows);
        setLoading(false);
      },
      (error) => {
        console.error(
          'Unable to load admin applications:',
          error,
        );

        setApplications([]);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    return applications.filter(
      (application) => {
        const matchesStatus =
          status === 'all' ||
          application.status === status;

        const normalizedSearch = search
          .trim()
          .toLowerCase();

        const haystack = `
          ${application.referenceNo ?? ''}
          ${application.admin?.vrfNo ?? ''}
          ${application.applicant?.fullName ?? ''}
          ${application.vehicle?.plateNo ?? ''}
          ${application.vehicle?.vehicleBrand ?? ''}
          ${application.vehicle?.model ?? ''}
        `.toLowerCase();

        const matchesSearch =
          !normalizedSearch ||
          haystack.includes(
            normalizedSearch,
          );

        return (
          matchesStatus &&
          matchesSearch
        );
      },
    );
  }, [
    applications,
    status,
    search,
  ]);

  function count(
    selectedStatus: ApplicationStatus,
  ) {
    return applications.filter(
      (application) =>
        application.status ===
        selectedStatus,
    ).length;
  }

  const activeStatusLabel = status === 'all'
    ? 'All Applications'
    : `${STATUS_LABELS[status]} Applications`;

  return (
    <PortalLayout admin>
      <section className="page-heading admin-dashboard-heading">
        <div>
          <span className="eyebrow">
            Administration
          </span>

          <h1>
            Vehicle Registration Dashboard
          </h1>

          <p>
            Review applications, record inspections, and issue gate pass information from one organized workspace.
          </p>
        </div>
      </section>

      <section className="stats-grid admin-stat-grid" aria-label="Application summary">
        <Link
          to="/admin"
          className={`stat-card admin-stat-card stat-all ${status === 'all' ? 'is-selected' : ''}`}
        >
          <CarFront />

          <div>
            <span>Total applications</span>
            <strong>{applications.length}</strong>
          </div>
        </Link>

        <Link
          to="/admin?status=submitted"
          className={`stat-card admin-stat-card stat-submitted ${status === 'submitted' ? 'is-selected' : ''}`}
        >
          <Clock3 />

          <div>
            <span>Submitted</span>
            <strong>{count('submitted')}</strong>
          </div>
        </Link>

        <Link
          to="/admin?status=under_review"
          className={`stat-card admin-stat-card stat-under-review ${status === 'under_review' ? 'is-selected' : ''}`}
        >
          <Search />

          <div>
            <span>Under review</span>
            <strong>{count('under_review')}</strong>
          </div>
        </Link>

        <Link
          to="/admin?status=for_inspection"
          className={`stat-card admin-stat-card stat-inspection ${status === 'for_inspection' ? 'is-selected' : ''}`}
        >
          <ShieldAlert />

          <div>
            <span>For inspection</span>
            <strong>{count('for_inspection')}</strong>
          </div>
        </Link>

        <Link
          to="/admin?status=approved"
          className={`stat-card admin-stat-card stat-approved ${status === 'approved' ? 'is-selected' : ''}`}
        >
          <CheckCircle2 />

          <div>
            <span>Approved</span>
            <strong>{count('approved')}</strong>
          </div>
        </Link>

        <Link
          to="/admin?status=rejected"
          className={`stat-card admin-stat-card stat-rejected ${status === 'rejected' ? 'is-selected' : ''}`}
        >
          <XCircle />

          <div>
            <span>Rejected</span>
            <strong>{count('rejected')}</strong>
          </div>
        </Link>
      </section>

      <section className="panel admin-applications-panel">
        <div className="panel-heading responsive admin-applications-heading">
          <div>
            <div className="admin-panel-title-row">
              <h2>{activeStatusLabel}</h2>
              <span className="admin-result-count">{filtered.length}</span>
            </div>

            <p>
              Search by applicant, plate number, reference, or vehicle. Use the Application Status menu in the sidebar to change queues.
            </p>
          </div>

          <div className="admin-application-tools">
            <label className="search-box admin-application-search">
              <Search size={18} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search applications"
                aria-label="Search applications"
              />
            </label>

            {status !== 'all' && (
              <Link className={`admin-active-filter filter-${status}`} to="/admin">
                <span>Queue</span>
                <strong>{STATUS_LABELS[status]}</strong>
                <span className="admin-filter-clear">Clear</span>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty-state admin-table-empty-state">
            Loading applications…
          </div>
        ) : (
          <div className="table-wrap admin-table-wrap">
            <table className="data-table admin-applications-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Applicant</th>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (application) => (
                    <tr key={application.id}>
                      <td>
                        <strong>{application.referenceNo}</strong>

                        <small>
                          {application.admin?.vrfNo || 'No official VRF yet'}
                        </small>
                      </td>

                      <td>
                        <strong className="admin-applicant-name">
                          {application.applicant.fullName}
                        </strong>

                        <small>{application.applicant.applicantType}</small>
                      </td>

                      <td>
                        {application.vehicle.vehicleBrand}{' '}
                        {application.vehicle.model}

                        <small>{application.vehicle.vehicleType}</small>
                      </td>

                      <td>
                        <span className="admin-plate-number">{application.vehicle.plateNo}</span>
                      </td>

                      <td>
                        <StatusBadge status={application.status} />
                      </td>

                      <td>
                        {formatDateTime(application.submittedAt)}
                      </td>

                      <td>
                        <Link
                          className="secondary-btn compact admin-review-button"
                          to={`/admin/application/${application.id}`}
                        >
                          <Eye size={16} />
                          Review
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="empty-state admin-table-empty-state">
                <Search size={28} />
                <strong>No matching applications</strong>
                <span>Try another search or choose a different status from the sidebar.</span>
              </div>
            )}
          </div>
        )}
      </section>
    </PortalLayout>
  );
}
