import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { ApplicationStatus } from '../types';

const steps: { key: ApplicationStatus; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Review' },
  { key: 'for_inspection', label: 'Inspection' },
  { key: 'approved', label: 'Approved' },
];

export function ProgressTimeline({ status }: { status: ApplicationStatus }) {
  if (status === 'rejected') {
    return (
      <div className="timeline rejected-timeline">
        <div className="timeline-step active error"><XCircle /> <span>Application Rejected</span></div>
      </div>
    );
  }

  const currentIndex = steps.findIndex((s) => s.key === status);
  return (
    <div className="timeline">
      {steps.map((step, index) => {
        const complete = index <= currentIndex;
        return (
          <div className={`timeline-step ${complete ? 'active' : ''}`} key={step.key}>
            {complete ? <CheckCircle2 /> : <Circle />}
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
