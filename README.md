# SYP — Smart Goal Tracking & AI Coaching Platform

SYP is being built incrementally as a modular monolith. The deterministic
Progress Engine remains the source of truth, while the application now also has
production-oriented health checks, structured request logging, container
images, and continuous integration.

## Prerequisites

- Python 3.12 or newer
- Node.js 22 or newer
- Docker Desktop (for PostgreSQL)

## Local setup

Copy `.env.example` to `.env`, then start PostgreSQL:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
```

Set up and run the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,ai]"
fastapi dev src/syp/main.py
```

In another terminal, set up and run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173/register>. Create an account with a password of at
least 8 characters. After registration, the protected dashboard shows the
authenticated user. Sign out, then use <http://localhost:5173/login> to sign in
again.

Open <http://localhost:5173/plans> after signing in. Create a draft personal
plan, open it from the list, edit its details, and exercise its valid lifecycle
actions: activate, pause/resume, complete, and archive. Archived plans are
read-only.

Inside an editable plan, add activities such as “Listening: 30 minutes every
day,” “Reading: 20 pages on Monday, Wednesday, and Friday,” or “Writing: 3
essays per week.” Changing a target or schedule creates a new effective-dated
expectation rather than rewriting earlier history.

Activate a plan to record actual effort from its activity cards. Multiple
entries on the same date are preserved, recent entries can be corrected, and
removal is implemented as recoverable soft deletion. The participant's IANA
timezone determines whether a performed date is in the future; exact submission
timestamps remain in UTC.

The plan screen now offers Today, This week, and custom date-range reports.
Each activity exposes expected and actual quantities, uncapped attainment,
capped adherence, and completed, partial, missed, and upcoming occurrence
counts. Overall adherence averages activity-level adherence so incompatible
units are never added together.

Coach accounts can create reusable plan templates, add measurable activities,
and invite an existing participant by email. The invitation must be accepted
before an independent draft plan is created. The participant's plan is a
snapshot: later edits to the reusable template do not silently rewrite it.
Participants can accept or reject invitations from the coaching workspace.

After acceptance, the assigning coach can review that participant plan's
deterministic progress report and leave written feedback. This access is scoped
to the accepted assignment; a coach cannot inspect unrelated participants.
Participants see feedback inside their own plan without granting coaches edit
access to progress records.

The optional AI progress coach uses the OpenAI Agents SDK with five controlled,
read-only tools for plan overview, progress reports, recent records, weekly
summaries, and weak areas. It requires explicit per-request consent, enforces a
daily usage limit, and records run/tool metadata without storing the question or
answer. The rest of SYP remains available when AI is disabled or unavailable.

The API uses a short-lived JWT access token in React memory and a rotating,
opaque refresh token in an HttpOnly cookie. Only a hash of each refresh token is
stored in PostgreSQL. Change `SYP_AUTH_SECRET_KEY` to a strong private value
outside local development.

## Database migrations

From the `backend` directory with the virtual environment active:

```powershell
alembic upgrade head
alembic current
```

Integration tests use a separate, temporary PostgreSQL service:

```powershell
docker compose --profile test up -d postgres-test
cd backend
pytest
```

## Run the complete container stack

For a production-like local run, build and start PostgreSQL, the migration job,
the API, and the web server together:

```powershell
docker compose --profile app up --build -d
docker compose --profile app ps
```

Open <http://localhost:5173>. The API liveness endpoint is
<http://localhost:8000/api/v1/health>; the readiness endpoint at
<http://localhost:8000/api/v1/ready> also verifies PostgreSQL connectivity.

```powershell
docker compose --profile app logs backend
docker compose --profile app down
```

The one-shot `migrate` service applies Alembic migrations before the API starts.
This avoids several API replicas attempting to migrate the same database.
Request logs are JSON and every response includes an `X-Request-ID` that can be
used to trace a request through logs.

Before a real production deployment, set `SYP_ENVIRONMENT=production`, use a
private `SYP_AUTH_SECRET_KEY`, use strong PostgreSQL credentials, configure
HTTPS at the hosting edge, and store secrets in the hosting platform rather
than committing them. Production startup intentionally fails if the development
authentication secret is still configured.

## Continuous integration

GitHub Actions runs backend linting and tests against PostgreSQL, frontend tests
and linting, both production builds, and both Docker image builds for pushes to
`main` and for pull requests.

## Verification

```powershell
cd backend
pytest
ruff check .
```

```powershell
cd frontend
npm test -- --run
npm run lint
npm run build
```
