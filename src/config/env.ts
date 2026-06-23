import dotenv from "dotenv";
dotenv.config();
import * as Yup from "yup";

const envSchema = Yup.object({
   APP_NAME: Yup.string().required(),
   APP_EMAIL: Yup.string().email().required(),
   PORT: Yup.number().default(3310),

   DATABASE_URL: Yup.string().required(),


}).noUnknown(true);

const envVars = envSchema.validateSync(process.env, {
   stripUnknown: true,
   abortEarly: false,
});

const config = {

   port: envVars.PORT,

   appName: envVars.APP_NAME,
   appEmail: envVars.APP_EMAIL,




};

export default config;
