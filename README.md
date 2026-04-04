StudyXP
A full-stack study productivity app built with Django REST Framework and Next.js. It allows users to manage study pages, tasks, and subtasks with JWT-based authentication.

Tech Stack
Backend

Python / Django 6
Django REST Framework
Simple JWT (authentication)
SQLite (default database)
django-cors-headers

Frontend

Next.js 15 (App Router)
React 19
TypeScript
Tailwind CSS


Project Structure
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

Getting Started
Prerequisites

Python 3.10+
Node.js 18+

Backend Setup
bashcd backend

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
The API will be available at http://localhost:8000.
Frontend Setup
bashcd frontend

npm install
npm run dev
The app will be available at http://localhost:3000.

Environment Variables
Create a .env file in the root directory based on .env.example:
VariableDescriptionSECRET_KEYDjango secret keyDEBUGTrue for development, False for productionALLOWED_HOSTSComma-separated list of allowed hostsCORS_ALLOW_ALL_ORIGINSTrue to allow all CORS origins (dev only)

API Endpoints
MethodEndpointDescriptionPOST/api/users/register/Register a new userPOST/api/users/login/Obtain JWT tokensPOST/api/users/token/refresh/Refresh access tokenGET/POST/api/pages/List or create pagesGET/PUT/DELETE/api/pages/<id>/Retrieve, update, or delete a pageGET/POST/api/tasks/List or create tasksGET/PUT/DELETE/api/tasks/<id>/Retrieve, update, or delete a task

All protected endpoints require a Bearer <access_token> header.