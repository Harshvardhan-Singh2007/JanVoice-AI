import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeComplaint, parseComplaintAnalysis } from '../src/services/gemini.service.js';

const valid = {
  category: 'Roads',
  department: 'Public Works Department',
  priority: 'high',
  summary: 'A large pothole is affecting traffic on Main Road.',
  language: 'English',
  explanation: 'The report describes a road hazard affecting traffic.',
};

test('Gemini analysis validates and returns structured civic recommendations', async () => {
  const result = await analyzeComplaint('There is a large pothole affecting traffic on Main Road.', {
    models: { generateContent: async () => ({ text: JSON.stringify(valid), modelVersion: 'test-model' }) },
  });
  assert.deepEqual(result.analysis, valid);
  assert.equal(result.model, 'test-model');
  assert.ok(result.analyzedAt instanceof Date);
});

test('malformed JSON, missing fields, and invalid values are rejected', () => {
  assert.throws(() => parseComplaintAnalysis('{broken'), /Invalid AI response/);
  const missingField = { ...valid };
  delete missingField.explanation;
  assert.throws(() => parseComplaintAnalysis(JSON.stringify(missingField)), /Invalid AI response/);
  assert.throws(() => parseComplaintAnalysis(JSON.stringify({ ...valid, priority: 'urgent' })), /Invalid AI response/);
});

test('Gemini timeout and API failures propagate to the controlled API fallback', async () => {
  const failure = new Error('simulated timeout');
  await assert.rejects(() => analyzeComplaint('A sufficiently long citizen complaint.', {
    models: { generateContent: async () => { throw failure; } },
  }), /simulated timeout/);
});
