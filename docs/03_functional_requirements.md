# Functional Requirements

## 1. User Authentication and Management

- FR-01: The system shall allow users to register and log in using valid credentials.
- FR-02: The system shall support Student, Maintenance Staff, Warden and Administrator roles.
- FR-03: The system shall enforce role-based access permissions.
- FR-04: Administrators shall be able to create, update, deactivate and manage user accounts.
- FR-05: Wardens shall be associated with their assigned hostels.
- FR-06: The system shall securely store passwords using password hashing.

## 2. Hostel and Room Management

- FR-07: Administrators shall be able to create and manage multiple hostels.
- FR-08: Administrators shall be able to manage rooms within each hostel.
- FR-09: Student records shall be associated with their hostel and room.
- FR-10: The system shall maintain maintenance staff and their hostel assignments.

## 3. Complaint Management

- FR-11: Students shall be able to submit maintenance complaints.
- FR-12: Each complaint shall contain a title, description, category, location and submission timestamp.
- FR-13: Students shall be able to view their own complaints and their current status.
- FR-14: Students shall be able to view complaint history.
- FR-15: Students shall be able to cancel eligible complaints.
- FR-16: Students shall be able to reopen eligible resolved complaints with a reason.

## 4. Complaint Prioritization

- FR-17: The system shall calculate complaint priority automatically.
- FR-18: Priority calculation shall consider severity, urgency and waiting time.
- FR-19: The system shall maintain the priority assigned to each complaint.
- FR-20: The system shall record the factors contributing to a priority decision.

## 5. Complaint Assignment

- FR-21: Wardens and administrators shall be able to assign complaints to suitable maintenance staff within their permitted scope.
- FR-22: The system shall maintain assignment history.
- FR-23: Authorized users shall be able to reassign complaints.
- FR-24: The system shall prevent unauthorized staff from accessing complaints assigned to other staff members.

## 6. Complaint Lifecycle Management

- FR-25: The system shall support complaint statuses such as Open, Assigned, In Progress, Resolved, Closed, Reopened and Cancelled.
- FR-26: Assigned staff shall be able to mark assigned complaints as In Progress.
- FR-27: Assigned staff shall be able to mark completed maintenance work as Resolved with resolution remarks.
- FR-28: Students or authorized administrators shall be able to close eligible resolved complaints.
- FR-29: The system shall record status changes with timestamps and the responsible user.

## 7. Semantic Search

- FR-30: The system shall generate vector embeddings for eligible complaint descriptions using the selected embedding model.
- FR-31: The system shall store complaint vectors and associated metadata in Qdrant.
- FR-32: Users with appropriate permissions shall be able to search for semantically similar complaints.
- FR-33: The system shall return relevant matching complaints based on vector similarity.
- FR-34: The system shall synchronize eligible complaint records with the vector database.

## 8. Feedback and Reporting

- FR-35: Students shall be able to provide feedback on resolved complaints.
- FR-36: Wardens shall be able to view complaint statistics for their assigned hostels.
- FR-37: Administrators shall be able to view system-wide complaint statistics.
- FR-38: The system shall support reports based on complaint category, status, priority and resolution time.

## 9. Audit and Data Integrity

- FR-39: The system shall maintain complaint event history.
- FR-40: The system shall preserve assignment and reassignment records.
- FR-41: The system shall validate complaint ownership, assignment permissions and status transitions.
- FR-42: Critical database operations shall use transactions to maintain data consistency.