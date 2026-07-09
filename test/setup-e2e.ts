// Loads the local .env (DATABASE_URL, JWT_SECRET, REDIS_*, ...) before the
// Nest app is imported. In dev the app is started with `tsx --env-file=.env`;
// under Vitest we have to load it ourselves.
import 'dotenv/config';
