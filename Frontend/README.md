# SAMYAK 2026 — Frontend Application

This folder contains the complete, modern React 19 + Vite 8 frontend interface for SAMYAK 2026, powered by the hardened Firebase and cloud backend services.

---

## 🚀 Quick Start

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview build:
```bash
npm run preview
```

---

## 📁 Directory Structure

```text
Frontend/
├── public/                 # Static public assets, fonts, icons
├── src/
│   ├── components/         # UI components & interactive widgets
│   ├── pages/              # Public routes & administrative dashboards
│   ├── services/           # Backend cloud services (Firebase, R2, GatePass, etc.)
│   ├── backend/            # Backend barrel export helper (@backend)
│   ├── context/            # React state providers (Auth, Content, Theme)
│   ├── data/               # Data schemas & local state
│   ├── config/             # Maintenance & payment settings
│   ├── App.jsx             # Main router & application controller
│   ├── index.css           # Global Tailwind CSS styles
│   └── main.jsx            # Application mount & system attribution
├── .env                    # Cloud credentials & API keys
├── package.json            # Frontend dependencies
├── vite.config.js          # Vite build config with path aliases
└── jsconfig.json           # IDE path mappings
```

---

## 🔌 Path Aliases Available

- `@/*` -> `src/*`
- `@backend` -> `src/backend/index.js`
- `@services/*` -> `src/services/*`
- `@components/*` -> `src/components/*`
- `@pages/*` -> `src/pages/*`
