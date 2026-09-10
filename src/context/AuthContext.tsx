import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { get, onValue, ref, update } from 'firebase/database';
import { auth, db } from '../firebase';
import { ApplicantType, StoredImageDocument, StudentVerificationStatus, UserProfile } from '../types';

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  applicantType: ApplicantType;
  studentId?: string;
  studentIdFrontImage?: StoredImageDocument;
  studentIdBackImage?: StoredImageDocument;
  personnelIdFrontImage?: StoredImageDocument;
  personnelIdBackImage?: StoredImageDocument;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeVerificationStatus(
  raw: Partial<UserProfile>,
  applicantType: ApplicantType,
): StudentVerificationStatus {
  if (
    raw.verificationStatus === 'pending' ||
    raw.verificationStatus === 'verified' ||
    raw.verificationStatus === 'not_required'
  ) {
    return raw.verificationStatus;
  }

  // Backward compatibility for accounts created before front/back ID verification.
  if (applicantType === 'Student' && raw.studentId?.trim()) return 'pending';
  if (
    applicantType === 'SSU Personnel' &&
    (raw.personnelIdFrontImageSubmitted === true || raw.personnelIdBackImageSubmitted === true)
  ) {
    return 'pending';
  }
  return 'not_required';
}

function normalizeProfile(firebaseUser: User, raw: Partial<UserProfile>): UserProfile {
  const createdFromAuth = firebaseUser.metadata.creationTime ? Date.parse(firebaseUser.metadata.creationTime) : 0;
  const applicantType: ApplicantType = raw.applicantType === 'Student' || raw.applicantType === 'Other'
    ? raw.applicantType
    : 'SSU Personnel';

  const legacyPhotoSubmitted = raw.studentIdImageSubmitted === true;
  const frontSubmitted = raw.studentIdFrontImageSubmitted === true || legacyPhotoSubmitted;
  const backSubmitted = raw.studentIdBackImageSubmitted === true;
  const personnelFrontSubmitted = raw.personnelIdFrontImageSubmitted === true;
  const personnelBackSubmitted = raw.personnelIdBackImageSubmitted === true;

  return {
    uid: raw.uid || firebaseUser.uid,
    email: raw.email || firebaseUser.email || '',
    fullName: raw.fullName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Portal User',
    applicantType,
    role: raw.role === 'admin' ? 'admin' : 'user',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : createdFromAuth,
    studentId: typeof raw.studentId === 'string' && raw.studentId.trim() ? raw.studentId.trim().toUpperCase() : undefined,
    studentIdImageSubmitted: legacyPhotoSubmitted || (frontSubmitted && backSubmitted),
    studentIdFrontImageSubmitted: frontSubmitted,
    studentIdBackImageSubmitted: backSubmitted,
    personnelIdFrontImageSubmitted: personnelFrontSubmitted,
    personnelIdBackImageSubmitted: personnelBackSubmitted,
    verificationStatus: normalizeVerificationStatus(raw, applicantType),
    verificationReviewedAt: typeof raw.verificationReviewedAt === 'number' ? raw.verificationReviewedAt : undefined,
    verificationReviewedByUid: typeof raw.verificationReviewedByUid === 'string' ? raw.verificationReviewedByUid : undefined,
  };
}

