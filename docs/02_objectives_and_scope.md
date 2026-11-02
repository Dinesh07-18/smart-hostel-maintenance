# Objectives and Scope

## 1. Project Objectives

The main objective is to develop a centralized Smart Hostel Maintenance & Complaint Prioritization Platform that improves how hostel maintenance complaints are submitted, prioritized, assigned and resolved.

The specific objectives are:

1. **Centralized Complaint Management:** Provide a single platform for students to submit and track maintenance complaints.
2. **Automatic Complaint Prioritization:** Calculate complaint priority using severity, urgency and waiting time.
3. **Efficient Staff Assignment:** Enable wardens and administrators to assign complaints to suitable maintenance staff.
4. **Complaint Lifecycle Tracking:** Maintain a clear record of complaint status changes from submission to closure.
5. **Role-Based Access Control:** Provide separate permissions and interfaces for students, maintenance staff, wardens and administrators.
6. **Semantic Complaint Search:** Use vector embeddings and Qdrant to identify complaints with similar meanings.
7. **Recurring Issue Identification:** Help management identify frequently reported maintenance problems.
8. **Data Integrity and Security:** Maintain reliable relational records using MySQL, enforce database constraints and protect user credentials.
9. **Reporting and Monitoring:** Provide hostel-level and system-level complaint statistics to support maintenance decisions.

## 2. Project Scope

### 2.1 Included in Scope

- Support for multiple hostels.
- User accounts for students, maintenance staff, wardens and administrators.
- Student complaint submission and tracking.
- Complaint categories such as plumbing, electrical, furniture, cleanliness and internet connectivity.
- Automatic complaint priority calculation.
- Complaint assignment and reassignment.
- Complaint status updates and resolution remarks.
- Complaint history and audit records.
- Warden-level monitoring of assigned hostels.
- Administrator-level platform management.
- Semantic search for similar complaints using Qdrant.
- Structured data storage using MySQL.
- Reporting and dashboard functionality.
- Feedback collection after complaint resolution.

### 2.2 Outside the Initial Scope

- Direct integration with external hostel ERP systems.
- Online payment processing.
- Automated procurement and inventory purchasing.
- IoT-based automatic fault detection.
- Native Android and iOS applications.
- Predictive maintenance using advanced machine learning models beyond the initial prioritization and semantic-search functionality.

These features may be considered for future development.

## 3. Technology Scope

| Component | Selected Technology |
|---|---|
| Frontend | Next.js |
| Backend | Next.js API Routes / Route Handlers |
| Relational Database | MySQL 8.4 LTS |
| Vector Database | Qdrant |
| Embedding Service | Python |
| Embedding Model | sentence-transformers/all-MiniLM-L6-v2 |
| Version Control | Git |

## 4. User Roles

| Role | Main Responsibilities |
|---|---|
| Student | Submit complaints, track progress and provide feedback |
| Maintenance Staff | View assigned complaints, update progress and resolve maintenance work |
| Warden | Monitor complaints and staff activity within assigned hostels |
| Administrator | Manage users, hostels, categories, assignments and platform-wide operations |

## 5. Expected Outcome

The expected outcome is a functional web-based platform that improves maintenance complaint handling through structured database management, automatic prioritization, role-based workflows and semantic complaint search.