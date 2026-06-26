PeopleFlow — Leave Request & Approval Module
A backend implementation of the Leave Request & Approval module for a multi-tenant HR SaaS platform. 

Design Overview
The goal of this implementation was to build a reliable and maintainable leave management API while focusing on correctness, data integrity, and clear business rule enforcement rather than building a fully featured HR platform.

Key areas of focus:
* Leave request validation
* Leave balance management
* Request state transitions
* Concurrency-safe approval handling
* PostgreSQL-backed persistence
* Clear separation of concerns
* Meaningful automated tests

Stack
* Node.js + TypeScript + Express
* PostgreSQL via Prisma ORM (Prisma 7 using @prisma/adapter-pg)
* Yup for request validation
* Vitest + Supertest for integration testing

Setup
Prerequisites
* Node.js 20+
* PostgreSQL running locally

1. Install Dependencies
npm install

2. Configure Environment
Copy .env.example to .env and update the PostgreSQL connection details:
cp .env.example .env
Create the application databases:
create db hr_api
create db hr_api_test

3. Generate Prisma Client and Run Migrations
npx prisma generate
npx prisma migrate deploy
Apply migrations to the test database as well:
DATABASE_URL="<your test database url>" npx prisma migrate deploy

4. Seed Sample Data
npx prisma db seed
This creates two employees:
Employee ID	Name	Annual Leave Balance
emp-001	Ada Obi	18 days
emp-002	Chidi Eze	10 days

5. Start the Application
npm run dev
The server starts on the port configured in .env (default: 3310).

6. Run Tests
npm test

API Endpoints
Method	Endpoint	Description
POST	/leave-requests	Submit a leave request
GET	/leave-requests	List leave requests
POST	/leave-requests/:id/approve	Approve a pending leave request
POST	/leave-requests/:id/reject	Reject a pending leave request
GET	/employees/:employeeId/leave-balance	Retrieve remaining annual leave balance
Optional Request Headers
Header	Purpose
X-Approver-Id	Records the approver identity
X-Approver-Role	Included for future authorization support
X-Tenant-Id	Included as a future multi-tenancy extension point
Assumptions and Design Decisions

1. Who Can Approve Leave Requests?
Authentication and authorization were intentionally kept out of scope, as specified in the assessment requirements.
The API accepts X-Approver-Id and X-Approver-Role headers and records the approver ID when a request is approved. However, the implementation does not verify whether the caller is actually authorized to approve requests.
In a production system, approval permissions would be enforced through authentication middleware and role-based access control.

2. Are Half-Day Requests Supported?
No.
Leave is tracked in whole calendar days only. Supporting half-day requests would require additional business rules, balance calculations, and overlap validation logic.

3. Do Weekends and Public Holidays Count?
Yes.
Every calendar day within the leave period counts against the employee's leave balance. Since the assessment does not provide a holiday calendar or company-specific working schedule, weekends and public holidays are treated the same as weekdays.
A production implementation would likely integrate a configurable holiday calendar and working-week definition.

4. How Are Dates Stored and Compared?
Dates are accepted as YYYY-MM-DD values and converted to UTC-based Date objects.
All calculations and comparisons are performed in UTC to avoid timezone-related inconsistencies between clients and servers.

5. What Happens If Two Overlapping Requests Are Submitted Simultaneously?
The current implementation performs overlap detection using a read-then-write pattern.
Under heavy concurrency, it is theoretically possible for two overlapping requests submitted by the same employee to pass validation before either transaction completes.
This limitation affects request integrity but does not impact leave balances because balances are only deducted during approval.
In production, this could be addressed using database locking, advisory locks, or a stronger database constraint strategy.

6. Approval Concurrency and Idempotency
Approval operations are protected against duplicate requests and retries.
The approval flow uses an atomic status transition inside a database transaction. Only one request can successfully transition a leave request from PENDING to APPROVED.
Subsequent approval attempts are treated as idempotent retries and do not result in additional leave balance deductions.
Additional details are documented in DEBUGGING.md.

7. Extending to Multi-Step Approvals
A future version could introduce an approval workflow table containing ordered approval steps.
Each step would define:
* Required approver
* Approval order
* Current state
A leave request would only become fully approved after all required approval steps have been completed successfully.

8. Tenant Isolation
The current implementation is intentionally single-tenant.
X-Tenant-Id is accepted as a placeholder for future tenant-aware behavior but is not currently enforced at the database level.
A production implementation could use either:
* Shared database with tenant-scoped records and row-level security
* Schema-per-tenant
* Database-per-tenant
Further discussion is included in DESIGN_NOTES.md.

Known Limitations
* Authentication and authorization are not implemented.
* Tenant isolation is not enforced.


Why Express Instead of NestJS?
The assessment allows either framework.
Express was chosen because it provides a lightweight and transparent structure while still allowing clear separation between routes, controllers, services, validation, and persistence layers.
This helped keep the implementation focused on business logic rather than framework-specific abstractions.

Why Vitest Instead of Jest?
The project was initially configured with Jest.
However, Prisma 7's generated client relies on import.meta, which requires additional ESM configuration when used with Jest and ts-jest.
Vitest supports this setup out of the box and provided a simpler testing environment without changing any test logic.

Why Prisma Driver Adapters?
This project uses Prisma 7 with the PostgreSQL driver adapter (@prisma/adapter-pg), which is the recommended PostgreSQL integration approach for Prisma's current architecture.
