"""
Tests for the Bookshelf API
===========================
Uses FastAPI's TestClient (built on httpx) — no real server needed.
The client sends real HTTP requests but everything runs in-process.

Run:  venv/Scripts/pytest test_main.py -v
"""

import pytest
from fastapi.testclient import TestClient
import main as app_module
from main import app

# ── Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch):
    """
    Give every test its own temp file database so tests are fully isolated.

    Why not ":memory:"?  SQLite's in-memory DB is per-connection — each
    call to sqlite3.connect(":memory:") opens a brand new empty database,
    so the table created in init_db() would vanish by the time a route runs.
    A temp file shares state across connections within one test.
    """
    db_file = str(tmp_path / "test_books.db")
    monkeypatch.setattr(app_module, "DB_PATH", db_file)  # patch before init
    app_module.init_db()   # create schema + seed 8 books in the temp file
    yield
    # tmp_path is cleaned up automatically by pytest after the test


@pytest.fixture
def client():
    return TestClient(app)


# ── Helper ────────────────────────────────────────────────────────────────

def add_book(client, **kwargs) -> dict:
    """POST a book and return the JSON response body."""
    payload = {
        "title":  kwargs.get("title",  "Test Book"),
        "author": kwargs.get("author", "Test Author"),
        "genre":  kwargs.get("genre",  "Testing"),
        "year":   kwargs.get("year",   2024),
        "rating": kwargs.get("rating", 3.0),
        "read":   kwargs.get("read",   False),
    }
    res = client.post("/books", json=payload)
    assert res.status_code == 201
    return res.json()


# ── Root ──────────────────────────────────────────────────────────────────

