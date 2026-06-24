import { Request, Response } from "express";
import use from "../utils/use";
import codes from "../utils/statusCode";
import { leaveService } from "../services/leaveService";
import {
  CreateLeaveRequestType,
  RejectLeaveRequestType,
  LeaveRequestParamsType,
  ListLeaveRequestsType,
} from "../middlewares/yupMiddleware/leaveValidator";
import { LeaveStatus } from "../../generated/prisma/client";

export const submitLeaveRequest = use(async (req: Request, res: Response) => {
  const input = req.validated?.body as unknown as CreateLeaveRequestType;

  const leaveRequest = await leaveService.submit(input);

  res.status(codes.created).json({
    message: "Leave request submitted successfully",
    data: leaveRequest,
  });
});

export const listLeaveRequests = use(async (req: Request, res: Response) => {
  const { status, employeeId } = (req.validated?.query ?? {}) as ListLeaveRequestsType;

  const leaveRequests = await leaveService.list({
    status: status as LeaveStatus | undefined,
    employeeId,
  });

  res.status(codes.success).json({
    message: "Leave requests fetched successfully",
    data: leaveRequests,
  });
});

export const approveLeaveRequest = use(async (req: Request, res: Response) => {
  const { id } = req.validated?.params as unknown as LeaveRequestParamsType;
  const approverId = req.header("X-Approver-Id") || "unknown-approver";

  const leaveRequest = await leaveService.approve(id, approverId);

  res.status(codes.success).json({
    message: "Leave request approved successfully",
    data: leaveRequest,
  });
});

export const rejectLeaveRequest = use(async (req: Request, res: Response) => {
  const { id } = req.validated?.params as unknown as LeaveRequestParamsType;
  const { comment } = req.validated?.body as unknown as RejectLeaveRequestType;

  const leaveRequest = await leaveService.reject(id, comment);

  res.status(codes.success).json({
    message: "Leave request rejected successfully",
    data: leaveRequest,
  });
});