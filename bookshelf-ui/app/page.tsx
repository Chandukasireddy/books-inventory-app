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
  Book, BookCreate, BookUpdate, Stats,
  fetchBooks, fetchStats, createBook, updateBook, deleteBook, toggleRead,
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

  // ── Edit-book form state ──────────────────────────────────────────────────
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState<BookUpdate>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

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

  const handleEdit = (book: Book) => {
    setEditBook(book);
    setEditForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      year: book.year,
      rating: book.rating,
      read: book.read,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBook) return;
    setEditSaving(true);
    try {
      await updateBook(editBook.id, editForm); // PUT /books/{id}
      setEditBook(null);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update book");
    } finally {
      setEditSaving(false);
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

      {/* ── Edit book form (modal) ──────────────────────────────────────────── */}
      {editBook && (
        <form className={styles.addForm} onSubmit={handleSaveEdit}>
          <h3>Edit Book</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Title</label>
              <input className={styles.input} required placeholder="Enter book title"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Author</label>
              <input className={styles.input} required placeholder="Author name"
                value={editForm.author}
                onChange={e => setEditForm({ ...editForm, author: e.target.value })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Genre</label>
              <input className={styles.input} required placeholder="e.g. Sci-Fi, Fantasy"
                value={editForm.genre}
                onChange={e => setEditForm({ ...editForm, genre: e.target.value })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Year</label>
              <input className={styles.input} required type="number"
                placeholder="Publication year" min={1000} max={2100}
                value={editForm.year}
                onChange={e => setEditForm({ ...editForm, year: Number(e.target.value) })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Rating</label>
              <input className={styles.input} type="number"
                placeholder="0 to 5 stars" min={0} max={5} step={0.1}
                value={editForm.rating}
                onChange={e => setEditForm({ ...editForm, rating: Number(e.target.value) })} />
            </div>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={editForm.read}
                onChange={e => setEditForm({ ...editForm, read: e.target.checked })} />
              <span>Already read this book</span>
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" className={styles.btnSecondary}
              onClick={() => setEditBook(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Add book form ─────────────────────────────────────────────────── */}
      {showForm && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <h3>New Book</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Title <span style={{color: "#ef4444"}}>*</span></label>
              <input className={styles.input} required placeholder="Enter book title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Author <span style={{color: "#ef4444"}}>*</span></label>
              <input className={styles.input} required placeholder="Author name"
                value={form.author}
                onChange={e => setForm({ ...form, author: e.target.value })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Genre <span style={{color: "#ef4444"}}>*</span></label>
              <input className={styles.input} required placeholder="e.g. Sci-Fi, Fantasy"
                value={form.genre}
                onChange={e => setForm({ ...form, genre: e.target.value })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Year <span style={{color: "#ef4444"}}>*</span></label>
              <input className={styles.input} required type="number"
                placeholder="Publication year" min={1000} max={2100}
                value={form.year}
                onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Rating</label>
              <input className={styles.input} type="number"
                placeholder="0 to 5 stars" min={0} max={5} step={0.1}
                value={form.rating}
                onChange={e => setForm({ ...form, rating: Number(e.target.value) })} />
            </div>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.read}
                onChange={e => setForm({ ...form, read: e.target.checked })} />
              <span>Already read this book</span>
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

      {/* ── Books grid (card layout) ──────────────────────────────────────── */}
      {loading ? (
        <div className={styles.loading}>⏳ Loading your books...</div>
      ) : books.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>📚 No books found</h2>
          <p>Try adjusting your filters or add a new book to get started!</p>
        </div>
      ) : (
        <>
          <div className={styles.booksContainer}>
            {books.map(book => (
              <div key={book.id} className={`${styles.bookCard} ${book.read ? styles.read : ""}`}>
                <div>
                  <h2 className={styles.bookTitle}>{book.title}</h2>
                  <p className={styles.bookAuthor}>by {book.author}</p>
                  
                  <div className={styles.bookMeta}>
                    <span className={styles.bookGenre}>{book.genre}</span>
                    <span className={styles.bookYear}>{book.year}</span>
                  </div>

                  <div className={styles.bookRating}>
                    {"★".repeat(Math.round(book.rating))}
                    {"☆".repeat(5 - Math.round(book.rating))}
                    <span style={{ fontSize: "0.9rem", marginLeft: "8px", color: "#6b7280" }}>
                      {book.rating.toFixed(1)}
                    </span>
                  </div>

                  {book.read && (
                    <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "#10b981", fontWeight: 600 }}>
                      ✓ Already read
                    </p>
                  )}
                </div>

                <div className={styles.bookActions}>
                  <button
                    className={book.read ? styles.btnRead : styles.btnUnread}
                    onClick={() => handleToggleRead(book)}
                  >
                    {book.read ? "✓ Read" : "○ Unread"}
                  </button>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => handleEdit(book)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.btnDanger}
                    onClick={() => handleDelete(book)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className={styles.booksFooter}>
            {books.length} book{books.length !== 1 ? "s" : ""} in your library
            {" · "}
            <a href="https://books-inventory-app.onrender.com/docs" target="_blank" rel="noopener">
              🔗 API Docs
            </a>
            {" · "}
            <a href="https://books-inventory-app.onrender.com/stats" target="_blank" rel="noopener">
              📊 Stats JSON
            </a>
          </p>
        </>
      )}
    </main>
  );
}
