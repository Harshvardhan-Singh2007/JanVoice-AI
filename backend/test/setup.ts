// Supply non-secret placeholders for app configuration in isolated API tests.
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '5000';
process.env.CLIENT_URL ??= 'http://localhost:5173';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/janvoice-test';
process.env.JWT_SECRET ??= 'test-only-secret-that-is-at-least-32-characters-long';
process.env.GEMINI_API_KEY ??= 'test-only-gemini-key';
process.env.LOGIN_RATE_LIMIT_MAX ??= '2';
process.env.REGISTER_RATE_LIMIT_MAX ??= '5';
process.env.GEMINI_RATE_LIMIT_MAX ??= '2';
process.env.IMAGE_UPLOAD_RATE_LIMIT_MAX ??= '10';
