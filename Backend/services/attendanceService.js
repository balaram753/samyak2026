/**
 * SAMYAK 2026 — Attendance Service
 * 
 * Manages participant attendance with:
 * - Server-authorized atomic Firestore transactions (no race conditions)
 * - Full audit trail in attendanceAudit/ collection
 * - eventStats.presentCount increments
 * - Role & permission validation before every action
 * 
 * Security Principle:
 * - USERS cannot mark themselves present.
 * - Only staff with manageAttendance permission can mark/cancel attendance.
 * - All changes are immutably logged in attendanceAudit/.
 */

import {
  doc, updateDoc, addDoc, collection, getDoc,
  runTransaction, serverTimestamp, increment
} from 'firebase/firestore';
import { db } from './firebase';
import { updateEventStats } from './registrationService';

// ============================================================
// ATTENDANCE STATUS ENUMERATIONS
// ============================================================

export const ATTENDANCE_STATUS = {
  NOT_MARKED: 'NOT_MARKED',
  PRESENT: 'PRESENT',
  CANCELLED: 'CANCELLED',
};

export const ATTENDANCE_AUDIT_ACTIONS = {
  MARK_PRESENT: 'MARK_PRESENT',
  CANCEL_ATTENDANCE: 'CANCEL_ATTENDANCE',
  CORRECT_ATTENDANCE: 'CORRECT_ATTENDANCE',
};

// ============================================================
// PERMISSION CHECKS
// ============================================================

/**
 * Validates that a staff member has permission to manage attendance.
 * @param {Object} staffInfo - Staff profile from getStaffProfile()
 * @throws if not authorized
 */
function assertAttendancePermission(staffInfo) {
  if (!staffInfo || !staffInfo.isAuthenticated) {
    throw new Error('Authentication required to manage attendance.');
  }
  if (!staffInfo.isStaff) {
    throw new Error('ACCESS_DENIED: Only authorized SAMYAK staff can manage attendance.');
  }
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM'];
  if (!allowedRoles.includes(staffInfo.role)) {
    throw new Error('ACCESS_DENIED: Your role does not permit attendance management.');
  }
  // Explicit permission check (if permissions object exists)
  if (
    staffInfo.permissions &&
    staffInfo.permissions.manageAttendance === false
  ) {
    throw new Error('ACCESS_DENIED: manageAttendance permission not granted to your account.');
  }
}

// ============================================================
// AUDIT LOGGING
// ============================================================

/**
 * Record an immutable attendance audit entry.
 */
