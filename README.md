# Job Tracker

A full-stack web app for tracking job applications through a pipeline (Wishlist, Applied, Interviewing, Offer, Rejected). Built with React, Node/Express, and PostgreSQL, and containerized with Docker.

![CI](https://github.com/<your-username>/job-tracker/actions/workflows/ci.yml/badge.svg)

## Features

- Add, search, move, and delete applications on a five-column board
- RESTful JSON API with input validation and consistent error responses
- PostgreSQL storage with a schema-level `CHECK` constraint on status and an index on the filter column
- Automated tests (unit + API) and a GitHub Actions CI pipeline
- One-command startup with Docker Compose

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 18, Vite, plain CSS                    |
| Backend  | Node.js 20, Express 4, `pg`                  |
| Database | PostgreSQL 16                                |
| Testing  | Jest, Supertest                              |
| DevOps   | Docker, Docker Compose, GitHub Actions (CI)  |

## Architecture

```
React (Vite / nginx)  --/api-->  Express routes  -->  Repository  -->  PostgreSQL
                                  (validation)        (SQL layer)
```

The Express app is built by `createApp(repository)`. Production injects the PostgreSQL repository and the tests inject an in-memory one with the same interface, so the whole HTTP layer is tested without a database.

## Run with Docker (recommended)

```bash
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:4000/api/health

## Run locally without Docker

You need Node 20+ and a running PostgreSQL instance.

```bash
# 1. Create a database
createdb jobtracker

# 2. Backend (tables are created automatically on start)
cd backend
npm install
DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobtracker npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api to port 4000
```

## Tests

```bash
cd backend
npm test
```

19 tests cover input validation, every endpoint, filtering, and error handling (400, 404, malformed JSON).

## API

| Method | Endpoint                 | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | `/api/health`            | Health check                                 |
| GET    | `/api/applications`      | List applications (optional `?status=offer`) |
| GET    | `/api/applications/:id`  | Get one application                          |
| POST   | `/api/applications`      | Create an application                        |
| PATCH  | `/api/applications/:id`  | Update any subset of fields                  |
| DELETE | `/api/applications/:id`  | Delete an application                        |
| GET    | `/api/stats`             | Count of applications per status             |

Example:

```bash
curl -X POST http://localhost:4000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"company":"Benda Infotech","role":"Software Engineer","status":"applied"}'
```

Validation errors return `400` with per-field details:

```json
{ "error": "Validation failed", "details": { "company": "company is required" } }
```

## Design decisions

- **Parameterized SQL only.** Dynamic `UPDATE` columns come from a whitelist, so user input never reaches the query text.
- **Repository pattern.** Keeps SQL out of the route handlers and makes the API testable without a database.
- **Validation in one module.** The same rules serve `POST` (full) and `PATCH` (partial).
- **Idempotent schema setup.** The API creates its tables on startup and retries while the database boots.

## Roadmap

- [ ] User accounts and JWT authentication
- [ ] Edit application details from the UI
- [ ] Interview reminders and follow-up dates
- [ ] Frontend component tests (Vitest + Testing Library)
- [ ] Database integration tests in CI using a Postgres service container
