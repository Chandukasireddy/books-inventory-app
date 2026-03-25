"use client";

/**
 * Main page — fetches data from the FastAPI backend and renders the bookshelf.
 *
 * Data flow:
 *   books.db  →  FastAPI (localhost:8000)  →  fetch() calls in lib/api.ts  →  this page
 *
 * Open DevTools → Network tab to watch every API call in real time.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Book, BookCreate, Stats,
  fetchBooks, fetchStats, createBook, deleteBook, toggleRead,
} from "@/lib/api";
import styles from "./page.module.css";

const EMPTY_FORM: BookCreate = {
  title: "", author: "", genre: "",
  year: new Date().getFullYear(), rating: 0, read: false,
};

export default function HomePage() {
  // ── Data state ──────────────────────────────────────────────────────────
  const [books,   setBooks]   = useState<Book[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [genreFilter,  setGenreFilter]  = useState("");
  const [authorInput,  setAuthorInput]  = useState("");   // raw input
  const [activeAuthor, setActiveAuthor] = useState("");   // debounced
  const [readFilter,   setReadFilter]   = useState<"" | "true" | "false">("");

  // ── Add-book form state ──────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState<BookCreate>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  // ── Debounce author search (350 ms) ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setActiveAuthor(authorInput), 350);
    return () => clearTimeout(t);
  }, [authorInput]);

  // ── Fetch books + stats whenever filters change ──────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const readValue = readFilter === "" ? undefined : readFilter === "true";

      // Both requests fire in parallel — watch them in the Network tab
      const [booksData, statsData] = await Promise.all([
        fetchBooks({
          genre:  genreFilter  || undefined,
          author: activeAuthor || undefined,
          read:   readValue,
        }),
        fetchStats(),
      ]);

      setBooks(booksData);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [genreFilter, activeAuthor, readFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createBook(form);                // POST /books
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add book");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRead = async (book: Book) => {
    try {
      await toggleRead(book.id, !book.read); // PATCH /books/{id}/read
      loadData();
    } catch {
      alert("Failed to update read status");
    }
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      await deleteBook(book.id);             // DELETE /books/{id}
      loadData();
    } catch {
      alert("Failed to delete book");
    }
  };

  const genres = stats ? Object.keys(stats.genres).sort() : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className={styles.main}>

      {/* ── Header & stats ────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <h1>📚 Bookshelf</h1>
        {stats && (
          <div className={styles.statsBar}>
            <span className={styles.stat}>{stats.total_books} books</span>
            <span className={`${styles.stat} ${styles.statGreen}`}>
              {stats.books_read} read
            </span>
            <span className={styles.stat}>{stats.books_unread} unread</span>
            <span className={styles.stat}>★ {stats.average_rating} avg</span>
          </div>
        )}
      </header>

      {/* ── Filters & add button ───────────────────────────────────────────── */}
      <div className={styles.controls}>
        <input
          className={styles.input}
          type="text"
          placeholder="Search author…"
          value={authorInput}
          onChange={e => setAuthorInput(e.target.value)}
        />
        <select
          className={styles.select}
          value={genreFilter}
          onChange={e => setGenreFilter(e.target.value)}
        >
          <option value="">All genres</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          className={styles.select}
          value={readFilter}
          onChange={e => setReadFilter(e.target.value as "" | "true" | "false")}
        >
          <option value="">All</option>
          <option value="true">Read</option>
          <option value="false">Unread</option>
        </select>
        <button
          className={styles.btnPrimary}
          onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); }}
        >
          {showForm ? "✕ Cancel" : "+ Add Book"}
        </button>
      </div>

      {/* ── Add book form ─────────────────────────────────────────────────── */}
      {showForm && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <h3>New Book</h3>
          <div className={styles.formGrid}>
            <input className={styles.input} required placeholder="Title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className={styles.input} required placeholder="Author"
              value={form.author}
              onChange={e => setForm({ ...form, author: e.target.value })} />
            <input className={styles.input} required placeholder="Genre (e.g. Sci-Fi)"
              value={form.genre}
              onChange={e => setForm({ ...form, genre: e.target.value })} />
            <input className={styles.input} required type="number"
              placeholder="Year" min={1000} max={2100}
              value={form.year}
              onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
            <input className={styles.input} type="number"
              placeholder="Rating (0–5)" min={0} max={5} step={0.1}
              value={form.rating}
              onChange={e => setForm({ ...form, rating: Number(e.target.value) })} />
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.read}
                onChange={e => setForm({ ...form, read: e.target.checked })} />
              Already read
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Adding…" : "Add Book"}
            </button>
            <button type="button" className={styles.btnSecondary}
              onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.error}>
          ⚠️ {error} — is the FastAPI server running?{" "}
          <code>uvicorn main:app --reload</code>
        </div>
      )}

      {/* ── Books table ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Genre</th>
                <th>Year</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>No books found.</td>
                </tr>
              ) : books.map(book => (
                <tr key={book.id} className={book.read ? styles.rowRead : ""}>
                  <td className={styles.titleCell}>{book.title}</td>
                  <td>{book.author}</td>
                  <td>
                    <span className={styles.genreBadge}>{book.genre}</span>
                  </td>
                  <td>{book.year}</td>
                  <td className={styles.ratingCell}>
                    {"★".repeat(Math.round(book.rating))}
                    {"☆".repeat(5 - Math.round(book.rating))}
                    {" "}{book.rating}
                  </td>
                  <td>
                    <button
                      className={book.read ? styles.btnRead : styles.btnUnread}
                      onClick={() => handleToggleRead(book)}
                    >
                      {book.read ? "✓ Read" : "○ Unread"}
                    </button>
                  </td>
                  <td>
                    <button
                      className={styles.btnDanger}
                      onClick={() => handleDelete(book)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.tableFooter}>
            {books.length} book{books.length !== 1 ? "s" : ""}
            {" · "}
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener">
              API Docs ↗
            </a>
            {" · "}
            <a href="http://localhost:8000/stats" target="_blank" rel="noopener">
              /stats JSON ↗
            </a>
          </p>
        </div>
      )}
    </main>
  );
}
