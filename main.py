"""
Bookshelf REST API — FastAPI Learning Project
=============================================
Data layer  : PostgreSQL (Supabase-compatible via DATABASE_URL)
Frontend    : Next.js at http://localhost:3000
API docs    : http://127.0.0.1:8000/docs  (Swagger UI)
             http://127.0.0.1:8000/redoc  (ReDoc)

Flow  →  PostgreSQL  →  FastAPI  →  HTTP/JSON  →  Next.js UI
"""

import os
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4
import psycopg
from psycopg.rows import dict_row

# ──────────────────────────────────────────────
# App setup
# ──────────────────────────────────────────────
app = FastAPI(
    title="Bookshelf API",
    description="A simple REST API to manage a book collection. Backed by PostgreSQL.",
    version="2.0.0",
    contact={"name": "api-learn project"},
)

# CORS setup (comma-separated list in env)
# Example: CORS_ORIGINS=https://your-ui.vercel.app,http://localhost:3000
default_origins = "http://localhost:3000,http://127.0.0.1:3000"
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", default_origins).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Pydantic schemas (same as before — unchanged)
# ──────────────────────────────────────────────

class BookCreate(BaseModel):
    """Fields required when ADDING a new book."""
    title:  str   = Field(..., min_length=1, max_length=200, example="Dune")
    author: str   = Field(..., min_length=1, max_length=100, example="Frank Herbert")
    genre:  str   = Field(..., example="Sci-Fi")
    year:   int   = Field(..., ge=1000, le=2100, example=1965)
    rating: float = Field(default=0.0, ge=0.0, le=5.0, example=4.8)
    read:   bool  = Field(default=False, example=True)


class BookUpdate(BaseModel):
    """All fields optional — used by PUT to partially update a book."""
    title:  Optional[str]   = Field(None, min_length=1, max_length=200)
    author: Optional[str]   = Field(None, min_length=1, max_length=100)
    genre:  Optional[str]   = None
    year:   Optional[int]   = Field(None, ge=1000, le=2100)
    rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    read:   Optional[bool]  = None


class Book(BookCreate):
    """Full book object returned by the API (includes server-generated id)."""
    id: str
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# PostgreSQL helpers
# ──────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Provide a PostgreSQL connection string (e.g. Supabase) in environment variables."
    )


@contextmanager
def get_db():
    """Open a PostgreSQL connection, yield it, commit on success, rollback on error."""
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_book(row) -> Book:
    """Convert a DB row dict into a Book Pydantic model."""
    return Book(
        id=row["id"],
        title=row["title"],
        author=row["author"],
        genre=row["genre"],
        year=row["year"],
        rating=row["rating"],
        read=bool(row["read"]),
    )


def init_db():
    """Create the table (if missing) and seed sample rows (if empty)."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS books (
                id     TEXT    PRIMARY KEY,
                title  TEXT    NOT NULL,
                author TEXT    NOT NULL,
                genre  TEXT    NOT NULL,
                year   INTEGER NOT NULL,
                rating REAL    NOT NULL DEFAULT 0.0,
                read   BOOLEAN NOT NULL DEFAULT FALSE
            )
        """)

        count = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
        if count == 0:
            seed = [
                ("Dune",                       "Frank Herbert",      "Sci-Fi",      1965, 4.8, 1),
                ("The Hobbit",                 "J.R.R. Tolkien",     "Fantasy",     1937, 4.7, 1),
                ("Clean Code",                 "Robert C. Martin",   "Programming", 2008, 4.3, 0),
                ("1984",                       "George Orwell",      "Dystopian",   1949, 4.6, 1),
                ("The Pragmatic Programmer",   "Andy Hunt",          "Programming", 1999, 4.5, 0),
                ("Sapiens",                    "Yuval Noah Harari",  "History",     2011, 4.4, 1),
                ("Atomic Habits",              "James Clear",        "Self-Help",   2018, 4.7, 0),
                ("Project Hail Mary",          "Andy Weir",          "Sci-Fi",      2021, 4.9, 1),
            ]
            conn.executemany(
                "INSERT INTO books (id, title, author, genre, year, rating, read) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                [(str(uuid4()), *row) for row in seed],
            )


