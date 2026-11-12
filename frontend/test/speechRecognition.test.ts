import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendRecognizedText, getSpeechRecognitionConstructor, speechRecognitionErrorMessage, type SpeechRecognitionConstructor } from '../src/features/voice/speechRecognition.js';

test('unsupported browsers expose no recognizer and preserve manual typing fallback', () => {
  assert.equal(getSpeechRecognitionConstructor({}), undefined);
});

test('webkit-prefixed browser speech recognition is supported', () => {
  class FakeRecognition {
    lang = '';
    interimResults = false;
    onresult = null;
    onerror = null;
    onend = null;
    start() {}
    stop() {}
  }
  const constructor = FakeRecognition as unknown as SpeechRecognitionConstructor;
  assert.equal(getSpeechRecognitionConstructor({ webkitSpeechRecognition: constructor }), constructor);
});

test('recognized speech is added as editable text and bounded by the form limit', () => {
  assert.equal(appendRecognizedText('Existing report', 'additional spoken words'), 'Existing report additional spoken words');
  assert.equal(appendRecognizedText('', 'spoken text', 6), 'spoken');
});

test('microphone denial and recognition failures keep manual entry available', () => {
  assert.match(speechRecognitionErrorMessage('not-allowed'), /permission was denied/i);
  assert.match(speechRecognitionErrorMessage('no-speech'), /type your report/i);
  assert.match(speechRecognitionErrorMessage('network'), /type your report/i);
});
