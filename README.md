# SYP — Smart Goal Tracking & AI Coaching Platform

SYP is being built incrementally as a modular monolith. Milestone 1 provides a
FastAPI backend, React frontend, and a local PostgreSQL service.

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

Open <http://localhost:5173>. The page calls the versioned backend health
endpoint through Vite's development proxy.

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
