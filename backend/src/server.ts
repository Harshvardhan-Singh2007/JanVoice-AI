import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function startServer(): Promise<void> {
  await connectDatabase();
  app.listen(env.port, () => console.log(`JanVoice AI backend listening on port ${env.port}`));
}

startServer().catch((error: unknown) => {
  console.error('Unable to start JanVoice AI backend.', error);
  process.exit(1);
});
