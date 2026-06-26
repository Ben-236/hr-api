Debugging Exercise: Duplicate Leave Balance Deduction
What Went Wrong
The approval flow performs several dependent operations as separate database calls:
1. Read the leave request
2. Validate that the request is still PENDING
3. Read the employee's current leave balance
4. Validate that sufficient balance exists
5. Update the employee's balance
6. Update the leave request status

Because these operations are executed independently and outside a database transaction, another request can modify the same data between steps. The validation checks are only true at the moment the data is read and are not revalidated when the updates occur.
As a result, the approval process is vulnerable to race conditions when multiple requests attempt to approve the same leave request concurrently.

Why the Balance Was Deducted Twice
The UI retried the approval request after a timeout, causing two approval handlers to run almost simultaneously.
Both requests:
1. Read the leave request while its status was still PENDING
2. Passed the status validation check
3. Read the employee's balance as 10 days
4. Deducted 5 days
5. Updated the leave request to APPROVED
Because the status check, balance update, and request update were performed as separate operations outside a transaction, both callers believed they were processing a valid approval.
The root cause is that the approval operation was not atomic. Nothing prevented two concurrent requests from executing the approval logic at the same time.

Corrected Approach
async approveLeaveRequest(requestId: string, approverId: string) {
  const existing = await this.db.leaveRequest.findUnique({
    where: { id: requestId },
  });

  if (!existing) {
    throw new NotFoundError("Leave request not found");
  }

  const result = await this.db.$transaction(async (tx) => {
    const updateResult = await tx.leaveRequest.updateMany({
      where: {
        id: requestId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    const updated = await tx.leaveRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (updated.leaveType === "ANNUAL") {
      await tx.employee.update({
        where: { id: updated.employeeId },
        data: {
          annualLeaveBalance: {
            decrement: updated.daysRequested,
          },
        },
      });
    }

    return updated;
  });

  if (!result) {
    const current = await this.db.leaveRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (current.status === "APPROVED") {
      return current;
    }

    throw new ConflictError(
      `Leave request is not pending (status: ${current.status})`
    );
  }

  await this.eventBus.publish("leave.approved", {
    requestId,
    employeeId: result.employeeId,
  });

  return result;
}

Why This Fix Works
* Atomicity: the status transition and leave balance deduction occur inside a single database transaction. Either both changes succeed or neither does.
* Consistency: the leave request status and employee balance remain synchronized. It is impossible for one update to succeed while the other fails.
* Database-level concurrency protection: the conditional update (WHERE status = 'PENDING') acts as an atomic check-and-set operation. Only one concurrent request can successfully transition the leave request from PENDING to APPROVED.
* Safe balance updates: using Prisma's decrement operation ensures the database performs the arithmetic directly, avoiding stale-read calculations in application memory.
* Idempotent retries: if a duplicate approval request arrives after the first one succeeds, it returns the already-approved request instead of performing a second balance deduction.

Additional Improvements
1. Idempotency Keys
Approval endpoints are naturally retry-prone because network timeouts can occur even when the server successfully processed the request.
A production implementation should support an Idempotency-Key header. The key would be stored with a unique constraint and associated with the original response. Any retry using the same key would return the previous result instead of executing the business logic again.
This prevents duplicate processing even before the request reaches the approval workflow.

2. Concurrency Tests
Add automated tests that execute multiple approval requests simultaneously against the same leave request:
await Promise.all([
  approveLeaveRequest(id, approverA),
  approveLeaveRequest(id, approverB),
]);
The test should verify:
* Only one approval succeeds
* The request ends in the APPROVED state
* The leave balance is deducted exactly once
This serves as a regression test for the original bug.

3. Database Constraints and Monitoring
Application logic should not be the only protection mechanism.
A database-level constraint provides an additional safety net:
CHECK (annual_leave_balance >= 0)
This prevents invalid balances from being persisted even if a future application bug bypasses validation.
In addition, monitoring should alert on:
* Negative leave balances
* Unexpected approval retries
* High rates of approval conflicts
These signals help identify concurrency issues before they affect large numbers of users.

Summary
The incident was caused by a race condition in the approval workflow. The leave request status check and leave balance deduction were executed as separate operations without transactional protection, allowing multiple concurrent requests to process the same approval.
The solution is to make approval a single atomic operation protected by a database-level status transition guard. Combined with idempotent retries, transactional updates, reliable event publishing, and concurrency testing, the approval workflow becomes safe under concurrent execution and network retries.
