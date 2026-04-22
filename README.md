# OpenTask

A full-stack study productivity app built with **Django REST Framework** and **Next.js**. Users can manage study pages, tasks, subtasks, and image attachments with JWT-based authentication — including Google OAuth login.

---

## Tech Stack

**Backend**
- Python / Django 6
- Django REST Framework
- Simple JWT (authentication)
- django-allauth + Google OAuth 2.0
- SQLite (default database)
- django-cors-headers

**Frontend**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

---

## Project Structure

```
OpenTask/
├── backend/
│   ├── config/        # Django project settings and URLs
│   ├── core/          # Pages module (models, views, serializers)
│   ├── tasks/         # Tasks, subtasks, and image uploads
│   └── users/         # Custom user model, registration, and auth
├── frontend/
│   └── src/
│       ├── app/       # Next.js App Router pages (login, dashboard)
│       └── components/
├── requirements.txt
└── .env.example
```

---

## Quick Start

**Prerequisites:** Python 3.10+ and Node.js 18+

Open two terminals and run:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 — Frontend**
```bash
cd frontend && npm run dev
```

---

## Getting Started

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Fill in the required values in .env

# Run migrations and start the server
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts |
| `CORS_ALLOW_ALL_ORIGINS` | `True` to allow all CORS origins (dev only) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

---

## API Endpoints

### Auth — `/api/users/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/users/register/` | Public | Register a new user |
| `POST` | `/api/users/login/` | Public | Obtain JWT tokens (email + password) |
| `POST` | `/api/users/login/google/` | Public | Obtain JWT tokens via Google ID token |
| `POST` | `/api/users/refresh/` | Public | Refresh access token |
| `POST` | `/api/users/check-username/` | Public | Check if a username is already taken |

### Pages — `/api/pages/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/pages/` | 🔒 | List or create study pages |
| `GET/PUT/DELETE` | `/api/pages/<id>/` | 🔒 | Retrieve, update, or delete a page |

### Tasks — `/api/tasks/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/tasks/tasks/` | 🔒 | List or create tasks |
| `GET/PUT/DELETE` | `/api/tasks/tasks/<id>/` | 🔒 | Retrieve, update, or delete a task |
| `POST` | `/api/tasks/tasks/<id>/upload_images/` | 🔒 | Upload one or more images to a task |
| `GET/POST` | `/api/tasks/subtasks/` | 🔒 | List or create subtasks |
| `GET/PUT/DELETE` | `/api/tasks/subtasks/<id>/` | 🔒 | Retrieve, update, or delete a subtask |

> 🔒 Protected endpoints require an `Authorization: Bearer <access_token>` header.

---

## Authentication

OpenTask supports two login methods:

**Email + Password** — Standard registration and login via `/api/users/register/` and `/api/users/login/`.

**Google OAuth** — Send a Google ID token to `/api/users/login/google/`. The backend validates it against Google's token info endpoint and returns JWT tokens. New users are created automatically on first login.

JWT access tokens expire after **60 minutes**; refresh tokens are valid for **7 days**.

---

## Data Models

### CustomUser
- `email` (unique, used as login identifier)
- `username`
- `google_id` (optional, for OAuth users)
- `avatar_url` (optional, from Google profile)

### Page
- `title`
- `user` (owner)
- `creation_date`

### Task
- `title`
- `completed` (boolean)
- `user` (owner)
- `created_at`

### SubTask
- `title`
- `completed` (boolean)
- `task` (parent task)
- `created_at`

### TaskImage
- `image` (file upload, stored under `tasks/`)
- `task` (parent task)
- `uploaded_at`
