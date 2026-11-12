import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIssueListQuery } from '../src/features/issues/issueApi.js';

test('issue list query encodes supported filters and bounded pagination inputs', () => {
  const params = new URLSearchParams(buildIssueListQuery(3, 10, {
    status: 'In Progress', priority: 'High', category: 'Street Lighting',
    search: 'pothole & water', sort: 'priority', department: 'Public Works',
  }));
  assert.equal(params.get('page'), '3');
  assert.equal(params.get('pageSize'), '10');
  assert.equal(params.get('status'), 'In Progress');
  assert.equal(params.get('priority'), 'High');
  assert.equal(params.get('category'), 'Street Lighting');
  assert.equal(params.get('search'), 'pothole & water');
  assert.equal(params.get('sort'), 'priority');
  assert.equal(params.get('department'), 'Public Works');
});

test('issue list query omits empty filters and keeps default sorting server controlled', () => {
  const params = new URLSearchParams(buildIssueListQuery(1, 20, { search: '  ' }));
  assert.equal(params.get('page'), '1');
  assert.equal(params.get('pageSize'), '20');
  assert.equal(params.has('search'), false);
  assert.deepEqual([...params.keys()], ['page', 'pageSize']);
});
