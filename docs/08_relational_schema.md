
# Relational Schema Design

## 1. Introduction

This document defines the relational database schema for the Smart Hostel Maintenance & Complaint Prioritization Platform.

The schema is based on the approved 22-entity ER diagram and uses MySQL 8.4.

It specifies table names, columns, data types, primary keys, foreign keys, unique constraints, check constraints, generated columns and important integrity rules.

The platform uses MySQL for relational data and Qdrant for storing and searching vector embeddings. The actual vector values are not stored in MySQL.

## 2. Naming Conventions

- Table names use lowercase `snake_case`.
- Column names use lowercase `snake_case`.
- Primary keys use the format `entity_id`.
- Foreign keys use the referenced entity's primary-key name.
- `DATETIME` is used for date and time values.
- `DATE` is used for date-only values.
- `BOOLEAN` is used for true/false values (implemented by MySQL as `TINYINT(1)`).
- Monetary values, if introduced later, will use `DECIMAL`, not floating-point types.
- All relational tables will use the InnoDB storage engine.
- The database will use `utf8mb4` character encoding.
- Generated columns will be used where they provide reliable database-level integrity enforcement.

## 3. Relational Table Definitions

### 3.1 roles

Stores the roles available in the platform.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| role_id | INT | PK, AUTO_INCREMENT | Unique role identifier |
| role_name | VARCHAR(50) | NOT NULL, UNIQUE | Role name |
| description | VARCHAR(255) | NULL | Role description |
| created_at | DATETIME | NOT NULL | Creation timestamp |

### 3.2 users

Stores login and account information for all platform users.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| user_id | INT | PK, AUTO_INCREMENT | Unique user identifier |
| role_id | INT | FK, NOT NULL | Assigned role |
| full_name | VARCHAR(120) | NOT NULL | User's full name |
| email | VARCHAR(150) | NOT NULL, UNIQUE | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| phone | VARCHAR(20) | NULL | Contact number |
| account_status | ENUM | NOT NULL | ACTIVE, INACTIVE, SUSPENDED |
| created_at | DATETIME | NOT NULL | Account creation time |
| updated_at | DATETIME | NOT NULL | Last update time |

### 3.3 hostels

Stores hostel information.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| hostel_id | INT | PK, AUTO_INCREMENT | Unique hostel identifier |
| hostel_name | VARCHAR(120) | NOT NULL | Hostel name |
| hostel_code | VARCHAR(30) | NOT NULL, UNIQUE | Hostel code |
| address | VARCHAR(255) | NOT NULL | Hostel address |
| hostel_type | VARCHAR(30) | NULL | Hostel classification |
| created_at | DATETIME | NOT NULL | Creation timestamp |

### 3.4 rooms

Stores room details for each hostel.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| room_id | INT | PK, AUTO_INCREMENT | Unique room identifier |
| hostel_id | INT | FK, NOT NULL | Parent hostel |
| room_number | VARCHAR(20) | NOT NULL | Room number |
| floor_number | INT | NOT NULL | Floor number |
| capacity | INT | NOT NULL | Maximum occupancy |
| room_status | ENUM | NOT NULL | AVAILABLE, OCCUPIED, MAINTENANCE |
| created_at | DATETIME | NOT NULL | Creation timestamp |

Additional constraints:

- `UNIQUE(hostel_id, room_number)` prevents duplicate room numbers within the same hostel.
- `UNIQUE(room_id, hostel_id)` supports composite foreign-key references from `student_room_history` and `complaints`.
- `CHECK(capacity > 0)` ensures every room has positive capacity.
- `CHECK(floor_number >= 0)` ensures a valid floor number.

### 3.5 student_profiles

Stores student-specific information.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| student_id | INT | PK, AUTO_INCREMENT | Student identifier |
| user_id | INT | FK, NOT NULL, UNIQUE | Associated user |
| registration_number | VARCHAR(40) | NOT NULL, UNIQUE | Student registration number |
| department | VARCHAR(100) | NULL | Academic department |
| course | VARCHAR(100) | NULL | Course name |
| admission_year | YEAR | NULL | Admission year |
| created_at | DATETIME | NOT NULL | Creation timestamp |

