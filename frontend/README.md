# Hostel Complaint Management — Frontend

Next.js application for the Student, Maintenance Staff, Warden and Administrator roles.

## Local setup

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

The default API URL is `http://localhost:5001/api`. Change `NEXT_PUBLIC_API_URL` in `.env.local` only if the backend uses a different host or port.

Open `http://localhost:3000`. Sign in using accounts created by the development seed or an Administrator-created account. The seed password is configured privately through `DEMO_SEED_PASSWORD`; it is not committed to this repository.

## Available commands

- `npm run dev` — local development server
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm start` — serve a completed production build

The frontend does not contain database credentials. All authorization and data validation must be enforced by the backend.