class TestRoot:
    def test_welcome_message(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        assert "total_books" in data

    def test_total_books_matches_seed(self, client):
        # init_db seeds 8 books
        res = client.get("/")
        assert res.json()["total_books"] == 8


# ── GET /books ────────────────────────────────────────────────────────────

class TestListBooks:
    def test_returns_all_seeded_books(self, client):
        res = client.get("/books")
        assert res.status_code == 200
        assert len(res.json()) == 8

    def test_filter_by_genre(self, client):
        res = client.get("/books?genre=Sci-Fi")
        assert res.status_code == 200
        books = res.json()
        assert len(books) > 0
        assert all(b["genre"] == "Sci-Fi" for b in books)

    def test_filter_genre_case_insensitive(self, client):
        lower = client.get("/books?genre=sci-fi").json()
        upper = client.get("/books?genre=Sci-Fi").json()
        assert len(lower) == len(upper)

    def test_filter_by_author_partial(self, client):
        res = client.get("/books?author=tolkien")
        books = res.json()
        assert len(books) == 1
        assert "Tolkien" in books[0]["author"]

    def test_filter_read_true(self, client):
        res = client.get("/books?read=true")
        books = res.json()
        assert len(books) > 0
        assert all(b["read"] is True for b in books)

    def test_filter_read_false(self, client):
        res = client.get("/books?read=false")
        books = res.json()
        assert all(b["read"] is False for b in books)

    def test_limit_param(self, client):
        res = client.get("/books?limit=3")
        assert len(res.json()) == 3

    def test_limit_max_is_100(self, client):
        res = client.get("/books?limit=999")
        assert res.status_code == 422   # FastAPI validation error


# ── GET /books/{id} ───────────────────────────────────────────────────────

class TestGetBook:
    def test_get_existing_book(self, client):
        created = add_book(client, title="Found It")
        res = client.get(f"/books/{created['id']}")
        assert res.status_code == 200
        assert res.json()["title"] == "Found It"

    def test_get_missing_book_returns_404(self, client):
        res = client.get("/books/does-not-exist")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


# ── POST /books ───────────────────────────────────────────────────────────

class TestCreateBook:
    def test_creates_book_and_returns_201(self, client):
        payload = {
            "title": "New Book", "author": "Someone",
            "genre": "Drama", "year": 2020,
        }
        res = client.post("/books", json=payload)
        assert res.status_code == 201
        body = res.json()
        assert body["title"] == "New Book"
        assert "id" in body               # server generated an id

    def test_new_book_persists_in_list(self, client):
        book = add_book(client, title="Persisted")
        ids = [b["id"] for b in client.get("/books").json()]
        assert book["id"] in ids

    def test_missing_required_field_returns_422(self, client):
        res = client.post("/books", json={"title": "No author"})
        assert res.status_code == 422

    def test_rating_defaults_to_zero(self, client):
        res = client.post("/books", json={
            "title": "No Rating", "author": "A", "genre": "X", "year": 2000,
        })
        assert res.json()["rating"] == 0.0

    def test_read_defaults_to_false(self, client):
        res = client.post("/books", json={
            "title": "Unread", "author": "A", "genre": "X", "year": 2000,
        })
        assert res.json()["read"] is False

    def test_rating_above_5_returns_422(self, client):
        res = client.post("/books", json={
            "title": "Bad Rating", "author": "A", "genre": "X",
            "year": 2000, "rating": 9.9,
        })
        assert res.status_code == 422


# ── PUT /books/{id} ───────────────────────────────────────────────────────

class TestUpdateBook:
    def test_update_title(self, client):
        book = add_book(client, title="Old Title")
        res = client.put(f"/books/{book['id']}", json={"title": "New Title"})
        assert res.status_code == 200
        assert res.json()["title"] == "New Title"

    def test_unset_fields_are_unchanged(self, client):
        book = add_book(client, title="Keep Me", author="Original Author")
        client.put(f"/books/{book['id']}", json={"title": "Updated Title"})
        updated = client.get(f"/books/{book['id']}").json()
        assert updated["author"] == "Original Author"   # untouched

    def test_update_missing_book_returns_404(self, client):
        res = client.put("/books/ghost", json={"title": "x"})
        assert res.status_code == 404


# ── PATCH /books/{id}/read ────────────────────────────────────────────────

class TestMarkRead:
    def test_mark_as_read(self, client):
        book = add_book(client, read=False)
        res = client.patch(f"/books/{book['id']}/read?read=true")
        assert res.status_code == 200
        assert res.json()["read"] is True

    def test_mark_as_unread(self, client):
        book = add_book(client, read=True)
        res = client.patch(f"/books/{book['id']}/read?read=false")
        assert res.json()["read"] is False

    def test_mark_read_missing_book_returns_404(self, client):
        res = client.patch("/books/ghost/read")
        assert res.status_code == 404


# ── DELETE /books/{id} ────────────────────────────────────────────────────

class TestDeleteBook:
    def test_delete_returns_204(self, client):
        book = add_book(client)
        res = client.delete(f"/books/{book['id']}")
        assert res.status_code == 204

    def test_deleted_book_is_gone(self, client):
        book = add_book(client)
        client.delete(f"/books/{book['id']}")
        res = client.get(f"/books/{book['id']}")
        assert res.status_code == 404

    def test_delete_missing_book_returns_404(self, client):
        res = client.delete("/books/ghost")
        assert res.status_code == 404


# ── GET /stats ────────────────────────────────────────────────────────────

class TestStats:
    def test_stats_structure(self, client):
        res = client.get("/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_books" in data
        assert "books_read" in data
        assert "books_unread" in data
        assert "average_rating" in data
        assert "genres" in data

    def test_read_plus_unread_equals_total(self, client):
        data = client.get("/stats").json()
        assert data["books_read"] + data["books_unread"] == data["total_books"]

    def test_stats_reflect_new_book(self, client):
        before = client.get("/stats").json()["total_books"]
        add_book(client)
        after  = client.get("/stats").json()["total_books"]
        assert after == before + 1

    def test_stats_reflect_deleted_book(self, client):
        book = add_book(client)
        before = client.get("/stats").json()["total_books"]
        client.delete(f"/books/{book['id']}")
        after  = client.get("/stats").json()["total_books"]
        assert after == before - 1

    def test_genres_dict_is_populated(self, client):
        genres = client.get("/stats").json()["genres"]
        assert isinstance(genres, dict)
        assert len(genres) > 0
