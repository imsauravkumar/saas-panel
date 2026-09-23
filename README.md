# SAAS Nexus — Enterprise Workspace & Real-Time Collaboration Platform

A production-grade, full-stack MERN collaborative workspace platform designed for modern engineering teams. Unites granular Role-Based Access Control (RBAC), real-time channels with rich media and voice messages, interactive task Kanban workflows, automated Google Meet/Calendar sync, company announcements, and audit logging under a single governed administrative umbrella.

---

## 🏛️ System Architecture

```
                                  +-----------------------------+
                                  |   Web Browser (React 18)    |
                                  |   Vite + Lucide + Context   |
                                  +--------------+--------------+
                                                 |
                                 REST / JSON     |     WebSockets (Socket.io)
                                (Axios Client)   |    (Rooms, Typing, Read receipts)
                                                 v
                  +-------------------------------------------------------------+
                  |                 Express.js API Gateway (Node.js)            |
                  |  - Helmet & Security Headers       - Rate Limiters (IP/API) |
                  |  - Zod Request Validators          - JWT & RBAC Middleware  |
                  |  - Multer Secure File Processing   - Central Error Handler  |
                  +---------------+-----------------------------+---------------+
                                  |                             |
                                  v                             v
                   +---------------------------+   +----------------------------+
                   |    MongoDB / Mongoose     |   |   External Cloud Services  |
                   |  - Workspaces & Users     |   |  - Firebase Admin Auth     |
                   |  - Groups & Real-time Msg |   |  - Google Meet / Calendar  |
                   |  - Tasks & Milestones     |   |  - SMTP (Nodemailer)       |
                   |  - Audit Activity Logs    |   |                            |
                   +---------------------------+   +----------------------------+
```

---

## ✨ Core Platform Features & Deep Dive

### 1. 💬 Real-Time Team Channels & Messaging

- **WebSockets Powered**: Instant bidirectional messaging via Socket.io with live room management, user typing indicators, and read receipts.
- **Rich Media & Attachments**: Upload and preview documents (PDF, DOCX, ZIP) and high-resolution photo galleries with lightbox view.
- **Crystal-Clear Voice Notes**: Built-in in-browser audio recorder with animated waveform visualization and HTML5 playback.
- **Message Interactions**: Inline emoji reactions, message editing, message deletion, reply threading context, and message forwarding across channels.
- **Pinned Messages**: Pin essential discussions and specifications to the channel banner for quick team reference.

### 2. 🛡️ Granular Permissions & Role-Based Access Control (RBAC)

- **Centralized Admin Provisioning**: No chaotic open signups. Administrators provision verified employee accounts with designated role titles, departments, and channel assignments.
- **Channel Access Rules**: Toggle channel posting permissions between **"Everyone Can Chat"** for cross-functional collaboration and **"Admin Only"** for broadcast announcements.
- **First-Login Security Guard**: Team members provisioned with temporary credentials are automatically routed to a mandatory password reset screen before gaining access to workspace resources.
- **Backend Route Shield**: Dual-layer authorization validates JWT tokens, Firebase token claims, and database role attributes with strict rejection of deactivated accounts.

### 3. 📹 Google Meet & Calendar Integration

- **Direct Video Scheduling**: Schedule team syncs directly from any channel with automatic attendee assignment.
- **Automated Google Meet Generation**: Integrates with the Google Calendar API to generate real-time meeting links, with smart fallback generation when offline.
- **Instant vs. Scheduled Calls**: Launch immediate ad-hoc team huddles or schedule upcoming milestone reviews with automatic calendar notifications.

### 4. 📋 Interactive Kanban Workflows & Task Management

- **Visual Kanban Board**: Drag-and-drop workflow spanning **To Do**, **In Progress**, and **Completed** states.
- **Rich Metadata**: Assign tasks to multiple teammates, assign priority labels (`Low`, `Medium`, `High`, `Urgent`), set deadlines, and attach tasks to specific group channels.
- **Milestone Celebration**: Interactive particle confetti animations trigger upon task completion to boost team morale.

### 5. 📢 Organization & Department Announcements

