/**
 * SAMYAK 2026 — Secure Excel (.xlsx) Export & Audit System
 * 
 * Generates genuine .xlsx files using SheetJS (xlsx).
 * Enforces role-based column authorization and logs every export event
 * to the Firestore 'audit_logs' collection for compliance and security.
 */

import * as XLSX from 'xlsx';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Log export actions to Firestore audit_logs collection.
 * Never logs secrets, passwords, or tokens.
 */
export async function recordExportAudit({
  action,
  performedBy,
  role,
  recordCount,
  filename,
  filterApplied
}) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action: action || 'DATA_EXPORT',
      performedBy: performedBy || 'anonymous_admin',
      role: role || 'UNKNOWN',
      recordCount: recordCount || 0,
      filename: filename || '',
      filterApplied: filterApplied || 'NONE',
      exportedAt: serverTimestamp(),
      platform: 'SAMYAK_ADMIN_CONSOLE'
    });
  } catch (err) {
    console.warn('Export audit logging error:', err);
  }
}

/**
 * Low-level workbook builder and browser trigger
 */
function downloadWorkbook(workbook, filename) {
  XLSX.writeFile(workbook, filename, {
    bookType: 'xlsx',
    compression: true
  });
}

/**
 * EXPORT 1: CORE TEAM MEMBERS (.xlsx)
 * 
 * Only exposes sensitive personal contact information (phone, studentId, bloodGroup)
 * if the authenticated user has super_admin, admin, or authorized committee role.
 */
export async function exportCoreTeamToExcel({
  members = [],
  adminUser = null,
  adminRole = 'admin',
  publishedIds = new Set()
}) {
  if (!members || members.length === 0) {
    throw new Error('No core team members available to export.');
  }

  // Security role verification
  const isAuthorizedFull = 
    adminRole === 'super_admin' || 
    adminRole === 'admin' || 
    adminRole === 'wing_admin' ||
    adminRole === 'core_team';

  // Projection: filter columns based on role authorization
  const sheetData = members.map((m, index) => {
    const isPublic = publishedIds.has(m.id) || m.showOnPublicTeam === true;

    const baseRow = {
      'S.No': index + 1,
      'Full Name': m.name || '',
      'Role / Designation': m.role || '',
      'Committee / Wing': m.team || '',
      'Card Code': m.memberCode || 'N/A',
      'Branch / Dept': m.branch || 'N/A',
      'Show on Public Team': isPublic ? 'YES' : 'NO',
      'Registered Date': m.createdAt?.seconds 
        ? new Date(m.createdAt.seconds * 1000).toLocaleDateString('en-IN')
        : 'N/A'
    };

    if (isAuthorizedFull) {
      baseRow['Student ID / Roll No'] = m.studentId || '';
      baseRow['Phone Number'] = m.phone || '';
      baseRow['Blood Group'] = m.bloodGroup || '';
    }

    return baseRow;
  });

  const ws = XLSX.utils.json_to_sheet(sheetData);

  // Auto-fit column widths
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 25 }, // Name
    { wch: 30 }, // Role
    { wch: 22 }, // Wing
    { wch: 16 }, // Card Code
    { wch: 18 }, // Branch
    { wch: 20 }, // Public Team
    { wch: 18 }, // Date
    { wch: 20 }, // Student ID
    { wch: 16 }, // Phone
    { wch: 12 }, // Blood
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Core Team');

  const filename = `SAMYAK_2026_Core_Team.xlsx`;
  downloadWorkbook(wb, filename);

  // Record security audit log
  await recordExportAudit({
    action: 'CORE_TEAM_EXPORT',
    performedBy: adminUser?.email || adminUser?.uid || 'authorized_admin',
    role: adminRole,
    recordCount: members.length,
    filename,
    filterApplied: 'ALL'
  });

  return { filename, count: members.length };
}

/**
 * EXPORT 2: ATTENDANCE & GATE PASSES (.xlsx)
 * 
 * Supports current active dataset filters (ALL, ISSUED, USED, CANCELLED, search query).
 * Only authorized roles may download full participant records.
 */
