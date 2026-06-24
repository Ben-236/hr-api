import { Request, Response } from "express";
import use from "../../utils/use";
import codes from "../../utils/statusCode";
import ErrorWithCode from "../../utils/ErrorWithCode";
import { prisma } from "../prisma";
import { EmployeeParamsType } from "../middlewares/yupMiddleware/employeeValidator";

export const getLeaveBalance = use(async (req: Request, res: Response) => {
  const { employeeId } = req.validated?.params as unknown as EmployeeParamsType;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new ErrorWithCode("Employee not found", codes.notFound);
  }

  res.status(codes.success).json({
    message: "Leave balance fetched successfully",
    data: {
      employeeId: employee.id,
      annualLeaveBalance: employee.annualLeaveBalance,
    },
  });
});