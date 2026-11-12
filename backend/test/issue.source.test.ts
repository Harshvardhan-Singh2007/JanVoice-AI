import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import { IssueModel } from '../src/models/Issue.js';
import { UserModel } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { createAnalysisReceipt, type ComplaintAnalysis } from '../src/services/gemini.service.js';
import { findPotentialDuplicates } from '../src/services/issue.service.js';

const server = app.listen(0);
const originals: Array<{ target: object; key: string; descriptor?: PropertyDescriptor }> = [];
const reporterId = '111111111111111111111111';
const otherReporterId = '222222222222222222222222';
const issueId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

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
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`;
}

function bearer(role: 'citizen' | 'authority' | 'admin' = 'citizen', subject = reporterId): Record<string, string> {
  stub(UserModel, 'findById', () => ({ select: async () => ({ id: subject, role, ...(role === 'authority' ? { department: 'Public Works' } : {}) }) }));
  return { authorization: `Bearer ${signAccessToken({ sub: subject, role, email: `${role}@example.com`, fullName: `Test ${role}` })}` };
}

function issue(overrides: Record<string, unknown> = {}) {
  return {
    _id: issueId,
    title: 'Broken street light',
    description: 'The street light has been out for three days.',
    category: 'Street Lighting',
    priority: 'Medium',
    location: 'Park Street',
    anonymous: false,
    emergency: false,
    reporter: reporterId,
    status: 'Pending',
    updates: [],
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    ...overrides,
  };
}

test('citizen report retrieval is scoped to the authenticated MongoDB reporter', async () => {
  let query: Record<string, unknown> | undefined;
  stub(IssueModel, 'find', (filter: Record<string, unknown>) => {
    query = filter;
    return { sort() { return this; }, skip() { return this; }, limit: async () => [issue()] };
  });
  stub(IssueModel, 'countDocuments', async () => 1);

  const response = await fetch(apiUrl('/api/issues/mine'), { headers: bearer() });
  const body = await response.json() as { data: { issues: Array<{ _id: string; status: string }> } };

  assert.equal(response.status, 200);
  assert.equal((query?.reporter as { toString(): string })?.toString(), reporterId);
  assert.equal(body.data.issues[0]?._id, issueId);
  assert.equal(body.data.issues[0]?.status, 'Pending');
});

test('citizen list pagination applies validated filters, date sort, and total metadata', async () => {
  let filter: Record<string, unknown> | undefined;
  let sort: Record<string, number> | undefined;
  let skipped = -1;
  let limited = -1;
  stub(IssueModel, 'countDocuments', async (value: Record<string, unknown>) => { filter = value; return 5; });
  stub(IssueModel, 'find', (value: Record<string, unknown>) => {
    filter = value;
    return {
      sort(valueSort: Record<string, number>) { sort = valueSort; return this; },
      skip(valueSkip: number) { skipped = valueSkip; return this; },
      limit: async (valueLimit: number) => { limited = valueLimit; return [issue()]; },
    };
  });
  const response = await fetch(apiUrl('/api/issues/mine?page=2&pageSize=2&status=Pending&priority=High&category=Roads&search=pipe%20burst&sort=oldest'), { headers: bearer() });
  const body = await response.json() as { data: { pagination: Record<string, unknown>; issues: unknown[] } };
  assert.equal(response.status, 200);
  assert.deepEqual(sort, { createdAt: 1 });
  assert.equal(skipped, 2);
  assert.equal(limited, 2);
  assert.equal((filter?.reporter as { toString(): string })?.toString(), reporterId);
  assert.equal(filter?.status, 'Pending');
  assert.equal(filter?.priority, 'High');
  assert.equal(filter?.category, 'Roads');
  assert.deepEqual(body.data.pagination, { page: 2, pageSize: 2, total: 5, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
});

test('citizen priority sorting keeps the MongoDB ObjectId owner filter in its aggregation', async () => {
  let pipeline: Array<Record<string, unknown>> = [];
  stub(IssueModel, 'countDocuments', async () => 1);
  stub(IssueModel, 'aggregate', (stages: Array<Record<string, unknown>>) => {
    pipeline = stages;
    return Promise.resolve([issue()]);
  });

  const response = await fetch(apiUrl('/api/issues/mine?sort=priority'), { headers: bearer() });
  const match = pipeline[0]?.$match as { reporter?: { toString(): string } };

  assert.equal(response.status, 200);
  assert.equal(match.reporter?.toString(), reporterId);
  assert.ok(pipeline.some((stage) => '$sort' in stage));
});

test('complaint list rejects page sizes above the server maximum', async () => {
  let queried = false;
  stub(IssueModel, 'find', () => { queried = true; throw new Error('Invalid page size reached database query'); });
  const response = await fetch(apiUrl('/api/issues/mine?pageSize=51'), { headers: bearer() });
  assert.equal(response.status, 422);
  assert.equal(queried, false);
});

test('citizen can create a complaint without optional GPS coordinates', async () => {
  let created: Record<string, unknown> | undefined;
  stub(IssueModel, 'create', async (document: Record<string, unknown>) => {
    created = document;
    return issue(document);
  });
  const response = await fetch(apiUrl('/api/issues'), {
    method: 'POST',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Water supply interruption', description: 'Water supply has stopped across our street since this morning.', category: 'Water', priority: 'Medium', location: 'Central Road' }),
  });
  assert.equal(response.status, 201);
  assert.equal(created?.coordinates, undefined);
});

test('complaint creation stores validated optional GPS coordinates', async () => {
  let created: Record<string, unknown> | undefined;
  stub(IssueModel, 'create', async (document: Record<string, unknown>) => {
    created = document;
    return issue(document);
  });
  const response = await fetch(apiUrl('/api/issues'), {
    method: 'POST',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Water supply interruption', description: 'Water supply has stopped across our street since this morning.', category: 'Water', priority: 'Medium', location: 'Central Road', latitude: 12.9716, longitude: 77.5946 }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(created?.coordinates, { latitude: 12.9716, longitude: 77.5946 });
});

test('invalid latitude, longitude, or partial coordinates are rejected', async () => {
  bearer();
  const base = { title: 'Water supply interruption', description: 'Water supply has stopped across our street since this morning.', category: 'Water', priority: 'Medium', location: 'Central Road' };
  for (const coordinates of [{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: 10 }]) {
    const response = await fetch(apiUrl('/api/issues'), {
      method: 'POST',
      headers: { authorization: `Bearer ${signAccessToken({ sub: reporterId, role: 'citizen', email: 'citizen@example.com', fullName: 'Test Citizen' })}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...base, ...coordinates }),
    });
    assert.equal(response.status, 422);
  }
});

