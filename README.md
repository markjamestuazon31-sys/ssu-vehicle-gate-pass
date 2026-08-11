# SSU Vehicle Registration, Security & Gate Pass Portal

A professional React + TypeScript web portal for the Samar State University One-Stop Vehicle Registration, Security, and Gate Pass Program.

## Included flows

### Applicant/User
- Public #WeAtSSU landing page
- Applicant account creation and sign-in
- Multi-step Vehicle Registration Form based on the supplied SSU paper form
- Applicant types: SSU Personnel, Student, Other
- Driver's license and expiration details
- Ownership categories: Registered Owner, Deed of Sale, Immediate Family
- Two-, three-, and four-wheeled vehicle classification
- Vehicle brand/model/color/plate information
- CR and Official Receipt details
- Consent/declaration confirmation
- Automatic tracking/reference number
- Application status timeline
- Administrative remarks visibility
- Printable application record

### Administrator
- Dedicated admin login route
- Dashboard counters and searchable/filterable application table
- Review applicant and vehicle information
- Set official VRF number
- Mark status as Submitted, Under Review, For Inspection, Approved, or Rejected
- Record inspection details
- Record SSU OR number/date and amount
- Record Vehicle Gate Pass number and sticker validity
- Record Certified by / Approved by
- Add administrative remarks
- Approval safeguard requiring Gate Pass No. and Sticker Validity
- Printable record

## Technology
- React
- TypeScript
- Vite
- Firebase Authentication (Email/Password)
- Firebase Realtime Database
- React Router
- Lucide icons
- Plain responsive CSS (no Tailwind dependency)

## 1. Create Firebase project

1. Open Firebase Console and create a project.
2. Add a Web App.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Create a **Realtime Database**. For the Philippines, select an appropriate nearby region if available for your project.
5. Copy the Firebase Web App configuration values.

## 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Do not commit `.env` to a public repository.

## 3. Install and run

```bash
npm install
npm run dev
```

Production test:

```bash
npm run build
npm run preview
```

## 4. Install Realtime Database security rules

The included `firebase.rules.json` separates applicant and administrator access.

If you use Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init database hosting
firebase deploy --only database
```

Or copy the contents of `firebase.rules.json` into Firebase Console > Realtime Database > Rules and publish.

## 5. Create the first administrator

The website intentionally does **not** let users choose the `admin` role during signup.

1. Register a normal account through `/register`.
2. In Firebase Realtime Database, find:

```text
users
  <USER_UID>
    role: "user"
```

3. Using Firebase Console administrative access, change it to:

```text
role: "admin"
```

4. Sign out, then use `/admin/login`.

This prevents public users from self-promoting themselves to administrator through the web UI. The included database rules also prevent a normal client from changing its own role after creation.

## Database shape

```text
users/
  <uid>/
    uid
    email
    fullName
    applicantType
    role
    createdAt

applications/
  <applicationId>/
    id
    uid
    referenceNo
    applicant/
    vehicle/
    declarationAccepted
    status
    submittedAt
    updatedAt
    admin/
      vrfNo
      inspectedBy
      inspectionDate
      ssuOrNo
      orDate
      amount
      vehicleGatePassNo
      vehicleStickerValidity
      certifiedBy
      approvedBy
      remarks
      processedAt
      processedByUid
```

## Branding

The local `public/ssu-logo.png` was obtained from an image hosted on the official Samar State University domain:

`https://ssu.edu.ph/wp-content/uploads/2024/07/ssulogo-2.png`

The interface uses SSU blue/gold-inspired colors. The official SSU logo description states that sky blue and gold are official colors, and an SSU article about its academic regalia also describes royal dark blue and gold as university colors.

Official references:
- `https://www.ssu.edu.ph/ssu-logo/`
- `https://ssu.edu.ph/2023/06/06/its-official-ssu-kamagi-official-academic-regalia/`

Before public deployment under the university's name/domain, obtain the appropriate institutional authorization for official branding, privacy notices, records retention, fees, approval authority, and production Firebase administration.

## Important production recommendations

For an official production rollout, consider adding:
- Firebase App Check
- Email verification
- Password reset
- Audit log collection
- Server-side admin claims using Firebase Admin SDK / Cloud Functions
- Formal privacy notice and consent wording approved by SSU
- Rate limiting / abuse protection
- Backups and records-retention policy
- QR code on approved vehicle gate passes
- CSV/PDF administrative reports
- SMS/email notifications if required

## Notes about the supplied paper form

The web form follows the major fields visible on the supplied Vehicle Registration Form: requesting party, designation/course and year level, contact and driver's license information, vehicle ownership/classification, vehicle brand/model/color/plate, CR/OR information, inspection details, SSU OR information, gate pass number, sticker validity, certification, approval, and declaration.

## Required document image uploads (Realtime Database only)

The application form now requires three image uploads:

- Driver's License
- Certificate of Registration (CR)
- Official Receipt (OR)

The browser resizes and compresses JPG/PNG/WEBP files before submission. The resulting JPEG data URL is saved directly in Firebase Realtime Database under `applicationDocuments/{uid}/{applicationId}`. Firebase Storage is not used. The main `applications` node stores only a lightweight `documentChecklist`, so normal applicant/admin dashboard lists do not download the large Base64 images.

The upload UI accepts source images up to 8 MB and targets roughly 700 KB or less per compressed image. Keep these limits conservative because Base64 increases the stored text size and large database payloads increase bandwidth and read costs.

**Important:** deploy the updated `firebase.rules.json` because it adds access rules for `applicationDocuments`.
