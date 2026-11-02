# Entity Identification

## 1. Introduction

This document identifies the major entities required for the Smart Hostel Maintenance & Complaint Prioritization Platform.

The entities are grouped according to their responsibilities in hostel management, user management, complaint processing, prioritization, semantic search and auditing.

## 2. Hostel Management Entities

### 2.1 Hostel
Stores information about each hostel managed by the platform.

Key attributes:
- hostel_id (Primary Key)
- hostel_name
- address
- contact_number
- status
- created_at

### 2.2 Room
Stores room information belonging to a particular hostel.

Key attributes:
- room_id (Primary Key)
- hostel_id (Foreign Key)
- room_number
- floor_number
- capacity
- status

A hostel can contain multiple rooms.

## 3. User Management Entities

### 3.1 User
Stores common account information for all platform users.

Key attributes:
- user_id (Primary Key)
- full_name
- email
- phone_number
- password_hash
- role_id (Foreign Key)
- account_status
- created_at
- updated_at

### 3.2 Role
Defines the available user roles.

Key attributes:
- role_id (Primary Key)
- role_name
- description

Initial roles:
- Student
- Maintenance Staff
- Warden
- Administrator

### 3.3 Student Profile
Stores student-specific information.

Key attributes:
- student_id (Primary Key)
- user_id (Foreign Key)
- registration_number
- department
- academic_year

### 3.4 Maintenance Staff Profile
Stores information about maintenance personnel.

Key attributes:
- staff_id (Primary Key)
- user_id (Foreign Key)
- employee_number
- availability_status

### 3.5 Warden Assignment
Maps wardens to the hostels they manage.

Key attributes:
- warden_assignment_id (Primary Key)
- warden_user_id (Foreign Key)
- hostel_id (Foreign Key)
- assigned_at
- assignment_status

This entity supports wardens managing one or more assigned hostels.

### 3.6 Student Room History
Maintains the historical hostel and room allocation of students.

Key attributes:
- allocation_id (Primary Key)
- student_id (Foreign Key)
- hostel_id (Foreign Key)
- room_id (Foreign Key)
- start_date
- end_date
- allocation_status

This entity preserves previous room and hostel allocations instead of overwriting historical information.

## 4. Maintenance Management Entities

### 4.1 Complaint Category
Stores the categories used to classify maintenance complaints.

Key attributes:
- category_id (Primary Key)
- category_name
- description
- category_status

Examples include plumbing, electrical, furniture, cleanliness and internet connectivity.

### 4.2 Maintenance Specialization
Stores maintenance skill categories.

Key attributes:
- specialization_id (Primary Key)
- specialization_name
- description

### 4.3 Staff Specialization
Maps maintenance staff to their specializations.

Key attributes:
- staff_specialization_id (Primary Key)
- staff_id (Foreign Key)
- specialization_id (Foreign Key)

A staff member may have multiple specializations.

### 4.4 Staff Hostel Assignment
Maps maintenance staff to the hostels where they are authorized to work.

Key attributes:
- staff_hostel_assignment_id (Primary Key)
- staff_id (Foreign Key)
- hostel_id (Foreign Key)
- assigned_at
- assignment_status

## 5. Complaint Management Entities

### 5.1 Complaint
Stores maintenance complaints submitted by students.

Key attributes:
- complaint_id (Primary Key)
- student_id (Foreign Key)
- hostel_id (Foreign Key)
- room_id (Foreign Key, nullable where applicable)
- category_id (Foreign Key)
- title
- description
- severity
- urgency
- current_priority
- current_status
- location_description
- submitted_at
- updated_at

The hostel and room references preserve the complaint's original location even if the student later changes rooms.

### 5.2 Complaint Assignment
Stores the assignment of complaints to maintenance staff.

Key attributes:
- assignment_id (Primary Key)
- complaint_id (Foreign Key)
- staff_id (Foreign Key)
- assigned_by (Foreign Key)
- assigned_at
- assignment_status
- unassigned_at

This entity maintains assignment and reassignment history.

### 5.3 Complaint Event
Records important events and status changes throughout a complaint's lifecycle.

Key attributes:
- event_id (Primary Key)
- complaint_id (Foreign Key)
- performed_by (Foreign Key)
- event_type
- previous_status
- new_status
- remarks
- event_timestamp

## 6. Complaint Prioritization Entities

### 6.1 Priority Policy
Stores the versions of the automatic complaint prioritization policy.

Key attributes:
- policy_id (Primary Key)
- policy_name
- policy_version
- description
- effective_from
- effective_until
- policy_status

### 6.2 Priority Policy Factor
Stores the factors and weights used by a priority policy.

Key attributes:
- factor_id (Primary Key)
- policy_id (Foreign Key)
- factor_name
- factor_weight
- description

### 6.3 Complaint Priority Snapshot
Stores the priority calculation result associated with a complaint at a particular point in time.

Key attributes:
- snapshot_id (Primary Key)
- complaint_id (Foreign Key)
- policy_id (Foreign Key)
- calculated_score
- priority_level
- calculated_at

This provides a historical record of priority decisions.

## 7. Semantic Search Entities

### 7.1 Embedding Model
Stores information about the embedding models used by the platform.

Key attributes:
- model_id (Primary Key)
- model_name
- model_version
- vector_dimension
- similarity_metric
- created_at

### 7.2 Complaint Embedding Reference
Stores the reference and synchronization information for complaint vectors stored in Qdrant.

Key attributes:
- embedding_id (Primary Key)
- complaint_id (Foreign Key)
- model_id (Foreign Key)
- qdrant_point_id
- synchronization_status
- generated_at
- updated_at

The actual embedding vectors are stored in Qdrant, not duplicated in MySQL.

## 8. Feedback and Audit Entities

### 8.1 Feedback
Stores student feedback about resolved complaints.

Key attributes:
- feedback_id (Primary Key)
- complaint_id (Foreign Key)
- student_id (Foreign Key)
- rating
- comments
- submitted_at

### 8.2 Audit Log
Records important administrative and security-related actions.

Key attributes:
- audit_id (Primary Key)
- user_id (Foreign Key)
- action_type
- entity_type
- entity_id
- action_details
- created_at

## 9. Entity Summary

The initial logical design identifies 22 entities:

1. Hostel
2. Room
3. User
4. Role
5. Student Profile
6. Maintenance Staff Profile
7. Warden Assignment
8. Student Room History
9. Complaint Category
10. Maintenance Specialization
11. Staff Specialization
12. Staff Hostel Assignment
13. Complaint
14. Complaint Assignment
15. Complaint Event
16. Priority Policy
17. Priority Policy Factor
18. Complaint Priority Snapshot
19. Embedding Model
20. Complaint Embedding Reference
21. Feedback
22. Audit Log

**Note:** The list contains 22 entities. This is an initial logical identification, not the finalized relational schema. Keys, constraints, normalization and additional entities will be evaluated during the next design stages.