test('nearby text and category matches are returned without complainant details or mutation', async () => {
  const candidate = issue({
    _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    title: 'Large pothole on Main Road',
    description: 'A large pothole on Main Road is causing serious damage to vehicles.',
    category: 'Roads',
    coordinates: { latitude: 12.9717, longitude: 77.5946 },
    reporter: otherReporterId,
  });
  const query = {
    select() { return this; },
    sort() { return this; },
    limit: async () => [candidate],
  };
  stub(IssueModel, 'find', () => query);
  let mutations = 0;
  stub(IssueModel, 'findByIdAndDelete', async () => { mutations += 1; return null; });
  const response = await fetch(apiUrl('/api/issues/duplicates'), {
    method: 'POST',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Large pothole on Main Road', description: 'A large pothole on Main Road is causing serious damage to passing vehicles.', category: 'Roads', latitude: 12.9716, longitude: 77.5946 }),
  });
  const payload = await response.json() as { data: { duplicates: Array<Record<string, unknown>> } };
  assert.equal(response.status, 200);
  assert.equal(payload.data.duplicates.length, 1);
  assert.equal(payload.data.duplicates[0]?.reference, 'bbbbbbbbbbbbbbbbbbbbbbbb');
  assert.equal('reporter' in (payload.data.duplicates[0] ?? {}), false);
  assert.equal('description' in (payload.data.duplicates[0] ?? {}), false);
  assert.equal(mutations, 0);
});

