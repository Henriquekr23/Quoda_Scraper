import { z } from 'zod';

const envSchema = z.object({
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default('mediador_db'),
  HTTP_TIMEOUT: z.coerce.number().default(30000),
  HTTP_RETRIES: z.coerce.number().default(3),
  STORAGE_RAW_XLS: z.string().default('storage/raw/xls'),
  STORAGE_RAW_HTML: z.string().default('storage/raw/html'),
  STORAGE_RAW_PDF: z.string().default('storage/raw/pdf'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  IA_PROVIDER: z.string().default('stub'),
  IA_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
