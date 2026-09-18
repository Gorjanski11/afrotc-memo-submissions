import type { AbsenceAsClass, AbsenceMemoStatus, AbsenceReason, AsLevel, DeviationMemoStatus, Instructor, PmtEventType } from "./constants";

/** The shared roster -- same Firestore `cadets` collection the TO's and Accountability sites read/write. Read-only here; this site never edits a roster record directly. */
export interface RosterPerson {
  id: string;
  name: string;
  asClass: AsLevel | undefined;
  devLevel: string | undefined;
  status: string | undefined;
  email: string | undefined;
}

/** Shared `pmtEvents` collection -- read-only here, used to let a memo reference which PMT(s) it covers. */
export interface PmtEvent {
  id: string;
  title: string;
  eventDate: string;
  eventType: PmtEventType;
}

/**
 * AbsenceMemoSubmissions -- a cadet's writeup covering one or more missed PMTs, with an uploaded
 * PDF (Firebase Storage, Blaze plan) as the actual memorandum document. On Accepted/Rejected, this
 * site writes a side-effect update into the Accountability site's shared `attendance` collection
 * (same Firebase project): each covered PMT's Attendance record flips PE -> AE (Accepted) or
 * PE -> A (Rejected). Returned has no Attendance side-effect -- it's sent back to the cadet first.
 * An excuse never reverts an absence-driven grade on the TO's side (per the user's explicit rule);
 * this site does not touch the TO's-site `completions` collection at all.
 */
export interface AbsenceMemo {
  id: string;
  cadetId: string;
  cadetName: string;
  /** Every PMT this single memo covers -- a cadet who missed a whole day (PT + LLAB + FM) submits one memo, not three. Empty when this memo is only for an AS-Class absence below. */
  pmtEventIds: string[];
  /**
   * AS-Class-absence fields -- a memo can cover a missed PMT, a missed AS-Class session, or both.
   * All four are set together or not at all: which AS Class, the date (manually entered -- an
   * academic-class absence isn't tied to any PMT calendar entry), the material/title covered that
   * day, and the instructor.
   */
  asClass: AbsenceAsClass | undefined;
  classDate: string | undefined;
  classTitle: string | undefined;
  instructor: Instructor | undefined;
  reason: AbsenceReason;
  /** Whether medical documentation was sent to the detachment separately from this memo (Medical reason only, but tracked regardless). */
  medicalDocSent: boolean;
  pdfUrl: string | undefined;
  pdfFileName: string | undefined;
  status: AbsenceMemoStatus;
  submittedAt: string;
  reviewedAt: string | undefined;
  /** Free text -- no auth, so the reviewer just types their own name. */
  reviewedBy: string | undefined;
  reviewNotes: string;
  /** Required when status is "Returned" -- what the cadet needs to fix before resubmitting. */
  returnReason: string | undefined;
  /** Set once the Accepted/Rejected Attendance side-effect has actually been written, so it's never silently reapplied (e.g. on a second render) and the UI can show it happened. */
  attendanceUpdatedAt: string | undefined;
}

/**
 * DeviationMemos -- assigned by a reviewer for a standards deviation, submitted by the cadet
 * (with a PDF), then resolved as Accepted or Returned (sent back to fix/resubmit) -- never
 * Rejected outright.
 */
export interface DeviationMemo {
  id: string;
  cadetId: string;
  cadetName: string;
  /** Free text -- no auth, so whoever assigns it just types their own name. */
  assignedBy: string;
  /** What the deviation was (e.g. uniform, grooming, punctuality) -- free text, no fixed catalog given. */
  reason: string;
  dateAssigned: string;
  dueDate: string | undefined;
  status: DeviationMemoStatus;
  pdfUrl: string | undefined;
  pdfFileName: string | undefined;
  submittedAt: string | undefined;
  reviewedAt: string | undefined;
  reviewedBy: string | undefined;
  reviewNotes: string;
}
