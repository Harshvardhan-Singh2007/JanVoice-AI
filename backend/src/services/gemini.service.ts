import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

const priorities = ['low', 'medium', 'high', 'critical'] as const;

export interface ComplaintAnalysis {
  category: string;
  department: string;
  priority: (typeof priorities)[number];
  professionalVersion: string;
  language: string;
}

const complaintAnalysisSchema = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    department: { type: 'string' },
    priority: { type: 'string', enum: priorities },
    professionalVersion: { type: 'string' },
    language: { type: 'string' },
  },
  required: ['category', 'department', 'priority', 'professionalVersion', 'language'],
  additionalProperties: false,
};

const isComplaintAnalysis = (value: unknown): value is ComplaintAnalysis => {
  if (typeof value !== 'object' || value === null) return false;

  const analysis = value as Record<string, unknown>;
  return (
    typeof analysis.category === 'string' &&
    typeof analysis.department === 'string' &&
    typeof analysis.professionalVersion === 'string' &&
    typeof analysis.language === 'string' &&
    typeof analysis.priority === 'string' &&
    priorities.includes(analysis.priority as ComplaintAnalysis['priority'])
  );
};

export const analyzeComplaint = async (text: string): Promise<ComplaintAnalysis> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `Analyze this citizen complaint and return the requested details.\n\nComplaint:\n${text}`,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: complaintAnalysisSchema,
      systemInstruction: [
        'Classify the complaint into a concise issue category and the responsible public department.',
        'Set priority to low, medium, high, or critical according to urgency and public safety impact.',
        'Write professionalVersion as a clear, factual formal complaint without inventing details.',
        'Identify the complaint language.',
      ].join(' '),
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty complaint analysis.');
  }

  const result: unknown = JSON.parse(response.text);
  if (!isComplaintAnalysis(result)) {
    throw new Error('Gemini returned an invalid complaint analysis.');
  }

  return result;
};
