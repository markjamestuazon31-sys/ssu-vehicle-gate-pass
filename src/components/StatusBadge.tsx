import { ApplicationStatus } from '../types';

const labels: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  for_inspection: 'For Inspection',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}
