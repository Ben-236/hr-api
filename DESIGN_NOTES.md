Design Notes
These notes capture the architectural decisions, tradeoffs, and engineering judgment behind the Leave Request & Approval module.
The goal is not to design for hypothetical internet-scale traffic, but to make pragmatic decisions that keep the system reliable, maintainable, and easy to evolve as usage grows.

Section 3: System Design Questions
1. Scaling Leave Submissions
At the scale described (500 companies with predictable end-of-week spikes), the primary concern is handling short bursts of write activity rather than sustained high throughput.
Recommended Approach
* Horizontally scale the API layer behind a load balancer. The application is stateless, so additional instances can be added without coordination concerns.
* Use connection pooling. PostgreSQL has a finite connection limit, and burst traffic can exhaust available connections if each API instance maintains its own large pool. A connection pooler such as PgBouncer helps smooth connection usage.
* Reduce database round-trips by keeping overlap validation, balance checks, and request creation within a single transaction where possible.
* Introduce asynchronous processing only if necessary. If submission traffic eventually exceeds what can be handled synchronously, requests could be accepted and queued for background processing. This adds complexity and eventual consistency concerns, so it would only be introduced when supported by real usage data.
What I Would Measure
* p50, p95, and p99 latency for POST /leave-requests
* Database connection pool utilization
* Query latency, particularly overlap validation queries
* API error rates
* Queue depth and processing latency if asynchronous processing is introduced

2. Duplicate Event Processing
Duplicate event delivery should be assumed whenever asynchronous messaging is involved. Consumers should be designed to handle repeated delivery safely.
Recommended Approach
* Include an idempotency key in every event (e.g. leave-approved:{requestId}).
* Maintain a consumer-side deduplication table containing processed event identifiers.
* Perform the deduplication check and business side effect within the same transaction.
* Use the Outbox Pattern on the producer side so event publication is tied to the same transaction that updates application state.
This provides protection against duplicate delivery regardless of whether the duplication originates from the producer, broker, or consumer.
Both producers and consumers should assume duplicate delivery is possible. This creates defense-in-depth rather than relying on a single layer for correctness.

3. Audit Logging
Goal
Provide immutable, searchable audit history without materially affecting request latency.
Recommended Approach
Audit records should be written transactionally alongside the business operation.
When a leave request is approved or rejected:
1. Update the leave request.
2. Insert an audit log entry.
3. Commit both changes in the same transaction.
This guarantees that approvals and audit records cannot become inconsistent.
For long-term analytics and reporting:
* Replicate audit data asynchronously using Change Data Capture (CDC)
* Stream audit events into a reporting or compliance system
* Avoid synchronous calls to external audit services from the request path
Immutability
Audit records should be append-only.
The application database role should not have permission to update or delete audit records, and database-level protections should prevent modification after insertion.
Data Captured
Each audit record should contain:
* Actor (employee or approver)
* Action performed
* Timestamp
* Before/after state (or state diff)
* Relevant request metadata

4. Sync vs Async Balance Deduction
Recommendation: Synchronous
Balance deduction should occur within the same transaction as leave approval.
Why
Balance updates are part of the core business transaction and should therefore share the same consistency guarantees as the leave request status.
If balance deduction becomes asynchronous:
* A request could appear approved while the balance remains unchanged.
* New leave submissions could be validated against stale balances.
* Additional consistency mechanisms would be required.
The balance update itself is inexpensive and does not justify introducing eventual consistency.
Where Async Makes Sense
Operations that are slow, external, or failure-prone should happen asynchronously.
Examples:
* Payroll synchronization
* Email notifications
* Slack or Teams notifications
* Analytics pipelines
The approval transaction should complete first, followed by event publication for downstream consumers.

5. Monolith vs Microservice
Recommendation: Modular Monolith
I would keep leave management inside the primary HR application.
Leave requests are tightly coupled to employee records, balances, reporting structures, and future HR workflows. Splitting the functionality into a separate service too early introduces operational complexity without delivering meaningful benefits.
A modular monolith preserves clear service boundaries while avoiding network calls, distributed transactions, and cross-service consistency challenges.
When I Would Consider Splitting
* Leave management has significantly different scaling requirements.
* Leave functionality evolves independently of the rest of HR.
* A dedicated team owns leave management and requires independent deployments.
* Integration requirements justify treating leave management as a standalone domain.
Risks of Splitting Too Early
* Cross-service consistency issues
* Additional operational overhead
* More complex reporting and analytics
* Increased deployment and monitoring complexity
For the scale described in the assessment, these costs outweigh the benefits.

Section 4: Product & Engineering Judgment
Scenario A — The Quick Win
Risks of Reverting Directly to PENDING
Changing an approved request back to PENDING introduces several problems:
* Leave balance remains deducted.
* There is no audit trail explaining the reversal.
* Historical approval information is lost.
* Downstream systems may become inconsistent.
* The request enters a state it was never designed to re-enter.
The result is a data integrity problem rather than a simplified solution.
Recommended Approach
Introduce a dedicated cancellation workflow:
APPROVED → CANCELLED
The cancellation endpoint should:
1. Restore the leave balance.
2. Record an audit entry.
3. Store who performed the cancellation.
4. Preserve approval history.
What I Would Ship
A minimal but correct cancellation endpoint:
POST /leave-requests/:id/cancel
This provides correct business behavior while keeping implementation effort small.
What I Would Not Ship
I would not implement a solution that simply changes:
APPROVED → PENDING
because it introduces data integrity issues that are harder to explain and fix later than implementing a minimal cancellation workflow now.

Scenario B — Consistency vs Performance
Tradeoff
Database Read
* ~80ms latency
* Always correct
Redis Cache
* ~5ms latency
* Potentially stale for up to 60 seconds
Recommendation
For leave balances, correctness is more important than saving tens of milliseconds.
Users are most likely to verify their balance immediately after a leave action, which is precisely when stale data would be most visible.
For that reason, I would prefer the database-backed value.
If Caching Becomes Necessary
Use cache invalidation rather than relying solely on TTLs.
Whenever a leave request changes the balance:
1. Update the database.
2. Invalidate the cache entry.
3. Rebuild the cache on the next read.
This preserves correctness while still benefiting from caching.

Scenario C — Legal Retention vs PII Deletion
These requirements are not inherently contradictory if leave history and personal information are treated separately.
Recommended Approach
Retain leave records for the legally required retention period while removing personally identifiable information.
Example Data Model
Employee
 └── EmployeePII
Employee
* Internal identifiers
* Organizational metadata
EmployeePII
* Name
* Email
* Address
* Other personal information
Leave requests reference the employee record, not the PII record directly.
Deletion Flow
When a deletion request is received:
1. Remove the EmployeePII record.
2. Retain leave records and non-identifying references.
3. Continue retaining legally required data.
4. Delete retained records once the retention period expires.
This satisfies both requirements:
* Legal retention obligations remain intact.
* Personally identifiable information is removed.
This approach also follows the principle of data minimization by retaining only the information necessary for legal and operational purposes.

Summary
The design favors correctness, operational simplicity, and clear ownership boundaries over premature optimization.
Core business operations such as leave approvals and balance updates remain strongly consistent and transactional, while secondary concerns such as notifications, analytics, and audit replication can be handled asynchronously.
Where tradeoffs exist, the preferred approach is to optimize for data integrity first and introduce additional complexity only when there is a demonstrated need for it.
