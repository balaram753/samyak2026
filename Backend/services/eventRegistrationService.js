import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, where, serverTimestamp, runTransaction, onSnapshot, increment 
} from 'firebase/firestore';
import { db } from './firebase';

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

/**
 * Check if student has already registered for an event
 * Checks both email and university ID against event_registrations
 */
export async function checkStudentAlreadyRegistered(eventId, email, universityId) {
  if (!eventId) return null;
  const regCol = collection(db, 'event_registrations');
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedUniId = (universityId || '').trim().toUpperCase();

  // 1. Check by email
  if (normalizedEmail) {
    const qEmail = query(
      regCol, 
      where('event_id', '==', eventId), 
      where('email', '==', normalizedEmail)
    );
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
    }
  }

  // 2. Check by university_id
  if (normalizedUniId) {
    const qUni = query(
      regCol, 
      where('event_id', '==', eventId), 
      where('university_id', '==', normalizedUniId)
    );
    const snapUni = await getDocs(qUni);
    if (!snapUni.empty) {
      return { id: snapUni.docs[0].id, ...snapUni.docs[0].data() };
    }
  }

  return null;
}

/**
 * Atomic Student Event Registration
 * - Enforces duplicate constraints on (event_id, email) and (event_id, university_id)
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
}) {
  if (!eventId) throw new Error('Event ID is required.');
  if (!studentName?.trim()) throw new Error('Student full name is required.');
  if (!universityId?.trim()) throw new Error('College / University ID is required.');
  if (!email?.trim()) throw new Error('Valid email address is required.');
  if (!phone?.trim()) throw new Error('Mobile phone number is required.');

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUniId = universityId.trim().toUpperCase();
  const normalizedPhone = phone.trim();

  // 1. Strict Duplicate Check
  const existingReg = await checkStudentAlreadyRegistered(eventId, normalizedEmail, normalizedUniId);
  if (existingReg) {
    const err = new Error('You are already registered for this event.');
    err.code = 'ALREADY_REGISTERED';
    err.existingRegistration = existingReg;
    throw err;
  }

  // 2. Reference to Event Doc
  const eventDocRef = doc(db, 'events', eventId);
  const ticketCode = generateTicketCode();
  const registrationId = `REG_${eventId}_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const regDocRef = doc(db, 'event_registrations', registrationId);

  // 3. Concurrency-Safe Transaction
  let finalTicketData = null;

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
    } else {
      // If event document hasn't been synced to Firestore collection yet, initialize it
      transaction.set(eventDocRef, {
        id: eventId,
        title: eventTitle || 'Fest Event',
        capacity: 100,
        registration_count: 1,
        available_seats: 99,
        is_registration_open: true,
        status: 'Upcoming',
        created_at: serverTimestamp(),
      }, { merge: true });
    }

    // 4. Create the Registration Document
    const regPayload = {
      id: registrationId,
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
      ticket_code: ticketCode,
      attendance: false,
      registered_at: new Date().toISOString(),
      timestamp: serverTimestamp(),
    };

    transaction.set(regDocRef, regPayload);
    finalTicketData = regPayload;
  });

  return {
    success: true,
    ticketCode,
    registrationId,
    registration: finalTicketData,
  };
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
