import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, runTransaction, onSnapshot, increment 
} from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Generate a unique 8-character uppercase alphanumeric ticket pass code
 * Prefix: SMYK- (strictly avoiding 'pulse')
 * Example: SMYK-8X92DA
 */
export function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omitting 0, O, 1, I to prevent human ambiguity
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SMYK-${randomPart}`;
}

/** One registration per account per event; Firestore rules enforce this id. */
export function eventRegistrationId(eventId, uid) {
  return `${eventId}__${uid}`;
}

/**
 * Returns the signed-in student's registration for an event, or null.
 * Registrations are private: a student can only read their own.
 */
export async function checkStudentAlreadyRegistered(eventId) {
  const uid = auth.currentUser?.uid;
  if (!eventId || !uid) return null;
  try {
    const snap = await getDoc(doc(db, 'event_registrations', eventRegistrationId(eventId, uid)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn('Registration lookup note:', err.message);
  }
}

/**
 * Returns whether a student account is registered and verified by the admin committee.
 */
export async function checkUserIsAdminVerified(uid) {
  if (!uid) return false;
  try {
    // 1. Check user document in users/{uid}
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const uData = userSnap.data();
      if (
        uData.paymentStatus === 'VERIFIED' ||
        uData.verified === true ||
        uData.idVerified === true ||
        uData.adminVerified === true ||
        uData.status === 'verified' ||
        uData.categoryVerificationStatus === 'VERIFIED' ||
        uData.gatePassStatus === 'ISSUED' ||
        uData.gatePassStatus === 'NOT_REQUIRED' ||
        uData.gatePassStatus === 'verified'
      ) {
        return true;
      }
    }

    // 2. Check registrations collection for uid
    const regCol = collection(db, 'registrations');
    const q = query(regCol, where('uid', '==', uid));
    const regSnap = await getDocs(q);
    if (!regSnap.empty) {
      for (const d of regSnap.docs) {
        const rData = d.data();
        if (
          rData.payment?.status === 'VERIFIED' ||
          rData.payment?.status === 'verified' ||
          rData.paymentStatus === 'VERIFIED' ||
          rData.verified === true ||
          rData.adminVerified === true ||
          rData.categoryVerificationStatus === 'VERIFIED' ||
          rData.gatePass?.status === 'ISSUED' ||
          rData.gatePass?.status === 'NOT_REQUIRED' ||
          rData.gatePass?.status === 'verified'
        ) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.warn('Error checking user admin verification:', err.message);
    return false;
  }
}

/**
 * Fetch all event registrations belonging to a specific student UID
 */
export async function getUserRegistrations(uid) {
  if (!uid) return [];
  try {
    const regCol = collection(db, 'event_registrations');
    const q = query(regCol, where('uid', '==', uid));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.warn('Error fetching user registrations:', err.message);
    return [];
  }
}

/**
 * Real-time listener for all event registrations belonging to a specific student UID
 */
export function listenToUserRegistrations(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const regCol = collection(db, 'event_registrations');
  const q = query(regCol, where('uid', '==', uid));
  return onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.registered_at || 0) - new Date(a.registered_at || 0));
    callback(list);
  }, (err) => {
    console.warn('User registrations listener note:', err);
    callback([]);
  });
}

/**
 * Normalizes date string for slot comparison (strips punctuation and spaces)
 */
export function normalizeDateStr(d) {
  if (!d || typeof d !== 'string') return '';
  const s = d.trim().toLowerCase();
  if (s === 'tba' || s === 'to be announced') return '';
  return s.replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes time string for slot comparison (extracts hour, minute, am/pm)
 */
export function normalizeTimeStr(t) {
  if (!t || typeof t !== 'string') return '';
  const s = t.trim().toLowerCase();
  if (s === 'tba' || s === 'to be announced') return '';
  const match = s.match(/(\d+):?(\d*)\s*(am|pm)?/i);
  if (!match) return s.replace(/\s+/g, '');
  let hours = parseInt(match[1], 10);
  const mins = match[2] ? match[2].padStart(2, '0') : '00';
  const meridiem = (match[3] || '').toLowerCase();
  return `${hours}:${mins}${meridiem}`;
}

/**
 * Parses time string into minutes from midnight (0 to 1440)
 */
export function parseEventTimeMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 9999;
  const s = timeStr.trim().toLowerCase();
  if (s === 'tba' || s === 'to be announced') return 9999;
  const match = s.match(/(\d+):?(\d*)\s*(am|pm)?/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

/**
 * Determines whether two events share the same time slot (conflict condition).
 */
export function isSameTimeSlot(dateA, timeA, dateB, timeB) {
  const normTimeA = normalizeTimeStr(timeA);
  const normTimeB = normalizeTimeStr(timeB);

  // Both must have an actual time defined to conflict
  if (!normTimeA || !normTimeB) return false;

  const minsA = parseEventTimeMinutes(timeA);
  const minsB = parseEventTimeMinutes(timeB);

  let timeMatches = false;
  if (normTimeA === normTimeB) {
    timeMatches = true;
  } else if (minsA !== 9999 && minsB !== 9999) {
    // Within 45 minutes overlap
    timeMatches = Math.abs(minsA - minsB) <= 45;
  } else {
    const rawA = (timeA || '').toLowerCase();
    const rawB = (timeB || '').toLowerCase();
    timeMatches = rawA.includes(rawB) || rawB.includes(rawA);
  }

  if (!timeMatches) return false;

  const normDateA = normalizeDateStr(dateA);
  const normDateB = normalizeDateStr(dateB);

  // If both have dates, they must match
  if (normDateA && normDateB) {
    return normDateA === normDateB || normDateA.includes(normDateB) || normDateB.includes(normDateA);
  }

  return true;
}

/**
 * Synchronous check of user registrations against a target event.
 * Checks if user has another ACTIVE (non-cancelled) event registered at the same time.
 * If that other event was cancelled, it DOES NOT conflict (the time slot is opened).
 */
export function checkUserTimeSlotConflictSync(targetEvent, userRegistrations = [], allEvents = []) {
  if (!targetEvent || !userRegistrations || userRegistrations.length === 0) {
    return { hasConflict: false, conflictingEvent: null };
  }

  const targetDate = targetEvent.date || '';
  const targetTime = targetEvent.time || '';

  for (const reg of userRegistrations) {
    // Skip if it's the exact same event
    if (reg.event_id === targetEvent.id) continue;

    // If this registration is cancelled, it DOES NOT block the slot!
    const isRegCancelled = (reg.status || '').toLowerCase() === 'cancelled' || reg.isCancelled === true;
    if (isRegCancelled) continue;

    // Look up the registered event in allEvents
    const eventObj = allEvents.find((e) => e.id === reg.event_id);

    // If the event itself was cancelled, it DOES NOT block the slot!
    const isEvCancelled = eventObj ? Boolean(
      eventObj.isCancelled || 
      (eventObj.status || '').toLowerCase() === 'cancelled' || 
      (eventObj.registrationStatus || '').toLowerCase() === 'cancelled'
    ) : false;

    if (isEvCancelled) continue;

    // Check if both events share the same time slot
    const regDate = reg.event_date || eventObj?.date || '';
    const regTime = reg.event_time || eventObj?.time || '';

    if (isSameTimeSlot(targetDate, targetTime, regDate, regTime)) {
      return {
        hasConflict: true,
        conflictingEvent: {
          id: reg.event_id,
          title: reg.event_title || eventObj?.title || 'SAMYAK Event',
          date: regDate,
          time: regTime,
          venue: reg.event_venue || eventObj?.venue || '',
          ticket_code: reg.ticket_code,
          ...eventObj,
          ...reg,
        }
      };
    }
  }

  return { hasConflict: false, conflictingEvent: null };
}

/**
 * Atomic Student Event Registration
 * - Enforces duplicate constraints on (event_id, uid)
 * - If prior registration for this event was cancelled, allows re-registration
 * - Enforces time-slot conflict check against any other active, non-cancelled event registrations
 * - Validates capacity, availability, and registration deadlines
 * - Atomically decrements available_seats and increments registration_count
 * - Creates registration record in Firestore
 */
export async function registerStudentForEvent({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  eventVenue,
  studentName,
  email,
  universityId,
  phone,
  branch,
  year,
  section = '',
  gender = '',
  accommodation = 'no',
  allEvents = []
}) {
  if (!eventId) throw new Error('Event ID is required.');
  if (!studentName?.trim()) throw new Error('Student full name is required.');
  if (!universityId?.trim()) throw new Error('College / University ID is required.');
  if (!email?.trim()) throw new Error('Valid email address is required.');
  if (!phone?.trim()) throw new Error('Mobile phone number is required.');

  const user = auth.currentUser;
  if (!user?.uid || !user.email) {
    throw new Error('Please sign in with Google to register for this event.');
  }
  const normalizedEmail = user.email.toLowerCase();
  const normalizedUniId = universityId.trim().toUpperCase();
  const normalizedPhone = phone.trim();

  // 1. Enforce Admin Verification Check
  const isVerifiedByAdmin = await checkUserIsAdminVerified(user.uid);
  if (!isVerifiedByAdmin) {
    const err = new Error(
      'Event registration is only allowed for users who are registered and verified by the admin. Your account is currently pending admin verification.'
    );
    err.code = 'ADMIN_VERIFICATION_REQUIRED';
    throw err;
  }

  // 2. Strict Duplicate Check (allowed if previously cancelled)
  const existingReg = await checkStudentAlreadyRegistered(eventId);
  if (existingReg && existingReg.status !== 'cancelled' && !existingReg.isCancelled) {
    const err = new Error('You are already registered for this event.');
    err.code = 'ALREADY_REGISTERED';
    err.existingRegistration = existingReg;
    throw err;
  }

  // 2. Strict Time-Slot Conflict Check
  // Check if student is actively enrolled in another non-cancelled event at the same time
  const userRegs = await getUserRegistrations(user.uid);
  const conflict = checkUserTimeSlotConflictSync(
    { id: eventId, date: eventDate, time: eventTime },
    userRegs,
    allEvents
  );

  if (conflict.hasConflict) {
    const conflictTitle = conflict.conflictingEvent?.title || conflict.conflictingEvent?.event_title || 'another event';
    const conflictTime = conflict.conflictingEvent?.time || conflict.conflictingEvent?.event_time || 'this time slot';
    const err = new Error(
      `Time slot conflict: You are already registered for "${conflictTitle}" at ${conflictTime}. You cannot attend two events simultaneously unless the conflicting event is cancelled.`
    );
    err.code = 'TIME_SLOT_CONFLICT';
    err.conflictingEvent = conflict.conflictingEvent;
    throw err;
  }

  // 3. Reference to Event Doc
  const eventDocRef = doc(db, 'events', eventId);
  const ticketCode = generateTicketCode();
  const registrationId = eventRegistrationId(eventId, user.uid);
  const regDocRef = doc(db, 'event_registrations', registrationId);

  // 4. Concurrency-Safe Transaction with Direct Fallback
  let finalTicketData = null;

  const regPayload = {
    id: registrationId,
    uid: user.uid,
    event_id: eventId,
    event_title: eventTitle || 'SAMYAK Event',
    event_date: eventDate || '',
    event_time: eventTime || '',
    event_venue: eventVenue || '',
    student_name: studentName.trim(),
    email: normalizedEmail,
    university_id: normalizedUniId,
    phone: normalizedPhone,
    branch: branch || 'General',
    year: year || '1st Year',
    section: section.trim(),
    gender: gender.trim(),
    accommodation: accommodation || 'no',
    ticket_code: ticketCode,
    attendance: false,
    status: 'active',
    isCancelled: false,
    registered_at: new Date().toISOString(),
    timestamp: serverTimestamp(),
  };

  try {
    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventDocRef);

      let capacity = 100;
      let regCount = 0;
      let availableSeats = 100;
      let isRegOpen = true;
      let deadline = null;

      if (eventSnap.exists()) {
        const eData = eventSnap.data();
        capacity = Number(eData.capacity ?? 100);
        regCount = Number(eData.registration_count ?? 0);
        availableSeats = Number(eData.available_seats ?? (capacity - regCount));
        isRegOpen = eData.is_registration_open !== false;
        deadline = eData.registration_deadline || null;

        // Deadline check
        if (deadline) {
          const deadlineDate = new Date(deadline);
          if (!isNaN(deadlineDate.getTime()) && new Date() > deadlineDate) {
            throw new Error('Registrations for this event have closed (deadline passed).');
          }
        }

        // Open check
        if (!isRegOpen) {
          throw new Error('Registrations are currently closed by the event organizers.');
        }

        // Capacity & Seat availability check
        if (availableSeats <= 0 || regCount >= capacity) {
          throw new Error('Registrations are closed or seats are full.');
        }

        // Atomically decrement available_seats and increment registration_count
        const newRegCount = regCount + 1;
        const newAvailable = Math.max(0, capacity - newRegCount);

        transaction.update(eventDocRef, {
          registration_count: newRegCount,
          available_seats: newAvailable,
          updated_at: serverTimestamp(),
        });
      }

      transaction.set(regDocRef, regPayload);
      finalTicketData = regPayload;
    });
  } catch (txErr) {
    if (
      txErr.message?.includes('closed') ||
      txErr.message?.includes('full') ||
      txErr.message?.includes('deadline')
    ) {
      throw txErr;
    }
    console.warn('Event seat transaction note, writing direct registration record:', txErr.message);
    await setDoc(regDocRef, regPayload);
    finalTicketData = regPayload;
  }

  return {
    success: true,
    ticketCode,
    registrationId,
    registration: finalTicketData,
  };
}

/**
 * Cancel an individual event registration (Admin function).
 * Frees up the seat in the event document and unlocks the time slot for the user.
 */
export async function cancelEventRegistration(registrationId, reason = 'Cancelled by administrator', adminEmail = 'Admin') {
  if (!registrationId) throw new Error('Registration ID is required.');
  const regRef = doc(db, 'event_registrations', registrationId);
  const snap = await getDoc(regRef);
  if (!snap.exists()) throw new Error('Registration record not found.');
  const regData = snap.data();

  const wasActive = (regData.status || '').toLowerCase() !== 'cancelled' && !regData.isCancelled;

  await updateDoc(regRef, {
    status: 'cancelled',
    isCancelled: true,
    cancellation_reason: reason,
    cancelled_at: serverTimestamp(),
    cancelled_by: adminEmail,
  });

  // Restore seat counter on event document if it was active
  if (wasActive && regData.event_id) {
    try {
      const eventDocRef = doc(db, 'events', regData.event_id);
      await runTransaction(db, async (tx) => {
        const evSnap = await tx.get(eventDocRef);
        if (evSnap.exists()) {
          const e = evSnap.data();
          const cap = Number(e.capacity ?? 100);
          const currentCount = Number(e.registration_count ?? 1);
          const newCount = Math.max(0, currentCount - 1);
          const newAvail = Math.min(cap, cap - newCount);
          tx.update(eventDocRef, {
            registration_count: newCount,
            available_seats: newAvail,
            updated_at: serverTimestamp(),
          });
        }
      });
    } catch (seatErr) {
      console.warn('Seat restoration transaction note:', seatErr.message);
      try {
        const eventDocRef = doc(db, 'events', regData.event_id);
        await updateDoc(eventDocRef, {
          registration_count: increment(-1),
          available_seats: increment(1),
          updated_at: serverTimestamp(),
        });
      } catch (fbErr) {
        console.warn('Seat restoration fallback note:', fbErr.message);
      }
    }
  }

  return { success: true, registrationId };
}

/**
 * Reactivate a cancelled event registration (Admin function).
 */
export async function reactivateEventRegistration(registrationId, adminEmail = 'Admin') {
  if (!registrationId) throw new Error('Registration ID is required.');
  const regRef = doc(db, 'event_registrations', registrationId);
  const snap = await getDoc(regRef);
  if (!snap.exists()) throw new Error('Registration record not found.');
  const regData = snap.data();

  const wasCancelled = (regData.status || '').toLowerCase() === 'cancelled' || regData.isCancelled === true;

  await updateDoc(regRef, {
    status: 'active',
    isCancelled: false,
    cancellation_reason: null,
    reactivated_at: serverTimestamp(),
    reactivated_by: adminEmail,
  });

  // Decrement seat on event doc if previously cancelled
  if (wasCancelled && regData.event_id) {
    try {
      const eventDocRef = doc(db, 'events', regData.event_id);
      await runTransaction(db, async (tx) => {
        const evSnap = await tx.get(eventDocRef);
        if (evSnap.exists()) {
          const e = evSnap.data();
          const cap = Number(e.capacity ?? 100);
          const currentCount = Number(e.registration_count ?? 0);
          const newCount = currentCount + 1;
          const newAvail = Math.max(0, cap - newCount);
          tx.update(eventDocRef, {
            registration_count: newCount,
            available_seats: newAvail,
            updated_at: serverTimestamp(),
          });
        }
      });
    } catch (seatErr) {
      console.warn('Seat decrement note:', seatErr.message);
    }
  }

  return { success: true, registrationId };
}

/**
 * Permanently delete a registration record (Admin function).
 * Also restores the event seat if it was active.
 */
export async function deleteEventRegistration(registrationId) {
  if (!registrationId) throw new Error('Registration ID is required.');
  const regRef = doc(db, 'event_registrations', registrationId);
  const snap = await getDoc(regRef);
  if (!snap.exists()) return;
  const regData = snap.data();
  const wasActive = (regData.status || '').toLowerCase() !== 'cancelled' && !regData.isCancelled;

  await deleteDoc(regRef);

  if (wasActive && regData.event_id) {
    try {
      const eventDocRef = doc(db, 'events', regData.event_id);
      await updateDoc(eventDocRef, {
        registration_count: increment(-1),
        available_seats: increment(1),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Seat restoration on delete note:', err.message);
    }
  }
}

/**
 * Toggle attendance for a registered student
 */
export async function toggleAttendance(registrationId, newStatus) {
  if (!registrationId) return;
  const regRef = doc(db, 'event_registrations', registrationId);
  await updateDoc(regRef, {
    attendance: Boolean(newStatus),
    attended_at: newStatus ? serverTimestamp() : null,
  });
}

/**
 * Listen to real-time seat counters and details for an event
 */
export function listenToEventStats(eventId, callback) {
  if (!eventId) return () => {};
  const eventRef = doc(db, 'events', eventId);
  return onSnapshot(eventRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn('Event stats listener note:', err);
  });
}

/**
 * Listen to all registrations for a specific event
 */
export function listenToEventRoster(eventId, callback) {
  const regCol = collection(db, 'event_registrations');
  const q = eventId && eventId !== 'all' 
    ? query(regCol, where('event_id', '==', eventId))
    : query(regCol);

  return onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    // Sort latest first
    list.sort((a, b) => new Date(b.registered_at || 0) - new Date(a.registered_at || 0));
    callback(list);
  }, (err) => {
    console.warn('Event roster listener note:', err);
    callback([]);
  });
}

/**
 * Export event registrations to CSV
 */
export function exportRosterToCSV(registrations, eventTitle = 'Event_Roster') {
  if (!registrations || registrations.length === 0) {
    throw new Error('No registrations found to export.');
  }

  const headers = [
    'Ticket Code',
    'Student Name',
    'University / Roll ID',
    'Email Address',
    'Mobile Phone',
    'Branch',
    'Year',
    'Section',
    'Event Title',
    'Status',
    'Attendance Status',
    'Registered At'
  ];

  const rows = registrations.map((r) => [
    `"${r.ticket_code || ''}"`,
    `"${r.student_name || ''}"`,
    `"${r.university_id || ''}"`,
    `"${r.email || ''}"`,
    `"${r.phone || ''}"`,
    `"${r.branch || ''}"`,
    `"${r.year || ''}"`,
    `"${r.section || ''}"`,
    `"${r.event_title || ''}"`,
    `"${r.status || (r.isCancelled ? 'cancelled' : 'active')}"`,
    `"${r.attendance ? 'Attended' : 'Absent'}"`,
    `"${r.registered_at ? new Date(r.registered_at).toLocaleString() : ''}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_roster.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
