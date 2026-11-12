import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import { IssueModel } from '../src/models/Issue.js';
import { UserModel } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/jwt.js';

const server = app.listen(0);
const originals: Array<{ target: object; key: string; descriptor?: PropertyDescriptor }> = [];
const authorityId = '111111111111111111111111';
const citizenId = '222222222222222222222222';
const issueId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

before(async () => { await new Promise<void>((resolve) => server.once('listening', resolve)); });
after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
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

function headers(role: 'citizen' | 'authority' | 'admin' = 'authority', department?: string, id = role === 'citizen' ? citizenId : authorityId): Record<string, string> {
  stub(UserModel, 'findById', () => ({ select: async () => ({ id, role, department }) }));
  return { authorization: `Bearer ${signAccessToken({ sub: id, role, email: `${role}@example.test`, fullName: `Test ${role}` })}` };
}

function issue(overrides: Record<string, unknown> = {}) {
  return { _id: issueId, title: 'Broken street lighting', description: 'The street light has been broken for three days.', category: 'Lighting', priority: 'High', location: 'Central Road', reporter: citizenId, status: 'Assigned', assignedDepartment: 'Public Works', remarks: '', updates: [], coordinates: { latitude: 12.9, longitude: 77.5 }, createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function url(path: string): string { return `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`; }

test('citizens cannot access the authority dashboard or complaint list', async () => {
  const auth = headers('citizen');
  const [dashboard, reports] = await Promise.all([
    fetch(url('/api/issues/dashboard'), { headers: auth }),
    fetch(url('/api/issues'), { headers: auth }),
  ]);
  assert.equal(dashboard.status, 403);
  assert.equal(reports.status, 403);
});

test('authority list is filtered by its server-loaded department and hides reporter identity', async () => {
  let query: Record<string, unknown> | undefined;
  let projection = '';
  const findQuery = {
    select(value: string) { projection = value; return this; },
    sort() { return this; }, skip() { return this; }, limit: async () => [issue({ reporter: undefined })],
  };
  stub(IssueModel, 'find', (filter: Record<string, unknown>) => { query = filter; return findQuery; });
  stub(IssueModel, 'countDocuments', async () => 1);
  const response = await fetch(url('/api/issues'), { headers: headers('authority', 'Public Works') });
  assert.equal(response.status, 200);
  assert.deepEqual(query, { assignedDepartment: 'Public Works' });
  assert.equal(projection, '-reporter');
  const payload = await response.json() as { data: { issues: Array<Record<string, unknown>> } };
  assert.equal('reporter' in (payload.data.issues[0] ?? {}), false);
});

test('authority without configured department receives no complaints', async () => {
  let queried = false;
  stub(IssueModel, 'find', () => { queried = true; throw new Error('Must fail closed without a scope'); });
  const response = await fetch(url('/api/issues'), { headers: headers('authority') });
  const payload = await response.json() as { data: { issues: unknown[] } };
  assert.equal(response.status, 200);
  assert.deepEqual(payload.data.issues, []);
  assert.equal(queried, false);
});

test('authority dashboard statistics and department summary use only the authority scope', async () => {
  const filters: Record<string, unknown>[] = [];
  stub(IssueModel, 'countDocuments', async (filter: Record<string, unknown>) => { filters.push(filter); return filters.length * 2; });
  stub(IssueModel, 'aggregate', async () => [{ _id: 'Public Works', count: 4 }]);
  stub(IssueModel, 'find', () => ({
    select() { return this; }, sort() { return this; },
    limit: async () => [issue({ updates: [{ kind: 'remarks', message: 'Crew dispatched.', actor: authorityId, createdAt: new Date('2026-10-01T10:00:00Z') }] })],
  }));
  const response = await fetch(url('/api/issues/dashboard'), { headers: headers('authority', 'Public Works') });
  const payload = await response.json() as { data: { dashboard: { scopeConfigured: boolean; total: number; pending: number; assigned: number; inProgress: number; resolved: number; rejected: number; departments: Array<{ department: string; count: number }>; recentActivity: Array<{ message: string }> } } };
  assert.equal(response.status, 200);
  assert.equal(payload.data.dashboard.scopeConfigured, true);
  assert.deepEqual([payload.data.dashboard.total, payload.data.dashboard.pending, payload.data.dashboard.assigned, payload.data.dashboard.inProgress, payload.data.dashboard.resolved, payload.data.dashboard.rejected], [2, 4, 6, 8, 10, 12]);
  assert.ok(filters.every((filter) => filter.assignedDepartment === 'Public Works'));
  assert.deepEqual(payload.data.dashboard.departments, [{ department: 'Public Works', count: 4 }]);
  assert.equal(payload.data.dashboard.recentActivity[0]?.message, 'Crew dispatched.');
});

test('admin can read the broader complaint list', async () => {
  let query: Record<string, unknown> | undefined;
  stub(IssueModel, 'find', (filter: Record<string, unknown>) => { query = filter; return { select() { return this; }, sort() { return this; }, skip() { return this; }, limit: async () => [] }; });
  stub(IssueModel, 'countDocuments', async () => 0);
  const response = await fetch(url('/api/issues'), { headers: headers('admin') });
  assert.equal(response.status, 200);
  assert.deepEqual(query, {});
});

test('admin priority sorting uses database ordering and bounded pagination', async () => {
  let pipeline: Array<Record<string, unknown>> = [];
  stub(IssueModel, 'countDocuments', async () => 3);
  stub(IssueModel, 'aggregate', async (stages: Array<Record<string, unknown>>) => { pipeline = stages; return [issue({ priority: 'Critical' })]; });
  const response = await fetch(url('/api/issues?page=2&pageSize=1&sort=priority'), { headers: headers('admin') });
  const payload = await response.json() as { data: { pagination: { total: number; totalPages: number }; issues: Array<{ priority: string }> } };
  assert.equal(response.status, 200);
  assert.equal(payload.data.issues[0]?.priority, 'Critical');
  assert.deepEqual(pipeline[0]?.$match, {});
  assert.deepEqual(pipeline[3], { $skip: 1 });
  assert.deepEqual(pipeline[4], { $limit: 1 });
  assert.deepEqual(payload.data.pagination, { page: 2, pageSize: 1, total: 3, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
});

test('authority cannot read complaint details outside its department scope', async () => {
  let query: Record<string, unknown> | undefined;
  const detailQuery = { select() { return Promise.resolve(null); } };
  stub(IssueModel, 'findOne', (filter: Record<string, unknown>) => { query = filter; return detailQuery; });
  const response = await fetch(url(`/api/issues/${issueId}`), { headers: headers('authority', 'Roads') });
  assert.equal(response.status, 404);
  assert.deepEqual(query, { _id: issueId, assignedDepartment: 'Roads' });
});

test('authorized staff detail responses omit reporter identities and do not populate update actors', async () => {
  let projection = '';
  const detail = issue({ reporter: undefined, anonymous: true, updates: [{ kind: 'submitted', message: 'Report submitted.', actor: citizenId, createdAt: new Date() }] });
  const detailQuery = { select(value: string) { projection = value; return Promise.resolve(detail); } };
  stub(IssueModel, 'findOne', () => detailQuery);

  const response = await fetch(url(`/api/issues/${issueId}`), { headers: headers('authority', 'Roads') });
  const payload = await response.json() as { data: { issue: Record<string, unknown> } };
  const updates = payload.data.issue.updates as Array<Record<string, unknown>>;

  assert.equal(response.status, 200);
  assert.equal(projection, '-reporter');
  assert.equal('reporter' in payload.data.issue, false);
  assert.equal(typeof updates[0]?.actor, 'string');
});

test('citizen is denied authority status and remarks updates', async () => {
  let written = false;
  stub(IssueModel, 'findOne', async () => { written = true; return issue(); });
  const response = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...headers('citizen'), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved', remarks: 'done' }),
  });
  assert.equal(response.status, 403);
  assert.equal(written, false);
});

test('protected complaint fields and authority assignment changes are rejected before database access', async () => {
  let queried = false;
  stub(IssueModel, 'findOne', async () => { queried = true; return issue(); });
  const auth = headers('authority', 'Public Works');
  const protectedResponse = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ remarks: 'reviewed', reporter: citizenId, description: 'Tampered complaint body.' }),
  });
  const assignmentResponse = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ assignedDepartment: 'Roads' }),
  });
  assert.equal(protectedResponse.status, 422);
  assert.equal(assignmentResponse.status, 422);
  assert.equal(queried, false);
});

