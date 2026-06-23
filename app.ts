// import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { JsonWebTokenError } from "jsonwebtoken";
import morgan from "morgan";
import config from "./src/config/env";
import codes from "./src/utils/statusCode";
import { AppError } from "./src/utils/error";
import employeeRouter from "./src/routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["localhost:3310"],
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    referrerPolicy: false,
  })
);

const format = config.nodeEnv === "production" ? "combined" : "dev";
app.use(morgan(format));
app.get("/", (_req: Request, res: Response, _next: NextFunction) => {
  res.send("Welcome to Expense Tracker Application");
});

//API routes


 app.use("/api/v1/employee", employeeRouter);


app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(codes.notFound).send("Route not found");
});

app.use(
  (
    error: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    console.log(error);
    console.log(error.message);

    if (error instanceof JsonWebTokenError) {
      res.status(codes.unAuthorized).json({ error: `Invalid token` });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res
          .status(codes.badRequest)
          .json({ error: `Duplicate ${error.meta?.target}` });
        return;
      }

      if (error.code === "P2003") {
        res.status(codes.badRequest).json({
          error: `Invalid ${error.meta?.field_name} provided`,
        });
        return;
      }

      if (error.code === "P2025") {
        res.status(codes.badRequest).json({
          error: error.meta?.modelName
            ? `Couldn't find ${error.meta?.modelName}`
            : error.meta?.cause ?? error.message,
        });
        return;
      }
    }

    res.status(error.statusCode ?? codes.badRequest).json({
      error: error.message,
      ...(error.data && { data: error.data }),
    });
  }
);

export default app;