async function readProfile(firebaseUser: User | null) {
  if (!firebaseUser) return null;
  const profileRef = ref(db, `users/${firebaseUser.uid}`);
  const snap = await get(profileRef);
  if (!snap.exists()) return null;

  const raw = snap.val() as Partial<UserProfile>;
  const normalized = normalizeProfile(firebaseUser, raw);

  // A first administrator can be provisioned in Firebase Console by creating
  // the Authentication user and setting only users/<UID>/role = "admin".
  // On first successful login, harmless display/profile fields are backfilled.
  const patch: Record<string, string | number> = {};
  if (!raw.uid) patch.uid = normalized.uid;
  if (!raw.email) patch.email = normalized.email;
  if (!raw.fullName) patch.fullName = normalized.fullName;
  // Do not let a normal user change their account classification through a profile backfill.
  // Administrators can still backfill a missing applicant type.
  if (!raw.applicantType && normalized.role === 'admin') patch.applicantType = normalized.applicantType;
  if (typeof raw.createdAt !== 'number') patch.createdAt = normalized.createdAt || Date.now();
  if (Object.keys(patch).length > 0) await update(profileRef, patch);

  return normalized;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(firebaseUser: User | null) {
    if (!firebaseUser) {
      setProfile(null);
      return null;
    }
    const value = await readProfile(firebaseUser);
    setProfile(value);
    return value;
  }

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const profileRef = ref(db, `users/${firebaseUser.uid}`);
      unsubscribeProfile = onValue(
        profileRef,
        (snap) => {
          if (!snap.exists()) {
            setProfile(null);
          } else {
            setProfile(normalizeProfile(firebaseUser, snap.val() as Partial<UserProfile>));
          }
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      async register(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedStudentId = input.applicantType === 'Student'
          ? input.studentId?.trim().toUpperCase()
          : undefined;

        if (input.applicantType === 'Student' && !normalizedStudentId) {
          throw new Error('Student ID is required for student registration.');
        }

        if (input.applicantType === 'Student' && !input.studentIdFrontImage) {
          throw new Error('A clear FRONT photo of your Student ID is required for verification.');
        }

        if (input.applicantType === 'Student' && !input.studentIdBackImage) {
          throw new Error('A clear BACK photo of your Student ID is required for verification.');
        }

        if (input.applicantType === 'SSU Personnel' && !input.personnelIdFrontImage) {
          throw new Error('A clear FRONT photo of your SSU Personnel ID is required for verification.');
        }

        if (input.applicantType === 'SSU Personnel' && !input.personnelIdBackImage) {
          throw new Error('A clear BACK photo of your SSU Personnel ID is required for verification.');
        }

        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, input.password);
        await updateProfile(credential.user, { displayName: input.fullName.trim() });

        const requiresIdVerification = input.applicantType === 'Student' || input.applicantType === 'SSU Personnel';
        const createdAt = Date.now();

        const nextProfile: UserProfile = {
          uid: credential.user.uid,
          email: credential.user.email ?? normalizedEmail,
          fullName: input.fullName.trim(),
          applicantType: input.applicantType,
          role: 'user',
          createdAt,
          verificationStatus: requiresIdVerification ? 'pending' : 'not_required',
          ...(normalizedStudentId ? { studentId: normalizedStudentId } : {}),
          ...(input.applicantType === 'Student'
            ? {
                studentIdImageSubmitted: true,
                studentIdFrontImageSubmitted: true,
                studentIdBackImageSubmitted: true,
              }
            : {}),
          ...(input.applicantType === 'SSU Personnel'
            ? {
                personnelIdFrontImageSubmitted: true,
                personnelIdBackImageSubmitted: true,
              }
            : {}),
        };

        const databaseUpdates: Record<string, unknown> = {
          [`users/${credential.user.uid}`]: nextProfile,
        };

        if (
          input.applicantType === 'Student' &&
          input.studentIdFrontImage &&
          input.studentIdBackImage
        ) {
          databaseUpdates[`studentVerificationDocuments/${credential.user.uid}`] = {
            uid: credential.user.uid,
            studentIdFrontImage: input.studentIdFrontImage,
            studentIdBackImage: input.studentIdBackImage,
            submittedAt: createdAt,
          };
        }

        if (
          input.applicantType === 'SSU Personnel' &&
          input.personnelIdFrontImage &&
          input.personnelIdBackImage
        ) {
          databaseUpdates[`personnelVerificationDocuments/${credential.user.uid}`] = {
            uid: credential.user.uid,
            personnelIdFrontImage: input.personnelIdFrontImage,
            personnelIdBackImage: input.personnelIdBackImage,
            submittedAt: createdAt,
          };
        }

        // Keep the profile lightweight. ID photos are stored separately so the
        // users list does not download image data. Profile + photos are committed
        // together in one Realtime Database multi-location update.
        await update(ref(db), databaseUpdates);
        setProfile(nextProfile);
      },
      async login(email, password) {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const next = await loadProfile(credential.user);
        if (!next) {
          await signOut(auth);
          throw new Error('No portal profile was found for this account. If this is the first administrator, add users/<UID>/role = "admin" in Firebase Realtime Database.');
        }
        return next;
      },
      async logout() {
        await signOut(auth);
      },
      async refreshProfile() {
        await loadProfile(auth.currentUser);
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
