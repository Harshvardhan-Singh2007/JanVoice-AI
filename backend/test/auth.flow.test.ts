import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { UserModel } from '../src/models/User.js';
import { comparePassword } from '../src/utils/password.js';

const server = app.listen(0);
const originals: Array<{ target: object; key: string; descriptor?: PropertyDescriptor }> = [];
let savedUser: Record<string, unknown> | undefined;

before(async () => new Promise<void>((resolve) => server.once('listening', resolve)));
after(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
afterEach(() => {
  for (const { target, key, descriptor } of originals.splice(0).reverse()) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  }
});

function stub(target: object, key: string, value: unknown): void {
  originals.push({ target, key, descriptor: Object.getOwnPropertyDescriptor(target, key) });
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}

function apiUrl(path: string): string {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`;
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('registration returns field-specific errors for missing fields, invalid email, and weak password', async () => {
  const missing = await post('/api/auth/register', {});
  const missingBody = await missing.json() as { errors: Array<{ field: string; message: string }> };
  assert.equal(missing.status, 422);
  assert.ok(missingBody.errors.some((item) => item.field === 'fullName'));
  assert.ok(missingBody.errors.some((item) => item.field === 'email'));
  assert.ok(missingBody.errors.some((item) => item.field === 'password'));

  const invalidEmail = await post('/api/auth/register', { fullName: 'Test Citizen', email: 'bad-email', password: 'valid-pass-123' });
  assert.equal(invalidEmail.status, 422);

  const weakPassword = await post('/api/auth/register', { fullName: 'Test Citizen', email: 'test@example.com', password: 'short' });
  assert.equal(weakPassword.status, 422);
});

test('duplicate email returns 409 without creating another account', async () => {
  stub(UserModel, 'exists', async () => ({ _id: 'existing-id' }));
  stub(UserModel, 'create', async () => { throw new Error('create must not be called'); });

  const response = await post('/api/auth/register', {
    fullName: 'Test Citizen', email: 'existing@example.com', password: 'valid-password-123',
  });
  assert.equal(response.status, 409);
});

test('registration hashes the password and returns no password field or hash', async () => {
  stub(UserModel, 'exists', async () => null);
  stub(UserModel, 'create', async (input: Record<string, unknown>) => {
    savedUser = { ...input, id: 'new-citizen-id', role: input.role };
    return savedUser;
  });

  const response = await post('/api/auth/register', {
    fullName: 'Test Citizen', email: 'new@example.com', password: 'valid-password-123', role: 'admin',
  });
  const body = await response.json() as { data: { user: Record<string, unknown>; token: string } };
  assert.equal(response.status, 201);
  assert.equal(body.data.user.role, 'citizen');
  assert.equal(savedUser?.role, 'citizen');
  assert.equal(typeof savedUser?.password, 'string');
  assert.notEqual(savedUser?.password, 'valid-password-123');
  assert.equal(await comparePassword('valid-password-123', String(savedUser?.password)), true);
  assert.equal('password' in body.data.user, false);
  assert.equal(body.data.token.length > 0, true);
});

test('new Citizen can log in, incorrect passwords fail, and protected APIs reject invalid or missing JWTs', async () => {
  assert.ok(savedUser, 'registration test must save a test account first');
  stub(UserModel, 'findOne', () => ({ select: async () => savedUser }));

  const login = await post('/api/auth/login', { email: 'new@example.com', password: 'valid-password-123' });
  const loginBody = await login.json() as { data: { token: string; user: Record<string, unknown> } };
  assert.equal(login.status, 200);
  assert.equal(loginBody.data.user.role, 'citizen');
  assert.equal('password' in loginBody.data.user, false);
  assert.equal(loginBody.data.token.length > 0, true);

  const badLogin = await post('/api/auth/login', { email: 'new@example.com', password: 'wrong-password-123' });
  assert.equal(badLogin.status, 401);

  const missingToken = await fetch(apiUrl('/api/issues'));
  const invalidToken = await fetch(apiUrl('/api/issues'), { headers: { authorization: 'Bearer invalid.jwt.value' } });
  const expiredToken = jwt.sign({ sub: 'expired-test-id', role: 'citizen', email: 'expired@example.com', fullName: 'Expired Test' }, process.env.JWT_SECRET!, { expiresIn: -10 });
  const expiredResponse = await fetch(apiUrl('/api/issues'), { headers: { authorization: `Bearer ${expiredToken}` } });
  assert.equal(missingToken.status, 401);
  assert.equal(invalidToken.status, 401);
  assert.equal(expiredResponse.status, 401);
});
