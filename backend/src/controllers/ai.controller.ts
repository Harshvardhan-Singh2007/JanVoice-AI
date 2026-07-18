import type { RequestHandler } from 'express';
import { analyzeComplaint } from '../services/gemini.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

interface AnalyzeComplaintInput {
  text: string;
}

export const analyze: RequestHandler = asyncHandler(async (request, response) => {
  const { text } = request.body as AnalyzeComplaintInput;
  const analysis = await analyzeComplaint(text);

  response.status(200).json({
    success: true,
    data: analysis,
  });
});