- **Company-Wide & Channel Broadcasts**: Publish global executive notices or department-specific updates.
- **Sticky Pinning**: Critical notices remain pinned to the top of the announcements hub until acknowledged.
- **Real-Time Push Alerts**: Toast alerts and unread indicators notify team members instantly upon publication.

### 6. 🗄️ Centralized Files Hub & Audit Logging

- **Unified Media Library**: Browse, filter, search, and download all documents, photos, and voice notes shared across channels in one centralized hub.
- **Security Audit Logs**: Track all critical events (workspace creation, user provisioning, status toggles, password resets, channel deletions) with actor IP and timestamps.

### 7. 🌐 Marketing Landing Page & Public Showcase

- **Responsive Landing Page**: High-conversion landing page presenting features, interactive flat UI mockups, 4-step workflow timeline, comparison grid, and FAQ accordion.
- **Seamless Flow**: Sticky navigation with mobile hamburger menu and direct links into the unified workspace login and workspace setup screens.

---

## 🚀 Tech Stack

| Layer            | Technologies                                                                                                |
| :--------------- | :---------------------------------------------------------------------------------------------------------- |
| **Frontend**     | React 18, Vite, React Router v7, Lucide Icons, Canvas Confetti, Native CSS Design System                    |
| **Backend**      | Node.js (v18+), Express.js, Socket.io, Zod, Multer, Helmet, Express Rate Limit                              |
| **Database**     | MongoDB 6.0+ via Mongoose ODM (Indexes, Aggregation pipelines, Cascade hooks)                               |
| **Security**     | JWT Authentication, Firebase Admin SDK (Hybrid mode), Bcrypt password hashing, DOMPurify / Input sanitizers |
| **Integrations** | Google Calendar & Google Meet API (with auto-fallback link generator), Nodemailer SMTP                      |
| **Code Quality** | ESLint 9 (Flat config), Prettier, Jest, Supertest                                                           |

---

## 📋 Prerequisites

Ensure you have the following installed on your local development machine:

