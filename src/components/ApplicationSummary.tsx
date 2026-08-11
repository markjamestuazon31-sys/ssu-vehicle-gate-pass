import { VehicleApplication } from '../types';

export function ApplicationSummary({ application }: { application: VehicleApplication }) {
  const items = [
    ['Reference No.', application.referenceNo],
    ['Official VRF No.', application.admin?.vrfNo || 'Pending assignment'],
    ['Applicant', application.applicant.fullName],
    ['Applicant Type', application.applicant.applicantType],
    ['College / Center / Unit', application.applicant.collegeCenterUnit],
    ['Contact No.', application.applicant.contactNo],
    ['Driver’s License No.', application.applicant.driversLicenseNo],
    ['Vehicle Type', application.vehicle.vehicleType],
    ['Ownership', application.vehicle.ownershipType],
    ['Brand / Model', `${application.vehicle.vehicleBrand} ${application.vehicle.model}`.trim()],
    ['Color', application.vehicle.color],
    ['Plate No.', application.vehicle.plateNo],
    ['CR No.', application.vehicle.crNo],
    ['Official Receipt No.', application.vehicle.officialReceiptNo],
    ['Gate Pass No.', application.admin?.vehicleGatePassNo || 'Pending'],
    ['Sticker Validity', application.admin?.vehicleStickerValidity || 'Pending'],
  ];

  return (
    <div className="summary-grid">
      {items.map(([label, value]) => (
        <div className="summary-item" key={label}>
          <span>{label}</span>
          <strong>{value || '—'}</strong>
        </div>
      ))}
    </div>
  );
}
