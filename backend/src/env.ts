import 'dotenv/config';
import path from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map(o => o.trim()),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  databaseUrl: required('DATABASE_URL'),
  // Base URL of the deployed frontend — used to build links back into the
  // app from emails (e.g. "View task" in a nudge email).
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  // Where task attachments are stored on disk. In production this must be a
  // path outside the app's own deploy/release directory (e.g. a persistent
  // volume like /var/lib/bjc-trackline/uploads) so it survives redeploys and
  // isn't wiped when a new release is unpacked. Defaults to ./uploads next to
  // the running process for local dev only.
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads'),
  // Optional — email sending (e.g. task nudges) is skipped with a warning
  // when these aren't set, rather than failing the request.
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
  },
};
