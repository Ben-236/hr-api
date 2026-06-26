import { Request, Response } from "express";
import use from "../utils/use";
import codes from "../utils/statusCode";
import { prisma } from "../db/prisma";
import { EmployeeParamsType } from "../middlewares/yupMiddleware/employeeValidator";
import { AppError } from "../utils/error";

export const getLeaveBalance = use(async (req: Request, res: Response) => {
  const { employeeId } = req.validated?.params as unknown as EmployeeParamsType;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new AppError(codes.notFound, "Employee not found");
  }

  res.status(codes.success).json({
    message: "Leave balance fetched successfully",
    data: {
      employeeId: employee.id,
      annualLeaveBalance: employee.annualLeaveBalance,
    },
  });
});