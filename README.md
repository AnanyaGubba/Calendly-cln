# Calendly Clone

A full-stack Calendly-inspired scheduling platform 

## Stack

- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy
- Database: MySQL-ready schema via SQLAlchemy
- Local fallback DB: SQLite when `DATABASE_URL` is not set
- Deployment: Single-link deployment on Render, with FastAPI serving the built React app

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
├── backend
│   ├── app
│   ├── requirements.txt
│   └── .env.example
├── frontend
│   ├── src
│   ├── package.json
│   └── .env.example
└── netlify.toml
```

## Local Setup

### 1. Backend

```powershell
cd backend
copy .env.example .env
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

### 2. Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## MySQL Configuration

The schema is designed to run on MySQL using SQLAlchemy with `PyMySQL`.

Example:

```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/calendly_clone
```

For local zero-setup demos, the backend falls back to SQLite. This keeps the assessment easy to run while preserving a MySQL-compatible schema and relationships.

## API Overview

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

## Single-Link Deployment On Render

This repo is configured so FastAPI serves the production React build. That means you can deploy one web service and submit one URL.

### Recommended setup

1. Push the repo to GitHub.
2. Create a new `Web Service` on Render from this repo.
3. Render will detect `render.yaml`, or you can set the same values manually:
   - Build command:

   ```bash
   cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
   ```

   - Start command:

   ```bash
   cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. Add a managed MySQL database on Render or use an external MySQL provider.
5. Set environment variables:
   - `APP_NAME=Calendly Clone API`
   - `FRONTEND_URL=https://your-render-app.onrender.com`
   - `DEFAULT_TIMEZONE=Asia/Kolkata`
   - `DATABASE_URL=mysql+pymysql://...`

### Important

- In production, `VITE_API_URL` is not needed because the frontend calls the same origin.
- For local development, `frontend/.env` should still point to `http://127.0.0.1:8000`.
- If you want a zero-setup demo locally, SQLite still works. For submission, use MySQL because the assignment asks for it.

## Assumptions

- No authentication is required; the app uses a seeded default admin user.
- The admin-side pages are intentionally modeled after Calendly’s layout patterns from the original website.
- Email and SMS workflow pages are represented visually and structurally, but real third-party delivery integrations are mocked.
- Rescheduling support is partially modeled in the schema and API through status handling and seeded examples, while the main mandatory user flow focuses on booking and cancellation.

