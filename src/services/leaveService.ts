import { prisma } from "../db/prisma";
import ErrorWithCode from "../utils/ErrorWithCode";
import codes from "../utils/statusCode";
import { LeaveType, LeaveStatus, Prisma } from "../../generated/prisma/client";
import { parseDateOnly, startOfTodayUTC, inclusiveDayCount } from "../utils/dates";
import { CreateLeaveRequestType } from "../middlewares/yupMiddleware/leaveValidator";

const SICK_LONG_LEAVE_DAYS = 3;
const SICK_LONG_LEAVE_MIN_REASON_LENGTH = 20;

export const leaveService = {
  async submit(input: CreateLeaveRequestType) {
    const { employeeId, leaveType, startDate: startStr, endDate: endStr, reason } = input;

    const startDate = parseDateOnly(startStr);
    const endDate = parseDateOnly(endStr);

    // Rule: endDate must be on or after startDate
    if (endDate.getTime() < startDate.getTime()) {
      throw new ErrorWithCode("endDate must be on or after startDate", codes.badRequest);
    }

    // Rule: leave cannot be submitted for dates entirely in the past
    const today = startOfTodayUTC();
    if (endDate.getTime() < today.getTime()) {
      throw new ErrorWithCode(
        "Leave cannot be submitted for dates entirely in the past",
        codes.badRequest
      );
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new ErrorWithCode("Employee not found", codes.notFound);
    }

    const daysRequested = inclusiveDayCount(startDate, endDate);

    // Rule: reason optional for ANNUAL, required for SICK and UNPAID
    if ((leaveType === LeaveType.SICK || leaveType === LeaveType.UNPAID) && !reason?.trim()) {
      throw new ErrorWithCode(`reason is required for ${leaveType} leave`, codes.badRequest);
    }

    // Rule: SICK leave for more than 3 consecutive days requires reason
    // length of at least 20 characters
    if (
      leaveType === LeaveType.SICK &&
      daysRequested > SICK_LONG_LEAVE_DAYS &&
      (reason?.trim().length ?? 0) < SICK_LONG_LEAVE_MIN_REASON_LENGTH
    ) {
      throw new ErrorWithCode(
        `SICK leave longer than ${SICK_LONG_LEAVE_DAYS} days requires a reason of at least ${SICK_LONG_LEAVE_MIN_REASON_LENGTH} characters`,
        codes.badRequest
      );
    }

    // Rule: no overlapping PENDING or APPROVED requests for the same employee
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new ErrorWithCode(
        "Employee already has a pending or approved leave request overlapping these dates",
        codes.conflict
      );
    }

    // Rule: ANNUAL leave must not exceed remaining balance
    if (leaveType === LeaveType.ANNUAL && daysRequested > employee.annualLeaveBalance) {
      throw new ErrorWithCode(
        `Requested ${daysRequested} day(s) exceeds remaining annual leave balance of ${employee.annualLeaveBalance}`,
        422
      );
    }

    return prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType: leaveType as LeaveType,
        startDate,
        endDate,
        daysRequested,
        reason: reason?.trim() || null,
        status: LeaveStatus.PENDING,
      },
    });
  },

  async list(filters: { status?: LeaveStatus; employeeId?: string }) {
    const where: Prisma.LeaveRequestWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.employeeId) where.employeeId = filters.employeeId;

    return prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Approves a PENDING request and deducts ANNUAL balance atomically.
   *
   * Concurrency/idempotency: the conditional `updateMany` (status: PENDING
   * in the WHERE clause) is what makes this safe against duplicate/retried
   * approval calls. If two requests race, only one will find the row still
   * PENDING and flip it - the loser's updateMany returns count: 0, so it
   * never touches the balance. See DEBUGGING.md for the full writeup of
   * why this differs from a naive findUnique -> check -> update sequence.
   */
  async approve(requestId: string, approverId: string) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!existing) {
      throw new ErrorWithCode("Leave request not found", codes.notFound);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.leaveRequest.updateMany({
        where: { id: requestId, status: LeaveStatus.PENDING },
        data: {
          status: LeaveStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Either already approved/rejected by another request, or this is
        // a retry arriving after the first call already succeeded.
        return null;
      }

      const updated = await tx.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });

      if (updated.leaveType === LeaveType.ANNUAL) {
        await tx.employee.update({
          where: { id: updated.employeeId },
          data: { annualLeaveBalance: { decrement: updated.daysRequested } },
        });
      }

      return updated;
    });

    if (!result) {
      // Re-fetch current state to give a clear, accurate error rather than
      // a generic conflict - distinguishes "already approved" (likely a
      // benign retry) from "already rejected" (a real conflict).
      const current = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });
      if (current.status === LeaveStatus.APPROVED) {
        // Idempotent: treat a retry on an already-approved request as a
        // success rather than an error, since the desired end state
        // (APPROVED) is already true. Balance was not deducted twice.
        return current;
      }
      throw new ErrorWithCode(
        `Leave request is not pending (current status: ${current.status})`,
        codes.conflict
      );
    }

    return result;
  },

  async reject(requestId: string, comment: string) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!existing) {
      throw new ErrorWithCode("Leave request not found", codes.notFound);
    }

    const result = await prisma.leaveRequest.updateMany({
      where: { id: requestId, status: LeaveStatus.PENDING },
      data: {
        status: LeaveStatus.REJECTED,
        rejectionComment: comment,
      },
    });

    if (result.count === 0) {
      const current = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });
      throw new ErrorWithCode(
        `Leave request is not pending (current status: ${current.status})`,
        codes.conflict
      );
    }

    return prisma.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });
  },
}; 