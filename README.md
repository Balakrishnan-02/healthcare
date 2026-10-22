# RuralCare — Offline-First Medical Staff Portal (MERN)

A modern starter project for rural clinics where authorized medical staff can work during internet outages. It stores draft/queued records in the browser's IndexedDB and syncs them to MongoDB when a connection returns.

> **Important:** This is a development starter, not a certified clinical system. Do not use real patient data until you have completed a security, privacy, clinical-safety, backup, and legal review. Browser-local storage is not encrypted by default and can be lost if browser data is cleared or a device fails. Production offline health data needs managed devices, encryption at rest, access controls, audit trails, retention rules, and tested recovery.

## Included
- React + Vite + TypeScript UI with responsive dashboard
- Express + Node.js + MongoDB API
- JWT authentication and role checks (`admin`, `doctor`, `nurse`, `staff`)
- Admin-only Staff Management page to create accounts, view the staff directory, and activate/deactivate accounts
- IndexedDB local queue via Dexie
- Online sync queue with server-side idempotency key
- PWA manifest and service worker for app-shell caching
- Patient/visit list starter, offline status, sync status, and audit-log model
- Example environment files and setup instructions

## Architecture
- `client/`: React PWA. UI and queued records run in the browser.
- `server/`: Express REST API, authentication, validation, MongoDB models, sync endpoint.
- `client/src/db/localDb.ts`: IndexedDB tables. This is local to the browser profile/device, not a shared LAN database.
- `client/src/services/sync.ts`: sends queued records when the network is available.
- `server/src/routes/sync.ts`: verifies identity/role and stores queued records in MongoDB.

## Requirements
- Node.js 20+ (LTS recommended)
- npm
- MongoDB Community Server on the same clinic computer/network OR MongoDB Atlas when online
- Git (optional)

## Install and run

### 1. Install dependencies
Open two terminals from the project root:

```bash
cd server
cp .env.example .env
npm install
```

Edit `server/.env` and set a long random `JWT_SECRET`, `MONGODB_URI`, and bootstrap-admin values.

Then:

```bash
cd ../client
npm install
cp .env.example .env
```

### 2. Start MongoDB
If using a local MongoDB installation, start its service and use:
`mongodb://127.0.0.1:27017/ruralcare`

MongoDB on `127.0.0.1` is only reachable from that computer. For multiple clinic computers, configure a secured clinic LAN database server and firewall; do not expose MongoDB directly to the public internet.

### 3. Start the API
```bash
cd server
npm run dev
```
API: `http://localhost:4000`

On first run, the server creates a bootstrap admin if `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are configured. Change this password immediately and remove bootstrap credentials from the environment after setup.

### 4. Start the frontend
In another terminal:
```bash
cd client
npm run dev
```
Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

Sign in using the bootstrap admin credentials. Create real staff accounts through a production-ready admin workflow before deployment.

## Demo workflow
1. Sign in while connected to the API.
2. Add a patient record. The browser stores a local queued copy first.
3. If the internet/API is unavailable, records remain in IndexedDB and appear as “Waiting to sync”.
4. When connectivity returns, the app retries the queue and the server stores the record in MongoDB.
5. A record is marked synced only after the API confirms success.

Staff registration is restricted to signed-in administrators; public self-registration is intentionally not exposed. The starter only queues patient demographics and a note field as a demonstration. Expand with clinical review and validation before adding prescriptions, diagnosis, lab results, or treatment decisions.

## Security checklist before any real deployment
- Use HTTPS, secure headers, rate limiting, strong password policy, short-lived access tokens, refresh-token rotation, and server-side session revocation.
- Do not store JWTs in localStorage in a production medical application. This demo uses sessionStorage for simplicity; prefer secure HttpOnly cookies with CSRF protection.
- Encrypt device storage and backups; browser IndexedDB itself is not encrypted by this app.
- Add per-record authorization, facility scoping, audit event coverage, account lockout, MFA, and secure recovery.
- Add consent/legal basis, data minimization, retention/deletion, export, breach response, and applicable India DPDP Act / health-data requirements review.
- Test concurrent edits and conflict resolution. This starter uses idempotency keys to avoid duplicate creates, not full multi-user conflict resolution.
- Validate all fields server-side; use schema validation, malware-safe uploads, and dependency scanning.
- Back up MongoDB and test restore. Offline queued data is not a backup.
- Do not store emergency-only or life-critical instructions in a way that could be stale or mistaken for current clinical guidance.

## Production limitations
- “Internet connected” is not the same as “API reachable”. Sync retries on browser online events and app startup; add background sync and a visible manual retry for production.
- Local records are tied to one browser profile/device. They are not automatically shared among clinic computers.
- PWA shell caching is not equivalent to offline clinical-data security.
- No medical advice, diagnostic logic, prescriptions, or clinical decision support is implemented.