export async function exportAttendanceToExcel({
  passes = [],
  filterName = 'ALL',
  adminUser = null,
  adminRole = 'admin'
}) {
  if (!passes || passes.length === 0) {
    throw new Error('No attendance or gate pass records available to export.');
  }

  // Security role verification
  const isGateStaffOnly = adminRole === 'gate_staff' || adminRole === 'security';

  const sheetData = passes.map((p, index) => {
    const isCheckedIn = Boolean(p.checkedIn || p.gatePassStatus === 'USED');
    const checkedInAtStr = p.checkedInAt?.seconds
      ? new Date(p.checkedInAt.seconds * 1000).toLocaleString('en-IN')
      : isCheckedIn ? 'Marked' : 'Not Checked In';

    const issuedAtStr = p.gatePassIssuedAt?.seconds
      ? new Date(p.gatePassIssuedAt.seconds * 1000).toLocaleString('en-IN')
      : 'N/A';

    return {
      'S.No': index + 1,
      'Registration ID': p.registrationNumber || p.registrationId || p.id || '',
      'Participant Name': p.name || '',
      'College / University': p.university || 'KL University',
      'Ticket Category': p.ticketType || p.category || 'Standard',
      'Attendance Status': isCheckedIn ? 'PRESENT' : 'ABSENT',
      'Checked In': isCheckedIn ? 'YES' : 'NO',
      'Checked In At': checkedInAtStr,
      'Checked In By': p.checkedInBy || (isCheckedIn ? 'Gate Scanner' : '-'),
      'Gate Pass Status': p.gatePassStatus || 'ACTIVE',
      'Issued At': issuedAtStr,
      'Email': isGateStaffOnly ? '***@***.***' : (p.email || 'N/A'),
      'Phone': isGateStaffOnly ? (p.phone ? p.phone.slice(-4).padStart(p.phone.length, '*') : 'N/A') : (p.phone || 'N/A'),
      'Gate Pass Token': p.gatePassToken || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(sheetData);

  // Column width hints
  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Reg ID
    { wch: 24 }, // Name
    { wch: 24 }, // College
    { wch: 18 }, // Ticket
    { wch: 18 }, // Status
    { wch: 14 }, // Checked In
    { wch: 24 }, // Checked In At
    { wch: 18 }, // Checked In By
    { wch: 18 }, // Pass Status
    { wch: 22 }, // Issued At
    { wch: 26 }, // Email
    { wch: 16 }, // Phone
    { wch: 36 }, // Token
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `SAMYAK_2026_Attendance_${todayStr}.xlsx`;
  downloadWorkbook(wb, filename);

  // Record security audit log
  await recordExportAudit({
    action: 'ATTENDANCE_EXPORT',
    performedBy: adminUser?.email || adminUser?.uid || 'authorized_admin',
    role: adminRole,
    recordCount: passes.length,
    filename,
    filterApplied: filterName
  });

  return { filename, count: passes.length };
}

/**
 * EXPORT 3: TOTAL USERS DIRECTORY (.xlsx)
 * 
 * Exports comprehensive user records with search filters, verification status,
 * Samyak ID, Roll No, payment and gate pass status.
 */
export async function exportUsersToExcel({
  users = [],
  filterName = 'ALL',
  adminUser = null,
  adminRole = 'admin'
}) {
  if (!users || users.length === 0) {
    throw new Error('No user records available to export.');
  }

  const isGateStaffOnly = adminRole === 'gate_staff' || adminRole === 'security';

  const sheetData = users.map((u, index) => {
    const isCheckedIn = Boolean(u.checkedIn || u.gatePassStatus === 'USED');
    const checkedInAtStr = u.checkedInAt?.seconds
      ? new Date(u.checkedInAt.seconds * 1000).toLocaleString('en-IN')
      : isCheckedIn ? 'Checked In' : 'Not Checked In';

    const regDateStr = u.createdAt?.seconds
      ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('en-IN')
      : (u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : 'N/A');

    return {
      'S.No': index + 1,
      'Samyak ID': u.samyakId || 'NOT ENROLLED',
      'Full Name': u.name || 'N/A',
      'Student ID / Roll No': u.studentId || u.rollNo || 'N/A',
      'Email': isGateStaffOnly ? '***@***.***' : (u.email || 'N/A'),
      'Phone Number': isGateStaffOnly ? (u.mobile ? u.mobile.slice(-4).padStart(u.mobile.length, '*') : 'N/A') : (u.mobile || u.phone || 'N/A'),
      'College / University': u.college || u.university || 'KL University',
      'Branch / Department': u.branch || 'N/A',
      'Category': u.category || (u.isInternal ? 'INTERNAL' : 'EXTERNAL'),
      'Category Verified': u.categoryVerificationStatus === 'VERIFIED' ? 'YES' : 'PENDING',
      'ID Card Uploaded': u.idCardUrl ? 'YES' : 'NO',
      'ID Card Verified': u.idVerified ? 'YES' : 'NO',
      'Payment Status': u.paymentStatus || 'UNPAID',
      'UTR ID': u.payment?.utr || u.utrId || 'N/A',
      'Amount (INR)': u.payment?.amount || 0,
      'Gate Pass Status': u.gatePassStatus || 'NOT_ISSUED',
      'Gate Pass Token': isGateStaffOnly ? 'HIDDEN' : (u.gatePassToken || 'N/A'),
      'Attendance': isCheckedIn ? 'PRESENT' : 'ABSENT',
      'Checked In At': checkedInAtStr,
      'Account Created': regDateStr,
    };
  });

  const ws = XLSX.utils.json_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 20 }, // Samyak ID
    { wch: 25 }, // Full Name
    { wch: 22 }, // Roll No
    { wch: 28 }, // Email
    { wch: 16 }, // Phone
    { wch: 26 }, // College
    { wch: 20 }, // Branch
    { wch: 14 }, // Category
    { wch: 18 }, // Category Verified
    { wch: 16 }, // ID Card Uploaded
    { wch: 16 }, // ID Card Verified
    { wch: 16 }, // Payment Status
    { wch: 22 }, // UTR
    { wch: 12 }, // Amount
    { wch: 18 }, // Gate Pass Status
    { wch: 26 }, // Token
    { wch: 14 }, // Attendance
    { wch: 22 }, // Checked In At
    { wch: 16 }, // Created
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Total Users');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `SAMYAK_2026_Total_Users_${todayStr}.xlsx`;
  downloadWorkbook(wb, filename);

  await recordExportAudit({
    action: 'TOTAL_USERS_EXPORT',
    performedBy: adminUser?.email || adminUser?.uid || 'authorized_admin',
    role: adminRole,
    recordCount: users.length,
    filename,
    filterApplied: filterName
  });

  return { filename, count: users.length };
}
