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
  Search,
  ShieldAlert,
} from 'lucide-react';

import { Link } from 'react-router-dom';

import { PortalLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';

import { db } from '../firebase';

import {
  ApplicationStatus,
  VehicleApplication,
} from '../types';

import { formatDateTime } from '../utils/id';

export function AdminDashboard() {
  const [applications, setApplications] =
    useState<VehicleApplication[]>([]);

  const [status, setStatus] =
    useState<'all' | ApplicationStatus>(
      'all',
    );

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

        /*
         * IMPORTANT:
         * Do not return rows.push().
         *
         * rows.push() returns a number,
         * but Firebase expects void | boolean.
         */
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

  return (
    <PortalLayout admin>
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            Administration
          </span>

          <h1>
            Vehicle Registration Dashboard
          </h1>

          <p>
            Review applications, record
            inspections, and issue gate pass
            information.
          </p>
        </div>
      </section>

      <section className="stats-grid five">
        <div className="stat-card">
          <CarFront />

          <div>
            <span>Total</span>

            <strong>
              {applications.length}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <Clock3 />

          <div>
            <span>Submitted</span>

            <strong>
              {count('submitted')}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <ShieldAlert />

          <div>
            <span>
              For inspection
            </span>

            <strong>
              {count(
                'for_inspection',
              )}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <CheckCircle2 />

          <div>
            <span>Approved</span>

            <strong>
              {count('approved')}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <ShieldAlert />

          <div>
            <span>Rejected</span>

            <strong>
              {count('rejected')}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading responsive">
          <div>
            <h2>
              Applications
            </h2>

            <p>
              Search by applicant, plate
              number, reference, or vehicle.
            </p>
          </div>

          <div className="filter-row">
            <label className="search-box">
              <Search size={17} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search applications"
              />
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as
                    | 'all'
                    | ApplicationStatus,
                )
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="submitted">
                Submitted
              </option>

              <option value="under_review">
                Under Review
              </option>

              <option value="for_inspection">
                For Inspection
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="rejected">
                Rejected
              </option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading applications…
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
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
                    <tr
                      key={application.id}
                    >
                      <td>
                        <strong>
                          {
                            application.referenceNo
                          }
                        </strong>

                        <small>
                          {application.admin
                            ?.vrfNo ||
                            'No official VRF yet'}
                        </small>
                      </td>

                      <td>
                        {
                          application.applicant
                            .fullName
                        }

                        <small>
                          {
                            application.applicant
                              .applicantType
                          }
                        </small>
                      </td>

                      <td>
                        {
                          application.vehicle
                            .vehicleBrand
                        }{' '}
                        {
                          application.vehicle
                            .model
                        }

                        <small>
                          {
                            application.vehicle
                              .vehicleType
                          }
                        </small>
                      </td>

                      <td>
                        {
                          application.vehicle
                            .plateNo
                        }
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            application.status
                          }
                        />
                      </td>

                      <td>
                        {formatDateTime(
                          application.submittedAt,
                        )}
                      </td>

                      <td>
                        <Link
                          className="text-action"
                          to={`/admin/application/${application.id}`}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="empty-state">
                No matching applications.
              </div>
            )}
          </div>
        )}
      </section>
    </PortalLayout>
  );
}