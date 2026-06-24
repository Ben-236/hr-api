import * as Yup from "yup";

export const employeeParamsSchema = Yup.object({
  employeeId: Yup.string().trim().required("employeeId is required"),
});

export type EmployeeParamsType = Yup.InferType<typeof employeeParamsSchema>;