### 3.6 maintenance_staff_profiles

Stores maintenance staff-specific information.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| staff_id | INT | PK, AUTO_INCREMENT | Staff identifier |
| user_id | INT | FK, NOT NULL, UNIQUE | Associated user |
| employee_code | VARCHAR(40) | NOT NULL, UNIQUE | Employee code |
| employment_type | VARCHAR(40) | NULL | Employment classification |
| availability_status | ENUM | NOT NULL | AVAILABLE, BUSY, UNAVAILABLE |
| created_at | DATETIME | NOT NULL | Creation timestamp |

### 3.7 warden_assignments

Records wardens assigned to hostels.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| warden_assignment_id | INT | PK, AUTO_INCREMENT | Assignment identifier |
| user_id | INT | FK, NOT NULL | Warden user |
| hostel_id | INT | FK, NOT NULL | Assigned hostel |
| start_date | DATE | NOT NULL | Assignment start |
| end_date | DATE | NULL | Assignment end |
| is_active | BOOLEAN | NOT NULL | Assignment status |

Additional constraints:

- `CHECK(end_date IS NULL OR end_date >= start_date)` prevents invalid assignment periods.
- Historical warden assignments must be retained.
- Active assignment validation must be handled by application logic or database triggers.

### 3.8 student_room_history

Maintains historical room allocations for students.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| room_history_id | INT | PK, AUTO_INCREMENT | Allocation identifier |
| student_id | INT | FK, NOT NULL | Allocated student |
| hostel_id | INT | FK, NOT NULL | Associated hostel |
| room_id | INT | FK, NOT NULL | Allocated room |
| start_date | DATETIME | NOT NULL | Allocation start |
| end_date | DATETIME | NULL | Allocation end |
| is_active | BOOLEAN | NOT NULL | Current allocation status |
| active_student_id | INT | GENERATED, NULLABLE | Generated value for active allocation enforcement |

The `active_student_id` column will be implemented as a stored generated column:

`CASE WHEN is_active = TRUE THEN student_id ELSE NULL END`

Additional constraints:

- `(room_id, hostel_id)` must reference a matching room and hostel combination.
- `UNIQUE(active_student_id)` ensures a student has at most one active room allocation.
- Inactive historical records have `active_student_id = NULL`, allowing multiple historical allocations.
- `CHECK(end_date IS NULL OR end_date >= start_date)` prevents invalid allocation periods.
- A student must not have overlapping active room allocations.
- Room capacity must not be exceeded when allocating students.
- Historical allocations must be retained after a student changes rooms.

Room capacity and allocation-period validation must use transactional application logic or database triggers.

### 3.9 complaint_categories

Stores complaint classifications.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| category_id | INT | PK, AUTO_INCREMENT | Category identifier |
| category_name | VARCHAR(80) | NOT NULL, UNIQUE | Category name |
| description | VARCHAR(255) | NULL | Category description |
| is_active | BOOLEAN | NOT NULL | Category availability |
| created_at | DATETIME | NOT NULL | Creation timestamp |

### 3.10 maintenance_specializations

Stores maintenance skill categories.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| specialization_id | INT | PK, AUTO_INCREMENT | Specialization identifier |
| specialization_name | VARCHAR(100) | NOT NULL, UNIQUE | Skill name |
| description | VARCHAR(255) | NULL | Skill description |

### 3.11 staff_specializations

Implements the many-to-many relationship between staff and specializations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| staff_specialization_id | INT | PK, AUTO_INCREMENT | Record identifier |
| staff_id | INT | FK, NOT NULL | Maintenance staff |
| specialization_id | INT | FK, NOT NULL | Specialization |
| created_at | DATETIME | NOT NULL | Creation timestamp |

Additional constraint:

- `UNIQUE(staff_id, specialization_id)` prevents duplicate specialization records for the same staff member.

### 3.12 staff_hostel_assignments

Records which maintenance staff members are assigned to which hostels.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| staff_hostel_assignment_id | INT | PK, AUTO_INCREMENT | Assignment identifier |
| staff_id | INT | FK, NOT NULL | Maintenance staff |
| hostel_id | INT | FK, NOT NULL | Assigned hostel |
| start_date | DATE | NOT NULL | Assignment start |
| end_date | DATE | NULL | Assignment end |
| is_active | BOOLEAN | NOT NULL | Assignment status |

Additional constraints:

- `UNIQUE(staff_hostel_assignment_id, staff_id, hostel_id)` supports composite foreign-key validation from `complaint_assignments`.
- `CHECK(end_date IS NULL OR end_date >= start_date)` prevents invalid assignment periods.
- Historical staff-hostel assignments must be retained.
- Multiple historical assignment periods between the same staff member and hostel are permitted.
- A staff member must have an active, date-valid hostel assignment before receiving a complaint assignment.
- The application or database triggers must validate that staff-hostel assignments are active when used.

### 3.13 complaints

Stores complaints submitted by students.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| complaint_id | INT | PK, AUTO_INCREMENT | Complaint identifier |
| student_id | INT | FK, NOT NULL | Submitting student |
| hostel_id | INT | FK, NOT NULL | Hostel concerned |
| room_id | INT | FK, NULL | Optional room reference |
| category_id | INT | FK, NOT NULL | Complaint category |
| title | VARCHAR(150) | NOT NULL | Complaint title |
| description | TEXT | NOT NULL | Complaint details |
| severity | ENUM | NOT NULL | LOW, MEDIUM, HIGH, CRITICAL |
| urgency | ENUM | NOT NULL | LOW, MEDIUM, HIGH, CRITICAL |
| status | ENUM | NOT NULL | SUBMITTED, VERIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED, REJECTED |
| submitted_at | DATETIME | NOT NULL | Submission timestamp |
| resolved_at | DATETIME | NULL | Resolution timestamp |
| closed_at | DATETIME | NULL | Closure timestamp |
| updated_at | DATETIME | NOT NULL | Last update timestamp |

Additional constraints:

- `UNIQUE(complaint_id, student_id)` supports feedback ownership validation.
- `UNIQUE(complaint_id, hostel_id)` supports composite hostel-consistency references.
- `(room_id, hostel_id)` must reference a matching room and hostel combination.
- `room_id` is nullable for common-area complaints.
- A complaint must reference an existing student, hostel and category.
- The application must verify that the student is associated with the hostel and room at complaint submission time.

### 3.14 complaint_assignments

Maintains complaint assignment and reassignment history.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| assignment_id | INT | PK, AUTO_INCREMENT | Assignment identifier |
| complaint_id | INT | FK, NOT NULL | Associated complaint |
| hostel_id | INT | FK, NOT NULL | Complaint hostel |
| staff_id | INT | FK, NOT NULL | Assigned staff member |
| staff_hostel_assignment_id | INT | FK, NOT NULL | Specific staff-hostel assignment used |
| assigned_by | INT | FK, NOT NULL | User who created assignment |
| assigned_at | DATETIME | NOT NULL | Assignment timestamp |
| unassigned_at | DATETIME | NULL | End of assignment |
| assignment_status | ENUM | NOT NULL | ACTIVE, COMPLETED, CANCELLED |
| active_complaint_id | INT | GENERATED, NULLABLE | Generated value for active assignment enforcement |

The `active_complaint_id` column will be implemented as a stored generated column:

`CASE WHEN assignment_status = 'ACTIVE' THEN complaint_id ELSE NULL END`

Additional constraints:

- `(complaint_id, hostel_id)` references the matching complaint and hostel.
- `(staff_hostel_assignment_id, staff_id, hostel_id)` references the matching staff-hostel assignment record.
- `UNIQUE(active_complaint_id)` ensures that a complaint has at most one active assignment.
- `CHECK(unassigned_at IS NULL OR unassigned_at >= assigned_at)` prevents invalid assignment periods.
- An active assignment must have `unassigned_at IS NULL`.
- A completed or cancelled assignment must have `unassigned_at IS NOT NULL`.
- The application or a database trigger must verify that the referenced staff-hostel assignment is active and date-valid when the complaint is assigned.
- Assignment and reassignment history must be retained.

### 3.15 complaint_events

Stores the complaint lifecycle and activity history.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| event_id | INT | PK, AUTO_INCREMENT | Event identifier |
| complaint_id | INT | FK, NOT NULL | Associated complaint |
| performed_by | INT | FK, NOT NULL | User performing the action |
| event_type | VARCHAR(60) | NOT NULL | Event classification |
| previous_status | VARCHAR(30) | NULL | Previous complaint status |
| new_status | VARCHAR(30) | NULL | New complaint status |
| remarks | TEXT | NULL | Event description |
| created_at | DATETIME | NOT NULL | Event timestamp |

### 3.16 priority_policies

Stores the rules used to calculate complaint priority.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| policy_id | INT | PK, AUTO_INCREMENT | Policy identifier |
| policy_name | VARCHAR(100) | NOT NULL | Policy name |
| description | VARCHAR(255) | NULL | Policy description |
| version | VARCHAR(30) | NOT NULL | Policy version |
| is_active | BOOLEAN | NOT NULL | Policy availability |
| effective_from | DATETIME | NOT NULL | Effective start |
| effective_until | DATETIME | NULL | Effective end |

Additional constraints:

- `CHECK(effective_until IS NULL OR effective_until >= effective_from)` prevents invalid policy periods.
- Policy versions must be identifiable and retained.
- Policy factors should not be modified after a policy version becomes active.
- Policy activation must validate the associated factor weights.

### 3.17 priority_policy_factors

Stores individual factors and weights used by a priority policy.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| factor_id | INT | PK, AUTO_INCREMENT | Factor identifier |
| policy_id | INT | FK, NOT NULL | Parent policy |
| factor_name | VARCHAR(80) | NOT NULL | Factor name |
| factor_weight | DECIMAL(6,3) | NOT NULL | Factor weight |
| description | VARCHAR(255) | NULL | Factor description |

Additional constraints:

- `UNIQUE(policy_id, factor_name)` prevents duplicate factor names within a policy.
- `CHECK(factor_weight >= 0 AND factor_weight <= 1)` restricts factor weights to the range 0–1.
- The total weight of all factors in an active policy must equal 1.
- The total-weight rule must be validated when a policy is activated, using transactional application logic or a database trigger.

### 3.18 complaint_priority_snapshots

Stores historical priority calculation results.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| snapshot_id | INT | PK, AUTO_INCREMENT | Snapshot identifier |
| complaint_id | INT | FK, NOT NULL | Associated complaint |
| policy_id | INT | FK, NOT NULL | Applied priority policy |
| severity_score | DECIMAL(8,3) | NOT NULL | Severity contribution |
| urgency_score | DECIMAL(8,3) | NOT NULL | Urgency contribution |
| waiting_time_score | DECIMAL(8,3) | NOT NULL | Waiting-time contribution |
| total_priority_score | DECIMAL(10,3) | NOT NULL | Calculated total |
| priority_level | ENUM | NOT NULL | LOW, MEDIUM, HIGH, CRITICAL |
| calculated_at | DATETIME | NOT NULL | Calculation timestamp |

Additional constraints:

- `CHECK(severity_score >= 0)` prevents negative severity contributions.
- `CHECK(urgency_score >= 0)` prevents negative urgency contributions.
- `CHECK(waiting_time_score >= 0)` prevents negative waiting-time contributions.
- `CHECK(total_priority_score >= 0)` prevents negative total priority scores.
- Each snapshot must retain the policy identifier and calculated score values used at that time.
- Historical snapshots must not be overwritten when a priority policy changes.