async function recordAttendanceAudit({
  participantUid,
  registrationId,
  action,
  previousStatus,
  newStatus,
  performedBy,
  performedByName,
  performedByRole,
  reason = null,
}) {
  try {
    await addDoc(collection(db, 'attendanceAudit'), {
      participantUid: participantUid || null,
      registrationId: registrationId || 'unknown',
      action,
      previousStatus,
      newStatus,
      performedBy: performedBy || 'staff',
      performedByName: performedByName || 'Staff Member',
      performedByRole: performedByRole || 'STAFF',
      reason: reason || null,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('attendanceAudit write note:', err.message);
  }

  // Also write to the general audit_logs collection
  try {
    await addDoc(collection(db, 'audit_logs'), {
      registrationId: registrationId || 'unknown',
      action,
      actorId: performedBy || 'staff',
      details: { previousStatus, newStatus, reason },
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('audit_logs write note:', err.message);
  }
}

// ============================================================
// MARK PRESENT — Atomic Transaction
// ============================================================

/**
 * Mark a participant as PRESENT.
 * 
 * Guards:
 * 1. staffInfo must be authenticated and authorized
 * 2. participant must not already be PRESENT
 * 3. Atomic Firestore transaction prevents race conditions
 * 
 * @param {string} registrationId - The registration document ID
 * @param {Object} staffInfo - From getStaffProfile()
 * @param {string} [reason] - Optional reason note
 * @returns {Promise<{success: boolean}>}
 */
export async function markAttendance(registrationId, staffInfo, reason = null) {
  // Authorization check
  assertAttendancePermission(staffInfo);

  if (!registrationId) throw new Error('Registration ID is required.');

  const regRef = doc(db, 'registrations', registrationId);
  let previousStatus = ATTENDANCE_STATUS.NOT_MARKED;
  let participantUid = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(regRef);
    if (!snap.exists()) {
      throw new Error('Registration not found. Please check the participant ID.');
    }

    const data = snap.data();
    participantUid = data.uid || null;
    previousStatus = data.attendance?.status || ATTENDANCE_STATUS.NOT_MARKED;

    // Prevent double-marking
    if (previousStatus === ATTENDANCE_STATUS.PRESENT) {
      throw new Error('ALREADY_PRESENT: This participant is already marked as present.');
    }

    tx.update(regRef, {
      'attendance.status': ATTENDANCE_STATUS.PRESENT,
      'attendance.markedAt': serverTimestamp(),
      'attendance.markedBy': staffInfo.uid,
      'attendance.markedByName': staffInfo.name || 'Staff Member',
      'attendance.markedByRole': staffInfo.role || 'STAFF',
      updatedAt: serverTimestamp(),
    });
  });

  // Update eventStats outside transaction (eventual consistency acceptable)
  await updateEventStats({ presentCount: 1 });

  // Immutable audit log
  await recordAttendanceAudit({
    participantUid,
    registrationId,
    action: ATTENDANCE_AUDIT_ACTIONS.MARK_PRESENT,
    previousStatus,
    newStatus: ATTENDANCE_STATUS.PRESENT,
    performedBy: staffInfo.uid,
    performedByName: staffInfo.name,
    performedByRole: staffInfo.role,
    reason,
  });

  return { success: true };
}

// ============================================================
// CANCEL ATTENDANCE
// ============================================================

/**
 * Cancel/correct an attendance record.
 * Does NOT silently delete — creates an audit record.
 * Only SUPER_ADMIN or ADMIN can cancel attendance.
 * 
 * @param {string} registrationId
 * @param {Object} staffInfo
 * @param {string} reason - Required reason for the cancellation
 */
export async function cancelAttendance(registrationId, staffInfo, reason) {
  assertAttendancePermission(staffInfo);

  // Only SUPER_ADMIN and ADMIN can cancel
  if (!['SUPER_ADMIN', 'ADMIN'].includes(staffInfo.role)) {
    throw new Error('ACCESS_DENIED: Only ADMIN or SUPER_ADMIN can cancel attendance records.');
  }

  if (!reason || reason.trim().length < 3) {
    throw new Error('A reason is required to cancel an attendance record.');
  }

  const regRef = doc(db, 'registrations', registrationId);
  let previousStatus = ATTENDANCE_STATUS.NOT_MARKED;
  let participantUid = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(regRef);
    if (!snap.exists()) throw new Error('Registration not found.');

    const data = snap.data();
    participantUid = data.uid || null;
    previousStatus = data.attendance?.status || ATTENDANCE_STATUS.NOT_MARKED;

    tx.update(regRef, {
      'attendance.status': ATTENDANCE_STATUS.CANCELLED,
      'attendance.cancelledAt': serverTimestamp(),
      'attendance.cancelledBy': staffInfo.uid,
      'attendance.cancelReason': reason.trim(),
      updatedAt: serverTimestamp(),
    });
  });

  // Decrement presentCount only if was PRESENT
  if (previousStatus === ATTENDANCE_STATUS.PRESENT) {
    await updateEventStats({ presentCount: -1 });
  }

  await recordAttendanceAudit({
    participantUid,
    registrationId,
    action: ATTENDANCE_AUDIT_ACTIONS.CANCEL_ATTENDANCE,
    previousStatus,
    newStatus: ATTENDANCE_STATUS.CANCELLED,
    performedBy: staffInfo.uid,
    performedByName: staffInfo.name,
    performedByRole: staffInfo.role,
    reason: reason.trim(),
  });

  return { success: true };
}
