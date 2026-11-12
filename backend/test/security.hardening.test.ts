import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import { UserModel } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/jwt.js';

const server = app.listen(0);
const originalTrustProxy = app.get('trust proxy');

before(async () => {
  app.set('trust proxy', true);
  await new Promise<void>((resolve) => server.once('listening', resolve));
});

after(async () => {
  app.set('trust proxy', originalTrustProxy);
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function apiUrl(path: string): string {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`;
}

function stubCitizenAuthentication(): void {
  Object.defineProperty(UserModel, 'findById', {
    configurable: true,
    writable: true,
    value: () => ({ select: async () => ({ id: 'rate-test-citizen', role: 'citizen' }) }),
  });
}

function citizenToken(): string {
  return signAccessToken({ sub: 'rate-test-citizen', role: 'citizen', email: 'citizen@example.com', fullName: 'Test Citizen' });
}

test('validation errors include fields and messages and retain the 422 response contract', async () => {
  const response = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.21' },
    body: JSON.stringify({ fullName: 'x', email: 'invalid', password: 'short' }),
  });
  const body = await response.json() as { status: string; message: string; errors: Array<{ field: string; message: string }> };

  assert.equal(response.status, 422);
  assert.equal(body.status, 'error');
  assert.equal(body.message, 'Request validation failed.');
  assert.ok(body.errors.some((error) => error.field === 'fullName' && error.message));
  assert.ok(body.errors.some((error) => error.field === 'email' && error.message));
  assert.ok(body.errors.some((error) => error.field === 'password' && error.message));
});

test('login and registration return 429 after their configured limits', async () => {
  const loginRequest = () => fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.22' },
    body: JSON.stringify({ email: 'invalid', password: '' }),
  });
  assert.equal((await loginRequest()).status, 422);
  assert.equal((await loginRequest()).status, 422);
  const loginLimited = await loginRequest();
  assert.equal(loginLimited.status, 429);
  assert.ok(Number(loginLimited.headers.get('retry-after')) > 0);

  const registrationRequest = () => fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.24' },
    body: JSON.stringify({ fullName: 'x', email: 'invalid', password: 'short' }),
  });
  let registrationWasLimited = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await registrationRequest();
    if (response.status === 429) {
      registrationWasLimited = true;
      break;
    }
    assert.equal(response.status, 422);
  }
  assert.equal(registrationWasLimited, true);
});

test('Gemini analysis and multipart issue submissions return 429 when their limits are exceeded', async () => {
  stubCitizenAuthentication();
  const authorization = { authorization: `Bearer ${citizenToken()}`, 'x-forwarded-for': '198.51.100.23' };
  const analysisRequest = () => fetch(apiUrl('/api/ai/analyze'), {
    method: 'POST',
    headers: { ...authorization, 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'x' }),
  });
  assert.equal((await analysisRequest()).status, 422);
  assert.equal((await analysisRequest()).status, 422);
  assert.equal((await analysisRequest()).status, 429);

  const uploadRequest = () => fetch(apiUrl('/api/issues'), {
    method: 'POST',
    headers: authorization,
    body: new FormData(),
  });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal((await uploadRequest()).status, 422);
  }
  assert.equal((await uploadRequest()).status, 429);
});

test('malformed JSON and unhandled failures return safe, structured error responses', async () => {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.25' },
    body: '{not-json',
  });
  const body = await response.json() as { status: string; message: string; stack?: string };

  assert.equal(response.status, 400);
  assert.equal(body.status, 'error');
  assert.equal(body.message, 'Request body must contain valid JSON.');
  assert.equal(body.stack, undefined);
});
