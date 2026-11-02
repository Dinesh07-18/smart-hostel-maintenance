# Smart Hostel Maintenance & Complaint Prioritization Platform

## 1. Problem Statement

Hostel students regularly face maintenance problems such as plumbing failures, electrical issues, water shortages, damaged furniture, cleanliness problems and internet connectivity issues.

Traditional complaint-handling processes often depend on manual registers, verbal communication or basic online forms. These approaches make it difficult to track complaints, identify urgent problems, assign maintenance staff efficiently and monitor resolution progress.

Complaints may remain unattended for long periods, urgent issues may not receive appropriate priority, and students may have limited visibility into the progress of their requests. Hostel wardens and administrators may also struggle to monitor complaint volumes, staff workloads and recurring maintenance problems.

The **Smart Hostel Maintenance & Complaint Prioritization Platform** aims to address these challenges through a centralized web-based application that manages the complete complaint lifecycle.

The platform will use a relational database (MySQL) to maintain structured hostel, user, complaint, assignment and maintenance records. A separate vector database (Qdrant) will support semantic search by identifying complaints with similar meanings, even when different words are used.

The system will automatically prioritize complaints based on defined factors such as severity, urgency and waiting time. It will provide separate interfaces and permissions for students, maintenance staff, wardens and administrators.

The proposed platform aims to improve complaint tracking, maintenance coordination, transparency, prioritization and overall hostel maintenance management.