test('authority remarks and valid status update are explicitly written with actor history', async () => {
  let update: Record<string, unknown> | undefined;
  const current = { ...issue(), status: 'Assigned', assignedDepartment: 'Public Works', remarks: '' };
  stub(IssueModel, 'findOne', () => ({ select: async () => current }));
  stub(IssueModel, 'findOneAndUpdate', async (_filter: unknown, value: Record<string, unknown>) => { update = value; return issue({ status: 'In Progress' }); });
  const response = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...headers('authority', 'Public Works'), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'In Progress', remarks: 'Crew dispatched.' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(update?.$set, { status: 'In Progress', remarks: 'Crew dispatched.' });
  const history = update?.$push as { updates: { $each: Array<{ kind: string; actor: string; message: string }> } };
  assert.deepEqual(history.updates.$each.map(({ kind }) => kind), ['status', 'remarks']);
  assert.ok(history.updates.$each.every(({ actor }) => actor === authorityId));
  assert.match(history.updates.$each[1]?.message ?? '', /Crew dispatched/);
});

test('invalid workflow transitions are rejected and do not write', async () => {
  let writes = 0;
  stub(IssueModel, 'findOne', () => ({ select: async () => ({ ...issue(), status: 'Pending', assignedDepartment: 'Public Works' }) }));
  stub(IssueModel, 'findOneAndUpdate', async () => { writes += 1; return issue(); });
  const response = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...headers('authority', 'Public Works'), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' }),
  });
  assert.equal(response.status, 422);
  assert.equal(writes, 0);
});

