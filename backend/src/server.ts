import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

function safeStartupError(error: unknown): { errorName: string; errorCode?: string | number; message: string } {
  const source = error instanceof Error ? error : new Error('Unknown startup error');
  let message = source.message;
  const secrets = [
    env.mongoUri,
    env.jwtSecret,
    env.geminiApiKey,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].filter((value): value is string => Boolean(value));

  for (const secret of secrets) message = message.replaceAll(secret, '[REDACTED]');
  message = message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[MongoDB connection string redacted]')
    .replace(/querySrv\s+ENOTFOUND\s+[^\s]+/gi, 'MongoDB SRV DNS lookup failed (ENOTFOUND).')
    .replace(/\b(password|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');

  const errorCode = 'code' in source && (typeof source.code === 'string' || typeof source.code === 'number')
    ? source.code
    : undefined;
  return {
    errorName: source.name,
    ...(errorCode !== undefined ? { errorCode } : {}),
    message: message.slice(0, 500),
  };
}

async function startServer(): Promise<void> {
  await connectDatabase();
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(env.port, () => {
      server.off('error', reject);
      console.log(`JAN Voice AI backend listening on port ${env.port}`);
      resolve();
    });
    server.once('error', reject);
  });
}

startServer().catch((error: unknown) => {
  console.error('Unable to start JAN Voice AI backend.', safeStartupError(error));
  process.exit(1);
});
