import * as Yup from "yup";
import { NextFunction, Request, Response } from "express";

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
      return res.status(400).json({ error: e.message });
    }
  };

export default validateRequestParameters;