test('unrelated complaint text is not flagged as a duplicate', async () => {
  const candidate = issue({
    title: 'Water pipe burst near market',
    description: 'Clean water is flooding the vegetable stalls near the market entrance.',
    category: 'Water',
    coordinates: { latitude: 13.0827, longitude: 80.2707 },
  });
  const query = { select() { return this; }, sort() { return this; }, limit: async () => [candidate] };
  stub(IssueModel, 'find', () => query);
  const duplicates = await findPotentialDuplicates({
    title: 'Large pothole on Main Road',
    description: 'A large pothole on Main Road is causing serious damage to vehicles.',
    category: 'Roads',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
  });
  assert.deepEqual(duplicates, []);
});

test('matching text far from the submitted GPS location is not flagged', async () => {
  const candidate = issue({
    title: 'Large pothole on Main Road',
    description: 'A large pothole on Main Road is causing serious damage to vehicles.',
    category: 'Roads',
    coordinates: { latitude: 13.0827, longitude: 80.2707 },
  });
  const query = { select() { return this; }, sort() { return this; }, limit: async () => [candidate] };
  stub(IssueModel, 'find', () => query);
  const duplicates = await findPotentialDuplicates({
    title: 'Large pothole on Main Road',
    description: 'A large pothole on Main Road is causing serious damage to passing vehicles.',
    category: 'Roads',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
  });
  assert.deepEqual(duplicates, []);
});

test('only citizens can run duplicate checks', async () => {
  stub(UserModel, 'findById', () => ({ select: async () => ({ id: otherReporterId, role: 'authority' }) }));
  const headers = { authorization: `Bearer ${signAccessToken({ sub: otherReporterId, role: 'authority', email: 'authority@example.com', fullName: 'Test Authority' })}`, 'content-type': 'application/json' };
  const response = await fetch(apiUrl('/api/issues/duplicates'), {
    method: 'POST', headers,
    body: JSON.stringify({ title: 'Pothole on Main Road', description: 'A large pothole has been here for several days.', category: 'Roads' }),
  });
  assert.equal(response.status, 403);
});

test('map returns only approximate coordinates and public complaint metadata', async () => {
  const candidate = issue({
    title: 'Private details in the citizen title',
    description: 'Private complainant information in the full report text.',
    reporter: otherReporterId,
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
  });
  const query = { select() { return this; }, sort() { return this; }, limit: async () => [candidate] };
  stub(IssueModel, 'find', () => query);
  const response = await fetch(apiUrl('/api/issues/map'), { headers: bearer() });
  const payload = await response.json() as { data: { markers: Array<Record<string, unknown>> } };
  assert.equal(response.status, 200);
  const marker = payload.data.markers[0];
  assert.deepEqual(marker?.coordinates, { latitude: 12.972, longitude: 77.595 });
  assert.equal('reporter' in (marker ?? {}), false);
  assert.equal('description' in (marker ?? {}), false);
  assert.equal('title' in (marker ?? {}), false);
});

