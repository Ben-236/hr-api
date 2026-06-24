import { Router } from "express";
import validateRequestParameters from "../../middleware/yupMiddleware/validateRequestParameters";
import {
  createLeaveRequestSchema,
  rejectLeaveRequestSchema,
  leaveRequestParamsSchema,
  listLeaveRequestsQuerySchema,
} from "../../middleware/yupMiddleware/leaveValidator";
import {
  submitLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "./leave.controller";

const router = Router();

router.post("/", validateRequestParameters(createLeaveRequestSchema, "body"), submitLeaveRequest);

router.get(
  "/",
  validateRequestParameters(listLeaveRequestsQuerySchema, "query"),
  listLeaveRequests
);

router.post(
  "/:id/approve",
  validateRequestParameters(leaveRequestParamsSchema, "params"),
  approveLeaveRequest
);

router.post(
  "/:id/reject",
  validateRequestParameters(leaveRequestParamsSchema, "params"),
  validateRequestParameters(rejectLeaveRequestSchema, "body"),
  rejectLeaveRequest
);

export default router;