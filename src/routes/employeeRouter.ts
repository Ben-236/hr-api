import { Router } from "express";
import validateRequestParameters from "../middlewares/yupMiddleware/validate";
import { employeeParamsSchema } from "../middlewares/yupMiddleware/employeeValidator";
import { getLeaveBalance } from "../controllers/employeeController";

const employeeRouter = Router();

employeeRouter.get(
  "/:employeeId/leave-balance",
  validateRequestParameters(employeeParamsSchema, "params"),
  getLeaveBalance
);

export default employeeRouter;