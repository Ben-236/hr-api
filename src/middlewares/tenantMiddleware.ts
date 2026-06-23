import { Request, Response, NextFunction } from "express";
import { PrismaClient as LandlordClient } from "../../generated/landlord/prisma/client";
import { getTenantClient } from "../../utils/tenantClient";
import ErrorWithCode from "../utils/ErrorWithCode";
import type { PrismaClient as TenantClient } from "../../generated/tenant/prisma/client";

declare global {
  namespace Express {
    interface Request {
      orgCode: string;
    }
  }
}

const landlord = new LandlordClient();

export interface TenantRequest extends Request {
  prisma: TenantClient;
}

export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const orgCode = req.params.code;

  if (!orgCode) {
    throw new ErrorWithCode("Organization code is required", 404);
  }

  const tenant = await landlord.tenant.findUnique({
    where: { orgCode: orgCode.toUpperCase() },
  });

  if (!tenant) {
    throw new ErrorWithCode("Invalid Organization code", 404);
  }

  try {
    const dbName = `${process.env.APP_NAME}_${tenant.orgCode.toLowerCase()}`;

    const tenantPrisma = getTenantClient(tenant.dbUrl, dbName);

    req.orgCode = tenant.orgCode.toLowerCase();
    req.prisma = tenantPrisma;

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err);
    return res.status(500).json("Something Went Wrong.");
  }
};