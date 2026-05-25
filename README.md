# OpenTask

A full-stack collaborative productivity app built with **Django REST Framework** and **Next.js**. Users can manage personal tasks, study pages, files, and collaborate in groups — with group tasks, file sharing, member roles, friend requests, and a Kanban/Excalidraw board. Supports JWT authentication and Google OAuth login.

**🚀 Live demo:** [opentask-davi-sudekums-projects.vercel.app](https://opentask-davi-sudekums-projects.vercel.app/login)

---

## Tech Stack

**Backend**
- Python / Django 6
- Django REST Framework
- Simple JWT (authentication)
- django-allauth + Google OAuth 2.0
- PostgreSQL
- Cloudinary (file & image uploads)
- django-cors-headers
- Gunicorn

**Frontend**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Excalidraw (collaborative whiteboard)

---

## Project Structure

```
OpenTask/
├── backend/
│   ├── config/        # Django settings, main URLs, ASGI/WSGI
│   ├── core/          # Pages and Notifications
│   ├── tasks/         # Personal tasks, subtasks, and Excalidraw board
│   ├── files/         # File uploads (personal and task-attached)
│   ├── users/         # Custom user model, registration, and auth
│   ├── friends/       # Friend requests and friend list
│   └── groups/        # Groups, members, roles, group tasks, and group files
├── frontend/
│   └── src/
│       ├── app/       # Next.js App Router pages (login, dashboard, auth callback)
│       └── components/ # TaskView, TeamsView, DocsView, Excalidraw wrappers
└── package.json
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
cp .env.sample .env
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

### Backend — `backend/.env`

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts |
| `CORS_ALLOW_ALL_ORIGINS` | `True` to allow all CORS origins (dev only) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host (default: `localhost`) |
| `DB_PORT` | PostgreSQL port (default: `5432`) |
| `CLOUDI_NAME` | Cloudinary cloud name |
| `CLOUDI_API_KEY` | Cloudinary API key |
| `CLOUDI_API_SECRET` | Cloudinary API secret |

### Frontend — `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:8000/api`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |

---

## API Endpoints

> 🔒 All protected endpoints require an `Authorization: Bearer <access_token>` header.

### Auth — `/api/users/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/users/register/` | Public | Register a new user |
| `POST` | `/api/users/login/` | Public | Obtain JWT tokens (email + password) |
| `POST` | `/api/users/login/google/` | Public | Obtain JWT tokens via Google ID token |
| `POST` | `/api/users/refresh/` | Public | Refresh access token |
| `POST` | `/api/users/check-username/` | Public | Check if a username is taken |
| `GET` | `/api/users/me/` | 🔒 | Get authenticated user's profile |
| `PATCH` | `/api/users/me/username/` | 🔒 | Set or update username |

### Pages — `/api/core/pages/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/core/pages/` | 🔒 | List or create study pages |
| `GET/PUT/PATCH/DELETE` | `/api/core/pages/<id>/` | 🔒 | Retrieve, update, or delete a page |

### Notifications — `/api/core/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/core/notifications/` | 🔒 | List unread notifications |
| `POST` | `/api/core/notifications/mark-read/` | 🔒 | Mark all notifications as read |

### Tasks — `/api/tasks/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/tasks/` | 🔒 | List or create personal tasks |
| `GET/PUT/PATCH/DELETE` | `/api/tasks/<id>/` | 🔒 | Retrieve, update, or delete a task |
| `GET/POST` | `/api/subtasks/` | 🔒 | List or create subtasks |
| `GET/PUT/PATCH/DELETE` | `/api/subtasks/<id>/` | 🔒 | Retrieve, update, or delete a subtask |
| `GET/PUT/PATCH` | `/api/tasks/boards/` | 🔒 | Get or update the user's Excalidraw board |

### Files — `/api/files/` and `/api/tasks/<id>/files/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/files/` | 🔒 | List or upload personal files |
| `GET/DELETE` | `/api/files/<id>/` | 🔒 | Retrieve or delete a file |
| `GET` | `/api/files/stats/` | 🔒 | Get storage usage stats |
| `GET/POST` | `/api/tasks/<id>/files/` | 🔒 | List or attach files to a task |
| `DELETE` | `/api/tasks/<id>/files/<pk>/` | 🔒 | Detach a file from a task |

### Friends — `/api/friends/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/friends/search/` | 🔒 | Search users by username |
| `GET` | `/api/friends/` | 🔒 | List accepted friends |
| `POST` | `/api/friends/request/<user_id>/` | 🔒 | Send a friend request |
| `POST` | `/api/friends/request/<friendship_id>/respond/` | 🔒 | Accept or decline a friend request |
| `DELETE` | `/api/friends/remove/<user_id>/` | 🔒 | Remove a friend |

### Groups — `/api/groups/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/groups/` | 🔒 | List user's groups or create a new group |
| `GET/PATCH/DELETE` | `/api/groups/<id>/` | 🔒 | Retrieve, update, or delete a group |
| `POST` | `/api/groups/<id>/upload-photo/` | 🔒 | Upload group photo (owner only) |
| `POST` | `/api/groups/<id>/upload-banner/` | 🔒 | Upload group banner (owner only) |
| **Members** | | | |
| `GET` | `/api/groups/<id>/members/filter/` | 🔒 | Filter group members by role or user |
| `POST` | `/api/groups/<id>/members/<user_id>/role/` | 🔒 | Promote or demote a member (owner only) |
| `POST` | `/api/groups/<id>/members/<user_id>/transfer-ownership/` | 🔒 | Transfer group ownership |
| `DELETE` | `/api/groups/<id>/members/<user_id>/kick/` | 🔒 | Remove a member (admin/owner) |
| `POST` | `/api/groups/<id>/leave/` | 🔒 | Leave a group |
| **Invites** | | | |
| `GET` | `/api/groups/invites/` | 🔒 | List my pending group invites |
| `POST` | `/api/groups/<id>/invites/` | 🔒 | Invite a user to a group (admin/owner) |
| `POST` | `/api/groups/invites/<invite_id>/respond/` | 🔒 | Accept or decline a group invite |
| `GET` | `/api/groups/<id>/users/search/` | 🔒 | Search users to invite (admin/owner) |
| **Group Tasks** | | | |
| `GET/POST` | `/api/groups/<id>/tasks/` | 🔒 | List or create group tasks |
| `GET/PATCH/DELETE` | `/api/groups/<id>/tasks/<pk>/` | 🔒 | Retrieve, update, or delete a group task |
| `GET/PATCH/DELETE` | `/api/groups/subtasks/<pk>/` | 🔒 | Manage a group subtask |
| `POST` | `/api/groups/<id>/share-task/<task_id>/` | 🔒 | Share a personal task to the group |
| **Group Files** | | | |
| `GET/POST` | `/api/groups/<id>/files/` | 🔒 | List or attach files to a group |
| `GET/DELETE` | `/api/groups/<id>/files/<pk>/` | 🔒 | Retrieve or remove a group file |
| `POST` | `/api/groups/<id>/share-file/` | 🔒 | Share a personal file to the group |

---

## Authentication

OpenTask supports two login methods:

**Email + Password** — Standard registration and login via `/api/users/register/` and `/api/users/login/`.

**Google OAuth** — Send a Google ID token to `/api/users/login/google/`. The backend validates it and returns JWT tokens. New users are created automatically on first login.

JWT access tokens expire after **60 minutes**; refresh tokens are valid for **7 days**.

---

## Data Models

### CustomUser
- `email` (unique, login identifier)
- `username`
- `full_name`
- `avatar_url`
- `google_id` (optional, for OAuth users)

### Page
- `title`
- `user` (owner)
- `creation_date`

### Notification
- `recipient`, `sender`
- `notif_type` — `friend_request` | `group_invite`
- `object_id` — ID of the related object
- `message`
- `is_read`

### Task
- `title`, `description`
- `completed`
- `is_personal`
- `user` (owner)
- `groups` (M2M — groups the task is shared to)

### SubTask
- `title`, `completed`
- `task` (parent)
- `completed_before_task` (used to restore state when parent is unchecked)

### Board
- `user` (one-to-one)
- `elements`, `app_state`, `files` (Excalidraw JSON state)

### File
- `user` (owner)
- `original_name`, `nickname`, `size`
- `file` (stored via Cloudinary or local media)
- `image_url` (for Cloudinary-hosted images)

### Friendship
- `sender`, `receiver`
- `status` — `pending` | `accepted` | `declined`

### Group
- `name`, `description`
- `photo_url`, `banner_url`
- `owner`

### GroupMember
- `group`, `user`
- `role` — `owner` | `admin` | `member`

### GroupInvite
- `group`, `invited_by`, `invited_user`
- `status` — `pending` | `accepted` | `declined`

### GroupTask
- `group`, `created_by`
- `title`, `description`, `completed`, `completed_by`
- `assigned_to` (M2M)

### GroupSubTask
- `task` (parent GroupTask)
- `title`, `completed`, `completed_by`
- `assigned_to` (M2M)

### GroupFile
- `group`, `file`, `uploaded_by`

---

## Member Roles

Groups have three roles with the following permissions:

| Action | Member | Admin | Owner |
|---|:---:|:---:|:---:|
| View group content | ✅ | ✅ | ✅ |
| Create tasks and upload files | ✅ | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ |
| Kick members | ❌ | ✅* | ✅ |
| Promote / demote members | ❌ | ❌ | ✅ |
| Edit group info | ❌ | ❌ | ✅ |
| Transfer ownership | ❌ | ❌ | ✅ |
| Delete group | ❌ | ❌ | ✅ |

> *Admins can only kick regular members, not other admins or the owner.