test('citizen submission persists receipt-verified AI suggestions and human review state', async () => {
  const complaintText = 'A large pothole has been damaging vehicles on Main Road.';
  const analysis: ComplaintAnalysis = {
    category: 'Roads', department: 'Public Works Department', priority: 'high',
    summary: 'A pothole is damaging vehicles on Main Road.', language: 'English',
    explanation: 'The report describes a road hazard affecting vehicles.',
  };
  let createdDocument: Record<string, unknown> | undefined;
  stub(IssueModel, 'create', async (document: Record<string, unknown>) => {
    createdDocument = document;
    return issue(document);
  });
  const analysisToken = createAnalysisReceipt({ analysis, model: 'test-model', analyzedAt: new Date('2026-10-10T10:00:00Z') }, reporterId, complaintText);
  const response = await fetch(apiUrl('/api/issues'), {
    method: 'POST',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Pothole on Main Road', description: complaintText, category: 'Roads', priority: 'High',
      location: 'Main Road', analysisToken, aiReviewState: 'edited', aiSummary: 'Edited factual summary.',
      status: 'Resolved', assignedDepartment: 'Injected Department',
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(createdDocument?.description, complaintText);
  assert.equal(createdDocument?.status, undefined);
  assert.equal(createdDocument?.assignedDepartment, undefined);
  assert.deepEqual(createdDocument?.aiAnalysis, {
    ...analysis, analyzedAt: new Date('2026-10-10T10:00:00Z'), model: 'test-model',
    reviewState: 'edited', reviewedSummary: 'Edited factual summary.',
  });
});

test('AI receipt cannot be reused for a different complaint text', async () => {
  const analysis: ComplaintAnalysis = {
    category: 'Roads', department: 'Public Works Department', priority: 'medium',
    summary: 'A pothole needs repair.', language: 'English', explanation: 'A road defect was reported.',
  };
  stub(IssueModel, 'create', async (document: Record<string, unknown>) => issue(document));
  const analysisToken = createAnalysisReceipt({ analysis, model: 'test-model', analyzedAt: new Date() }, reporterId, 'A pothole was reported on Main Road.');
  const response = await fetch(apiUrl('/api/issues'), {
    method: 'POST',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Pothole on Main Road', description: 'A different pothole was reported on Main Road.',
      category: 'Roads', priority: 'Medium', location: 'Main Road', analysisToken, aiReviewState: 'accepted',
    }),
  });
  assert.equal(response.status, 422);
});

test('citizen update is owner-scoped and only writes editable fields', async () => {
  let filter: Record<string, unknown> | undefined;
  let update: Record<string, unknown> | undefined;
  stub(IssueModel, 'findOneAndUpdate', async (query: Record<string, unknown>, changes: Record<string, unknown>) => {
    filter = query;
    update = changes;
    return issue({ title: 'Updated street light title' });
  });

  const response = await fetch(apiUrl(`/api/issues/mine/${issueId}`), {
    method: 'PATCH',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Updated street light title', location: 'Park Avenue' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(filter, { _id: issueId, reporter: reporterId });
  assert.deepEqual(update, { $set: { title: 'Updated street light title', location: 'Park Avenue' } });
});

test('citizen cannot update a report owned by another reporter', async () => {
  let filter: Record<string, unknown> | undefined;
  stub(IssueModel, 'findOneAndUpdate', async (query: Record<string, unknown>) => {
    filter = query;
    return null;
  });

  const response = await fetch(apiUrl(`/api/issues/mine/${issueId}`), {
    method: 'PATCH',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Updated street light title' }),
  });
  const body = await response.json() as { message: string };

  assert.equal(response.status, 404);
  assert.equal(body.message, 'Issue not found.');
  assert.deepEqual(filter, { _id: issueId, reporter: reporterId });
});

test('citizen cannot change status, department, remarks, or use staff update/delete endpoints', async () => {
  let writeAttempted = false;
  stub(IssueModel, 'findOneAndUpdate', async () => { writeAttempted = true; return issue(); });
  stub(IssueModel, 'findByIdAndDelete', async () => { writeAttempted = true; return issue(); });
  const auth = bearer();
  const protectedFieldResponse = await fetch(apiUrl(`/api/issues/mine/${issueId}`), {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved', assignedDepartment: 'Public Works', remarks: 'Completed' }),
  });
  const staffUpdateResponse = await fetch(apiUrl(`/api/issues/${issueId}`), {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ remarks: 'Unauthorized change' }),
  });
  const deleteResponse = await fetch(apiUrl(`/api/issues/${issueId}`), { method: 'DELETE', headers: auth });

  assert.equal(protectedFieldResponse.status, 422);
  assert.equal(staffUpdateResponse.status, 403);
  assert.equal(deleteResponse.status, 403);
  assert.equal(writeAttempted, false);
});

