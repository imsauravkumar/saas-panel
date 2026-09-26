# SAAS Nexus — Team Workspace & Collaboration Platform

Welcome to **SAAS Nexus**! It is an all-in-one internal workspace app built for modern teams. Think of it like Slack, but with built-in task management, Google Meet video sync, company announcements, and centralized admin controls.

---

## What is SAAS Nexus?

Most teams juggle three or four different tools every day — one for chat, one for tasks, another for meetings, and email for company updates. SAAS Nexus brings all of that into one fast, clean, and organized place.

- **Group Channels & Direct Messages**: Real-time team chat with text, photo galleries, file attachments, emojis, and voice notes.
- **Admin-Governed Workspaces**: Admins create the workspace, invite team members with specific roles, and manage channel permissions.
- **Kanban Task Boards**: Track who is working on what with simple To Do, In Progress, and Completed stages.
- **Video Meetings**: Jump into instant video calls or schedule team syncs with Google Meet links.
- **Company Announcements**: Share important company or department news that stays pinned to the top.
- **Files Hub**: Find all shared documents, photos, and voice notes across your workspace in one central place.
- **Marketing Landing Page**: A clean, responsive public-facing page showcasing the product to visitors.

---

## Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Plain CSS (custom design system, light/dark themes).
- **Backend**: Node.js, Express.js, Socket.io (for real-time messaging).
- **Database**: MongoDB with Mongoose.
- **Security**: JWT authentication, bcrypt password hashing, role-based access control (Admin / Member).
- **Integrations**: Google Meet / Google Calendar API (with automatic fallback links), Nodemailer for emails.

---

## Getting Started

### 1. Prerequisites

Make sure you have installed on your computer:

- [Node.js](https://nodejs.org/) (version 18 or newer)
- [MongoDB](https://www.mongodb.com/) (running locally on port 27017, or a MongoDB Atlas connection string)

### 2. Install Dependencies

Run this command in the project root to install everything for both backend and frontend:

```bash
npm run install:all
```

### 3. Setup Your Environment (.env)

Create a `.env` file in the `backend/` folder:

```bash
cp backend/.env.example backend/.env
```

Here are the basic settings you need in `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/saas_nexus
JWT_SECRET=super_secret_jwt_key_saas_nexus_2026
CLIENT_URL=http://localhost:5173
```

_(Optional Google Meet, Firebase, and SMTP mail settings can be added if you want live Google Calendar or email notifications, but they are not required to run the app)._

### 4. Load Demo Data (Seed)

Populate your database with a sample workspace, demo channels, tasks, and test user accounts:

```bash
npm run seed
```

#### Demo Logins:

- **Admin Account**: `admin@nexus.corp` / `Admin@12345`
- **Member Account**: `sarah@nexus.corp` / `User@12345`
- **Member Account**: `david@nexus.corp` / `User@12345`

### 5. Run the Project

Start both the backend and frontend at the same time:

```bash
npm run dev
```

Open your browser and visit:

- **Landing Page**: [http://localhost:5173](http://localhost:5173)
- **Login Screen**: [http://localhost:5173/#login](http://localhost:5173/#login)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## How It Works

### 1. Admin Workspace Setup

The Admin sets up the company workspace, creates employee accounts, and assigns people to channels (like `#general`, `#engineering`, `#marketing`).

When a newly invited teammate logs in for the first time with their temporary password, they are prompted to set their own private password.

### 2. Real-Time Chat & Channels

- Chat instantly in channels or direct 1-on-1 messages.
- Channels can be open for everyone to talk, or set to "Admin Only" for announcements.
- Send voice notes, record audio straight from your browser, share images with photo preview, or upload PDF and ZIP files.
- React to messages with emojis, reply in threads, edit or delete your messages, and pin important messages.

### 3. Task Management (To-Do & Kanban)

- Create tasks, assign them to team members, set due dates, and tag priority (`Low`, `Medium`, `High`, `Urgent`).
- Move tasks across stages: **To Do** → **In Progress** → **Completed**.
- Switch between Kanban cards and a clean table list view.
- Tasks show clear due dates and highlight overdue items in red.

### 4. Meetings & Video Calls

- Schedule upcoming meetings with team members or jump on an instant video call.
- Generates Google Meet links automatically so everyone can join with a single click.

### 5. Announcements & Files Hub

- Post important updates across the whole company.
- Access every file, document, image, or voice recording ever shared in your workspace from the Files Hub.

---

## Helpful Commands

| Command          | What it does                                                      |
| :--------------- | :---------------------------------------------------------------- |
| `npm run dev`    | Starts both backend (port 5000) and frontend (port 5173) together |
| `npm run seed`   | Resets and populates the database with sample demo data           |
| `npm run lint`   | Runs ESLint to check for any code errors                          |
| `npm run format` | Formats all code cleanly using Prettier                           |
| `npm run test`   | Runs backend tests (unit, integration, and socket tests)          |

---

## Folder Structure

```
SAAS_2/
├── backend/                # Express.js REST API & Socket.io server
│   ├── src/
│   │   ├── controllers/    # API endpoint logic (auth, groups, tasks, meetings, etc.)
│   │   ├── models/         # Mongoose schemas (User, Group, Message, Task, etc.)
│   │   ├── routes/         # Express routes & RBAC middleware
│   │   ├── sockets/        # Real-time chat & typing event handlers
│   │   ├── services/       # Google Meet, email, and file upload handlers
│   │   └── server.js       # App entry point
│   ├── tests/              # Jest automated tests
│   └── .env.example        # Environment variables template
│
├── frontend/               # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/     # Modals, TopBar, Sidebar, VoiceRecorder, etc.
│   │   ├── context/        # Auth, Socket, and Toast notification state
│   │   ├── pages/
│   │   │   ├── admin/      # Admin dashboard, user management, tasks, channels
│   │   │   ├── user/       # User dashboard, personal tasks, meetings
│   │   │   ├── shared/     # Group chat, files library, settings
│   │   │   ├── auth/       # Login, sign up, password reset
│   │   │   └── marketing/  # Marketing landing page
│   │   └── styles/         # CSS design tokens & responsive styling
│   └── index.html          # HTML entry point with SEO & meta tags
│
└── README.md               # Project documentation
```

---

## License

This project is built for internal team collaboration and is open for custom extension and deployment. Enjoy building with SAAS Nexus!

<!-- Test note: confirms the GitHub connection used by Claude Code sessions. Safe to remove. -->
