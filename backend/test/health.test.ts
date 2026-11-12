import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { app } from '../src/app.js';

const server = app.listen(0);
let originalReadyState: number;

before(async () => {
  await new Promise<void>((resolve) => server.once('listening', resolve));
  originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;
});

after(async () => {
  mongoose.connection.readyState = originalReadyState;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint reports unavailable when MongoDB is disconnected', async () => {
  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: 'unavailable',
    message: 'JanVoice AI Backend Running',
    database: 'disconnected',
  });
});