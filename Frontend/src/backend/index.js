/**
 * SAMYAK 2026 — Backend Layer Unified Entry Point
 * 
 * Provides centralized access to all backend operations:
 * - Firebase Authentication & Roles (`auth`)
 * - Firestore Database & Transactions (`db`)
 * - Storage & Media Services (`storage`, `r2Storage`, `media`)
 * - Ticketing, Gate Pass & Verification (`gatePass`)
 * - Attendance & Event Registrations (`attendance`, `eventRegistration`)
 * - Backend Configuration (`paymentConfig`, `maintenanceConfig`)
 */

export * as db from './db';
export * as auth from './auth';
export * as services from './services';

// Direct utility re-exports for convenience
export * from './db';
export * from './auth';
export * from './services';

// Configuration
export { default as maintenanceConfig } from '../config/maintenanceConfig';
export { default as paymentConfig } from '../config/paymentConfig';
