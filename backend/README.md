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
| GET | /api/warden/complaints | List complaints for assigned hostels (admin: all) |
| GET | /api/warden/staff?hostel_id=1 | List active maintenance staff for a hostel |
| POST | /api/warden/complaints/:id/assign | Assign a complaint to hostel staff |

## Roles

- STUDENT
- MAINTENANCE_STAFF
- WARDEN
- ADMINISTRATOR

- Student complaint routes restrict access to STUDENT.
- Staff routes restrict access to MAINTENANCE_STAFF.
- Warden routes restrict access to WARDEN and ADMINISTRATOR. Wardens are scoped to active hostel assignments; administrators can view and assign across hostels.

## Warden assignment workflow

1. A warden lists complaints within their active hostel assignments using `GET /api/warden/complaints`.
2. The warden loads staff assigned to a hostel using `GET /api/warden/staff?hostel_id=HOSTEL_ID`.
3. The warden assigns an eligible complaint using `POST /api/warden/complaints/COMPLAINT_ID/assign` with `{ "staff_id": 1, "remarks": "Optional note" }`.
4. Assignment and complaint status updates are committed in one transaction. The complaint audit trigger receives the authenticated actor ID on the same database connection.

## Security

- Keep `.env` private.
- Use a strong, random JWT_SECRET.
- Do not commit passwords, tokens or database credentials.
- Authenticated endpoints require a Bearer token.

## Tests

Run `npm test` from this directory.
