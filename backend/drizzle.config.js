import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'drizzle-kit';

const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = new URL(process.env.DATABASE_URL);

export default defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // url: process.env.DATABASE_URL, 
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'tanish',
    database: 'videoapp',
    ssl: false,
  },
});
