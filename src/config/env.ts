import dotenv from "dotenv";
dotenv.config();
import * as Yup from "yup";

const envSchema = Yup.object({
   APP_NAME: Yup.string().required(),
   PORT: Yup.number().default(3310),

   DATABASE_URL: Yup.string().required(),
   NODE_ENV: Yup.string().oneOf(["development", "production", "test"]).default("development"),


}).noUnknown(true);

const envVars = envSchema.validateSync(process.env, {
   stripUnknown: true,
   abortEarly: false,
});

const config = {

   port: envVars.PORT,
   nodeEnv: envVars.NODE_ENV,
   appName: envVars.APP_NAME,
};

export default config;
