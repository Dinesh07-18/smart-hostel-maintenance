# Non-Functional Requirements

## 1. Performance

- NFR-01: Common application operations should respond within 3 seconds under normal testing conditions.
- NFR-02: Complaint listing and filtering should use appropriate database indexes.
- NFR-03: Semantic search should return results within an acceptable response time under normal testing conditions.

## 2. Security

- NFR-04: Passwords must be stored using a secure password-hashing algorithm.
- NFR-05: Access to application resources must be controlled by role-based permissions.
- NFR-06: Users must not access complaints or hostel information outside their authorized scope.
- NFR-07: Database credentials, API keys and other secrets must be stored in environment variables.
- NFR-08: The application must validate and sanitize user input.
- NFR-09: Sensitive operations must be recorded for auditing.

## 3. Reliability and Data Integrity

- NFR-10: Database transactions must protect critical multi-step operations.
- NFR-11: Foreign keys and database constraints must prevent invalid relational records.
- NFR-12: The application must handle database and vector-service failures gracefully.
- NFR-13: Complaint history and assignment records must remain consistent.

## 4. Usability

- NFR-14: The application must provide separate, understandable dashboards for each user role.
- NFR-15: Students must be able to submit and track complaints with minimal steps.
- NFR-16: Complaint priority and status must be clearly displayed.
- NFR-17: The interface must support common desktop and mobile screen sizes.

## 5. Scalability

- NFR-18: The database design must support multiple hostels and increasing complaint volumes.
- NFR-19: The application must support adding maintenance staff and users without requiring major architectural changes.
- NFR-20: Vector search must support an increasing collection of complaint embeddings.

## 6. Maintainability

- NFR-21: The application must use a modular project structure.
- NFR-22: Database schema changes must be maintained through version-controlled migration files.
- NFR-23: Application configuration must be separated from source code.
- NFR-24: Important modules and APIs must have appropriate documentation and tests.

## 7. Compatibility

- NFR-25: The web application must support current versions of major desktop browsers.
- NFR-26: The application must operate using the selected MySQL, Qdrant, Next.js and Python technology stack.

## 8. Testing and Verification

- NFR-27: Critical database operations must have verification tests.
- NFR-28: Role-based access restrictions must be tested.
- NFR-29: Complaint lifecycle transitions must be tested.
- NFR-30: Semantic search functionality must be tested using representative complaint descriptions.