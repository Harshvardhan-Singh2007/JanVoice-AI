import type { RequestHandler } from 'express';
import { createIssue, deleteIssue, getAllIssues, getIssueById, getIssuesForReporter, updateIssue, updateIssueStatus } from '../services/issue.service.js';
import type { CreateIssueInput, UpdateIssueInput, UpdateIssueStatusInput } from '../types/issue.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadIssueImage } from '../services/cloudinary.service.js';

export const create: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const image = request.file ? await uploadIssueImage(request.file) : undefined;
  const input: CreateIssueInput = { ...(request.body as CreateIssueInput), ...(image ? { image } : {}) };
  console.log('Issue image value before saving:', input.image);
  const issue = await createIssue(input, request.auth.userId);
  response.status(201).json({ status: 'success', data: { issue } });
});

export const getMine: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const issues = await getIssuesForReporter(request.auth.userId);
  response.status(200).json({ status: 'success', data: { issues } });
});

export const getAll: RequestHandler = asyncHandler(async (_request, response) => {
  const issues = await getAllIssues();
  response.status(200).json({ status: 'success', data: { issues } });
});

export const updateStatus: RequestHandler = asyncHandler(async (request, response) => {
  const { issueId } = request.params;
  if (typeof issueId !== 'string') throw new ApiError(400, 'Invalid issue identifier.');
  const issue = await updateIssueStatus(issueId, request.body as UpdateIssueStatusInput);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

const issueIdFrom = (request: Parameters<RequestHandler>[0]): string => {
  const { issueId } = request.params;
  if (typeof issueId !== 'string') throw new ApiError(400, 'Invalid issue identifier.');
  return issueId;
};

export const getOne: RequestHandler = asyncHandler(async (request, response) => {
  const issue = await getIssueById(issueIdFrom(request));
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

export const update: RequestHandler = asyncHandler(async (request, response) => {
  const issue = await updateIssue(issueIdFrom(request), request.body as UpdateIssueInput);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

export const remove: RequestHandler = asyncHandler(async (request, response) => {
  const issue = await deleteIssue(issueIdFrom(request));
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', message: 'Issue deleted successfully.' });
});
