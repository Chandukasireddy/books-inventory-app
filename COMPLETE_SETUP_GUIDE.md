# 📚 Complete Book Inventory App Setup Guide
## Full Stack Deployment with Next.js, FastAPI, PostgreSQL, Vercel & Render

**Last Updated:** March 25, 2026  
**Project:** Books Inventory Management Application  
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Interview: FastAPI Backend Pseudocode](#interview-fastapi-backend-pseudocode)
3. [Architecture Diagram](#architecture-diagram)
4. [Technology Stack](#technology-stack)
5. [Prerequisites](#prerequisites)
6. [Part 1: Database Setup (Supabase)](#part-1-database-setup-supabase)
7. [Part 2: Backend Setup (FastAPI on Render)](#part-2-backend-setup-fastapi-on-render)
8. [Part 3: Frontend Setup (Next.js on Vercel)](#part-3-frontend-setup-nextjs-on-vercel)
9. [Environment Variables Checklist](#environment-variables-checklist)
10. [Deployment Guide](#deployment-guide)
11. [Common Issues & Solutions](#common-issues--solutions)
12. [Testing & Verification](#testing--verification)
13. [Replication Checklist](#replication-checklist-for-new-projects)

---

## 📚 Project Overview

**What This Does:**
- A full-stack book management application
- Users can add, edit, delete, and read books
- Complete CRUD operations (Create, Read, Update, Delete)
- Real-time data syncing across all platforms
- Professional UI with modern card-based design

**Free Tier Stack:**
- ✅ Vercel (Next.js Frontend) — free tier
- ✅ Render (FastAPI Backend) — free tier with auto-hibernation
- ✅ Supabase (PostgreSQL Database) — 500MB free storage
- ✅ GitHub (Code Repository) — free

**Total Cost:** $0 (completely free)

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                        │
│            (Vercel: books-inventory-app-two.vercel.app)     │
├─────────────────────────────────────────────────────────────┤
│  Next.js (React + TypeScript) with Modern UI               │
│  - Card-based book layout                                   │
│  - Add/Edit/Delete/Read functionality                      │
│  - Real-time filters (genre, author)                        │
│  - Stats dashboard                                          │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS Requests
                 │ (CORS enabled - Cross-origin resource sharing )
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER BACKEND                           │
│          (books-inventory-app.onrender.com)                 │
├─────────────────────────────────────────────────────────────┤
│  FastAPI (Python 3.11.9)                                   │
│  - 7 REST Endpoints: GET/POST/PUT/PATCH/DELETE /books      │
│  - Pydantic validation                                      │
│  - CORS middleware                                          │
│  - Database connection layer                                │
│  - Auto-hibernates after 15 min inactivity                  │
└────────────────┬────────────────────────────────────────────┘
                 │ psycopg3 Driver
                 │ (PostgreSQL Protocol)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (DATABASE)                        │
│             (PostgreSQL Managed Service)                    │
├─────────────────────────────────────────────────────────────┤
│  Project ID: jqnwgenpvegaypnvvnbd                          │
│  - books table (id, title, author, genre, year, rating, read)
│  - Transaction pooler connection                            │
│  - Automatic backups                                        │
│  - 500MB free storage                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  GITHUB REPOSITORY                          │
│          (Chandukasireddy/books-inventory-app)              │
├─────────────────────────────────────────────────────────────┤
│  - Source of truth for code                                 │
│  - Auto-triggers Vercel & Render deploys on push           │
│  - .gitignore excludes node_modules, .next, venv            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Interview: FastAPI Backend Pseudocode

**Question:** "Walk me through how your FastAPI backend works"

### Connection Lifecycle (Resource Management)
```python
# Handles database connection safely - prevents leaks & ensures cleanup
function get_db():
    OPEN connection to PostgreSQL transaction pooler
    TRY:
        YIELD connection to caller  ← caller uses it
        COMMIT changes (auto-save)
    CATCH any error:
        ROLLBACK changes (undo all)
    FINALLY:
        CLOSE connection (cleanup)
    
    # Why? Every operation is atomic (all-or-nothing), prevents abandoned connections
```

### Initialization on Startup
```python
# Auto-runs when app starts (happens ONCE per deployment)
function init_db():
    OPEN database connection
    
    # Create table only if it doesn't exist
    EXECUTE SQL: CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        genre TEXT,
        year INTEGER,
        rating FLOAT,
        read BOOLEAN DEFAULT FALSE
    )
    
    IF no books exist in table THEN:
        PREPARE seed data = [
            (Dune, Frank Herbert, Sci-Fi, 1965, 4.8, True),
            (The Hobbit, J.R.R. Tolkien, Fantasy, 1937, 4.7, True),
            ... 6 more books ...
        ]
        
        FOR each book in seed data:
            GENERATE new UUID
            INSERT row into books table
        
        COMMIT all inserts at once
    
    CLOSE connection
```

### GET Endpoint Flow (Fetching Books)
```python
# When browser sends: GET /books?genre=Sci-Fi&author=Frank

function GET_books(genre=None, author=None, read_status=None):
    OPEN database connection via get_db()
    
    START building query: SELECT * FROM books
    
    IF genre provided:
        ADD condition: WHERE genre = 'Sci-Fi'
    IF author provided:
        ADD condition: AND author LIKE '%Frank%'  ← LIKE = partial match
    IF read_status provided:
        ADD condition: AND read = True/False
    
    EXECUTE final query
    FETCH all rows as dictionaries
    
    FOR each row dictionary:
        VALIDATE using Pydantic Book model ← ensures correct types
        CONVERT to Book object
    
    RETURN list of Book objects as JSON
    # Browser receives: [ { id: "...", title: "Dune", ... }, ... ]
```

### POST Endpoint Flow (Creating Book)
```python
# When browser sends: POST /books { title: "Dune", author: "Frank", ... }

function POST_books(book_data: BookCreate):
    VALIDATE book_data using Pydantic
        ↓ catches: missing fields, wrong types, invalid data
        ↓ returns 400 Bad Request if fails
    
    OPEN database connection
    
    GENERATE new_id = UUID4()  ← unique identifier
    
    INSERT INTO books VALUES (new_id, title, author, genre, year, rating, False)
    
    FETCH the newly inserted row back
    CONVERT to Book object
    CLOSE connection
    
    RETURN 201 Created + Book object
    # Browser receives: { id: "newly-generated-uuid", title: "Dune", ... }
```

### PUT Endpoint Flow (Update All Fields)
```python
# When browser sends: PUT /books/{id} { title: "...", author: "...", ... }

function PUT_books(book_id, book_data: BookUpdate):
    VALIDATE book_data using Pydantic ← ensures required fields
    
    OPEN database connection
    
    EXECUTE: UPDATE books SET title=?, author=?, genre=?, ... WHERE id=?
    
    IF 0 rows affected:
        RETURN 404 Not Found  ← book doesn't exist
    
    FETCH updated row
    CONVERT to Book object
    CLOSE connection
    
    RETURN 200 OK + updated Book object
```

### PATCH Endpoint Flow (Toggle Read Status)
```python
# When browser sends: PATCH /books/{id}/read

function PATCH_read_status(book_id):
    OPEN database connection
    
    FETCH current book WHERE id = book_id
    IF not found:
        RETURN 404 Not Found
    
    current_read_status = book.read  ← True or False
    new_status = NOT current_read_status  ← flip it
    
    UPDATE books SET read = new_status WHERE id = book_id
    
    FETCH updated book
    CONVERT to Book object
    CLOSE connection
    
    RETURN 200 OK + updated Book
```

### DELETE Endpoint Flow
```python
# When browser sends: DELETE /books/{id}

function DELETE_books(book_id):
    OPEN database connection
    
    EXECUTE: DELETE FROM books WHERE id = book_id
    
    IF 0 rows deleted:
        RETURN 404 Not Found
    
    CLOSE connection
    RETURN 204 No Content  ← success, no response body needed
```

### Stats Aggregation Flow
```python
# When browser sends: GET /stats

function GET_stats():
    OPEN database connection
    
    # All of these run efficiently because PostgreSQL optimizes aggregates
    total_books = COUNT(*) FROM books  ← 8
    books_read = COUNT(*) WHERE read = True  ← 5
    avg_rating = AVG(rating)  ← 4.6
    
    genre_breakdown = GROUP BY genre, COUNT(*)
        → { "Sci-Fi": 2, "Fantasy": 3, ... }
    
    CLOSE connection
    
    RETURN Stats object:
        {
            total_books: 8,
            books_read: 5,
            avg_rating: 4.6,
            books_by_genre: { "Sci-Fi": 2, ... }
        }
```

### Key Design Patterns Applied

| Pattern | Purpose | Example |
|---------|---------|---------|
| **Context Manager** | Resource safety (open/close/commit/rollback) | `@contextmanager def get_db()` |
| **Pydantic Validation** | Input/output type checking | `class BookCreate(BaseModel): title: str` |
| **Environment Config** | Secrets outside code | `DATABASE_URL` from `.env` |
| **HTTP Status Codes** | Clear request outcomes | 201 Created, 404 Not Found, 400 Bad Request |
| **CORS Middleware** | Allow cross-origin requests | Enable Vercel domain in Render |
| **UUID Primary Key** | Distributed ID generation | No database coordination needed |
| **Transaction Pooler** | Efficient serverless connections | Avoids connection exhaustion |

**Why These Patterns?**
- **Context Manager** → Never leaves connections hanging (memory leaks prevented)
- **Pydantic** → Catches bad data at API boundary (prevents invalid DB writes)
- **Environment Variables** → Never hardcode secrets (security)
- **Status Codes** → Frontend knows what succeeded/failed (better UX)
- **CORS** → Allows secure cross-site requests (frontend on Vercel, backend on Render)
- **UUIDs** → Works in distributed systems (Render may spin down, need to work on restart)
- **Pooler** → Handles micro-sleep on Render free tier (pooler maintains "warm" connections)

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 15.5.14 | React framework for UI |
| | React | 19 | Component library |
| | TypeScript | Latest | Type safety |
| | CSS Modules | - | Scoped styling |
| **Backend** | FastAPI | 0.115.6 | REST API framework |
| | Python | 3.11.9 | Programming language |
| | Uvicorn | 0.34.0 | ASGI server |
| | Pydantic | 2.10.4 | Data validation |
| | psycopg | 3.2.9 | PostgreSQL driver |
| **Database** | PostgreSQL | 15 | Relational database |
| | Supabase | - | Managed Postgres |
| **Deployment** | Vercel | - | Frontend hosting |
| | Render | - | Backend hosting |
| | GitHub | - | Code repository |

---

## ✅ Prerequisites

Before starting, ensure you have:

### Local Machine
- [Node.js](https://nodejs.org/) (v18+) with npm
- [Python](https://www.python.org/) (3.11+)
- [Git](https://git-scm.com/) configured
- [GitHub Account](https://github.com/)

### Cloud Accounts (All Free)
- [GitHub Account](https://github.com/) (free)
- [Supabase Account](https://supabase.com/) (free tier 500MB)
- [Render Account](https://render.com/) (free tier)
- [Vercel Account](https://vercel.com/) (free tier)

### Basic Knowledge
- Git commands (add, commit, push)
- Environment variables
- REST API concepts
- Basic React/JavaScript

---

## 🔴 Part 1: Database Setup (Supabase)

### Step 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Click **New Project**
3. **Project Details:**
   - Name: `books-inventory` (or any name)
   - Database Password: Generate strong password (save it!)
   - Region: Closest to you (e.g., `eu-west-1` for Europe)
4. Click **Create Project** (takes 2-3 minutes)

### Step 1.2: Create Database Table

1. In Supabase dashboard → **SQL Editor**
2. Click **New Query**
3. Paste this SQL:

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  year INTEGER NOT NULL,
  rating REAL NOT NULL DEFAULT 0.0,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

4. Click **Run** ✅

### Step 1.3: Get Connection String

1. In Supabase dashboard → **Settings** → **Database**
2. Look for **Connection Strings** section
3. Select **psycopg3** (binary) from dropdown
4. **IMPORTANT:** Use **Transaction Pooler** URL (NOT direct connection)
   - Host: `aws-1-eu-west-1.pooler.supabase.com:6543` (changes by region)
   - Format: `postgresql://postgres.<project-id>:<password>@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`

5. Save this connection string — you'll need it for backend

### Step 1.4: Verify Table Created

1. In Supabase → **Table Editor** → Select **books** table
2. You should see columns: `id`, `title`, `author`, `genre`, `year`, `rating`, `read`, `created_at`
3. ✅ Database ready!

**Key Information to Save:**
```
Project ID: jqnwgenpvegaypnvvnbd
Database URL (Pooler): postgresql://postgres.jqnwgenpvegaypnvvnbd:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
Region: eu-west-1
```

---

## 🔵 Part 2: Backend Setup (FastAPI on Render)

### Step 2.1: Create Local FastAPI Application

1. Create project folder:
```bash
mkdir books-inventory-app
cd books-inventory-app
```

2. Create Python virtual environment:
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Or macOS/Linux:
source venv/bin/activate
```

3. Create `requirements.txt`:
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.4
psycopg[binary]==3.2.9
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

### Step 2.2: Create FastAPI Application (`main.py`)

```python
"""
Books Inventory API
Full-stack learning project with PostgreSQL backend
"""
import os
from contextlib import contextmanager
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row

# ── Configuration ─────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/postgres")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]

# ── FastAPI App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="Bookshelf API",
    version="2.0.0",
    description="A simple REST API to manage a book collection. Backed by PostgreSQL.",
)

# ── CORS Middleware ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────
class Book(BaseModel):
    id: str
    title: str
    author: str
    genre: str
    year: int
    rating: float
    read: bool

class BookCreate(BaseModel):
    title: str
    author: str
    genre: str
    year: int
    rating: float = 0.0
    read: bool = False

class BookUpdate(BaseModel):
    title: str
    author: str
    genre: str
    year: int
    rating: float
    read: bool

class Stats(BaseModel):
    total_books: int
    books_read: int
    books_unread: int
    average_rating: float
    genres: dict

# ── Database Helper ───────────────────────────────────────────────────────
@contextmanager
def get_db():
    """Context manager for database connections with auto-commit/rollback"""
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def row_to_book(row: dict) -> Book:
    """Convert database row dict to Book model"""
    return Book(**row)

# ── Database Initialization ───────────────────────────────────────────────
def init_db():
    """Create table and seed data on first startup"""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY UNIQUE,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                genre TEXT NOT NULL,
                year INTEGER NOT NULL,
                rating REAL NOT NULL DEFAULT 0.0,
                read BOOLEAN NOT NULL DEFAULT FALSE
            )
        """)

        count = conn.execute("SELECT COUNT(*) AS total FROM books").fetchone()["total"]
        if count == 0:
            seed = [
                ("Dune", "Frank Herbert", "Sci-Fi", 1965, 4.8, True),
                ("The Hobbit", "J.R.R. Tolkien", "Fantasy", 1937, 4.7, True),
                ("Clean Code", "Robert C. Martin", "Programming", 2008, 4.3, False),
                ("1984", "George Orwell", "Dystopian", 1949, 4.6, True),
                ("The Pragmatic Programmer", "Andy Hunt", "Programming", 1999, 4.5, False),
                ("Sapiens", "Yuval Noah Harari", "History", 2011, 4.4, True),
                ("Atomic Habits", "James Clear", "Self-Help", 2018, 4.7, False),
                ("Project Hail Mary", "Andy Weir", "Sci-Fi", 2021, 4.9, True),
            ]
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT INTO books (id, title, author, genre, year, rating, read) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                    [(str(uuid4()), *row) for row in seed],
                )

init_db()

# ── REST Endpoints ────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """API welcome message"""
    return {
        "message": "Welcome to Books Inventory API",
        "docs": "/docs",
        "version": "2.0.0"
    }

@app.get("/books", response_model=list[Book])
async def get_books(
    genre: str = Query(None),
    author: str = Query(None),
    read: bool = Query(None),
):
    """Fetch all books with optional filters"""
    with get_db() as conn:
        query = "SELECT * FROM books WHERE 1=1"
        params = []

        if genre:
            query += " AND genre = %s"
            params.append(genre)
        if author:
            query += " AND author ILIKE %s"
            params.append(f"%{author}%")
        if read is not None:
            query += " AND read = %s"
            params.append(read)

        rows = conn.execute(query, params).fetchall()
        return [row_to_book(row) for row in rows]

@app.post("/books", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(data: BookCreate) -> Book:
    """Create a new book"""
    book_id = str(uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO books (id, title, author, genre, year, rating, read) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (book_id, data.title, data.author, data.genre, data.year, data.rating, data.read),
        )
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
        return row_to_book(row)

@app.get("/books/{book_id}", response_model=Book)
async def get_book(book_id: str) -> Book:
    """Fetch a single book by ID"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Book not found")
        return row_to_book(row)

@app.put("/books/{book_id}", response_model=Book)
async def update_book(book_id: str, data: BookUpdate) -> Book:
    """Update all fields of a book"""
    with get_db() as conn:
        conn.execute(
            "UPDATE books SET title = %s, author = %s, genre = %s, year = %s, rating = %s, read = %s WHERE id = %s",
            (data.title, data.author, data.genre, data.year, data.rating, data.read, book_id),
        )
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Book not found")
        return row_to_book(row)

@app.patch("/books/{book_id}/read", response_model=Book)
async def toggle_read(book_id: str, read: bool = Query(...)) -> Book:
    """Toggle read/unread status"""
    with get_db() as conn:
        conn.execute("UPDATE books SET read = %s WHERE id = %s", (read, book_id))
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Book not found")
        return row_to_book(row)

@app.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: str):
    """Delete a book"""
    with get_db() as conn:
        result = conn.execute("DELETE FROM books WHERE id = %s", (book_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Book not found")

@app.get("/stats", response_model=Stats)
async def get_stats() -> Stats:
    """Get library statistics"""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) AS total FROM books").fetchone()["total"]
        read = conn.execute("SELECT COUNT(*) AS total FROM books WHERE read = true").fetchone()["total"]
        avg_rating = conn.execute("SELECT AVG(rating) AS avg FROM books").fetchone()["avg"] or 0
        
        genres_rows = conn.execute(
            "SELECT genre, COUNT(*) as count FROM books GROUP BY genre ORDER BY count DESC"
        ).fetchall()
        genres = {row["genre"]: row["count"] for row in genres_rows}

        return Stats(
            total_books=total,
            books_read=read,
            books_unread=total - read,
            average_rating=round(avg_rating, 2),
            genres=genres,
        )
```

### Step 2.3: Create Configuration Files

**Create `.python-version`:**
```
3.11.9
```

**Create `runtime.txt`:**
```
python-3.11.9
```

### Step 2.4: Test Locally

```bash
uvicorn main:app --reload
# Open http://localhost:8000/docs
# You should see Swagger UI with all 7 endpoints
```

### Step 2.5: Push to GitHub

1. Initialize git repo:
```bash
git init
git add .
git commit -m "Initial FastAPI backend setup"
```

2. Create GitHub repo at [github.com/new](https://github.com/new)
   - Name: `books-inventory-app`
   - Public
3. Push code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/books-inventory-app.git
git branch -M main
git push -u origin main
```

### Step 2.6: Deploy to Render

1. Go to [render.com](https://render.com) → Sign up (free)
2. Click **New Web Service**
3. **Connect GitHub:** Authorize and select `books-inventory-app` repo
4. **Configuration:**
   - Name: `books-inventory-app`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: **Free**

5. **Environment Variables:**
   - Add `DATABASE_URL`: `postgresql://postgres.jqnwgenpvegaypnvvnbd:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`
   - Add `CORS_ORIGINS`: `http://localhost:3000` (will update later with Vercel domain)

6. Click **Create Web Service**
7. Wait for build to complete (~3 minutes)
8. You'll get a URL like: `https://books-inventory-app.onrender.com`

**Verify Backend:**
- Open `https://books-inventory-app.onrender.com/docs`
- Should see Swagger UI ✅

**Save Render URL:**
```
https://books-inventory-app.onrender.com
```

---

## 🟢 Part 3: Frontend Setup (Next.js on Vercel)

### Step 3.1: Create Next.js Project

In same GitHub repo root (or new folder if modular):

```bash
npx create-next-app@latest bookshelf-ui --typescript --tailwind=no --app=true
cd bookshelf-ui
```

### Step 3.2: Create API Client (`lib/api.ts`)

```typescript
/**
 * API client — all HTTP calls to the FastAPI backend live here.
 */

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL 
  ? process.env.NEXT_PUBLIC_API_BASE_URL 
  : "/api";

// ── Types ──────────────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  year: number;
  rating: number;
  read: boolean;
}

export interface BookCreate {
  title: string;
  author: string;
  genre: string;
  year: number;
  rating: number;
  read: boolean;
}

export type BookUpdate = BookCreate;

export interface Stats {
  total_books: number;
  books_read: number;
  books_unread: number;
  average_rating: number;
  genres: Record<string, number>;
}

export interface BookFilters {
  genre?: string;
  author?: string;
  read?: boolean;
}

// ── API Functions ──────────────────────────────────────────────────

export async function fetchBooks(filters: BookFilters = {}): Promise<Book[]> {
  const params = new URLSearchParams();
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.author) params.set("author", filters.author);
  if (filters.read !== undefined) params.set("read", String(filters.read));

  const qs = params.toString();
  const url = `${API_URL}/books${qs ? "?" + qs : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /books failed: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error(`GET /stats failed: ${res.status}`);
  return res.json();
}

export async function createBook(data: BookCreate): Promise<Book> {
  const res = await fetch(`${API_URL}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST /books failed: ${res.status}`);
  return res.json();
}

export async function updateBook(id: string, data: BookUpdate): Promise<Book> {
  const res = await fetch(`${API_URL}/books/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT /books/${id} failed: ${res.status}`);
  return res.json();
}

export async function toggleRead(id: string, read: boolean): Promise<Book> {
  const res = await fetch(`${API_URL}/books/${id}/read?read=${read}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(`PATCH /books/${id}/read failed: ${res.status}`);
  return res.json();
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/books/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /books/${id} failed: ${res.status}`);
}
```

### Step 3.3: Update Next.js Config (`next.config.ts`)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.API_BASE_URL || "http://localhost:8000";
    
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

### Step 3.4: Create Global Styles (`app/globals.css`)

```css
:root {
  --primary: #3b82f6;
  --primary-dark: #1d4ed8;
  --secondary: #8b5cf6;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --gray-light: #f3f4f6;
  --gray-medium: #9ca3af;
  --gray-dark: #1f2937;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%);
  color: #1f2937;
  font-size: 15px;
}

button {
  cursor: pointer;
}
```

### Step 3.5: Create Module Styles (`app/page.module.css`)

[See StyleG architecture — full CSS file with card-based layout, buttons, forms]

### Step 3.6: Create Main Page (`app/page.tsx`)

[See React component with:
- Book card grid layout
- Add/Edit/Delete functionality
- Search and filters
- Stats dashboard
- Professional UI]

### Step 3.7: Test Locally

```bash
npm run dev
# Open http://localhost:3000
# Should show 8 seed books from backend
```

### Step 3.8: Update GitHub and Push

```bash
git add .
git commit -m "Add Next.js frontend with modern UI"
git push origin main
```

### Step 3.9: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com/dashboard)
2. Click **Import Project**
3. Select `books-inventory-app` repository
4. **Important Settings:**
   - Root Directory: `bookshelf-ui/`
   - Framework: Next.js
   - Build Command: `npm run build`
   - Start Command: `npm start`

5. **Environment Variables:**
   - `API_BASE_URL`: `https://books-inventory-app.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL`: `https://books-inventory-app.onrender.com`

6. Click **Deploy**
7. Wait for deployment to complete (~2-3 minutes)
8. Get Vercel URL: `https://books-inventory-app-two.vercel.app`

---

## 📋 Environment Variables Checklist

### Local Development (`.env.local` or `.env`)

**Backend (.env):**
```
DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
API_BASE_URL=http://localhost:8000
```

### Production Environment Variables

**Render Dashboard (Backend):**
```
DATABASE_URL = postgresql://postgres.PROJECT_ID:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
CORS_ORIGINS = https://books-inventory-app-two.vercel.app,http://localhost:3000
```

**Vercel Dashboard (Frontend):**
```
API_BASE_URL = https://books-inventory-app.onrender.com
NEXT_PUBLIC_API_BASE_URL = https://books-inventory-app.onrender.com
```

---

## 🚀 Deployment Guide

### Quick Deployment Workflow

**1. Make Changes Locally**
```bash
# Make code edits
# Test with npm run dev or uvicorn main:app --reload
```

**2. Git Commit & Push**
```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

**3. Auto-Deploy (Magic Happens!)**
- **Vercel:** Auto-deploys frontend changes from `bookshelf-ui/` folder (1-2 min)
- **Render:** Auto-deploys backend changes from root folder (2-3 min)

**4. Verify Deployment**
- Frontend: Visit Vercel URL
- Backend: Visit Render URL/docs
- Database: Check Supabase Table Editor

### Manual Redeployment (If Needed)

**Render:**
1. Go to render.com dashboard
2. Select service → **Manual Deploy** button
3. Wait for logs to show "Deploy successful"

**Vercel:**
1. Go to vercel.com dashboard
2. Select project → **Deployments** tab
3. Click three dots (⋯) → **Redeploy**

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to fetch — is the FastAPI server running?"
**Cause:** Frontend can't reach backend API  
**Solution:**
1. Check Render service is running (not hibernated)
2. Verify `CORS_ORIGINS` in Render includes Vercel domain
3. Check `NEXT_PUBLIC_API_BASE_URL` is set in Vercel
4. Redeploy both services

### Issue 2: "Column 'read' is of type boolean but expression is of type smallint"
**Cause:** Seed data using `0/1` instead of `True/False`  
**Solution:** Update seed data to use Python booleans:
```python
seed = [
    (..., True),   # ✅ Correct
    (..., False),  # ✅ Correct
    # NOT:
    (..., 1),      # ❌ Wrong
    (..., 0),      # ❌ Wrong
]
```

### Issue 3: "AttributeError: 'Connection' object has no attribute 'executemany'"
**Cause:** Using psycopg 3 Connection API incorrectly  
**Solution:** Use Cursor for bulk operations:
```python
# ❌ Wrong:
conn.executemany(...)

# ✅ Correct:
with conn.cursor() as cur:
    cur.executemany(...)
```

### Issue 4: PostgreSQL "network unreachable" IPv6 error
**Cause:** Using direct PostgreSQL endpoint instead of pooler  
**Solution:** Use Transaction Pooler URL:
```
# ❌ Wrong:
postgresql://postgres:pass@db.PROJECT_ID.supabase.co:5432/postgres

# ✅ Correct:
postgresql://postgres.PROJECT_ID:pass@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### Issue 5: "CSS Module doesn't support :root selector"
**Cause:** `:root` is global, can't be in .module.css  
**Solution:** Move CSS variables to `globals.css`:
```typescript
// ❌ Wrong: page.module.css
:root { --primary: #3b82f6; }

// ✅ Correct: globals.css
:root { --primary: #3b82f6; }
```

### Issue 6: Render 15-minute auto-hibernation
**Cause:** Service goes to sleep when inactive  
**Solution:** This is normal! Service wakes up automatically on first request (no action needed)

### Issue 7: "Build failed: Python 3.14 pydantic-core compile error"
**Cause:** Render defaulting to incompatible Python version  
**Solution:** Add `.python-version` and `runtime.txt` files both containing `3.11.9`

---

## ✅ Testing & Verification

### Verify Backend

**1. Check Status:**
```bash
curl https://books-inventory-app.onrender.com/
# Response: {"message": "Welcome to Books Inventory API", ...}
```

**2. List Books:**
```bash
curl https://books-inventory-app.onrender.com/books
# Response: [8 book objects]
```

**3. View API Docs:**
- Visit `https://books-inventory-app.onrender.com/docs`
- Should see Swagger UI with all 7 endpoints

**4. Test Stats:**
```bash
curl https://books-inventory-app.onrender.com/stats
# Response: {"total_books": 8, "books_read": 5, ...}
```

### Verify Database

**1. Supabase Table Editor:**
- Go to supabase.com → Select project
- Click Table Editor → Select "books" table
- Should see 8 rows with seed data

**2. Test Create:**
- Add book in Vercel UI
- Check Supabase table — new row should appear

**3. Test Update:**
- Edit book in Vercel UI
- Refresh Supabase — changes should appear

**4. Test Delete:**
- Delete book in Vercel UI
- Refresh Supabase — row should disappear

### Verify Frontend

**1. Local Test:**
```bash
cd bookshelf-ui
npm run dev
# Visit http://localhost:3000
# Add test book → check Supabase
```

**2. Production Test:**
- Visit Vercel URL: `https://books-inventory-app-two.vercel.app`
- Add/edit/delete books
- Verify all operations work
- Check Supabase for data sync

---

## 📦 Replication Checklist (For New Projects)

Use this step-by-step checklist to replicate the entire project anywhere:

### Phase 1: Planning
- [ ] Define project scope and entities
- [ ] Choose tech stack (Next.js, FastAPI, PostgreSQL confirmed best)
- [ ] Identify free tier requirements
- [ ] Plan folder structure

### Phase 2: Database (5 min)
- [ ] Create Supabase account
- [ ] Create new project
- [ ] Write SQL schema file
- [ ] Create table via SQL Editor
- [ ] Get Transaction Pooler connection string
- [ ] Save: Project ID, Password, Region, Connection URL

### Phase 3: Backend (20 min)
- [ ] Create local folder with venv
- [ ] Create `requirements.txt` with dependencies
- [ ] Write `main.py` with FastAPI app
- [ ] Create `.python-version` (3.11.9)
- [ ] Create `runtime.txt` (3.11.9)
- [ ] Test locally: `uvicorn main:app --reload`
- [ ] Initialize git, push to GitHub
- [ ] Create Render service
- [ ] Set environment variables
- [ ] Verify `/docs` endpoint loads
- [ ] Save Render URL

### Phase 4: Frontend (20 min)
- [ ] Create `bookshelf-ui/` folder with Next.js
- [ ] Update `next.config.ts` with rewrites
- [ ] Create `lib/api.ts` with fetch functions
- [ ] Update `globals.css` with CSS variables and styles
- [ ] Create `page.module.css` with component styles
- [ ] Create `app/page.tsx` with React component
- [ ] Test locally: `npm run dev`
- [ ] Push to same GitHub repo
- [ ] Create Vercel project
- [ ] Set Root Directory to `bookshelf-ui/`
- [ ] Set environment variables
- [ ] Verify frontend loads and connects to backend
- [ ] Save Vercel URL

### Phase 5: Integration (10 min)
- [ ] Update Render CORS_ORIGINS with Vercel URL
- [ ] Redeploy Render service
- [ ] Test end-to-end in Vercel UI
- [ ] Verify data syncs to Supabase
- [ ] Add test data and verify

### Phase 6: Documentation (5 min)
- [ ] Save all URLs and credentials
- [ ] Document environment variables
- [ ] Create README.md with deployment steps
- [ ] Save this guide in project folder

---

## 🎯 Key Points to Remember

### Architecture Principles
1. **Separation of Concerns:** Frontend (Vercel) ↔ Backend (Render) ↔ Database (Supabase)
2. **Stateless Backends:** Render can restart/hibernate anytime
3. **Connection Pooling:** Always use Supabase pooler, never direct endpoint
4. **CORS Critical:** Frontend domain must be in backend CORS list
5. **Environment Variables:** Different for local dev vs production

### Database Best Practices
- ✅ Use UUID for primary keys (distributed systems)
- ✅ Use Transaction Pooler for serverless connections
- ✅ Always use `sslmode=require` for Supabase
- ✅ Use context managers for auto-commit/rollback
- ✅ Use parameterized queries (prevents SQL injection)
- ✅ Use row_factory=dict_row for dict responses

### Backend Best Practices
- ✅ Use Pydantic models for validation
- ✅ Use context managers (`@contextmanager`) for resource management
- ✅ Pin Python version to minor (3.11.9, not just 3.11)
- ✅ Use CORS middleware for frontend access
- ✅ Use HTTP status codes correctly (201 for create, 204 for delete)
- ✅ Use `.env` files for secrets, never commit to git

### Frontend Best Practices
- ✅ Use CSS Modules for scoped styling
- ✅ Use environment variables for API URLs
- ✅ Separate API logic into `lib/api.ts`
- ✅ Use React hooks for state management
- ✅ Use Pydantic-inspired TypeScript interfaces
- ✅ Never hardcode API URLs

### Git Workflow
```bash
# Feature development
git checkout -b feature/description
# ... make changes
git add .
git commit -m "Descriptive message"
git push origin feature/description
# Create PR

# Or simple workflow (for learning):
git add .
git commit -m "Change description"
git push origin main  # Auto-deploys!
```

### Troubleshooting Workflow
1. Check error in console (frontend) or logs (backend)
2. Check environment variables
3. Check CORS settings
4. Test API endpoint with curl
5. Check Supabase table for data
6. Restart services or redeploy

---

## 📞 Deployment Platform Limits & Specs

| Platform | Feature | Free Tier Limit | Notes |
|----------|---------|-----------------|-------|
| **Vercel** | Requests/month | Unlimited | 100GB bandwidth/month |
| | Build minutes | 6000/month | Shared runners |
| | Deployments | Unlimited | Git trigger |
| | Functions | 1 million calls | Serverless |
| **Render** | Service hours | 750/month | Auto-hibernates after 15min |
| | Build hours | 500/month | Limited concurrency |
| | Deployments | Unlimited | Git trigger |
| | Database | N/A | Backend only |
| **Supabase** | Storage | 500 MB | Auto-backups |
| | Database | PostgreSQL | 2 concurrent connections |
| | Bandwidth | 2 GB/month | Sufficient for learning |
| | Auth users | 50,000 | Not needed for this project |

---

## 🎓 Learning Outcomes

By completing this project, you've learned:

✅ **Full-stack architecture:** Frontend → Backend → Database  
✅ **REST API design:** Proper HTTP methods and status codes  
✅ **Database design:** Schema, relationships, connection pooling  
✅ **Deployment pipelines:** Git → Auto-build → Auto-deploy  
✅ **Environment configuration:** Local dev vs production  
✅ **CORS & security:** Cross-origin requests and authentication basics  
✅ **Modern UI/UX:** Professional card-based design  
✅ **Git workflows:** Push-to-deploy automation  

---

## 📚 Additional Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

### Useful Commands

**Backend:**
```bash
# Local development
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
uvicorn main:app --reload

# Git workflow
git add .
git commit -m "message"
git push origin main
```

**Frontend:**
```bash
# Development
npm run dev  # http://localhost:3000

# Build for production
npm run build
npm start

# Git deployment
git add bookshelf-ui/
git commit -m "message"
git push origin main
```

**Database:**
```bash
# Test connection
psql "postgresql://postgres:pass@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

# View data
SELECT * FROM books;
```

---

## 🎉 Conclusion

You now have a **complete, production-ready full-stack application** deployed across three platforms using free tiers. This setup is:

- ✅ **Scalable:** Auto-hibernation, serverless architecture
- ✅ **Secure:** Environment variables, parameterized queries, CORS
- ✅ **Professional:** Modern UI, proper API design, database best practices
- ✅ **Cost-effective:** $0 monthly
- ✅ **Replicable:** Complete documentation for future projects

**Total Time to Deploy:** ~1-2 hours  
**Cost:** $0  
**Complexity:** Beginner-Friendly with Professional Patterns  

Happy building! 🚀

---

**Document Version:** 1.0  
**Last Updated:** March 25, 2026  
**Project Status:** ✅ Complete & Tested  
**Next Steps:** Extend with authentication, add more features, deploy to custom domain
