import request from "supertest";
import app from "../app";
import { resetDb, disconnectDb, EMP_WITH_BALANCE, EMP_LOW_BALANCE } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe("POST /leave-requests", () => {
  it("submits a valid ANNUAL leave request successfully", async () => {
    const res = await request(app)
      .post("/leave-requests")
      .send({
        employeeId: EMP_WITH_BALANCE,
        leaveType: "ANNUAL",
        startDate: futureDate(5),
        endDate: futureDate(7),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.daysRequested).toBe(3);
  });

  it("rejects when endDate is before startDate", async () => {
    const res = await request(app)
      .post("/leave-requests")
      .send({
        employeeId: EMP_WITH_BALANCE,
        leaveType: "ANNUAL",
        startDate: futureDate(5),
        endDate: futureDate(2),
      });

    expect(res.status).toBe(400);
expect(res.body.error).toMatch(/end date must be on or after start date/i);
  });

  it("rejects an overlapping PENDING leave request for the same employee", async () => {
    await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "ANNUAL",
      startDate: futureDate(5),
      endDate: futureDate(7),
    });

    const res = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "ANNUAL",
      startDate: futureDate(6),
      endDate: futureDate(9),
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/overlapping/i);
  });

  it("rejects ANNUAL leave that exceeds remaining balance", async () => {
    const res = await request(app).post("/leave-requests").send({
      employeeId: EMP_LOW_BALANCE, // balance = 1
      leaveType: "ANNUAL",
      startDate: futureDate(5),
      endDate: futureDate(7), // 3 days requested
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/exceeds remaining annual leave balance/i);
  });

  it("rejects SICK/UNPAID leave with a missing reason", async () => {
    const res = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "SICK",
      startDate: futureDate(1),
      endDate: futureDate(2),
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason is required/i);
  });

  it("rejects SICK leave longer than 3 days with a short reason", async () => {
    const res = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "SICK",
      startDate: futureDate(1),
      endDate: futureDate(5), // 5 days
      reason: "feeling unwell", // < 20 chars
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 20 characters/i);
  });
});

describe("POST /leave-requests/:id/approve", () => {
  it("approves a PENDING request and deducts balance exactly once", async () => {
    const submitRes = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "ANNUAL",
      startDate: futureDate(1),
      endDate: futureDate(3), // 3 days
    });
    const id = submitRes.body.data.id;

    const approveRes = await request(app)
      .post(`/leave-requests/${id}/approve`)
      .set("X-Approver-Id", "manager-001");

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("APPROVED");

    const balanceRes = await request(app).get(`/employees/${EMP_WITH_BALANCE}/leave-balance`);
    expect(balanceRes.body.data.annualLeaveBalance).toBe(7); // 10 - 3
  });

  it("does not deduct balance twice when approve is called twice for the same request", async () => {
    const submitRes = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "ANNUAL",
      startDate: futureDate(1),
      endDate: futureDate(3), // 3 days
    });
    const id = submitRes.body.data.id;

    // Fire two approve calls back-to-back, simulating a retry.
    const [first, second] = await Promise.all([
      request(app).post(`/leave-requests/${id}/approve`).set("X-Approver-Id", "manager-001"),
      request(app).post(`/leave-requests/${id}/approve`).set("X-Approver-Id", "manager-001"),
    ]);

    expect([first.status, second.status]).toContain(200);

    const balanceRes = await request(app).get(`/employees/${EMP_WITH_BALANCE}/leave-balance`);
    expect(balanceRes.body.data.annualLeaveBalance).toBe(7); // deducted only once
  });
});

describe("POST /leave-requests/:id/reject", () => {
  it("rejects with a missing comment", async () => {
    const submitRes = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "ANNUAL",
      startDate: futureDate(1),
      endDate: futureDate(2),
    });
    const id = submitRes.body.data.id;

    const res = await request(app).post(`/leave-requests/${id}/reject`).send({});

    expect(res.status).toBe(400);
  });

  it("rejects a PENDING request and does not affect leave balance", async () => {
    const submitRes = await request(app).post("/leave-requests").send({
      employeeId: EMP_WITH_BALANCE,
      leaveType: "ANNUAL",
      startDate: futureDate(1),
      endDate: futureDate(2),
    });
    const id = submitRes.body.data.id;

    const res = await request(app)
      .post(`/leave-requests/${id}/reject`)
      .send({ comment: "Team is short-staffed that week" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("REJECTED");

    const balanceRes = await request(app).get(`/employees/${EMP_WITH_BALANCE}/leave-balance`);
    expect(balanceRes.body.data.annualLeaveBalance).toBe(10); // unchanged
  });
});