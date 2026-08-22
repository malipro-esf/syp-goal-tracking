# SYP — Smart Goal Tracking & AI Coaching Platform

SYP is being built incrementally as a modular monolith. The current milestone
adds secure registration, login, session refresh, logout, roles, and a protected
React dashboard to the FastAPI and PostgreSQL foundation.

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
python -m pip install -e ".[dev]"
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
