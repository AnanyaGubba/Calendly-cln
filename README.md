# Calendly Clone (Calendly-cln)

A full‑stack Calendly‑inspired scheduling platform.

This README is an end‑to‑end guide: **project structure → local development → configuration → deployment (Render) → troubleshooting**.

---

## Table of Contents

- [Demo / URLs](#demo--urls)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Run Locally (Development)](#run-locally-development)
  - [1) Backend (FastAPI)](#1-backend-fastapi)
  - [2) Frontend (Vite)](#2-frontend-vite)
  - [Common Local URLs](#common-local-urls)
- [API Overview (Key Routes)](#api-overview-key-routes)
- [Build for Production](#build-for-production)
- [Deploy to Render (Single Web Service)](#deploy-to-render-single-web-service)
  - [Render Build Command](#render-build-command)
  - [Render Start Command](#render-start-command)
  - [Render Environment Variables](#render-environment-variables)
- [Assumptions](#assumptions)
- [Troubleshooting](#troubleshooting)

---

## Demo / URLs

- **Frontend (local dev):** `http://127.0.0.1:5173` (or the port Vite picks)
- **Backend (local dev):** `http://127.0.0.1:8000`

> In production on Render, FastAPI serves the built frontend from the **same origin**, so you typically deploy **one URL**.

---

## Tech Stack

- **Frontend:** React + Vite (Node/npm)
- **Backend:** FastAPI + Uvicorn (Python)
- **DB access:** SQL
- **Database:**
  - Designed for **MySQL** (production-ready schema)
  - Supports **SQLite fallback** for quick local demos
- **Deployment:** Render (single web service; FastAPI serves frontend build)

---

## Implemented Features

- Event type management with create, edit, delete, custom slug, duration, location, and buffers
- Weekly availability management with timezone support
- Date-specific availability overrides
- Public booking page with calendar view, available time slots, invitee form, and booking confirmation
- Double-booking prevention using live slot generation against existing meetings
- Meetings page with upcoming/past separation and cancellation flow
- Seeded sample event types, meetings, contacts, workflows, integrations, analytics, and admin data
- Calendly-style admin shell with Scheduling, Meetings, Availability, Contacts, Workflows, Integrations, Analytics, and Admin Center views
- Responsive layouts for desktop, tablet, and mobile


## Project Structure

```text
.
├── README.md                        # Main end-to-end documentation (this file)
├── render.yaml                      # Render deployment blueprint (build/start commands + env vars)
├── netlify.toml                     # Netlify config (present in repo; not used for the Render flow)
│
├── backend/                         # FastAPI backend (API + serves frontend build in production)
│   ├── .env                         # Local backend env file (do not commit secrets)
│   ├── .env.example                 # Sample backend env vars
│   ├── requirements.txt             # Python dependencies
│   ├── calendly_clone.db            # SQLite DB file used for local/demo mode
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                  # FastAPI app entrypoint (uvicorn app.main:app)
│       ├── db.py                    # Database engine/session setup
│       ├── models.py                # SQLAlchemy models (schema/entities)
│       ├── schemas.py               # Pydantic schemas (request/response DTOs)
│       ├── services.py              # Business logic (slot generation, booking rules, etc.)
│       ├── seed.py                  # Seed/demo data loader
│       ├── routes_admin.py          # Admin APIs (dashboard, event types, availability, meetings, etc.)
│       ├── routes_public.py         # Public booking APIs (public page, slots, booking, confirmations)
│       │
│       └── core/
│           └── config.py            # Central config (loads env vars, defaults like timezone)
│
└── frontend/                        # React + Vite frontend (UI)
    ├── .env                         # Local frontend env vars (e.g., VITE_API_URL for dev)
    ├── .env.example                 # Sample frontend env vars
    ├── .gitignore
    ├── index.html                   # Vite HTML entry
    ├── vite.config.js               # Vite configuration
    ├── eslint.config.js             # ESLint config
    ├── package.json                 # Frontend dependencies + scripts
    ├── package-lock.json            # Locked dependency tree
    ├── README.md                    # Default Vite template readme (can be removed/trimmed if desired)
    │
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    │
    └── src/
        ├── main.jsx                 # React entrypoint (mounts <App />)
        ├── App.jsx                  # Main app UI / routing / pages composition
        ├── App.css
        ├── index.css
        │
        ├── assets/                  # Images/SVGs used by the UI
        │   ├── hero.png
        │   ├── react.svg
        │   └── vite.svg
        │
        ├── components/              # Reusable UI components
        │   ├── AdminLayout.jsx
        │   └── EventTypeModal.jsx
        │
        └── lib/                     # Frontend helper utilities
            ├── api.js               # API client (calls backend; reads VITE_API_URL in dev)
            └── format.js            # Formatting helpers (dates/times, etc.)
```

---

## Prerequisites

- **Python 3** (recommended: latest 3.x)
- **Node.js + npm**
- (Optional) **MySQL** if you want to run with MySQL locally

---

## Environment Variables

### Backend (`backend/.env`)


powershell
cd backend
copy .env.example .env
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn app.main:app --reload

Create `backend/.env` from `backend/.env.example`.

#### SQLite (easy local run)
If your `.env` was pointing to MySQL and the API crashed on startup, switch it to SQLite:

```env
DATABASE_URL=sqlite:///./calendly_clone.db
```

#### MySQL 

```env
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:3306/calendly_clone
```
The backend runs at
```env
 http://127.0.0.1:8000.
```

### Frontend (`frontend/.env`)

The frontend runs at 
``` env
http://localhost:5173.
```

## MySQL Configuration

The schema is designed to run on MySQL using SQLAlchemy with PyMySQL.

Example:

```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/calendly_clone
```


Create `frontend/.env` from `frontend/.env.example`.

- For **local development**, point the frontend to the backend:

```env
VITE_API_URL=http://127.0.0.1:8000
```

- In **production (Render single-service setup)**, you typically **do not** need `VITE_API_URL` because frontend and backend share the same origin.

---

## Run Locally (Development)

Run backend and frontend in **two terminals**.

### 1) Backend (FastAPI)

```powershell
cd backend
copy .env.example .env

# create venv if needed
python -m venv venv

# activate venv (Windows)
.\venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

You should see something like:

- `Uvicorn running on http://127.0.0.1:8000`

### 2) Frontend (Vite)

```powershell
cd frontend
copy .env.example .env

npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

> Note: if port `5173` is in use, Vite will automatically try another port (for example `5174`).

### Common Local URLs

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`

---

## API Overview (Key Routes)

Examples of commonly used endpoints:

- `GET /api/admin/dashboard`
- `GET/POST/PUT/DELETE /api/admin/event-types`
- `GET/PUT /api/admin/availability`
- `GET /api/admin/meetings`
- `POST /api/admin/meetings/{id}/cancel`
- `POST /api/admin/workflows`
- `GET /api/public/{slug}`
- `GET /api/public/{slug}/slots?date=YYYY-MM-DD`
- `POST /api/public/{slug}/book`
- `GET /api/public/confirmations/{code}`

---

## Build for Production

To create the frontend production build:

```bash
cd frontend
npm install
npm run build
```

This generates a static build that the backend can serve in production.

---

## Deploy to Render (Single Web Service)

This repo can be deployed as **one Render Web Service** where:

- Render builds the frontend
- Installs backend dependencies
- Starts Uvicorn
- FastAPI serves both the API and the built frontend

### Render Build Command

Use the build command:

```bash
cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
```

### Render Start Command

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Render Environment Variables

Set at least:

- `DATABASE_URL` 

Optional (if your backend uses them):

- `APP_NAME=Calendly Clone API`
- `FRONTEND_URL=http://localhost:5173`
- `DEFAULT_TIMEZONE=Asia/Kolkata`
- `DATABASE_URL=sqlite:///./calendly_clone.db`


Also ensure:

- **Branch:** `main`
- **Language:** Python 3
- **Root Directory:** leave blank (unless you intentionally deploy from a subfolder)

---

## Assumptions

- App may ship with seeded/demo admin data (no full auth flow required for evaluation).
- Email/SMS workflow pages are represented structurally; third‑party integrations may be mocked.
- For a quick local run, SQLite is acceptable; for production-like behavior, prefer MySQL.
- No authentication is required; the app uses a seeded default admin user.
- The admin-side pages are intentionally modeled after Calendly’s layout patterns from the original website.
- Email and SMS workflow pages are represented visually and structurally, but real third-party delivery integrations are mocked.
- Rescheduling support is partially modeled in the schema and API through status handling and seeded examples, while the main mandatory user flow focuses on booking and cancellation.

---

## Troubleshooting

### "Failed to fetch" in the UI

- Ensure the backend is running: `http://127.0.0.1:8000`
- Ensure `frontend/.env` has the correct `VITE_API_URL` for local dev.

### Backend crashes on startup (DB connection)

- Check `backend/.env`.
- If it was pointing to MySQL but you don’t have MySQL running locally, use:

```env
DATABASE_URL=sqlite:///./calendly_clone.db
```

### Port already in use (Vite)

- Stop the process using the port, or let Vite pick another port and open the URL it prints.

---

