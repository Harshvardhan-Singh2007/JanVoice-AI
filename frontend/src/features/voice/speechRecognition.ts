export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export const getSpeechRecognitionConstructor = (source: SpeechRecognitionWindow): SpeechRecognitionConstructor | undefined =>
  source.SpeechRecognition ?? source.webkitSpeechRecognition;

export const appendRecognizedText = (current: string, transcript: string, maxLength = 5000): string =>
  `${current.trim()}${current.trim() ? ' ' : ''}${transcript.trim()}`.slice(0, maxLength);

export const speechRecognitionErrorMessage = (error: string): string => {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'Microphone permission was denied. You can type your report instead.';
  if (error === 'no-speech') return 'No speech was detected. Try again or type your report.';
  return 'Voice input could not start. You can type your report instead.';
};