### 3.19 embedding_models

Stores metadata about embedding models used by the semantic search service.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| model_id | INT | PK, AUTO_INCREMENT | Model identifier |
| model_name | VARCHAR(150) | NOT NULL | Model name |
| model_version | VARCHAR(80) | NOT NULL | Model version |
| vector_dimension | INT | NOT NULL | Vector dimension |
| qdrant_collection | VARCHAR(120) | NOT NULL | Qdrant collection name |
| is_active | BOOLEAN | NOT NULL | Model availability |
| created_at | DATETIME | NOT NULL | Creation timestamp |

Additional constraints:

- `CHECK(vector_dimension > 0)` ensures a valid vector dimension.
- Model metadata must match the actual embedding model and Qdrant collection configuration.

### 3.20 complaint_embedding_references

Stores references to complaint vectors held in Qdrant.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| embedding_reference_id | INT | PK, AUTO_INCREMENT | Reference identifier |
| complaint_id | INT | FK, NOT NULL | Associated complaint |
| model_id | INT | FK, NOT NULL | Embedding model |
| qdrant_point_id | VARCHAR(100) | NOT NULL, UNIQUE | Qdrant point identifier |
| collection_name | VARCHAR(120) | NOT NULL | Qdrant collection |
| generated_at | DATETIME | NOT NULL | Embedding creation time |
| updated_at | DATETIME | NOT NULL | Last update time |

Additional constraint:

- `UNIQUE(complaint_id, model_id)` prevents duplicate embedding references for the same complaint and model.

Actual vector values are stored in Qdrant, not in MySQL.

The application must ensure that the referenced Qdrant point exists and belongs to the expected collection and model.

### 3.21 feedback

Stores student feedback about complaint resolution.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| feedback_id | INT | PK, AUTO_INCREMENT | Feedback identifier |
| complaint_id | INT | FK, NOT NULL, UNIQUE | Related complaint |
| student_id | INT | FK, NOT NULL | Feedback provider |
| rating | TINYINT | NOT NULL | Rating from 1 to 5 |
| comments | TEXT | NULL | Feedback comments |
| submitted_at | DATETIME | NOT NULL | Submission timestamp |

Additional constraints:

- `(complaint_id, student_id)` must reference the same student-complaint combination in `complaints`.
- `CHECK(rating BETWEEN 1 AND 5)` ensures valid feedback ratings.
- The unique complaint identifier ensures at most one feedback record per complaint.
- Feedback must be submitted by the student who originally submitted the complaint.

### 3.22 audit_logs

Stores important user activities for accountability and auditing.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| audit_id | BIGINT | PK, AUTO_INCREMENT | Audit identifier |
| user_id | INT | FK, NOT NULL | User performing the action |
| action | VARCHAR(100) | NOT NULL | Action performed |
| entity_name | VARCHAR(80) | NOT NULL | Affected entity |
| entity_id | VARCHAR(80) | NULL | Identifier of affected record |
| old_values | JSON | NULL | Previous values |
| new_values | JSON | NULL | Updated values |
| ip_address | VARCHAR(45) | NULL | User IP address |
| created_at | DATETIME | NOT NULL | Audit timestamp |

Audit records must be retained for accountability and should not be casually modified or deleted.

## 4. Foreign Key Relationships

The following foreign-key relationships will be implemented.

