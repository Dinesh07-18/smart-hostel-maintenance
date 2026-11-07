# Backend - Smart Hostel Maintenance Platform

## Technology
- Node.js and Express
- MySQL 8
- mysql2
- JWT authentication
- bcryptjs password verification

## Setup

1. Install Node.js.
2. Open the backend directory.
3. Install dependencies:

   npm install

4. Copy `.env.example` to `.env`.
5. Configure database credentials and a strong JWT_SECRET.
6. Ensure the MySQL database and schema migrations are available.
7. Start the backend:

   npm start

Development mode:

   npm run dev

Run tests:

   npm test

The API runs on port 5000 by default.

## API routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/login | User login |
| GET | /api/health | API health |
| GET | /api/complaints/categories | List active categories |
| GET | /api/complaints | List authenticated student's complaints |
| POST | /api/complaints | Submit a complaint |
| GET | /api/complaints/:id | View complaint details |
| GET | /api/staff/complaints | List assigned staff complaints |
| PATCH | /api/staff/complaints/:id/status | Update assigned complaint status |

## Roles

- STUDENT
- MAINTENANCE_STAFF
- WARDEN
- ADMINISTRATOR

The staff routes currently restrict access to MAINTENANCE_STAFF.

## Security

- Keep `.env` private.
- Use a strong, random JWT_SECRET.
- Do not commit passwords, tokens or database credentials.
- Authenticated endpoints require a Bearer token.

## Tests

Run `npm test` from this directory.
