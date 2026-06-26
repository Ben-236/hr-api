import { Request, Response, NextFunction } from "express";

declare global {

  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-1';


export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  req.tenantId = (req.header('X-Tenant-Id') || DEFAULT_TENANT_ID).trim();
  next();
}