| Child Table | Foreign Key | Parent Table |
|---|---|---|
| users | role_id | roles |
| rooms | hostel_id | hostels |
| student_profiles | user_id | users |
| maintenance_staff_profiles | user_id | users |
| warden_assignments | user_id | users |
| warden_assignments | hostel_id | hostels |
| student_room_history | student_id | student_profiles |
| student_room_history | hostel_id | hostels |
| student_room_history | room_id, hostel_id | rooms |
| staff_specializations | staff_id | maintenance_staff_profiles |
| staff_specializations | specialization_id | maintenance_specializations |
| staff_hostel_assignments | staff_id | maintenance_staff_profiles |
| staff_hostel_assignments | hostel_id | hostels |
| complaints | student_id | student_profiles |
| complaints | hostel_id | hostels |
| complaints | room_id, hostel_id | rooms |
| complaints | category_id | complaint_categories |
| complaint_assignments | complaint_id, hostel_id | complaints |
| complaint_assignments | staff_hostel_assignment_id, staff_id, hostel_id | staff_hostel_assignments |
| complaint_assignments | assigned_by | users |
| complaint_events | complaint_id | complaints |
| complaint_events | performed_by | users |
| priority_policy_factors | policy_id | priority_policies |
| complaint_priority_snapshots | complaint_id | complaints |
| complaint_priority_snapshots | policy_id | priority_policies |
| complaint_embedding_references | complaint_id | complaints |
| complaint_embedding_references | model_id | embedding_models |
| feedback | complaint_id, student_id | complaints |
| audit_logs | user_id | users |

### 4.1 Composite Foreign-Key Requirements

Composite foreign keys require matching unique keys in their referenced tables.

The following unique keys will be included:

- `rooms`: `UNIQUE(room_id, hostel_id)`.
- `complaints`: `UNIQUE(complaint_id, student_id)`.
- `complaints`: `UNIQUE(complaint_id, hostel_id)`.
- `staff_hostel_assignments`: `UNIQUE(staff_hostel_assignment_id, staff_id, hostel_id)`.

These keys ensure that related records cannot refer to mismatched hostel, room, student or staff-assignment combinations.

The nullable `room_id` in `complaints` allows common-area complaints. When `room_id` is NULL, the composite room foreign key does not require a room reference.

## 5. Integrity and Validation Rules

1. Every user must have a valid role.
2. Each user may have at most one student profile and at most one maintenance staff profile.
3. The application must ensure that a user receives only the profile type permitted by their role.
4. Every room must belong to an existing hostel.
5. A student must not have overlapping active room allocations.
6. A complaint must reference an existing student, hostel and category.
7. If a complaint references a room, that room must belong to the complaint's hostel.
8. A complaint may have no room reference when it concerns a common area.
9. A maintenance staff member must have an eligible hostel assignment before receiving a complaint assignment.
10. A complaint must not have multiple active assignments simultaneously.
11. Feedback must be submitted by the student who originally submitted the complaint.
12. Feedback rating must be between 1 and 5.
13. Priority snapshots must preserve the policy and scores used at calculation time.
14. Embedding references must identify the correct complaint, model and Qdrant point.
15. Complaint events, assignment history and audit records must be preserved.
16. A student may have at most one active room allocation.
17. Room capacity must not be exceeded when allocating students.
18. A staff member must be assigned to the same hostel as the complaint before receiving the assignment.
19. A staff-hostel assignment must be active and date-valid when used for a complaint assignment.
20. A complaint may have at most one active staff assignment at a time.
21. Priority policy factor weights must be between 0 and 1, and their total must equal 1 when the policy is activated.
22. Priority scores and feedback ratings must satisfy their defined numeric constraints.
23. Historical staff-hostel assignments, room allocations, complaint assignments and priority snapshots must be retained.

### 5.1 Enforcement Mechanisms

| Integrity Rule | Enforcement Mechanism |
|---|---|
| User role validity | Foreign key |
| Unique user profiles | Unique constraints and application validation |
| Room belongs to hostel | Composite foreign key |
| One active room allocation per student | Generated column and unique index |
| Room capacity | Transactional validation or database trigger |
| Complaint room belongs to hostel | Composite foreign key |
| Complaint belongs to correct student and hostel | Foreign keys and composite unique keys |
| Staff belongs to complaint hostel | Composite foreign key |
| Staff-hostel assignment is active | Transactional validation or database trigger |
| One active complaint assignment | Generated column and unique index |
| Valid priority weights | CHECK constraint and policy activation validation |
| Valid feedback rating | CHECK constraint |
| Historical records | Application rules and restrictive deletion policies |

