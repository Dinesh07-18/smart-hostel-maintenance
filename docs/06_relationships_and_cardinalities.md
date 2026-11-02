# Relationships and Cardinalities

## 1. Introduction

This document defines the relationships and cardinalities between the 22 entities identified in the Smart Hostel Maintenance & Complaint Prioritization Platform.

It establishes how entities are connected through primary keys and foreign keys and defines the relationship rules required for database implementation.

## 2. Relationship Definitions

| No. | Parent Entity | Child Entity | Cardinality |
|---|---|---|---|
| 1 | Role | User | 1:N |
| 2 | Hostel | Room | 1:N |
| 3 | User | Student Profile | 1:0..1 |
| 4 | User | Maintenance Staff Profile | 1:0..1 |
| 5 | User | Warden Assignment | 1:N |
| 6 | Hostel | Warden Assignment | 1:N |
| 7 | Student Profile | Student Room History | 1:N |
| 8 | Hostel | Student Room History | 1:N |
| 9 | Room | Student Room History | 1:N |
| 10 | Maintenance Staff Profile | Staff Specialization | 1:N |
| 11 | Maintenance Specialization | Staff Specialization | 1:N |
| 12 | Maintenance Staff Profile | Staff Hostel Assignment | 1:N |
| 13 | Hostel | Staff Hostel Assignment | 1:N |
| 14 | Student Profile | Complaint | 1:N |
| 15 | Hostel | Complaint | 1:N |
| 16 | Room | Complaint | 1:N |
| 17 | Complaint Category | Complaint | 1:N |
| 18 | Complaint | Complaint Assignment | 1:N |
| 19 | Maintenance Staff Profile | Complaint Assignment | 1:N |
| 20 | User | Complaint Assignment (assigned_by) | 1:N |
| 21 | Complaint | Complaint Event | 1:N |
| 22 | User | Complaint Event | 1:N |
| 23 | Priority Policy | Priority Policy Factor | 1:N |
| 24 | Complaint | Complaint Priority Snapshot | 1:N |
| 25 | Priority Policy | Complaint Priority Snapshot | 1:N |
| 26 | Embedding Model | Complaint Embedding Reference | 1:N |
| 27 | Complaint | Complaint Embedding Reference | 1:N |
| 28 | Complaint | Feedback | 1:0..1 |
| 29 | Student Profile | Feedback | 1:N |
| 30 | User | Audit Log | 1:N |

## 3. Relationship Explanations

### 3.1 Hostel Management

- One hostel can contain multiple rooms.
- Each room belongs to exactly one hostel.
- One hostel can have multiple wardens through Warden Assignment.
- One hostel can have multiple maintenance staff members through Staff Hostel Assignment.

### 3.2 User Management

- One role can be assigned to multiple users.
- Each user has one assigned role in the initial design.
- A user may have one student profile or one maintenance staff profile, depending on their role.
- One warden can be associated with multiple hostels through Warden Assignment.

### 3.3 Student Room History

- One student can have multiple room allocation records over time.
- Each room allocation belongs to one student.
- Each allocation references one hostel and one room.
- Historical allocations are retained when students change rooms or hostels.

### 3.4 Maintenance Management

- One maintenance staff member can have multiple specializations.
- One specialization can belong to multiple staff members through Staff Specialization.
- One staff member can be assigned to multiple hostels.
- One hostel can have multiple assigned maintenance staff members.

### 3.5 Complaint Management

- One student can submit multiple complaints.
- One hostel can receive multiple complaints.
- One room can be associated with multiple complaints over time.
- One complaint category can classify multiple complaints.
- Each complaint belongs to one student, one hostel and one category.
- A room reference may be optional for complaints involving common areas.

### 3.6 Complaint Assignment

- One complaint can have multiple assignment records over time.
- One maintenance staff member can receive multiple complaint assignments.
- One user can create multiple assignments.
- Assignment records preserve the history of initial assignments and reassignments.

### 3.7 Complaint Event History

- One complaint can have multiple event records.
- One user can perform multiple complaint-related events.
- Each event records the action, previous status, new status, remarks and timestamp.

### 3.8 Complaint Prioritization

- One priority policy can contain multiple priority factors.
- One complaint can have multiple priority calculation snapshots.
- Each priority snapshot references the policy used for its calculation.
- Historical snapshots preserve earlier priority decisions.

### 3.9 Semantic Search

- One embedding model can be used for multiple complaint embeddings.
- One complaint can have multiple embedding references when different models or versions are used.
- Each embedding reference identifies the corresponding Qdrant point.
- Actual vector values are stored in Qdrant.

### 3.10 Feedback and Auditing

- One complaint can have zero or one feedback record in the initial design.
- One student can submit feedback for multiple complaints.
- One user can generate multiple audit log records.

## 4. Database Integrity Rules

The following rules will be enforced through appropriate database constraints and backend validation:

1. Every room must reference an existing hostel.
2. Every user must reference a valid role.
3. Student and maintenance staff profiles must reference existing users.
4. A student must not have more than one active room allocation at the same time.
5. Every complaint must reference an existing student, hostel and complaint category.
6. A complaint's original hostel and room information must remain unchanged when the student changes accommodation.
7. A complaint must not have multiple active maintenance assignments simultaneously.
8. Assigned maintenance staff must be authorized to work in the complaint's hostel.
9. Only authorized users can create or modify complaint assignments.
10. Complaint status transitions must follow the defined complaint lifecycle.
11. Every priority snapshot must reference an existing complaint and priority policy.
12. Every complaint embedding reference must identify an existing complaint and embedding model.
13. Feedback must be submitted by the student associated with the complaint.
14. Historical complaint events and assignment records must be preserved.

## 5. Many-to-Many Relationships

The following many-to-many relationships are implemented using junction entities:

### 5.1 Maintenance Staff and Maintenance Specialization

- A staff member can have multiple specializations.
- A specialization can belong to multiple staff members.
- Junction entity: Staff Specialization.

### 5.2 Maintenance Staff and Hostel

- A staff member can work in multiple hostels.
- A hostel can have multiple maintenance staff members.
- Junction entity: Staff Hostel Assignment.

### 5.3 Warden and Hostel

- A warden can manage multiple hostels.
- A hostel can have multiple assigned wardens.
- Junction entity: Warden Assignment.

## 6. Conclusion

The relationship model establishes the logical connections between all 22 entities.

These relationships provide the foundation for preparing the Entity-Relationship Diagram and relational schema.

The final implementation will use primary keys, foreign keys, unique constraints, check constraints, indexes and transaction management to maintain database consistency.