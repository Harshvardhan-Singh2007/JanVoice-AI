import 'dotenv/config';

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
};

const nonNegativeInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  trustProxyHops: nonNegativeInteger('TRUST_PROXY_HOPS', 0),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  geminiTimeoutMs: positiveInteger('GEMINI_TIMEOUT_MS', 15000),
  rateLimits: {
    login: {
      windowMs: positiveInteger('LOGIN_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      max: positiveInteger('LOGIN_RATE_LIMIT_MAX', 10),
    },
    registration: {
      windowMs: positiveInteger('REGISTER_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000),
      max: positiveInteger('REGISTER_RATE_LIMIT_MAX', 5),
    },
    aiAnalysis: {
      windowMs: positiveInteger('GEMINI_RATE_LIMIT_WINDOW_MS', 60 * 1000),
      max: positiveInteger('GEMINI_RATE_LIMIT_MAX', 20),
    },
    imageUpload: {
      windowMs: positiveInteger('IMAGE_UPLOAD_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      max: positiveInteger('IMAGE_UPLOAD_RATE_LIMIT_MAX', 20),
    },
    duplicateCheck: {
      windowMs: positiveInteger('DUPLICATE_CHECK_RATE_LIMIT_WINDOW_MS', 60 * 1000),
      max: positiveInteger('DUPLICATE_CHECK_RATE_LIMIT_MAX', 30),
    },
  },
} as const;

if (!/^mongodb(?:\+srv)?:\/\//i.test(env.mongoUri)) {
  throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.');
}

try {
  const clientUrl = new URL(env.clientUrl);
  if (clientUrl.protocol !== 'http:' && clientUrl.protocol !== 'https:') throw new Error();
} catch {
  throw new Error('CLIENT_URL must be a valid HTTP or HTTPS origin.');
}

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT must be a valid port number.');
}

if (env.jwtSecret.length < 32 && env.nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
