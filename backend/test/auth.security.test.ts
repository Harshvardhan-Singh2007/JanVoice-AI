import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import { IssueModel } from '../src/models/Issue.js';
import { UserModel } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/jwt.js';

const server = app.listen(0);
const originals: Array<{ target: object; key: string; descriptor?: PropertyDescriptor }> = [];

before(async () => {
  await new Promise<void>((resolve) => server.once('listening', resolve));
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

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
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}${path}`;
}

function tokenFor(role: 'citizen' | 'authority' | 'admin'): string {
  return signAccessToken({ sub: `test-${role}-id`, role, email: `${role}@example.com`, fullName: `Test ${role}` });
}

function stubAuthenticatedRole(role: 'citizen' | 'authority' | 'admin'): void {
  stub(UserModel, 'findById', () => ({
    select: async () => ({ id: `test-${role}-id`, role }),
  }));
}

function stubIssueQuery(): void {
  const query = {
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    select() { return this; },
  };
  stub(IssueModel, 'find', () => query);
  stub(IssueModel, 'countDocuments', async () => 0);
}

async function registerWithRole(role?: string): Promise<{ response: Response; savedRole: string | undefined }> {
  let savedRole: string | undefined;
  stub(UserModel, 'exists', async () => null);
  stub(UserModel, 'create', async (input: { role?: string; fullName: string; email: string; phone?: string }) => {
    savedRole = input.role;
    return { id: 'new-user-id', fullName: input.fullName, email: input.email, phone: input.phone, role: input.role };
  });

  const response = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test Citizen',
      email: `citizen-${role ?? 'normal'}@example.com`,
      password: 'safe-test-password',
      ...(role ? { role } : {}),
    }),
  });
  return { response, savedRole };
}

test('normal public registration creates a Citizen account', async () => {
  const { response, savedRole } = await registerWithRole();
  const body = await response.json() as { data: { user: { role: string } } };

  assert.equal(response.status, 201);
  assert.equal(savedRole, 'citizen');
  assert.equal(body.data.user.role, 'citizen');
});

test('role="admin" cannot create an Admin account', async () => {
  const { response, savedRole } = await registerWithRole('admin');
  const body = await response.json() as { data: { user: { role: string } } };

  assert.equal(response.status, 201);
  assert.equal(savedRole, 'citizen');
  assert.equal(body.data.user.role, 'citizen');
});

test('role="authority" cannot create an Authority account', async () => {
  const { response, savedRole } = await registerWithRole('authority');
  const body = await response.json() as { data: { user: { role: string } } };

  assert.equal(response.status, 201);
  assert.equal(savedRole, 'citizen');
  assert.equal(body.data.user.role, 'citizen');
});

test('anonymous and Citizen users cannot access privileged APIs', async () => {
  const anonymousResponse = await fetch(apiUrl('/api/admin/recent-activity'));
  assert.equal(anonymousResponse.status, 401);

  stubAuthenticatedRole('citizen');
  const citizenAdminResponse = await fetch(apiUrl('/api/admin/recent-activity'), {
    headers: { authorization: `Bearer ${tokenFor('citizen')}` },
  });
  const citizenAuthorityResponse = await fetch(apiUrl('/api/issues'), {
    headers: { authorization: `Bearer ${tokenFor('citizen')}` },
  });

  assert.equal(citizenAdminResponse.status, 403);
  assert.equal(citizenAuthorityResponse.status, 403);
});

test('Authority and Admin accounts retain access to their permitted APIs', async () => {
  stubAuthenticatedRole('authority');
  stubIssueQuery();
  const authorityResponse = await fetch(apiUrl('/api/issues'), {
    headers: { authorization: `Bearer ${tokenFor('authority')}` },
  });
  assert.equal(authorityResponse.status, 200);

  stubAuthenticatedRole('admin');
  const adminResponse = await fetch(apiUrl('/api/admin/recent-activity'), {
    headers: { authorization: `Bearer ${tokenFor('admin')}` },
  });
  assert.equal(adminResponse.status, 200);
});
