import * as Yup from "yup";

const dateOnly = Yup.string()
  .required("date is required")
  .matches(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format");

export const createLeaveRequestSchema = Yup.object({
  employeeId: Yup.string().trim().required("employeeId is required"),
  leaveType: Yup.string()
    .oneOf(["ANNUAL", "SICK", "UNPAID"], "leaveType must be ANNUAL, SICK, or UNPAID")
    .required("leaveType is required"),
  startDate: dateOnly,
  endDate: dateOnly,
  reason: Yup.string().trim().max(1000, "reason must be 1000 characters or fewer"),
});

export const rejectLeaveRequestSchema = Yup.object({
  comment: Yup.string().trim().required("comment is required").min(1, "comment is required"),
});

export const leaveRequestParamsSchema = Yup.object({
  id: Yup.string().trim().required("id is required"),
});

export const listLeaveRequestsQuerySchema = Yup.object({
  status: Yup.string().oneOf(["PENDING", "APPROVED", "REJECTED"]).optional(),
  employeeId: Yup.string().trim().optional(),
  page: Yup.number().integer().min(1).default(1),
  perPage: Yup.number().integer().min(1).max(100).default(15),
});

export type CreateLeaveRequestType = Yup.InferType<typeof createLeaveRequestSchema>;
export type RejectLeaveRequestType = Yup.InferType<typeof rejectLeaveRequestSchema>;
export type LeaveRequestParamsType = Yup.InferType<typeof leaveRequestParamsSchema>;
export type ListLeaveRequestsType = Yup.InferType<typeof listLeaveRequestsQuerySchema>;