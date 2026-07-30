# Campus Grievance Redressal — Backend

> Next.js 14 App Router · Prisma 7 · SQLite (libsql) · JWT Auth · node-cron SLA Engine

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL to absolute path of your dev.db

# 3. Create & seed the database
npx prisma migrate dev --name init
cmd /c seed.cmd        # Windows seed runner

# 4. Start the server
npm run dev:next       # Next.js only (no cron)
# -- OR --
node server.js         # Next.js + SLA cron scheduler (recommended)
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@vitbhopal.ac.in` | `admin123` |
| Dept Admin | `deptadmin@vitbhopal.ac.in` | `admin123` |
| Staff (Ramesh) | `ramesh@vitbhopal.ac.in` | `staff123` |
| Student (Riya) | `21BCE0001@vitbhopal.ac.in` | `student123` |

> **⚡ Demo tip:** Ticket `GRV-2024-001003` (WiFi outage) has an already-breached SLA.
> Hit `GET /api/admin/escalation/trigger` (logged in as Super Admin) to fire live escalation.

---

## Environment Variables

```env
DATABASE_URL="file:C:/absolute/path/to/prisma/dev.db"
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAIL_DOMAIN=vitbhopal.ac.in
JWT_SECRET=your_secret
AUTH_SECRET=your_nextauth_secret
UPLOAD_DIR=public/uploads
SYSTEM_USER_ID=1
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Local email/password login → JWT |
| `POST` | `/api/auth/register` | None | Create account (STUDENT by default) |
| `GET` | `/api/auth/me` | Any | Current user info |
| `POST` | `/api/auth/me` | Any | Logout (clears cookie) |

### Tickets
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tickets` | Student+ | Create ticket (auto-assigns, sets SLA) |
| `GET` | `/api/tickets` | Student+ | List tickets (role-filtered) |
| `GET` | `/api/tickets/my` | Student | Own tickets with SLA countdown |
| `GET` | `/api/tickets/assigned` | Staff+ | Assigned queue sorted by SLA urgency |
| `GET` | `/api/tickets/:id` | Student+ | Full ticket detail + timeline |
| `PATCH` | `/api/tickets/:id/status` | Student+ | Update status (validated transitions) |
| `POST` | `/api/tickets/:id/reopen` | Student | Reopen within 48h grace window |
| `GET` | `/api/tickets/:id/timeline` | Student+ | Full immutable audit trail |
| `POST` | `/api/tickets/:id/attachments` | Student+ | Upload up to 3 files (5 MB each) |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Dept Admin+ | Kanban board, metrics, staff load |
| `POST` | `/api/admin/reassign/:id` | Dept Admin+ | Reassign ticket to different staff |
| `GET` | `/api/admin/categories` | Staff+ | List categories with SLA config |
| `POST` | `/api/admin/categories` | Super Admin | Create new category |
| `GET` | `/api/admin/users` | Dept Admin+ | List users by role |
| `PATCH` | `/api/admin/users/:id/role` | Super Admin | Promote/demote user role |
| `GET` | `/api/admin/super` | Super Admin | Cross-category heatmap + escalation feed |
| `GET` | `/api/admin/escalation/trigger` | Super Admin | Manual SLA escalation trigger (demo) |

### Other
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Any | In-app notifications with unread count |
| `PATCH` | `/api/notifications` | Any | Mark notifications as read |
| `GET` | `/api/health` | None | Health check |

---

## Status Workflow

```
OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
              ↘ ESCALATED ↗
                              ↘ REOPENED → IN_PROGRESS (within 48h)
```

Every transition is timestamped and logged in `TicketTimeline`. Nothing is ever deleted.

---

## SLA Config (per Priority)

| Priority | Ack Deadline | Resolve Deadline |
|---|---|---|
| CRITICAL | 2 hours | 24 hours |
| HIGH | 4 hours | 48 hours |
| MEDIUM | 24 hours | 5 days |
| LOW | 48 hours | 7 days |

SLA cron runs every 5 min via `node server.js`. On breach:
- Tier 1 → Dept Admin  
- Tier 2 → Super Admin  
Each escalation is logged in timeline + in-app notification fired.

---

## Project Structure

```
backend/
├── app/api/
│   ├── auth/           login, register, me
│   ├── tickets/        CRUD + my + assigned + [id]/(status|reopen|timeline|attachments)
│   ├── admin/          dashboard, reassign, categories, users, super, escalation/trigger
│   ├── notifications/
│   └── health/
├── lib/
│   ├── db.ts           Prisma client singleton (PrismaLibSql adapter)
│   ├── jwt.ts          Sign/verify JWT
│   ├── rbac.ts         withAuth HOF + role hierarchy
│   ├── escalation.ts   SLA checker (called by cron)
│   ├── assignment.ts   Round-robin least-loaded assignee
│   └── utils.ts        Ticket codes, SLA deadlines, status transitions
├── prisma/
│   ├── schema.prisma   Full data model
│   └── seed.ts         Demo data + pre-breached ticket for escalation demo
├── server.js           Custom server: Next.js + node-cron
├── prisma.config.ts    Prisma 7 config (libsql SQLite adapter)
└── .env                Environment variables
```