- **Node.js**: `v18.0.0` or higher ([Download](https://nodejs.org/))
- **npm**: `v9.0.0` or higher
- **MongoDB**: `v6.0` or higher (running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI)

---

## ⚡ 5-Minute Quick Start

### 1. Install Dependencies

Run the unified installer from the workspace root:

```bash
npm run install:all
```

_(Alternatively: `cd backend && npm install` followed by `cd ../frontend && npm install`)_

### 2. Configure Environment Variables

Copy the template configuration file:

```bash
cp backend/.env.example backend/.env
```

Ensure your `backend/.env` contains valid configurations:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/saas_nexus
JWT_SECRET=super_secret_jwt_key_saas_nexus_2026
CLIENT_URL=http://localhost:5173
```

### 3. Seed the Database

Populate your database with sample workspaces, admin and member accounts, demo channels, tasks, and announcements:

```bash
npm run seed
```

**Default Seed Credentials:**

- **Admin**: `admin@nexus.corp` / `Admin@12345`
- **User (Sarah)**: `sarah@nexus.corp` / `User@12345`
- **User (David)**: `david@nexus.corp` / `User@12345`

### 4. Start Development Servers

Start both backend API and Vite frontend dev server concurrently:

```bash
npm run dev
```

- **Marketing Landing Page**: [http://localhost:5173](http://localhost:5173)
- **Sign In / Create Workspace**: [http://localhost:5173/#login](http://localhost:5173/#login)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Environment Variables Reference

| Variable                | Required     | Default                                | Description                                              |
| :---------------------- | :----------- | :------------------------------------- | :------------------------------------------------------- |
| `PORT`                  | Optional     | `5000`                                 | Port for Express backend server                          |
| `NODE_ENV`              | Optional     | `development`                          | Environment mode (`development` / `production` / `test`) |
| `MONGO_URI`             | **Required** | `mongodb://127.0.0.1:27017/saas_nexus` | MongoDB connection string                                |
| `JWT_SECRET`            | **Required** | —                                      | High-entropy secret for signing session JWT tokens       |
| `CLIENT_URL`            | Optional     | `http://localhost:5173`                | Frontend URL allowed by CORS & Socket.io policies        |
| `FIREBASE_PROJECT_ID`   | Optional     | —                                      | Google Firebase project ID for token verification        |
| `FIREBASE_CLIENT_EMAIL` | Optional     | —                                      | Firebase service account client email                    |
| `FIREBASE_PRIVATE_KEY`  | Optional     | —                                      | Firebase service account RSA private key                 |
| `GOOGLE_CLIENT_ID`      | Optional     | —                                      | Google OAuth2 Client ID for Meet/Calendar sync           |
| `GOOGLE_CLIENT_SECRET`  | Optional     | —                                      | Google OAuth2 Client Secret                              |
| `GOOGLE_REFRESH_TOKEN`  | Optional     | —                                      | Google OAuth2 long-lived Refresh Token                   |
| `GOOGLE_CALENDAR_ID`    | Optional     | `primary`                              | Target Google Calendar ID for synchronized events        |
| `SMTP_HOST`             | Optional     | —                                      | SMTP mail host for email notification delivery           |
| `SMTP_PORT`             | Optional     | `587`                                  | SMTP port (e.g., `587` for STARTTLS, `465` for SSL)      |
| `SMTP_USER`             | Optional     | —                                      | SMTP username / address                                  |
| `SMTP_PASS`             | Optional     | —                                      | SMTP password or Google App Password                     |
| `SMTP_FROM`             | Optional     | —                                      | Header sender formatted string                           |

---

## 🛠️ Available Scripts

### Root Workspace Scripts

| Command                | Description                                                |
| :--------------------- | :--------------------------------------------------------- |
| `npm run dev`          | Runs backend and frontend concurrently via `concurrently`  |
| `npm run dev:backend`  | Starts Express backend with `nodemon` live-reload          |
| `npm run dev:frontend` | Starts Vite frontend dev server on port 5173               |
| `npm run lint`         | Runs ESLint 9 across all backend and frontend JS/JSX files |
| `npm run format`       | Formats all source files with Prettier                     |
| `npm run format:check` | Verifies code formatting compliance with `.prettierrc`     |
| `npm run test`         | Executes Jest integration, unit, and socket test suites    |
| `npm run seed`         | Seeds database with clean demo data                        |

### Backend Scripts (`backend/`)

| Command        | Description                                                         |
| :------------- | :------------------------------------------------------------------ |
| `npm run dev`  | Start backend with nodemon                                          |
| `npm start`    | Start backend in production mode                                    |
| `npm test`     | Run Jest test suite (`--runInBand --detectOpenHandles --forceExit`) |
| `npm run seed` | Seed database with initial dataset                                  |

### Frontend Scripts (`frontend/`)

| Command           | Description                                    |
| :---------------- | :--------------------------------------------- |
| `npm run dev`     | Start Vite development server                  |
| `npm run build`   | Produce optimized production bundle in `dist/` |
| `npm run preview` | Preview production build locally               |

---

## 🧪 Testing & Code Quality

### Running Tests

Execute the full automated test suite (9 test suites covering RBAC, Zod schemas, socket concurrency, and CRUD APIs):

```bash
cd backend && npm test
```

### Static Analysis & Linting

Enforce zero-warning code standard:

```bash
npm run lint
```

### Code Formatting

Ensure uniform 2-space indentation and single-quote styling:

```bash
npm run format
```

---

## 💡 Known Caveats & Development Notes

1. **Local Media Upload Storage**: In local development (`NODE_ENV=development`), uploaded documents, photos, and voice notes are stored on the local filesystem under `backend/uploads/`. In production, this can be seamlessly configured with AWS S3 or Google Cloud Storage.
2. **Google Meet Fallback**: If Google API credentials are not set in `.env`, the system automatically falls back to generating standard compliant Google Meet URLs (`https://meet.google.com/xxx-yyyy-zzz`), ensuring uninterrupted meeting scheduling functionality.
3. **Hybrid Authentication**: Supports standard JWT authentication alongside optional Firebase Authentication tokens. When Firebase credentials are not provided, dev JWT authentication executes seamlessly.
4. **Socket Connection Fallback**: Socket.io is configured with `websocket` and HTTP long-polling fallbacks for resilience across restrictive firewalls and proxy configurations.
