import * as Yup from "yup";
import { NextFunction, Request, Response } from "express";
import codes from "../../utils/statusCode";

type ReqParameter = "body" | "params" | "query";

const validateRequestParameters =
  (resourceSchema: Yup.ObjectSchema<any>, reqParameter: ReqParameter) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const resource = req[reqParameter];
    try {
      const parsedResource = await resourceSchema.validate(resource, {
        stripUnknown: true,
      });

      req.validated = {
        ...(req.validated || {}),
        [reqParameter]: parsedResource,
      };
      return next();
    } catch (e: any) {
      console.error(e);
      return res.status(codes.badRequest).json({
        message: e.message,
        errors: e.errors,
      });
    }
  };

export default validateRequestParameters;