init_db()   # runs once when the server starts


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/", tags=["Root"])
def root():
    """API welcome message and quick-start links."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM books").fetchone()["count"]
    return {
        "message": "Welcome to the Bookshelf API!",
        "docs":    "http://127.0.0.1:8000/docs",
        "redoc":   "http://127.0.0.1:8000/redoc",
        "total_books": total,
    }


# ── READ ──────────────────────────────────────

@app.get("/books", response_model=list[Book], tags=["Books"])
def list_books(
    genre:  Optional[str]  = Query(None, description="Filter by genre (case-insensitive)"),
    author: Optional[str]  = Query(None, description="Filter by author name (partial match)"),
    read:   Optional[bool] = Query(None, description="Filter by read status"),
    limit:  int            = Query(100, ge=1, le=100, description="Max number of results"),
):
    """List all books with optional filters."""
    sql    = "SELECT * FROM books WHERE 1=1"
    params: list = []

    if genre:
        sql += " AND LOWER(genre) = LOWER(%s)"
        params.append(genre)
    if author:
        sql += " AND LOWER(author) LIKE LOWER(%s)"
        params.append(f"%{author}%")
    if read is not None:
        sql += " AND read = %s"
        params.append(read)

    sql += " LIMIT %s"
    params.append(limit)

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()

    return [row_to_book(r) for r in rows]


@app.get("/books/{book_id}", response_model=Book, tags=["Books"])
def get_book(book_id: str):
    """Get a single book by its ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found.")
    return row_to_book(row)


# ── CREATE ────────────────────────────────────

@app.post("/books", response_model=Book, status_code=status.HTTP_201_CREATED, tags=["Books"])
def create_book(book: BookCreate):
    """Add a new book. Returns the created book with a generated id."""
    book_id = str(uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO books (id, title, author, genre, year, rating, read) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (book_id, book.title, book.author, book.genre, book.year, book.rating, book.read),
        )
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
    return row_to_book(row)


# ── UPDATE ────────────────────────────────────

@app.put("/books/{book_id}", response_model=Book, tags=["Books"])
def update_book(book_id: str, updates: BookUpdate):
    """Update an existing book. Only send the fields you want to change."""
    with get_db() as conn:
        if not conn.execute("SELECT 1 FROM books WHERE id = %s", (book_id,)).fetchone():
            raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found.")

        patch = updates.model_dump(exclude_unset=True)   # only fields the client sent
        if patch:
            set_clauses = ", ".join(f"{k} = %s" for k in patch)
            values = [v for _, v in patch.items()]
            values.append(book_id)
            conn.execute(f"UPDATE books SET {set_clauses} WHERE id = %s", values)

        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
    return row_to_book(row)


# ── MARK AS READ ──────────────────────────────

@app.patch("/books/{book_id}/read", response_model=Book, tags=["Books"])
def mark_read(book_id: str, read: bool = True):
    """Toggle the read status of a book. ?read=false marks it unread."""
    with get_db() as conn:
        if not conn.execute("SELECT 1 FROM books WHERE id = %s", (book_id,)).fetchone():
            raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found.")
        conn.execute("UPDATE books SET read = %s WHERE id = %s", (read, book_id))
        row = conn.execute("SELECT * FROM books WHERE id = %s", (book_id,)).fetchone()
    return row_to_book(row)


# ── DELETE ────────────────────────────────────

@app.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Books"])
def delete_book(book_id: str):
    """Remove a book. Returns 204 No Content on success."""
    with get_db() as conn:
        if not conn.execute("SELECT 1 FROM books WHERE id = %s", (book_id,)).fetchone():
            raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found.")
        conn.execute("DELETE FROM books WHERE id = %s", (book_id,))


# ── STATS ─────────────────────────────────────

@app.get("/stats", tags=["Stats"])
def get_stats():
    """Summary stats about your bookshelf."""
    with get_db() as conn:
        total_row = conn.execute("SELECT COUNT(*) AS total FROM books").fetchone()
        read_row = conn.execute("SELECT COUNT(*) AS total FROM books WHERE read = TRUE").fetchone()
        avg_row = conn.execute("SELECT AVG(rating) AS average_rating FROM books").fetchone()
        genre_rows = conn.execute(
            "SELECT genre, COUNT(*) AS cnt FROM books GROUP BY genre ORDER BY cnt DESC"
        ).fetchall()

    total = total_row["total"]
    read_count = read_row["total"]
    avg = avg_row["average_rating"]

    return {
        "total_books":    total,
        "books_read":     read_count,
        "books_unread":   total - read_count,
        "average_rating": round(avg, 2) if avg else 0,
        "genres":         {r["genre"]: r["cnt"] for r in genre_rows},
    }
