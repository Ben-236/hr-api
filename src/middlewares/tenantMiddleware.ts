import { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-1';

/**
 * NOTE: The current schema is single-tenant (no tenantId column on
 * Employee/LeaveRequest). This middleware reads X-Tenant-Id purely so the
 * API surface matches what a multi-tenant version would look like, and
 * documents the header as the intended seam for tenant isolation. It does
 * NOT yet filter queries by tenant - see README "Tenant isolation" note.
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  req.tenantId = (req.header('X-Tenant-Id') || DEFAULT_TENANT_ID).trim();
  next();
}