test('Admin-only deletion remains available while citizens cannot delete complaints', async () => {
  let deletedId = '';
  stub(IssueModel, 'findByIdAndDelete', async (id: string) => { deletedId = id; return issue(); });

  const response = await fetch(apiUrl(`/api/issues/${issueId}`), { method: 'DELETE', headers: bearer('admin', otherReporterId) });
  const body = await response.json() as { message: string };

  assert.equal(response.status, 200);
  assert.equal(body.message, 'Issue deleted successfully.');
  assert.equal(deletedId, issueId);
});

test('citizen dashboard statistics are counted from reporter-scoped MongoDB queries', async () => {
  const calls: Array<Record<string, unknown>> = [];
  stub(IssueModel, 'countDocuments', async (filter: Record<string, unknown> = {}) => {
    calls.push(filter);
    if (filter.status === 'Pending') return 2;
    if (filter.status === 'In Progress') return 3;
    if (filter.status === 'Resolved') return 4;
    return 12;
  });

  const response = await fetch(apiUrl('/api/issues/mine/stats'), { headers: bearer() });
  const body = await response.json() as { data: { statistics: { total: number; pending: number; inProgress: number; resolved: number } } };

  assert.equal(response.status, 200);
  assert.deepEqual(body.data.statistics, { total: 12, pending: 2, inProgress: 3, resolved: 4 });
  assert.equal(calls.length, 4);
  assert.ok(calls.every((filter) => filter.reporter === reporterId));
});

test('authority status changes are saved with a MongoDB update event', async () => {
  let storedUpdate: Record<string, unknown> | undefined;
  stub(IssueModel, 'findOne', () => ({ select: async () => issue({ assignedDepartment: 'Public Works' }) }));
  stub(IssueModel, 'findOneAndUpdate', async (_filter: Record<string, unknown>, changes: Record<string, unknown>) => {
    storedUpdate = changes;
    return issue({ status: 'In Progress' });
  });

  const response = await fetch(apiUrl(`/api/issues/${issueId}/status`), {
    method: 'PATCH',
    headers: { ...bearer('authority', otherReporterId), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'In Progress' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(storedUpdate?.$set, { status: 'In Progress' });
  const pushed = storedUpdate?.$push as { updates: { $each: Array<{ kind: string; message: string; actor: string }> } };
  assert.equal(pushed.updates.$each[0]?.kind, 'status');
  assert.equal(pushed.updates.$each[0]?.message, 'Status changed to In Progress.');
  assert.equal(pushed.updates.$each[0]?.actor, otherReporterId);
});

test('citizen update feed is returned from reporter-filtered MongoDB history', async () => {
  let pipeline: Array<Record<string, unknown>> = [];
  stub(IssueModel, 'aggregate', (stages: Array<Record<string, unknown>>) => {
    pipeline = stages;
    return Promise.resolve([{ _id: 'event-id', issueId, issueTitle: 'Broken street light', kind: 'status', message: 'Status changed to Resolved.', status: 'Resolved', createdAt: new Date() }]);
  });

  const response = await fetch(apiUrl('/api/issues/mine/updates'), { headers: bearer() });
  const body = await response.json() as { data: { updates: Array<{ issueId: string; message: string }> } };
  const match = pipeline[0]?.$match as { reporter?: { toString(): string } };

  assert.equal(response.status, 200);
  assert.equal(match.reporter?.toString(), reporterId);
  assert.equal(body.data.updates[0]?.issueId, issueId);
  assert.equal(body.data.updates[0]?.message, 'Status changed to Resolved.');
});
