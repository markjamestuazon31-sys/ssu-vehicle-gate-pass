import { FormEvent, useMemo, useState } from 'react';
import { push, ref, update } from 'firebase/database';
import { CheckCircle2, ChevronLeft, ChevronRight, FileImage, FileText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../components/DocumentUploader';
import { PortalLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ApplicantDetails, ApplicationDocuments, OwnershipType, StoredImageDocument, VehicleApplication, VehicleDetails, VehicleType } from '../types';
import { formatFileSize } from '../utils/image';
import { makeReferenceNo } from '../utils/id';

const today = new Date().toISOString().slice(0, 10);

type UploadState = Omit<ApplicationDocuments, 'uid'>;

export function VehicleApplicationPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [documents, setDocuments] = useState<UploadState>({});

  const [applicant, setApplicant] = useState<ApplicantDetails>({
    registrationDate: today,
    applicantType: profile?.applicantType ?? 'Student',
    otherApplicantType: '',
    fullName: profile?.fullName ?? '',
    collegeCenterUnit: '',
    completeAddress: '',
    driversLicenseNo: '',
    designationCourseYearLevel: '',
    contactNo: '',
    licenseExpirationDate: '',
  });

  const [vehicle, setVehicle] = useState<VehicleDetails>({
    ownershipType: 'Registered Owner',
    vehicleType: 'Two-Wheeled Vehicle',
    vehicleBrand: '',
    model: '',
    color: '',
    plateNo: '',
    crNo: '',
    crDateIssued: '',
    officialReceiptNo: '',
    orDateIssued: '',
  });

  const steps = useMemo(() => ['Applicant', 'Vehicle', 'Documents', 'Review'], []);

  function setApplicantField<K extends keyof ApplicantDetails>(key: K, value: ApplicantDetails[K]) {
    setApplicant((prev) => ({ ...prev, [key]: value }));
  }
  function setVehicleField<K extends keyof VehicleDetails>(key: K, value: VehicleDetails[K]) {
    setVehicle((prev) => ({ ...prev, [key]: value }));
  }
  function setDocumentField(key: keyof UploadState, value?: StoredImageDocument) {
    setDocuments((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrent() {
    setError('');
    if (step === 1) {
      const required = [applicant.fullName, applicant.collegeCenterUnit, applicant.completeAddress, applicant.driversLicenseNo, applicant.designationCourseYearLevel, applicant.contactNo, applicant.licenseExpirationDate];
      if (required.some((value) => !value.trim())) return setError('Please complete all required applicant information.'), false;
      if (applicant.applicantType === 'Other' && !applicant.otherApplicantType?.trim()) return setError('Please specify the applicant type.'), false;
    }
    if (step === 2) {
      const required = [vehicle.vehicleBrand, vehicle.model, vehicle.color, vehicle.plateNo, vehicle.crNo, vehicle.crDateIssued, vehicle.officialReceiptNo, vehicle.orDateIssued];
      if (required.some((value) => !value.trim())) return setError('Please complete all required vehicle and registration information.'), false;
    }
    if (step === 3) {
      if (!documents.driversLicense || !documents.certificateRegistration || !documents.officialReceipt) {
        return setError("Please upload clear images of the Driver's License, Certificate of Registration (CR), and Official Receipt (OR)."), false;
      }
    }
    return true;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!documents.driversLicense || !documents.certificateRegistration || !documents.officialReceipt) {
      setStep(3);
      return setError('All three required document images must be uploaded before submission.');
    }
    if (!accepted) return setError('You must confirm the declaration before submitting.');
    setBusy(true);
    setError('');
    try {
      const newRef = push(ref(db, 'applications'));
      const id = newRef.key!;
      const now = Date.now();
      const application: VehicleApplication = {
        id,
        uid: user.uid,
        referenceNo: makeReferenceNo(),
        applicant,
        vehicle,
        documentChecklist: {
          driversLicense: true,
          certificateRegistration: true,
          officialReceipt: true,
        },
        declarationAccepted: true,
        status: 'submitted',
        submittedAt: now,
        updatedAt: now,
      };
      const uploadedDocuments: ApplicationDocuments = { uid: user.uid, ...documents };

      await update(ref(db), {
        [`applications/${id}`]: application,
        [`applicationDocuments/${user.uid}/${id}`]: uploadedDocuments,
      });
      navigate(`/application/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit the application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalLayout>
      <section className="page-heading compact-heading">
        <div><span className="eyebrow">Vehicle Registration Form</span><h1>New vehicle application</h1><p>Complete the information based on your valid vehicle and driver records, then upload clear images of the required documents.</p></div>
      </section>

      <div className="form-stepper four no-print">
        {steps.map((label, index) => <div key={label} className={`stepper-item ${step >= index + 1 ? 'active' : ''}`}><span>{index + 1}</span><strong>{label}</strong></div>)}
      </div>

      <form className="panel form-panel" onSubmit={submit}>
        {error && <div className="alert error-alert">{error}</div>}
        {step === 1 && <>
          <div className="form-section-title"><div><h2>Requesting party information</h2><p>Fields correspond to the requesting-party section of the SSU Vehicle Registration Form.</p></div><FileText /></div>
          <div className="form-grid three">
            <label>Registration date<input type="date" required value={applicant.registrationDate} onChange={(e) => setApplicantField('registrationDate', e.target.value)} /></label>
            <label>Applicant type<select value={applicant.applicantType} onChange={(e) => setApplicantField('applicantType', e.target.value as ApplicantDetails['applicantType'])}><option>SSU Personnel</option><option>Student</option><option>Other</option></select></label>
            {applicant.applicantType === 'Other' && <label>Specify type<input required value={applicant.otherApplicantType} onChange={(e) => setApplicantField('otherApplicantType', e.target.value)} /></label>}
          </div>
          <div className="form-grid two">
            <label>Full name<input required value={applicant.fullName} onChange={(e) => setApplicantField('fullName', e.target.value)} /></label>
            <label>Designation / Course & Year Level<input required value={applicant.designationCourseYearLevel} onChange={(e) => setApplicantField('designationCourseYearLevel', e.target.value)} placeholder="e.g. BSIT 3rd Year / Instructor I" /></label>
            <label>College / Center / Unit<input required value={applicant.collegeCenterUnit} onChange={(e) => setApplicantField('collegeCenterUnit', e.target.value)} /></label>
            <label>Contact number<input required value={applicant.contactNo} onChange={(e) => setApplicantField('contactNo', e.target.value)} placeholder="09XXXXXXXXX" /></label>
          </div>
          <label>Complete address<textarea required rows={3} value={applicant.completeAddress} onChange={(e) => setApplicantField('completeAddress', e.target.value)} /></label>
          <div className="form-grid two">
            <label>Driver's License No.<input required value={applicant.driversLicenseNo} onChange={(e) => setApplicantField('driversLicenseNo', e.target.value)} /></label>
            <label>License expiration date<input type="date" required value={applicant.licenseExpirationDate} onChange={(e) => setApplicantField('licenseExpirationDate', e.target.value)} /></label>
          </div>
        </>}

        {step === 2 && <>
          <div className="form-section-title"><div><h2>Vehicle details</h2><p>Enter the same ownership, vehicle, CR, and OR information requested on the printed SSU registration form.</p></div><ShieldCheck /></div>
          <div className="form-grid two">
            <label>Ownership<select value={vehicle.ownershipType} onChange={(e) => setVehicleField('ownershipType', e.target.value as OwnershipType)}><option>Registered Owner</option><option>Not Registered Owner with Deed of Sale</option><option>Immediate Family</option></select></label>
            <label>Vehicle type<select value={vehicle.vehicleType} onChange={(e) => setVehicleField('vehicleType', e.target.value as VehicleType)}><option>Two-Wheeled Vehicle</option><option>Three-Wheeled Vehicle</option><option>Four-Wheeled Vehicle</option></select></label>
          </div>
          <div className="form-grid three">
            <label>Vehicle brand<input required value={vehicle.vehicleBrand} onChange={(e) => setVehicleField('vehicleBrand', e.target.value)} /></label>
            <label>Model<input required value={vehicle.model} onChange={(e) => setVehicleField('model', e.target.value)} /></label>
            <label>Color<input required value={vehicle.color} onChange={(e) => setVehicleField('color', e.target.value)} /></label>
          </div>
          <label>Plate number<input required value={vehicle.plateNo} onChange={(e) => setVehicleField('plateNo', e.target.value.toUpperCase())} /></label>
          <div className="form-grid two">
            <label>Certificate of Registration (CR) No.<input required value={vehicle.crNo} onChange={(e) => setVehicleField('crNo', e.target.value)} /></label>
            <label>CR date issued<input type="date" required value={vehicle.crDateIssued} onChange={(e) => setVehicleField('crDateIssued', e.target.value)} /></label>
            <label>Official Receipt No.<input required value={vehicle.officialReceiptNo} onChange={(e) => setVehicleField('officialReceiptNo', e.target.value)} /></label>
            <label>OR date issued<input type="date" required value={vehicle.orDateIssued} onChange={(e) => setVehicleField('orDateIssued', e.target.value)} /></label>
          </div>
        </>}

        {step === 3 && <>
          <div className="form-section-title"><div><h2>Required document images</h2><p>Take or upload a clear photo. Images are compressed in your browser, then stored as Base64 data in Firebase Realtime Database.</p></div><FileImage /></div>
          <div className="document-upload-grid">
            <DocumentUploader required label="Driver's License" description="Upload a clear photo showing the license information." value={documents.driversLicense} onChange={(value) => setDocumentField('driversLicense', value)} />
            <DocumentUploader required label="Certificate of Registration (CR)" description="Upload a readable image of the vehicle Certificate of Registration." value={documents.certificateRegistration} onChange={(value) => setDocumentField('certificateRegistration', value)} />
            <DocumentUploader required label="Official Receipt (OR)" description="Upload a readable image of the current vehicle Official Receipt." value={documents.officialReceipt} onChange={(value) => setDocumentField('officialReceipt', value)} />
          </div>
          <div className="notice-box"><strong>Realtime Database only</strong><p>No Firebase Storage is used. To keep database reads and writes practical, each image is resized and compressed before it is saved. The document images are stored under a separate applicationDocuments path so dashboard lists do not download every image.</p></div>
        </>}

        {step === 4 && <>
          <div className="form-section-title"><div><h2>Review and declaration</h2><p>Check the information and required documents before final submission.</p></div><CheckCircle2 /></div>
          <div className="review-block"><h3>Applicant</h3><div className="summary-grid">
            <div className="summary-item"><span>Name</span><strong>{applicant.fullName}</strong></div>
            <div className="summary-item"><span>Type</span><strong>{applicant.applicantType === 'Other' ? applicant.otherApplicantType : applicant.applicantType}</strong></div>
            <div className="summary-item"><span>College / Unit</span><strong>{applicant.collegeCenterUnit}</strong></div>
            <div className="summary-item"><span>Contact</span><strong>{applicant.contactNo}</strong></div>
            <div className="summary-item"><span>Driver's License</span><strong>{applicant.driversLicenseNo}</strong></div>
            <div className="summary-item"><span>License expiration</span><strong>{applicant.licenseExpirationDate}</strong></div>
          </div></div>
          <div className="review-block"><h3>Vehicle</h3><div className="summary-grid">
            <div className="summary-item"><span>Vehicle</span><strong>{vehicle.vehicleBrand} {vehicle.model}</strong></div>
            <div className="summary-item"><span>Type</span><strong>{vehicle.vehicleType}</strong></div>
            <div className="summary-item"><span>Plate No.</span><strong>{vehicle.plateNo}</strong></div>
            <div className="summary-item"><span>Ownership</span><strong>{vehicle.ownershipType}</strong></div>
            <div className="summary-item"><span>CR No.</span><strong>{vehicle.crNo}</strong></div>
            <div className="summary-item"><span>OR No.</span><strong>{vehicle.officialReceiptNo}</strong></div>
          </div></div>
          <div className="review-block"><h3>Required documents</h3><div className="review-document-list">
            <div><CheckCircle2 size={17} /><span>Driver's License</span><strong>{documents.driversLicense ? formatFileSize(documents.driversLicense.sizeBytes) : 'Missing'}</strong></div>
            <div><CheckCircle2 size={17} /><span>Certificate of Registration (CR)</span><strong>{documents.certificateRegistration ? formatFileSize(documents.certificateRegistration.sizeBytes) : 'Missing'}</strong></div>
            <div><CheckCircle2 size={17} /><span>Official Receipt (OR)</span><strong>{documents.officialReceipt ? formatFileSize(documents.officialReceipt.sizeBytes) : 'Missing'}</strong></div>
          </div></div>
          <label className="check-row"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>I certify that the information and document images provided are true and correct, and I agree to comply with applicable university traffic, parking, security, safety, vehicle registration, and data privacy requirements.</span></label>
        </>}

        <div className="form-actions no-print">
          <button type="button" className="secondary-btn" disabled={step === 1} onClick={() => { setError(''); setStep((current) => Math.max(1, current - 1)); }}><ChevronLeft size={18} /> Previous</button>
          {step < 4 ? <button type="button" className="primary-btn" onClick={() => { if (validateCurrent()) setStep((current) => Math.min(4, current + 1)); }}>Continue <ChevronRight size={18} /></button> : <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>}
        </div>
      </form>
    </PortalLayout>
  );
}
