/**
 * SAMYAK 2026 — Backend Services Hub
 * Aggregates all cloud, data, and security services into a centralized backend registry.
 */

import * as attendance from '../services/attendanceService';
import * as eventRegistration from '../services/eventRegistrationService';
import * as fileSecurity from '../services/fileSecurityService';
import * as gatePass from '../services/gatePassService';
import * as media from '../services/mediaService';
import * as r2Storage from '../services/r2Storage';
import * as registration from '../services/registrationService';
import * as storage from '../services/storageService';

export {
  attendance,
  eventRegistration,
  fileSecurity,
  gatePass,
  media,
  r2Storage,
  registration,
  storage
};

export * from '../services/attendanceService';
export * from '../services/eventRegistrationService';
export * from '../services/fileSecurityService';
export * from '../services/gatePassService';
export * from '../services/mediaService';
export * from '../services/r2Storage';
export * from '../services/registrationService';
export * from '../services/storageService';
