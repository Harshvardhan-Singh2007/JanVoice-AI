import type { RequestHandler } from 'express';
import { createIssue, getIssuesForReporter } from '../services/issue.service.js';
import type { CreateIssueInput } from '../types/issue.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const issue = await createIssue(request.body as CreateIssueInput, request.auth.userId);
  response.status(201).json({ status: 'success', data: { issue } });
});

export const getMine: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const issues = await getIssuesForReporter(request.auth.userId);
  response.status(200).json({ status: 'success', data: { issues } });
});
