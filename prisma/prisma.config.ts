import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
path: "./migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});