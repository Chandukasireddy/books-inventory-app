# Complete Guide: REST APIs, FastAPI & Swagger UI

> Everything from scratch — what REST APIs are, how FastAPI works, what Swagger does, how this project was built, and how to use it.

---

## Table of Contents

1. [What is an API?](#1-what-is-an-api)
2. [What is REST?](#2-what-is-rest)
3. [HTTP Methods — The Verbs of REST](#3-http-methods--the-verbs-of-rest)
4. [HTTP Status Codes](#4-http-status-codes)
5. [What is JSON?](#5-what-is-json)
6. [What is FastAPI?](#6-what-is-fastapi)
7. [What is Pydantic?](#7-what-is-pydantic)
8. [What is Swagger UI & ReDoc?](#8-what-is-swagger-ui--redoc)
9. [What is Uvicorn?](#9-what-is-uvicorn)
10. [How Everything Connects](#10-how-everything-connects)
11. [How This Project Was Built](#11-how-this-project-was-built)
12. [Project Structure](#12-project-structure)
13. [Code Walkthrough](#13-code-walkthrough)
14. [How to Run & Use the API](#14-how-to-run--use-the-api)
15. [Using Swagger UI](#15-using-swagger-ui)
16. [Testing with curl](#16-testing-with-curl)
17. [Key Concepts Recap](#17-key-concepts-recap)
18. [Next Steps](#18-next-steps)

---

## 1. What is an API?

**API** stands for **Application Programming Interface**.

Think of it like a waiter in a restaurant:
- You (the client) sit at a table and look at the menu
- You tell the waiter what you want
- The waiter goes to the kitchen (the server/backend) and brings back your food (the data)
- You never go into the kitchen directly

An API is the waiter — it's the defined way two pieces of software talk to each other.

### Real-world examples:
- When you open a weather app, it calls a weather API to get today's forecast
- When you log in with Google on another website, that website calls Google's API
- When you pay online, the website calls a payment API (like Stripe)

---

## 2. What is REST?

**REST** stands for **Representational State Transfer**. It's a set of rules (an architectural style) for building APIs over the web using HTTP.

A REST API uses the existing rules of the web (URLs, HTTP methods) to create a consistent, predictable way to interact with data.

### Core idea — Resources & URLs

In REST, everything is a **resource** — a thing you can interact with. Resources are identified by **URLs**.

```
https://yourapi.com/books          → the collection of all books
https://yourapi.com/books/42       → one specific book (id = 42)
https://yourapi.com/books/42/read  → the "read status" of book 42
```

### REST Rules (Constraints)

| Rule | What it means |
|---|---|
| **Client-Server** | The frontend (client) and backend (server) are separate. They only talk through the API. |
| **Stateless** | Each request is independent. The server doesn't remember previous requests. Every request must carry all the info needed. |
| **Uniform Interface** | All resources follow the same URL/method patterns. Predictable and consistent. |
| **JSON responses** | Data is sent and received as JSON (usually). |

---

## 3. HTTP Methods — The Verbs of REST

HTTP methods tell the server **what action** you want to perform on a resource. These map directly to **CRUD** operations.

| HTTP Method | CRUD Action | What it does | Example |
|---|---|---|---|
| `GET` | Read | Fetch data, no changes | `GET /books` — list all books |
| `POST` | Create | Send data to create something new | `POST /books` — add a new book |
| `PUT` | Update | Replace/update an existing resource | `PUT /books/42` — update book 42 |
| `PATCH` | Partial Update | Update just one field | `PATCH /books/42/read` — mark as read |
| `DELETE` | Delete | Remove a resource | `DELETE /books/42` — delete book 42 |

### Path Parameters vs Query Parameters

**Path parameters** — part of the URL, identify a specific resource:
```
GET /books/42        ← 42 is the path parameter (which book?)
```

**Query parameters** — after the `?`, used for filtering/searching:
```
GET /books?genre=Sci-Fi&limit=5    ← filter books by genre, max 5 results
```

---

## 4. HTTP Status Codes

When the server responds, it includes a **status code** — a 3-digit number that tells you if the request succeeded or failed.

| Code | Meaning | When you see it |
|---|---|---|
| `200 OK` | Success | `GET` or `PUT` worked fine |
| `201 Created` | Resource was created | After a successful `POST` |
| `204 No Content` | Success, nothing to return | After a successful `DELETE` |
| `400 Bad Request` | Your request had bad data | Sent wrong field names or types |
| `404 Not Found` | Resource doesn't exist | `GET /books/999` — book 999 doesn't exist |
| `422 Unprocessable Entity` | Validation failed | Missing required field in request body |
| `500 Internal Server Error` | Server crashed | Bug in the server code |

---

## 5. What is JSON?

**JSON** (JavaScript Object Notation) is the standard data format used in REST APIs. It's human-readable and language-agnostic.

A book as JSON:
```json
{
  "id": "a3f9...",
  "title": "Dune",
  "author": "Frank Herbert",
  "genre": "Sci-Fi",
  "year": 1965,
  "rating": 4.8,
  "read": true
}
```

A list of books:
```json
[
  { "id": "a3f9", "title": "Dune", ... },
  { "id": "b7c2", "title": "1984", ... }
]
```

---

## 6. What is FastAPI?

**FastAPI** is a modern Python web framework for building REST APIs. It's:

- **Fast to write** — minimal code, clean syntax
- **Fast to run** — one of the fastest Python frameworks (async support)
- **Auto-documented** — generates Swagger UI and ReDoc automatically
- **Type-safe** — uses Python type hints and Pydantic for validation

### How a basic FastAPI app looks:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def say_hello():
    return {"message": "Hello, world!"}
```

That's it. Three lines of real logic, and you have a working REST endpoint.

### The `@app.get("/hello")` part — Decorators

The `@app.get(...)` is a **decorator** — it tells FastAPI:
- `get` → this handles HTTP GET requests
- `"/hello"` → at this URL path

Other decorators: `@app.post()`, `@app.put()`, `@app.patch()`, `@app.delete()`

---

## 7. What is Pydantic?

**Pydantic** is a Python library for data validation using type hints. FastAPI uses it to define the shape (schema) of request bodies and responses.

```python
from pydantic import BaseModel, Field

class BookCreate(BaseModel):
    title: str                          # required, must be string
    author: str
    year: int = Field(ge=1000, le=2100) # must be between 1000 and 2100
    rating: float = 0.0                 # optional, defaults to 0.0
    read: bool = False
```

When someone sends a `POST /books` request:
- FastAPI reads the JSON body
- Pydantic validates it against `BookCreate`
- If a field is missing or wrong type → automatic `422 Unprocessable Entity` response
- If valid → your function receives a clean Python object

This means **you write zero validation code manually**. Pydantic handles it.

---

## 8. What is Swagger UI & ReDoc?

### OpenAPI Specification

FastAPI automatically generates an **OpenAPI spec** — a JSON document at `/openapi.json` that describes every endpoint, its parameters, request body schema, and response schema. This is the "blueprint" of your API.

### Swagger UI (`/docs`)

**Swagger UI** is an interactive web interface generated from the OpenAPI spec. It lets you:
- See all endpoints listed, grouped by tags
- Read what each endpoint does
- See what parameters it accepts
- See example request/response formats
- **Click "Try it out"** and send real HTTP requests directly from the browser

You don't need Postman, curl, or any other tool — you can test the entire API from `/docs`.

### ReDoc (`/redoc`)

**ReDoc** is an alternative documentation UI — cleaner, read-only, better for sharing as reference docs. Same data, different presentation.

### How FastAPI generates these automatically

When you write:
```python
@app.post("/books", response_model=Book, status_code=201, tags=["Books"])
def create_book(book: BookCreate):
    """Add a new book to the shelf."""
    ...
```

FastAPI reads:
- The decorator → method is `POST`, path is `/books`
- `tags=["Books"]` → groups this under "Books" in Swagger
- The docstring → shown as the endpoint description in Swagger
- `book: BookCreate` → request body schema comes from the Pydantic model
- `response_model=Book` → response schema comes from the `Book` model
- `status_code=201` → documented as the success response code

**Everything in Swagger UI is derived directly from your Python code.** No separate docs to maintain.

---

## 9. What is Uvicorn?

**Uvicorn** is an ASGI web server — it's what actually runs your FastAPI app and listens for HTTP requests.

Think of it this way:
- **FastAPI** is the application (the logic, routes, models)
- **Uvicorn** is the server (listens on a port, handles connections, passes requests to FastAPI)

```
Browser → HTTP request → Uvicorn (port 8000) → FastAPI → your function → response → Uvicorn → Browser
```

### The `--reload` flag

```bash
uvicorn main:app --reload
```

`--reload` tells Uvicorn to watch your files for changes and restart automatically. Use this during development — never in production.

---

## 10. How Everything Connects

Here's the full picture of how all the pieces fit together:

```
┌─────────────────────────────────────────────────────┐
│                    Your Browser                      │
│                                                      │
│  http://127.0.0.1:8000/docs   ← Swagger UI          │
│  http://127.0.0.1:8000/books  ← API endpoint        │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP Request
                    ▼
┌─────────────────────────────────────────────────────┐
│                   Uvicorn (Server)                   │
│         Listens on port 8000, handles TCP            │
└───────────────────┬─────────────────────────────────┘
                    │ Passes request to app
                    ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI (Application)               │
│                                                      │
│  1. Matches URL + method to the right function       │
│  2. Extracts path/query params                       │
│  3. Parses + validates JSON body with Pydantic       │
│  4. Calls your function                              │
│  5. Serializes return value to JSON                  │
│  6. Adds status code and headers                     │
└───────────────────┬─────────────────────────────────┘
                    │ Calls your route function
                    ▼
┌─────────────────────────────────────────────────────┐
│              Your Code (main.py)                     │
│                                                      │
│  def create_book(book: BookCreate):                  │
│      book_id = str(uuid4())                          │
│      db[book_id] = Book(id=book_id, **book...)       │
│      return db[book_id]          ← returned as JSON  │
└───────────────────┬─────────────────────────────────┘
                    │ Reads/writes
                    ▼
┌─────────────────────────────────────────────────────┐
│           In-Memory Store (Python dict)              │
│                                                      │
│  db = { "uuid1": Book(...), "uuid2": Book(...) }     │
└─────────────────────────────────────────────────────┘
```

**Separately, Swagger UI is served at `/docs`:**

```
FastAPI → generates OpenAPI JSON (/openapi.json)
        → serves Swagger UI at /docs (reads that JSON)
        → serves ReDoc at /redoc (reads that JSON)
```

---

## 11. How This Project Was Built

### Step 1 — Created the project folder
```
K:\Tech\Projects\api-learn\
```

### Step 2 — Defined dependencies (`requirements.txt`)
```
fastapi      ← the framework
uvicorn      ← the server
pydantic     ← data validation (comes with fastapi, listed explicitly)
```

### Step 3 — Created a virtual environment
```bash
python -m venv venv
```
A virtual environment isolates this project's packages from your global Python. Keeps things clean.

### Step 4 — Installed dependencies
```bash
pip install -r requirements.txt
```

### Step 5 — Wrote `main.py`

The entire API lives in one file for simplicity. Here's the design process:

**What resource are we managing?** → Books

**What operations do we need?**
- List all books → `GET /books`
- Get one book → `GET /books/{id}`
- Create a book → `POST /books`
- Update a book → `PUT /books/{id}`
- Toggle read → `PATCH /books/{id}/read`
- Delete a book → `DELETE /books/{id}`
- Stats summary → `GET /stats`

**What does a Book look like?** → Designed the Pydantic schema

**Where does data live?** → A Python `dict` (in-memory, no DB needed to start)

### Step 6 — Seeded sample data
Added 4 books on startup so the API isn't empty when you first open it.

### Step 7 — Run
```bash
uvicorn main:app --reload
```

---

## 12. Project Structure

```
api-learn/
│
├── main.py            ← The entire API: routes, models, in-memory DB, app config
├── requirements.txt   ← Python package dependencies
├── README.md          ← Quick start guide
├── DOCS.md            ← This file — full documentation
│
└── venv/              ← Virtual environment (auto-generated, don't edit)
```

---

## 13. Code Walkthrough

### App initialization

```python
app = FastAPI(
    title="Bookshelf API",
    description="A simple REST API to manage your personal book collection.",
    version="1.0.0",
)
```
This creates the FastAPI app and sets the metadata shown in Swagger UI.

---

### Pydantic Models (Schemas)

```python
class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, example="Dune")
    author: str = Field(..., min_length=1, max_length=100)
    genre: str
    year: int = Field(..., ge=1000, le=2100)  # ge = greater or equal, le = less or equal
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    read: bool = Field(default=False)
```

- `Field(...)` → the `...` means **required** (no default)
- `Field(default=0.0)` → optional, defaults to 0.0
- `min_length`, `max_length`, `ge`, `le` → validation constraints
- `example=` → shown in Swagger UI as the example value

```python
class Book(BookCreate):
    id: str  # inherits all BookCreate fields + adds id
```

Why two models?
- `BookCreate` = what the **client sends** (no id — server generates it)
- `Book` = what the **server returns** (includes the generated id)

---

### In-Memory Database

```python
db: dict[str, Book] = {}
```

Just a Python dictionary. The key is the book's UUID string, the value is the Book object.
Simple, zero setup — perfect for learning. In a real app, this would be a database (PostgreSQL, SQLite, etc.).

---

### A GET endpoint (Read)

```python
@app.get("/books", response_model=list[Book], tags=["Books"])
def list_books(
    genre: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=100),
):
    results = list(db.values())
    if genre:
        results = [b for b in results if b.genre.lower() == genre.lower()]
    return results[:limit]
```

- `response_model=list[Book]` → FastAPI will serialize the return value as a list of Book objects
- `Query(None)` → this is a query parameter, optional, defaults to None
- `Query(100, ge=1, le=100)` → query param with default 100, must be 1–100

---

### A POST endpoint (Create)

```python
@app.post("/books", response_model=Book, status_code=status.HTTP_201_CREATED, tags=["Books"])
def create_book(book: BookCreate):
    book_id = str(uuid4())           # generate a unique ID
    new_book = Book(id=book_id, **book.model_dump())  # merge id + book fields
    db[book_id] = new_book           # save to in-memory store
    return new_book                  # FastAPI serializes this to JSON
```

- `book: BookCreate` → FastAPI reads the JSON request body and validates it as `BookCreate`
- `uuid4()` → generates a random unique identifier like `"a3f9b2c1-..."`
- `**book.model_dump()` → unpacks the Pydantic model into a dict

---

### A DELETE endpoint

```python
@app.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Books"])
def delete_book(book_id: str):
    if book_id not in db:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found.")
    del db[book_id]
    # no return needed — 204 means "success, no content"
```

- `{book_id}` in the path → FastAPI extracts it and passes it as the `book_id` parameter
- `HTTPException` → FastAPI turns this into the right HTTP error response
- `204 No Content` → standard for successful deletes (nothing to return)

---

## 14. How to Run & Use the API

### First time setup

```bash
# Navigate to the project
cd K:\Tech\Projects\api-learn

# Activate the virtual environment (Windows)
venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt
```

### Start the server

```bash
uvicorn main:app --reload
```

You'll see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Available URLs

| URL | Purpose |
|---|---|
| http://127.0.0.1:8000/ | Root — welcome message |
| http://127.0.0.1:8000/books | List all books |
| http://127.0.0.1:8000/stats | Bookshelf stats |
| http://127.0.0.1:8000/docs | **Swagger UI** (interactive docs) |
| http://127.0.0.1:8000/redoc | **ReDoc** (reference docs) |
| http://127.0.0.1:8000/openapi.json | Raw OpenAPI spec (JSON) |

---

## 15. Using Swagger UI

Open **http://127.0.0.1:8000/docs**

### What you'll see:
- The API title, description, and version at the top
- Endpoints grouped by **tags** (Books, Stats, Root)
- Each endpoint shows its method (green=GET, blue=POST, orange=PUT, etc.) and path

### How to try an endpoint:

1. Click on any endpoint to expand it
2. Click **"Try it out"** button (top right of the endpoint)
3. Fill in any parameters or request body
4. Click **"Execute"**
5. See the real HTTP response: status code, headers, and JSON body

### Example — Add a new book:

1. Expand `POST /books`
2. Click **Try it out**
3. The request body field appears pre-filled with the example values
4. Edit the JSON to your book:
   ```json
   {
     "title": "Atomic Habits",
     "author": "James Clear",
     "genre": "Self-help",
     "year": 2018,
     "rating": 4.9,
     "read": true
   }
   ```
5. Click **Execute**
6. See the `201 Created` response with the new book including its generated `id`

### Example — Filter books by genre:

1. Expand `GET /books`
2. Click **Try it out**
3. In the `genre` field type `Sci-Fi`
4. Click **Execute**
5. See only Sci-Fi books returned

---

## 16. Testing with curl

If you prefer the terminal over Swagger UI, here are the curl commands:

```bash
# List all books
curl http://127.0.0.1:8000/books

# Filter by genre
curl "http://127.0.0.1:8000/books?genre=Sci-Fi"

# Get stats
curl http://127.0.0.1:8000/stats

# Add a new book
curl -X POST http://127.0.0.1:8000/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Atomic Habits", "author": "James Clear", "genre": "Self-help", "year": 2018, "rating": 4.9, "read": true}'

# Update a book (replace YOUR_ID with an actual id from the list)
curl -X PUT http://127.0.0.1:8000/books/YOUR_ID \
  -H "Content-Type: application/json" \
  -d '{"rating": 5.0}'

# Mark a book as read
curl -X PATCH "http://127.0.0.1:8000/books/YOUR_ID/read?read=true"

# Delete a book
curl -X DELETE http://127.0.0.1:8000/books/YOUR_ID
```

---

## 17. Key Concepts Recap

| Term | Simple definition |
|---|---|
| **API** | A defined way for two programs to talk to each other |
| **REST** | Rules for building APIs using URLs and HTTP methods |
| **HTTP Method** | The action (GET=read, POST=create, PUT=update, DELETE=delete) |
| **Endpoint** | A specific URL + method combination, e.g. `GET /books` |
| **Request Body** | JSON data sent by the client (e.g. the new book's fields) |
| **Response** | JSON data returned by the server + a status code |
| **Path Parameter** | Variable part of the URL: `/books/{id}` |
| **Query Parameter** | Filters after `?`: `/books?genre=Sci-Fi` |
| **Status Code** | 3-digit number telling you if it worked (200, 201, 404, etc.) |
| **Pydantic** | Python library that validates data shapes using type hints |
| **Schema** | The defined shape/structure of a data object |
| **FastAPI** | Python framework for building REST APIs |
| **Uvicorn** | The server that runs your FastAPI app |
| **OpenAPI** | A standard format for describing REST APIs |
| **Swagger UI** | Interactive browser UI for exploring and testing an API |
| **ReDoc** | Clean read-only documentation UI |
| **CRUD** | Create, Read, Update, Delete — the four basic data operations |
| **UUID** | Universally Unique Identifier — a random unique ID string |
| **Virtual Environment** | Isolated Python package sandbox per project |

---

## 18. Next Steps

Now that you understand the fundamentals, here's a natural learning path:

### Level 2 — Add a Real Database
Replace the in-memory dict with **SQLite** using SQLAlchemy or **Tortoise ORM**.
```bash
pip install sqlalchemy
```

### Level 3 — Split Into Multiple Files
As the app grows, split into:
```
api-learn/
├── main.py
├── database.py     ← DB connection
├── models.py       ← SQLAlchemy models
├── schemas.py      ← Pydantic schemas
└── routers/
    ├── books.py    ← Book routes
    └── stats.py    ← Stats routes
```

### Level 4 — Add Authentication
Protect endpoints with **JWT tokens**:
```bash
pip install python-jose passlib
```

### Level 5 — Write Tests
Use `pytest` + `httpx` to test your API:
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_list_books():
    response = client.get("/books")
    assert response.status_code == 200
```

### Level 6 — Deploy
Free deployment options:
- **Railway** — push to GitHub, auto-deploys
- **Render** — same, very simple setup
- **Fly.io** — more control, still free tier

---

*Built with FastAPI · Documented for learning · `api-learn` project*
