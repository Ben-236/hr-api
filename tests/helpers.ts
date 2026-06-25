import { prisma } from "../src/db/prisma";

export const EMP_WITH_BALANCE = "test-emp-balance"; // 10 days
export const EMP_LOW_BALANCE = "test-emp-low-balance"; // 1 day

export async function resetDb() {
  await prisma.leaveRequest.deleteMany({});
  await prisma.employee.deleteMany({});

  await prisma.employee.create({
    data: { id: EMP_WITH_BALANCE, name: "Test Employee", annualLeaveBalance: 10 },
  });
  await prisma.employee.create({
    data: { id: EMP_LOW_BALANCE, name: "Low Balance Employee", annualLeaveBalance: 1 },
  });
}

export async function disconnectDb() {
  await prisma.$disconnect();
}