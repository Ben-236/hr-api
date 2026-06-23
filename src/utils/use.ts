import { NextFunction, Request, Response } from "express";
import ErrorWithCode from "./ErrorWithCode";

type Function = (req: Request, res: Response, next: NextFunction | null) => Promise<void | null>

const use = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next)

export const axiosErrorWrapper = (fn: Function) => (req: Request, res: Response, next: NextFunction | null) => Promise.resolve(fn(req, res, next)).catch(error => {
  throw new ErrorWithCode(error.response.data.error ?? "Error from provider");
})

export default use