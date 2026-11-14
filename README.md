# Smart Hostel Maintenance & Complaint Prioritization Platform

An intelligent, role-based hostel maintenance management system designed to simplify complaint registration, automate maintenance prioritization, coordinate maintenance staff, and improve complaint resolution across multiple hostels.

The platform combines a centralized complaint management workflow with automated priority scoring and AI-powered semantic complaint search. It provides separate functionality for students, maintenance staff, wardens, and administrators while enforcing role-based and hostel-level access restrictions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Objectives](#2-project-objectives)
3. [Key Features](#3-key-features)
4. [User Roles](#4-user-roles)
5. [Complaint Management Workflow](#5-complaint-management-workflow)
6. [Automated Complaint Prioritization](#6-automated-complaint-prioritization)
7. [Semantic Search](semantic-complaint-search)
8. [Background Embedding Processing](#8-background-embedding-processing)
9. [Technology Stack](#9-technology-stack)
10. [System Architecture](#10-system-architecture)
11. [Repository Structure](#11-repository-structure)
12. [Database Design](#12-database-design)
13. [Installation and Setup](#13-installation-and-setup)
14. [Environment Configuration](#14-environment-configuration)
15. [Running the Application](#15-running-the-application)
16. [Testing](#16-testing)
17. [Security and Access Control](#17-security-and-access-control)
18. [Future Enhancements](#18-future-enhancements)
19. [Project Status](#19-project-status)
20. [Windows Integration and Safe Development Setup](#20-windows-integration-and-safe-development-setup)

---

## 1. Project Overview

Hostel maintenance issues such as electrical failures, plumbing problems, damaged infrastructure, and sanitation concerns require an organized reporting and resolution process.

Traditional complaint management often depends on manual communication and tracking. This can result in delayed responses, difficulty identifying urgent issues, inefficient staff allocation, and limited visibility into complaint progress.

The Smart Hostel Maintenance & Complaint Prioritization Platform addresses these challenges through a centralized digital system.

Students can submit and track maintenance complaints, maintenance staff can manage assigned work, wardens can monitor and allocate complaints, and administrators can access authorized administrative functionality.

The platform also incorporates an AI-powered semantic search mechanism to identify complaints with similar meanings and an automated priority model to help determine which complaints require attention first.

## 2. Project Objectives

The primary objectives are:

- Develop a centralized hostel maintenance complaint management system.
- Support multiple hostels within a single application.
- Implement secure authentication and role-based authorization.
- Simplify complaint submission and tracking.
- Automate complaint prioritization using severity, urgency, and waiting time.
- Improve maintenance staff assignment and workload coordination.
- Introduce semantic search for identifying similar complaints.
- Maintain hostel-level data isolation.
- Provide structured complaint lifecycle management.
- Improve transparency and efficiency in hostel maintenance operations.

## 3. Key Features

### 3.1 Authentication and Authorization

- Secure user authentication.
- JWT-based session authentication.
- Password hashing using bcrypt.
- Protected API endpoints.
- Role-based access control.
- Separate permissions for different user categories.

### 3.2 Student Complaint Management

- Submit maintenance complaints.
- View complaint details and status.
- Track complaint progress.
- Receive semantic suggestions for similar complaints.
- Submit feedback regarding complaint resolution.

### 3.3 Maintenance Staff Management

- Maintenance staff authentication.
- View assigned complaints.
- Access complaint information.
- Update complaint status.
- Manage assigned maintenance work.

### 3.4 Warden Complaint Management

- View complaints associated with authorized hostels.
- Monitor complaint status and progress.
- View eligible maintenance staff.
- Assign complaints to maintenance staff.
- Manage complaint queues.

### 3.5 Administrator Access

- Administrator role-based authorization.
- Access to authorized administrative operations.
- Support for cross-hostel administrative access where permitted by the backend authorization rules.

### 3.6 Automated Prioritization

- Weighted complaint priority calculation.
- Severity-based prioritization.
- Urgency-based prioritization.
- Waiting-time consideration.
- Priority snapshot tracking.
- Refreshing of open complaint priorities when authorized queues are accessed.

### 3.7 AI-Powered Semantic Search

- Natural-language complaint similarity search.
- Sentence Transformer embeddings.
- Qdrant vector storage.
- Hostel-scoped search.
- Background embedding generation and indexing.

---

## 4. User Roles

The platform is designed around four primary user roles.

| Role | Responsibilities |
|---|---|
| Student | Submit complaints, track progress, search similar complaints, and provide feedback. |
| Maintenance Staff | View assigned complaints and update their maintenance status. |
| Warden | Monitor hostel complaints and assign work to maintenance staff. |
| Administrator | Perform authorized administrative operations across the platform. |

Each role has its own access permissions. Users should only be able to perform operations permitted by their assigned role and access scope.

---

## 5. Complaint Management Workflow

The complaint management system follows a structured lifecycle.

### Complaint Lifecycle

\`SUBMITTED → IN_PROGRESS → RESOLVED\`

**1. Submitted**

A student registers a maintenance complaint through the application. The complaint is stored in the MySQL database.

**2. In Progress**

After assignment, maintenance staff can access the complaint and begin working on the issue. The complaint status is updated to indicate that maintenance work has started.

**3. Resolved**

Once the maintenance work is completed, the complaint is marked as resolved.

This workflow provides a consistent mechanism for monitoring complaint progress.

### Workflow Overview

\`\`\`text
Student
   |
   v
Submit Complaint
   |
   v
Complaint Stored in MySQL
   |
   v
Priority Calculation
   |
   v
Warden Reviews Complaint
   |
   v
Assign Maintenance Staff
   |
   v
Maintenance Work Begins
   |
   v
IN_PROGRESS
   |
   v
Issue Resolved
   |
   v
RESOLVED
\`\`\`

---

## 6. Automated Complaint Prioritization

The platform implements an automated complaint prioritization mechanism to help identify maintenance issues that require earlier attention.

The priority calculation considers three major factors:

| Factor | Weight | Purpose |
|---|---:|---|
| Severity | 50% | Measures the seriousness and potential impact of the maintenance issue. |
| Urgency | 30% | Measures how quickly the issue requires attention. |
| Waiting Time | 20% | Considers how long the complaint has remained unresolved. |
| **Total** | **100%** | |

### Priority Formula

\`Priority Score = (Severity × 0.50) + (Urgency × 0.30) + (Waiting Time × 0.20)\`

The individual factor values are evaluated according to the application's priority-scoring implementation.

### Priority Management

The system includes:

- Automated priority calculation.
- Weighted factor evaluation.
- Complaint priority snapshots.
- Tracking of priority changes.
- Refreshing priorities for open complaints when authorized Warden or Administrator queues are accessed.

This mechanism helps ensure that serious and urgent maintenance issues receive appropriate attention.

---

## 7. AI-Powered Semantic Complaint Search

The platform integrates AI-powered semantic search to identify complaints that are similar in meaning.

Traditional keyword search depends heavily on exact word matching. Semantic search instead converts text into numerical representations called embeddings and compares their similarity.

### Technologies Used

- Sentence Transformers
- \`sentence-transformers/all-MiniLM-L6-v2\`
- Qdrant Vector Database
- Python FastAPI
- Node.js backend integration
- 384-dimensional embeddings

### Semantic Search Process

1. A complaint is submitted by a student.
2. The backend creates an embedding-processing job.
3. The background worker processes the job.
4. The Python embedding service converts complaint text into a vector.
5. The vector and relevant metadata are indexed in Qdrant.
6. A student enters text into the semantic search interface.
7. The query is converted into an embedding.
8. Qdrant retrieves semantically similar complaints.
9. The results are restricted to the student's active hostel.

### Semantic Search Architecture

\`\`\`text
        Complaint Text
              |
              v
       Text Preprocessing
              |
              v
      Sentence Transformer
              |
              v
       384-Dimensional
           Embedding
              |
              v
        Qdrant Database
              |
              v
      Similarity Retrieval
              |
              v
       Hostel-Level Filter
              |
              v
       Similar Complaints
\`\`\`

### Embedding Model

The project uses:

\`sentence-transformers/all-MiniLM-L6-v2\`

This model generates 384-dimensional sentence embeddings suitable for semantic similarity tasks.

### Data Isolation

Semantic search is restricted using the authenticated student's active hostel assignment.

The backend checks the student's active hostel context before requesting similar complaints. This prevents the search interface from intentionally exposing complaints belonging to unrelated hostels.

---

## 8. Background Embedding Processing

The platform uses a database-backed job queue to process complaint embeddings asynchronously.

This prevents embedding generation and vector indexing from being tightly coupled to the complaint submission request.

### Main Capabilities

- Database-backed embedding job creation.
- Periodic job polling.
- Job claiming.
- Lease-based processing.
- Expired lease recovery.
- Retry handling.
- Failed-job tracking.
- Completion status updates.
- Qdrant indexing.

### Processing Flow

\`\`\`text
New Complaint
     |
     v
Create Embedding Job
     |
     v
Database Job Queue
     |
     v
Background Worker
     |
     v
Python Embedding Service
     |
     v
Generate Vector
     |
     v
Store in Qdrant
     |
     v
Update Job Status
\`\`\`

The worker uses retry handling and lease management to improve reliability when embedding jobs cannot be processed immediately.

---

## 9. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| UI Framework | React |
| Backend | Node.js |
| Backend Framework | Express.js |
| Relational Database | MySQL |
| Authentication | JWT |
| Password Security | bcrypt |
| Vector Database | Qdrant |
| Embedding Model | Sentence Transformers |
| Embedding Service | Python, FastAPI |
| API Communication | REST APIs |
| Programming Languages | JavaScript, Python, SQL |

---

## 10. System Architecture

The application follows a modular architecture in which the frontend, backend, relational database, embedding service, and vector database operate as separate components.

### High-Level Architecture

\`\`\`text
             USERS
               |
               v
        NEXT.JS FRONTEND
               |
               v
       NODE.JS / EXPRESS API
               |
        +------+------+
        |             |
        v             v
      MYSQL       VECTOR SERVICE
        |             |
        v             v
  EMBEDDING JOB   PYTHON FASTAPI
      QUEUE            |
        |              v
        v            QDRANT
 BACKGROUND
    WORKER
\`\`\`

### Architecture Components

**Frontend**

The Next.js frontend provides the user interface for students, maintenance staff, wardens, and administrators.

**Backend**

The Node.js and Express backend handles authentication, authorization, complaint operations, business logic, and integration with other services.

**MySQL Database**

MySQL stores application records, including users, hostels, complaints, assignments, and supporting workflow data.

**Embedding Service**

The Python FastAPI service generates sentence embeddings and communicates with Qdrant.

**Qdrant**

Qdrant stores complaint embeddings and supports semantic similarity retrieval.

**Background Worker**

The worker processes embedding jobs from the database queue and manages indexing and retry operations.

---

## 11. Repository Structure

The project is organized into separate directories for frontend, backend, database, vector integration, documentation, and scripts.

\`\`\`text
smart-hostel-maintenance/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── workers/
│   │
│   ├── embedding_service/
│   │   ├── app.py
│   │   └── .venv/
│   │
│   ├── tests/
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── database/
│
├── vector/
│
├── docs/
│
├── scripts/
│
├── .gitignore
└── README.md
\`\`\`

*Note: The structure above represents the main project organization. Individual files and subdirectories may change as development continues.*

---

## 12. Database Design

MySQL is used as the primary relational database.

The database supports the main application entities and workflows.

### Main Data Areas

- User accounts and roles.
- Hostel information.
- Student profiles.
- Room assignments and hostel history.
- Maintenance staff information.
- Complaint records.
- Complaint assignments.
- Complaint status information.
- Priority snapshots.
- Embedding job records.
- Complaint embedding references.
- Feedback records.

### Database Responsibilities

MySQL is responsible for maintaining the application's transactional and relational data.

Qdrant is used for vector storage and similarity retrieval rather than as a replacement for the relational database.

The backend is responsible for enforcing access permissions and validating the application context before returning complaint information.

---

## 13. Installation and Setup

### 13.1 Prerequisites

Install the following tools:

- Node.js and npm.
- MySQL.
- Python 3.10 or newer.
- Qdrant.
- Git.

### 13.2 Clone the Repository

\`\`\`powershell
git clone https://github.com/Dinesh07-18/smart-hostel-maintenance.git

cd smart-hostel-maintenance
\`\`\`

### 13.3 Backend Setup

Navigate to the backend directory:

\`\`\`powershell
cd backend
npm install
\`\`\`

Create the environment file:

\`\`\`powershell
Copy-Item .env.example .env
\`\`\`

Configure the required database credentials, JWT secret, service URLs, and other environment variables in the new `.env` file.

Start the backend:

\`\`\`powershell
npm start
\`\`\`

For development:

\`\`\`powershell
npm run dev
\`\`\`

### 13.4 Frontend Setup

Open another terminal:

\`\`\`powershell
cd frontend
npm install
\`\`\`

Configure the frontend API URL using the appropriate environment variable.

Start the development server:

\`\`\`powershell
npm run dev
\`\`\`

### 13.5 Embedding Service Setup

Open another terminal:

\`\`\`powershell
cd backend/embedding_service

python -m venv .venv

.\.venv\Scripts\Activate.ps1

pip install fastapi uvicorn requests numpy sentence-transformers
\`\`\`

Start the FastAPI service:

\`\`\`powershell
uvicorn app:app --host 127.0.0.1 --port 8001
\`\`\`

The embedding service requires access to the configured Qdrant instance.

### 13.6 Qdrant Setup

Start a Qdrant instance and ensure that it is reachable from the embedding service.

The service uses the configured Qdrant URL and collection name.

### 13.7 Background Worker Setup

After configuring the backend and applying the required database migration, navigate to the backend directory and execute:

\`\`\`powershell
npm run worker
\`\`\`

The worker processes embedding jobs from the database queue.

---

## 14. Environment Configuration

The application uses environment variables to manage local configuration and service connections.

### Backend Configuration

Depending on the backend implementation, configure:

- MySQL host.
- MySQL port.
- MySQL database name.
- MySQL username.
- MySQL password.
- JWT secret.
- Backend server port.
- Embedding service URL.
- Other integration-specific settings.

### Frontend Configuration

Configure:

- `NEXT_PUBLIC_API_URL` — backend API base URL used by the frontend.

### Embedding Service Configuration

| Variable | Purpose |
|---|---|
| `QDRANT_URL` | Qdrant server URL. |
| `QDRANT_COLLECTION` | Vector collection name. |
| `EMBEDDING_MODEL` | Sentence Transformer model identifier. |

The embedding service defaults to:

- Qdrant URL: `http://127.0.0.1:6333`
- Collection: `hostel_complaint_embeddings`
- Model: `sentence-transformers/all-MiniLM-L6-v2`

The backend embedding service URL should be configured using `EMBEDDING_SERVICE_URL` to match the actual service address and port.

**Security note:** Never commit actual `.env` files, database credentials, JWT secrets, API keys, or other sensitive configuration.

---

## 15. Running the Application

The application consists of multiple services that must be configured and started separately.

| Service | Responsibility |
|---|---|
| Next.js Frontend | User interface |
| Express Backend | API and business logic |
| MySQL | Relational data storage |
| Qdrant | Vector storage |
| Python FastAPI | Embedding generation and search |
| Embedding Worker | Background indexing jobs |

For semantic search and embedding processing, ensure that MySQL, Qdrant, the embedding service, and the backend are running and correctly configured.

The frontend should point to the correct backend API address.

---

## 16. Testing

Testing is important for validating the functionality, integration, and security of the platform.

### Backend Tests

Run the backend test suite:

\`\`\`powershell
cd backend
npm test
\`\`\`

### Frontend Linting

Run:

\`\`\`powershell
cd frontend
npm run lint
\`\`\`

### Frontend Production Build

Run:

\`\`\`powershell
npm run build
\`\`\`

### Recommended Validation Areas

- User authentication.
- Role-based authorization.
- Complaint submission.
- Complaint retrieval.
- Complaint status transitions.
- Maintenance staff assignment.
- Hostel-level access restrictions.
- Priority calculation.
- Priority snapshot handling.
- Semantic complaint search.
- Embedding job processing.
- Qdrant integration.
- Feedback operations.
- Frontend and backend communication.

Database-related tests should use a dedicated test database and should not unintentionally modify development or demonstration records.

---

## 17. Security and Access Control

Security is an important part of the platform because it manages student information, hostel information, and maintenance records.

The system incorporates the following security measures:

- JWT-based authentication.
- Password hashing.
- Role-based access control.
- Protected API endpoints.
- Hostel-scoped complaint access.
- Active hostel assignment validation for semantic search.
- Separation of relational and vector data responsibilities.
- Environment-based configuration for sensitive values.

### Important Security Practices

- Never commit credentials or secret environment files.
- Use strong, unique JWT secrets.
- Keep test and development databases separate.
- Validate user permissions on the backend.
- Do not rely solely on frontend restrictions for access control.
- Ensure vector search filters are enforced using authenticated backend context.

---

## 18. Future Enhancements

The platform can be extended with additional features to improve its functionality and scalability.

Potential improvements include:

- Real-time complaint status notifications.
- Email and mobile notifications.
- Maintenance staff workload analytics.
- Advanced administrative dashboards.
- Complaint resolution time analytics.
- Hostel-wise performance reports.
- Improved semantic search ranking.
- Additional AI-based complaint classification.
- Predictive maintenance recommendations.
- Deployment using cloud infrastructure.
- Monitoring, logging, and performance optimization.


---

## 19. Project Status

The Smart Hostel Maintenance & Complaint Prioritization Platform has completed its core application development and major integration work in the development environment.

The system brings together role-based authentication, student complaint management, maintenance staff operations, hostel-scoped Warden functionality, automated priority scoring, and AI-powered semantic complaint search.

### Implemented Components

| Component | Implementation |
|---|---|
| Authentication | JWT-based authentication and password hashing |
| Authorization | Role-based access control |
| Student Complaint Management | Complaint submission and tracking |
| Maintenance Staff Module | Assigned complaint management and status updates |
| Warden Module | Hostel-scoped complaint management and staff assignment |
| Priority Management | Weighted 50/30/20 priority model |
| Priority Snapshots | Tracking of complaint priority changes |
| Semantic Search | Sentence Transformer embeddings and Qdrant |
| Embedding Service | Python FastAPI |
| Background Processing | Database-backed embedding job queue |
| Database Integration | MySQL |
| Frontend | Next.js |
| Backend | Node.js and Express |



## Repository

**GitHub:** https://github.com/Dinesh07-18/smart-hostel-maintenance

**Project:** Smart Hostel Maintenance & Complaint Prioritization Platform

---

## 20. Windows Integration and Safe Development Setup

### Windows environment preparation

For Windows development, run `scripts/Initialize-LocalEnvironment.ps1` and follow `docs/WINDOWS_SETUP.md`.

Configure local environment files using:

- `backend/.env.example`
- `frontend/.env.example`

Never commit real credentials, JWT secrets, or local environment files.

### Database initialization

For a fresh development database, follow this sequence:

1. Run `database/create_database.sql`.
2. Apply `database/migrations/001_initial_schema.sql`.
3. Apply `database/migrations/002_complaint_embedding_jobs.sql`.
4. Apply `database/seeds/001_reference_data.sql`.

Do not rerun initialization scripts against an existing database without checking their effects and current migration state.

### Local service ports

The verified local integration uses:

| Component | Port |
|---|---:|
| Frontend | 5000 |
| Backend API | 5001 |
| Embedding service | 8001 |
| Qdrant | 6333 |

Start Qdrant using `infrastructure/qdrant/docker-compose.yml`.

Start the FastAPI embedding service from `backend/embedding_service` on port `8001`.

Start the embedding worker from the backend directory using:

```powershell
npm run worker
```

These are local integration settings; adjust them if your environment uses different ports.

### Development demo data

The demo seed is gated and intended for development databases.

Before running it:

- Confirm that the backend targets the intended development database.
- Set a unique `DEMO_SEED_PASSWORD` in `backend/.env`.
- Use a password between 12 and 128 characters.
- Review the seed script and its safeguards.

Run from the `backend` directory in PowerShell:

```powershell
$env:NODE_ENV = "development"
node .\scripts\seed-demo.js
```

The script is designed to refuse production-like database names and reuse existing records rather than truncate or delete data. Review its implementation before execution.

### Semantic search API

Authenticated users can submit semantic complaint searches through:

`POST /api/search/complaints`

Example request body:

```json
{
  "text": "water leakage in the bathroom",
  "limit": 5
}
```

The API derives hostel scope from the authenticated user's assignments and verifies vector-search matches against MySQL before returning complaint details.

Further documentation:

- `docs/SEMANTIC_SEARCH_IMPLEMENTATION.md`
- `docs/testing/SEMANTIC_SEARCH_EVALUATION.md`

### Integration verification

After implementation and dependency setup, run the consolidated checks from the repository root:

```powershell
.\scripts\Verify-Integration.ps1 -InstallDependencies
```

This script runs backend automated tests, frontend linting and production build checks, and a Python embedding-service syntax check when Python is installed.

It does not start MySQL, Qdrant, or the embedding model service.

Complete the live role-by-role API and browser workflow checks documented in `docs/IMPLEMENTATION_STATUS.md` before considering the integration fully verified.
