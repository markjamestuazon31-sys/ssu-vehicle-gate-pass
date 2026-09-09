export type Role = 'user' | 'admin';

export type ApplicantType = 'SSU Personnel' | 'Student' | 'Other';
export type StudentVerificationStatus = 'pending' | 'verified' | 'not_required';
export type OwnershipType = 'Registered Owner' | 'Not Registered Owner with Deed of Sale' | 'Immediate Family';
export type VehicleType = 'Two-Wheeled Vehicle' | 'Three-Wheeled Vehicle' | 'Four-Wheeled Vehicle';
export type ApplicationStatus = 'submitted' | 'under_review' | 'for_inspection' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  applicantType: ApplicantType;
  role: Role;
  createdAt: number;
  studentId?: string;
  studentIdImageSubmitted?: boolean;
  studentIdFrontImageSubmitted?: boolean;
  studentIdBackImageSubmitted?: boolean;
  verificationStatus?: StudentVerificationStatus;
  verificationReviewedAt?: number;
  verificationReviewedByUid?: string;
}

export interface ApplicantDetails {
  registrationDate: string;
  applicantType: ApplicantType;
  otherApplicantType?: string;
  fullName: string;
  collegeCenterUnit: string;
  completeAddress: string;
  driversLicenseNo: string;
  designationCourseYearLevel: string;
  contactNo: string;
  licenseExpirationDate: string;
}

export interface VehicleDetails {
  ownershipType: OwnershipType;
  vehicleType: VehicleType;
  vehicleBrand: string;
  model: string;
  color: string;
  plateNo: string;
  crNo: string;
  crDateIssued: string;
  officialReceiptNo: string;
  orDateIssued: string;
}

export interface StoredImageDocument {
  fileName: string;
  mimeType: 'image/jpeg';
  sizeBytes: number;
  originalSizeBytes: number;
  width: number;
  height: number;
  dataUrl: string;
  uploadedAt: number;
}

export interface StudentVerificationDocument {
  uid: string;
  studentIdFrontImage?: StoredImageDocument;
  studentIdBackImage?: StoredImageDocument;
  /** Legacy single-photo field kept for older registrations. */
  studentIdImage?: StoredImageDocument;
  submittedAt: number;
}

export interface ApplicationDocuments {
  uid: string;
  driversLicense?: StoredImageDocument;
  certificateRegistration?: StoredImageDocument;
  officialReceipt?: StoredImageDocument;
}

export interface AdminProcessing {
  vrfNo?: string;
  inspectedBy?: string;
  inspectionDate?: string;
  ssuOrNo?: string;
  orDate?: string;
  amount?: string;
  vehicleGatePassNo?: string;
  vehicleStickerValidity?: string;
  certifiedBy?: string;
  approvedBy?: string;
  remarks?: string;
  stickerPickupLocation?: string;
  stickerPickupInstructions?: string;
  approvalNoticeSentAt?: number;
  processedAt?: number;
  processedByUid?: string;
}

export interface VehicleApplication {
  id: string;
  uid: string;
  referenceNo: string;
  applicant: ApplicantDetails;
  vehicle: VehicleDetails;
  documentChecklist: {
    driversLicense: boolean;
    certificateRegistration: boolean;
    officialReceipt: boolean;
  };
  declarationAccepted: boolean;
  status: ApplicationStatus;
  submittedAt: number;
  updatedAt: number;
  admin?: AdminProcessing;
}
