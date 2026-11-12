import type { RequestHandler } from 'express';
import { analyzeComplaint, createAnalysisReceipt } from '../services/gemini.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

interface AnalyzeComplaintInput {
  text: string;
}

export const analyze: RequestHandler = asyncHandler(async (request, response) => {
  const { text } = request.body as AnalyzeComplaintInput;
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  try {
    const result = await analyzeComplaint(text);
    response.status(200).json({
      success: true,
      data: {
        ...result.analysis,
        model: result.model,
        analyzedAt: result.analyzedAt,
        analysisToken: createAnalysisReceipt(result, request.auth.userId, text),
        available: true,
      },
    });
  } catch {
    response.status(200).json({
      success: true,
      data: { available: false, message: 'AI analysis is temporarily unavailable. You can still submit your report.' },
    });
  }
});
