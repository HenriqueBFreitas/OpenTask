# StudyXP
 
A full-stack study productivity app built with **Django REST Framework** and **Next.js**. It allows users to manage study pages, tasks, and subtasks with JWT-based authentication.
 
---
 
## Tech Stack
 
**Backend**
- Python / Django 6
- Django REST Framework
- Simple JWT (authentication)
- SQLite (default database)
- django-cors-headers
 
**Frontend**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
 
---

## Quick Start

Prerequisites:
Python 3.10+ and
Node.js 18+
 
Open two terminals and run:
 
**Terminal 1 — Backend**
```bash
cd backend && source venv/bin/activate && python manage.py runserver
```
 
**Terminal 2 — Frontend**
```bash
cd frontend && npm run dev
```
 
---
 
## Project Structure
 
```
StudyXP/
├── backend/
│   ├── config/        # Django project settings and URLs
│   ├── core/          # Pages module (models, views, serializers)
│   ├── tasks/         # Tasks and subtasks module
│   └── users/         # User registration and authentication
├── frontend/
│   └── src/app/       # Next.js pages and components
├── requirements.txt
└── .env.example
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Python 3.10+
- Node.js 18+
 
### Backend Setup
 
```bash
cd backend
 
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
 
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
 
---
 
## API Endpoints
 
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users/register/` | Register a new user |
| `POST` | `/api/users/login/` | Obtain JWT tokens |
| `POST` | `/api/users/token/refresh/` | Refresh access token |
| `GET/POST` | `/api/pages/` | List or create pages |
| `GET/PUT/DELETE` | `/api/pages/<id>/` | Retrieve, update, or delete a page |
| `GET/POST` | `/api/tasks/` | List or create tasks |
| `GET/PUT/DELETE` | `/api/tasks/<id>/` | Retrieve, update, or delete a task |
 
> All protected endpoints require a `Bearer <access_token>` header.