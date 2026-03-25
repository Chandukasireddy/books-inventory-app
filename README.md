# Bookshelf API — FastAPI + Supabase Postgres

A REST API to manage a personal book collection. This version uses **PostgreSQL** (Supabase-compatible), and is ready for deployment with **Render** (backend) + **Vercel** (Next.js UI).

## Stack

- Backend: FastAPI
- Database: PostgreSQL (Supabase)
- UI: Next.js
- API docs: Swagger (`/docs`) and ReDoc (`/redoc`)

## API Endpoints

```
GET     /books                  List books (filters: genre, author, read, limit)
POST    /books                  Create book
GET     /books/{book_id}        Get one book
PUT     /books/{book_id}        Update book (partial fields allowed)
PATCH   /books/{book_id}/read   Toggle read/unread
DELETE  /books/{book_id}        Delete book
GET     /stats                  Summary stats
```

## Local setup

### 1) Create and activate venv

```bash
python -m venv venv
venv\Scripts\activate
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) Set env vars

Windows PowerShell:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
$env:CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

### 4) Run API

```bash
uvicorn main:app --reload
```

Open:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

## Full deployment (free tiers)

## 1) Supabase (database)

1. Create a Supabase project.
2. Open **Project Settings → Database**.
3. Copy the **Connection string** (URI format).
4. Keep this value for `DATABASE_URL` in Render.

## 2) Render (FastAPI backend)

1. Push this repo to GitHub.
2. In Render: **New + → Web Service**.
3. Connect your repo.
4. Set:
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
  - `DATABASE_URL` = Supabase Postgres URI
  - `CORS_ORIGINS` = `https://<your-vercel-domain>`
6. Deploy and copy your backend URL (for example `https://books-api.onrender.com`).

## 3) Vercel (Next.js UI)

1. Import your Next.js repo in Vercel.
2. Add env var:
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend-url>`
3. Deploy.

In your UI code, call API like:

```ts
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const res = await fetch(`${apiBase}/books`);
```

## Notes

- Render free services may sleep when idle (first request can be slow).
- Supabase free tier has quotas; good for learning and demos.
- For production security, lock `CORS_ORIGINS` to your real frontend domain only.
