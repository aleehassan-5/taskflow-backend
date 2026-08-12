# TaskFlow — Backend

Express + Prisma + PostgreSQL API for **TaskFlow**, a task manager built for a 2-person team. JWT
auth, full task CRUD with status transitions, completion tracking, activity history, and
notifications.

Frontend repo: [taskflow-frontend](https://github.com/aleehassan-5/taskflow-frontend)

## Tech Stack

- **Runtime:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (access token)

## Data Model

| Model | Purpose |
|---|---|
| `User` | Team member — name, email, password hash, role (Admin/Member) |
| `Task` | Title, description, status, due date, assignee, creator |
| `TaskHistory` | Audit trail of status/field changes on a task |
| `Notification` | In-app notifications (assignment, due date, etc.) |

## API Routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `/api/auth` | Login, session |
| `/api/tasks` | Full task CRUD, status changes, completion, history |
| `/api/users` | Team member list/management |
| `/api/notifications` | In-app notifications |

## Getting Started

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow?schema=public"
JWT_SECRET="change-this-to-a-long-random-string"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

No local Postgres? Quickest option is Docker:

```bash
docker run --name taskflow-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=taskflow -p 5432:5432 -d postgres
```

Then:

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

API runs at `http://localhost:4000`.

### Seeded accounts

| Name | Email | Password | Role |
|---|---|---|---|
| Ali | ali@taskflow.dev | password123 | Admin |
| Arooj | arooj@taskflow.dev | password123 | Member |

> Change these before using this anywhere beyond local dev/demo.

## Scripts

```bash
npm run dev              # ts-node-dev, auto-restart
npm run build             # compile to dist/
npm start                 # run compiled build
npm run typecheck          # tsc --noEmit
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Production Build

```bash
npm run build
npm start
```

## Status

Typechecks clean (`tsc --noEmit`). Requires a real PostgreSQL connection to run — no external
integrations beyond the database.