test('admin department assignment saves only the authority department and rejects citizen access', async () => {
  let filter: Record<string, unknown> | undefined;
  let update: Record<string, unknown> | undefined;
  stub(UserModel, 'findOneAndUpdate', async (criteria: Record<string, unknown>, changes: Record<string, unknown>) => {
    filter = criteria; update = changes; return { id: authorityId, fullName: 'Test Authority', email: 'authority@example.test', role: 'authority', department: 'Public Works' };
  });
  const response = await fetch(url(`/api/admin/authorities/${authorityId}/department`), {
    method: 'PATCH', headers: { ...headers('admin'), 'content-type': 'application/json' }, body: JSON.stringify({ department: 'Public Works', role: 'admin' }),
  });
  assert.equal(response.status, 422);
  assert.equal(update, undefined);
  const allowed = await fetch(url(`/api/admin/authorities/${authorityId}/department`), {
    method: 'PATCH', headers: { ...headers('admin'), 'content-type': 'application/json' }, body: JSON.stringify({ department: 'Public Works' }),
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(filter, { _id: authorityId, role: 'authority' });
  assert.deepEqual(update, { $set: { department: 'Public Works' } });
  const citizen = await fetch(url(`/api/admin/authorities/${authorityId}/department`), {
    method: 'PATCH', headers: { ...headers('citizen'), 'content-type': 'application/json' }, body: JSON.stringify({ department: 'Roads' }),
  });
  assert.equal(citizen.status, 403);
});

test('authority cannot move a complaint to Assigned without an existing department assignment', async () => {
  let writes = 0;
  stub(IssueModel, 'findOne', () => ({ select: async () => ({ ...issue(), status: 'Pending', assignedDepartment: undefined }) }));
  stub(IssueModel, 'findOneAndUpdate', async () => { writes += 1; return issue(); });
  const response = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...headers('authority', 'Public Works'), 'content-type': 'application/json' }, body: JSON.stringify({ status: 'Assigned' }),
  });
  assert.equal(response.status, 422);
  assert.equal(writes, 0);
});

test('admin assignment sets the department, advances a pending complaint and records history', async () => {
  let update: Record<string, unknown> | undefined;
  stub(IssueModel, 'findOne', () => ({ select: async () => ({ ...issue(), status: 'Pending', assignedDepartment: undefined }) }));
  stub(IssueModel, 'findOneAndUpdate', async (_filter: unknown, changes: Record<string, unknown>) => { update = changes; return issue({ status: 'Assigned', assignedDepartment: 'Public Works' }); });
  const response = await fetch(url(`/api/issues/${issueId}`), {
    method: 'PATCH', headers: { ...headers('admin'), 'content-type': 'application/json' },
    body: JSON.stringify({ assignedDepartment: 'Public Works' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(update?.$set, { assignedDepartment: 'Public Works', status: 'Assigned' });
  const history = update?.$push as { updates: { $each: Array<{ kind: string; message: string }> } };
  assert.deepEqual(history.updates.$each.map(({ kind }) => kind), ['assignment', 'status']);
});