Database-level constraints and transactional application logic will be used together. A foreign key alone cannot enforce every time-dependent or cross-row business rule.

## 6. Normalization Considerations

### First Normal Form (1NF)

- Each table has a primary key.
- Each column stores a single value.
- Repeating groups are represented through separate related records.
- Multiple staff specializations are stored in the `staff_specializations` table.

### Second Normal Form (2NF)

- Tables use primary keys to identify individual records.
- Non-key attributes depend on the complete candidate key.
- Many-to-many relationships are separated into junction tables.
- Each junction table stores the attributes associated with its relationship.

### Third Normal Form (3NF)

- Non-key attributes depend on the key, the whole key and nothing but the key.
- Role descriptions are stored in `roles` rather than repeated in `users`.
- Complaint categories are stored separately from complaints.
- Maintenance specializations are stored separately from staff profiles.
- Student and maintenance staff profile information is separated from common user account information.

## 7. Indexing Strategy

The following columns are expected to require indexes:

- `users.email`
- `users.role_id`
- `rooms.hostel_id`
- `rooms.hostel_id, room_number`
- `student_profiles.registration_number`
- `complaints.student_id`
- `complaints.hostel_id`
- `complaints.category_id`
- `complaints.status`
- `complaints.submitted_at`
- `complaint_assignments.complaint_id`
- `complaint_assignments.staff_id`
- `complaint_assignments.active_complaint_id`
- `student_room_history.student_id`
- `student_room_history.active_student_id`
- `staff_hostel_assignments.staff_id`
- `staff_hostel_assignments.hostel_id`
- `complaint_events.complaint_id`
- `complaint_priority_snapshots.complaint_id`
- `complaint_embedding_references.complaint_id`
- `audit_logs.user_id`
- `audit_logs.created_at`

Indexes will be finalized based on actual query patterns and tested workload.

Unique constraints and foreign-key indexes will also be considered when implementing the SQL schema. Redundant indexes will be avoided.

## 8. Database Implementation Considerations

The following implementation decisions apply to the MySQL database:

1. MySQL 8.4 will be used as the relational database.
2. All tables will use the InnoDB storage engine.
3. The database will use `utf8mb4` character encoding.
4. Foreign keys will enforce referential integrity.
5. Composite unique keys will support the required composite foreign keys.
6. Generated columns and unique indexes will enforce active-record uniqueness.
7. CHECK constraints will enforce valid numeric ranges and date relationships.
8. Transactional application logic or triggers will enforce rules that require checking multiple rows or related records.
9. Historical records will be preserved rather than physically deleted.
10. Qdrant will store the actual complaint embedding vectors.
11. MySQL will store embedding metadata and Qdrant point references.
12. The actual embedding model dimension must be measured and verified before configuring the Qdrant collection.

### 8.1 Deletion and Historical Data Policy

- Parent records referenced by historical records must not be physically deleted.
- Foreign keys should use restrictive deletion behavior for important historical relationships.
- Soft deletion or status changes should be preferred for users, hostels, rooms, staff and categories where historical references exist.
- Complaint events, assignment history, priority snapshots and audit logs must be retained.
- Cascading deletion should not be used where it could remove historical or audit information.

### 8.2 Transactional Validation

The following operations must use transactions and appropriate locking to prevent concurrent requests from violating business rules:

- Student room allocation and room-capacity validation.
- Staff-hostel assignment validation during complaint assignment.
- Complaint assignment and reassignment.
- Priority policy activation and factor-weight validation.

## 9. Conclusion

This relational schema defines the structure of the 22-entity Smart Hostel Maintenance & Complaint Prioritization Platform.

It establishes the foundation for MySQL implementation, data integrity, normalization, indexing, transaction management and advanced SQL operations.

The schema also defines how MySQL relational records will connect to Qdrant vector records through embedding references.

The next stage is to convert this approved design into executable MySQL DDL statements, implement the required constraints and triggers, and verify the resulting database through SQL tests.
