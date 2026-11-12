import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { PassThrough } from 'node:stream';
import type { NextFunction, Request, Response } from 'express';
import { app } from '../src/app.js';
import { cloudinary } from '../src/config/cloudinary.js';
import { IssueModel } from '../src/models/Issue.js';
import { deleteIssueImage, uploadIssueImage } from '../src/services/cloudinary.service.js';
import { UserModel } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { validateImageContent } from '../src/middleware/upload.js';

const server = app.listen(0);
const originalTrustProxy = app.get('trust proxy');
const originals: Array<{ target: object; key: string; descriptor?: PropertyDescriptor }> = [];
const cloudinaryEnvironment = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
const originalEnvironment = new Map(cloudinaryEnvironment.map((key) => [key, process.env[key]]));

before(async () => {
  app.set('trust proxy', true);
  await new Promise<void>((resolve) => server.once('listening', resolve));
});

after(async () => {
  app.set('trust proxy', originalTrustProxy);
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

afterEach(() => {
  for (const { target, key, descriptor } of originals.splice(0).reverse()) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  }
  for (const key of cloudinaryEnvironment) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function stub(target: object, key: string, value: unknown): void {
  originals.push({ target, key, descriptor: Object.getOwnPropertyDescriptor(target, key) });
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}

function apiUrl(path: string): string {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`;
}

function authorizeCitizen(): string {
  stub(UserModel, 'findById', () => ({ select: async () => ({ id: 'upload-test-citizen', role: 'citizen' }) }));
  return signAccessToken({ sub: 'upload-test-citizen', role: 'citizen', email: 'citizen@example.com', fullName: 'Test Citizen' });
}

function multipart(file: Blob, filename: string): FormData {
  const form = new FormData();
  form.append('image', file, filename);
  return form;
}

function validIssueForm(): FormData {
  const form = multipart(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'issue.png');
  form.append('title', 'Broken street light');
  form.append('description', 'Street light has been broken for several days.');
  form.append('category', 'Street Lighting');
  form.append('priority', 'Medium');
  form.append('location', 'Park Street');
  return form;
}

test('upload rejects MIME spoofing and enforces the 5 MB limit', async () => {
  const token = authorizeCitizen();
  const headers = { authorization: `Bearer ${token}`, 'x-forwarded-for': '198.51.100.31' };
  const textFile = await fetch(apiUrl('/api/issues'), {
    method: 'POST', headers, body: multipart(new Blob(['not an image'], { type: 'text/plain' }), 'fake.txt'),
  });
  assert.equal(textFile.status, 415);

  const spoofedPng = await fetch(apiUrl('/api/issues'), {
    method: 'POST', headers, body: multipart(new Blob(['not a png'], { type: 'image/png' }), 'fake.png'),
  });
  assert.equal(spoofedPng.status, 415);

  const oversized = await fetch(apiUrl('/api/issues'), {
    method: 'POST', headers, body: multipart(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png'),
  });
  assert.equal(oversized.status, 413);
  const body = await oversized.json() as { message: string };
  assert.equal(body.message, 'Image upload must not exceed 5 MB.');
});

test('JPEG, PNG, and WebP signatures pass content verification', () => {
  const signatures = [
    { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff, 0x00] },
    { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { mime: 'image/webp', bytes: [...Buffer.from('RIFF'), 0x00, 0x00, 0x00, 0x00, ...Buffer.from('WEBP')] },
  ];

  for (const { mime, bytes } of signatures) {
    let receivedError: unknown;
    const request = { file: { mimetype: mime, buffer: Buffer.from(bytes) } } as Request;
    validateImageContent(request, {} as Response, ((error?: unknown) => { receivedError = error; }) as NextFunction);
    assert.equal(receivedError, undefined, `${mime} should be accepted`);
  }
});

test('failed Mongo complaint save triggers Cloudinary cleanup without logging private details', async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  const token = authorizeCitizen();
  let cleanedPublicId = '';
  const loggedOutput: string[] = [];
  const uploadMock = ((_options: unknown, callback?: (error?: unknown, result?: { secure_url: string; public_id: string }) => void) => {
    queueMicrotask(() => callback?.(undefined, {
      secure_url: 'https://res.cloudinary.test/private-issue-url',
      public_id: 'janvoice-ai/issues/test-private-id',
    }));
    return new PassThrough();
  }) as unknown as typeof cloudinary.uploader.upload_stream;
  stub(cloudinary.uploader, 'upload_stream', uploadMock);
  stub(cloudinary.uploader, 'destroy', async (publicId: string) => {
    cleanedPublicId = publicId;
    return { result: 'ok' };
  });
  stub(IssueModel, 'create', async () => {
    throw new Error('private api secret and database URL');
  });
  stub(console, 'error', (...args: unknown[]) => { loggedOutput.push(args.map(String).join(' ')); });

  const response = await fetch(apiUrl('/api/issues'), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': '198.51.100.32' },
    body: validIssueForm(),
  });
  const body = await response.json() as { message: string; stack?: string };

  assert.equal(response.status, 500);
  assert.equal(body.message, 'An unexpected server error occurred.');
  assert.equal(body.stack, undefined);
  assert.equal(cleanedPublicId, 'janvoice-ai/issues/test-private-id');
  assert.ok(!loggedOutput.join(' ').includes('private api secret'));
  assert.ok(!loggedOutput.join(' ').includes('private-issue-url'));
});

test('Cloudinary client failures are converted to a generic upload error and cleanup is best-effort', async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  const uploadMock = (() => {
    throw new Error('private credential and URL details');
  }) as unknown as typeof cloudinary.uploader.upload_stream;
  stub(cloudinary.uploader, 'upload_stream', uploadMock);
  stub(cloudinary.uploader, 'destroy', async () => {
    throw new Error('private cleanup response');
  });

  await assert.rejects(
    uploadIssueImage({ buffer: Buffer.from('test') } as unknown as Express.Multer.File),
    (error: unknown) => {
      assert.equal(error instanceof Error ? error.message : '', 'Image upload failed. Please try again.');
      return true;
    },
  );
  await assert.doesNotReject(deleteIssueImage('janvoice-ai/issues/test-private-id'));
});
