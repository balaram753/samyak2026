# SAMYAK 2026 — Backend Architecture

This directory provides the unified data, services, and authentication backend layer for the SAMYAK 2026 fest application.

## 🏗️ Architecture Overview

The backend uses a high-performance **Serverless BaaS (Backend-as-a-Service)** architecture powered by:
- **Firebase Authentication**: Multi-provider authentication supporting Google Auth (external participants) and Microsoft 365 OAuth (`@kluniversity.in` internal students).
- **Cloud Firestore**: High-concurrency NoSQL database backed by security rules (`firestore.rules`) and atomic transactions.
- **Cloudflare R2 + D1 (via the SAMYAK Worker)**: all files (R2) and site content (D1). Firebase is used only for auth, admin access and student registrations.
- **Firebase Cloud Storage**: Secure storage for transactional proof uploads and system assets.

## 📁 Layer Structure

```text
src/backend/
├── index.js          # Unified entry point (@backend)
├── db.js             # Firestore client, collection references, transactional primitives
├── auth.js           # Multi-provider Auth, session handling, superadmin allowlists
├── services.js       # Aggregator of all operational cloud services
└── README.md         # This architecture reference
```

## 🔌 Using the Backend Layer

You can import backend services cleanly using the `@backend` alias:

```javascript
// Database and Firestore helpers
import { db, collection, query, where, getDocs } from '@backend';

// Authentication and Current User
import { auth, useUser, useAdminAuth } from '@backend';

// Services
import { gatePass, attendance, media, r2Storage } from '@backend';

// Or direct imports
import { verifyGatePass } from '@backend';
```

## 🔒 Security & Firestore Rules
All collections are protected by server-enforced rules defined in `firestore.rules`.
- `admins/{adminId}`: Restricted to authenticated administrators.
- `payments/{paymentId}`: Read/write protected; status validation enforced.
- `student_registrations/{regId}`: Student registrations and gate pass statuses.
- `attendanceAudit/{auditId}`: Immutable, append-only logs for campus entry/attendance.
