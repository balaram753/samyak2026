# SAMYAK 2026 — Backend Repository

This folder houses the backend architecture, security rules, data access services, and administrative scripts for SAMYAK 2026.

---

## 📁 Directory Structure

```text
Backend/
├── firestore.rules       # Hardened Firestore security rules (Role-based access)
├── storage.rules         # Cloud Storage security rules (MIME & size limits)
├── firebase.json         # Firebase deployment config for rules
├── .firebaserc           # Firebase project alias
├── verify_payment_qr.mjs # Offline payment verification script
├── package.json          # Backend script dependencies
├── services/             # Core Backend cloud integration services
│   ├── firebase.js       # Multi-provider Auth (Google & Microsoft 365) + Firestore
│   ├── gatePassService.js # Gate pass token generation & QR verification
│   ├── attendanceService.js # Atomic attendance logging & audit trails
│   ├── registrationService.js # Student profile registration
│   ├── eventRegistrationService.js # Event rosters & slot management
│   ├── mediaService.js   # Cloudflare R2 media gallery service
│   ├── r2Storage.js      # Direct S3-compatible R2 upload helper
│   ├── imgbb.js          # ImgBB image hosting API
│   ├── fileSecurityService.js # MIME validation & data masking
│   ├── integrityGuard.js # System signature verification
│   ├── storageService.js # Secure Firebase storage upload
│   └── launchAudio.js    # Audio manager
└── config/
    ├── maintenanceConfig.js
    └── paymentConfig.js
```

---

## 🔒 Security Architecture

1. **Role-Based Access Control**:
   - `admins/{adminId}`: Restricted to authenticated administrators.
   - `payments/{paymentId}`: Read/write protected; payment status verified against fraud.
   - `attendanceAudit/{auditId}`: Immutable, append-only log.
2. **Multi-Tenant Authentication**:
   - Google Auth for external participants and system admins.
   - Microsoft 365 OAuth with tenant filtering for KL University students (`@kluniversity.in`).

---

## 🚀 Deployment Commands

Deploy security rules to Firebase:
```bash
firebase deploy --only firestore:rules,storage
```

Run QR Verification Script:
```bash
node verify_payment_qr.mjs
```
