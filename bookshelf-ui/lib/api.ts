/**
 * API client — all HTTP calls to the FastAPI backend live here.
 *
 * Full stack flow:
 *   books.db  →  FastAPI (port 8000)  →  these functions  →  React UI
 *
 * Open browser DevTools → Network tab to watch every request.
 */

// On Vercel: Make direct calls to Render backend (requires CORS)
// On localhost: Use /api proxy (Next.js rewrites to localhost:8000, no CORS needed)
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ? 
  process.env.NEXT_PUBLIC_API_BASE_URL : 
  "/api";

// ── Types (mirror the Pydantic models in main.py) ──────────────────────────

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

// ── API functions ──────────────────────────────────────────────────────────

/**
 * GET /books  — fetch all books, optionally filtered.
 * You can watch this hit the server at http://localhost:8000/books
 */
export async function fetchBooks(filters: BookFilters = {}): Promise<Book[]> {
  const params = new URLSearchParams();
  if (filters.genre)            params.set("genre",  filters.genre);
  if (filters.author)           params.set("author", filters.author);
  if (filters.read !== undefined) params.set("read", String(filters.read));

  const qs  = params.toString();
  const url = `${API_URL}/books${qs ? "?" + qs : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /books failed: ${res.status}`);
  return res.json();
}

/**
 * GET /stats  — summary counts & genre breakdown.
 */
export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error(`GET /stats failed: ${res.status}`);
  return res.json();
}

/**
 * POST /books  — create a new book.
 * Body is JSON; FastAPI validates it against BookCreate.
 */
export async function createBook(data: BookCreate): Promise<Book> {
  const res = await fetch(`${API_URL}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST /books failed: ${res.status}`);
  return res.json();
}

/**
 * PATCH /books/{id}/read  — toggle read/unread.
 * Uses a query param: ?read=true or ?read=false
 */
export async function toggleRead(id: string, read: boolean): Promise<Book> {
  const res = await fetch(`${API_URL}/books/${id}/read?read=${read}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(`PATCH /books/${id}/read failed: ${res.status}`);
  return res.json();
}

/**
 * PUT /books/{id}  — update all fields of a book.
 */
export async function updateBook(id: string, data: BookUpdate): Promise<Book> {
  const res = await fetch(`${API_URL}/books/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT /books/${id} failed: ${res.status}`);
  return res.json();
}

/**
 * DELETE /books/{id}  — remove a book. Returns 204 No Content.
 */
export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/books/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /books/${id} failed: ${res.status}`);
}
