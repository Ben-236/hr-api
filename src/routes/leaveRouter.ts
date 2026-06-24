import { Router } from "express";
import validateRequestParameters from "../middlewares/yupMiddleware/validate";
import {
  createLeaveRequestSchema,
  rejectLeaveRequestSchema,
  leaveRequestParamsSchema,
  listLeaveRequestsQuerySchema,
} from "../middlewares/yupMiddleware/leaveValidator";
import {
  submitLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../controllers/leaveController";

const leaveRouter = Router();

leaveRouter.post("/", validateRequestParameters(createLeaveRequestSchema, "body"), submitLeaveRequest);

leaveRouter.get(
  "/",
  validateRequestParameters(listLeaveRequestsQuerySchema, "query"),
  listLeaveRequests
);

leaveRouter.post(
  "/:id/approve",
  validateRequestParameters(leaveRequestParamsSchema, "params"),
  approveLeaveRequest
);

leaveRouter.post(
  "/:id/reject",
  validateRequestParameters(leaveRequestParamsSchema, "params"),
  validateRequestParameters(rejectLeaveRequestSchema, "body"),
  rejectLeaveRequest
);

export default leaveRouter;