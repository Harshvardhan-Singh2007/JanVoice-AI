import type { RequestHandler } from 'express';
import { createIssue, deleteIssue, findPotentialDuplicates, getAllIssues, getAuthorityDashboard, getIssueById, getIssueMapMarkers, getIssueStatisticsForReporter, getIssueUpdatesForReporter, getIssuesForReporter, updateIssue, updateIssueForReporter, updateIssueStatus } from '../services/issue.service.js';
import type { CreateIssueInput, IssueListQuery, UpdateCitizenIssueInput, UpdateIssueInput, UpdateIssueStatusInput } from '../types/issue.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deleteIssueImage, uploadIssueImage } from '../services/cloudinary.service.js';
import { verifyAnalysisReceipt } from '../services/gemini.service.js';

export const create: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const uploadedImage = request.file ? await uploadIssueImage(request.file) : undefined;
  const { analysisToken, aiReviewState, aiSummary, latitude, longitude, ...complaintInput } = request.body as CreateIssueInput & {
    analysisToken?: string;
    aiReviewState?: 'accepted' | 'edited' | 'rejected';
    aiSummary?: string;
    latitude?: number;
    longitude?: number;
  };
  const input: CreateIssueInput = {
    title: complaintInput.title,
    description: complaintInput.description,
    category: complaintInput.category,
    priority: complaintInput.priority,
    location: complaintInput.location,
    ...(complaintInput.anonymous !== undefined ? { anonymous: complaintInput.anonymous } : {}),
    ...(complaintInput.emergency !== undefined ? { emergency: complaintInput.emergency } : {}),
    ...(latitude !== undefined && longitude !== undefined ? { coordinates: { latitude, longitude } } : {}),
    ...(uploadedImage ? { image: uploadedImage.secureUrl } : {}),
  };
  if (analysisToken) {
    try {
      if (!aiReviewState) throw new Error('Review state is required.');
      const verified = verifyAnalysisReceipt(analysisToken, request.auth.userId, input.description);
      input.aiAnalysis = {
        ...verified.analysis,
        analyzedAt: verified.analyzedAt,
        model: verified.model,
        reviewState: aiReviewState,
        ...(aiSummary ? { reviewedSummary: aiSummary } : {}),
      };
    } catch {
      if (uploadedImage) await deleteIssueImage(uploadedImage.publicId);
      throw new ApiError(422, 'AI analysis could not be verified. Please analyze the current description again or submit without AI suggestions.');
    }
  } else if (aiReviewState || aiSummary) {
    if (uploadedImage) await deleteIssueImage(uploadedImage.publicId);
    throw new ApiError(422, 'AI review details require a valid analysis.');
  }
  let issue;
  try {
    issue = await createIssue(input, request.auth.userId);
  } catch (error) {
    if (uploadedImage) await deleteIssueImage(uploadedImage.publicId);
    throw error;
  }
  response.status(201).json({ status: 'success', data: { issue } });
});

export const checkDuplicates: RequestHandler = asyncHandler(async (request, response) => {
  const { title, description, category, latitude, longitude } = request.body as {
    title: string; description: string; category: string; latitude?: number; longitude?: number;
  };
  const duplicates = await findPotentialDuplicates({
    title, description, category,
    ...(latitude !== undefined && longitude !== undefined ? { coordinates: { latitude, longitude } } : {}),
  });
  response.status(200).json({ status: 'success', data: { duplicates } });
});

export const getMap: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const markers = await getIssueMapMarkers(request.auth.role, request.auth.department);
  response.status(200).json({ status: 'success', data: { markers } });
});

export const getMine: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const result = await getIssuesForReporter(request.auth.userId, listQueryFrom(request));
  response.status(200).json({ status: 'success', data: result });
});

export const statisticsMine: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const statistics = await getIssueStatisticsForReporter(request.auth.userId);
  response.status(200).json({ status: 'success', data: { statistics } });
});

export const updatesMine: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const updates = await getIssueUpdatesForReporter(request.auth.userId);
  response.status(200).json({ status: 'success', data: { updates } });
});

export const updateMine: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  const issue = await updateIssueForReporter(issueIdFrom(request), request.auth.userId, request.body as UpdateCitizenIssueInput);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

export const getAll: RequestHandler = asyncHandler(async (request, response) => {
  const role = staffRole(request);
  const result = await getAllIssues(role, request.auth!.department, listQueryFrom(request));
  response.status(200).json({ status: 'success', data: result });
});

export const dashboard: RequestHandler = asyncHandler(async (request, response) => {
  const role = staffRole(request);
  const data = await getAuthorityDashboard(role, request.auth!.department);
  response.status(200).json({ status: 'success', data: { dashboard: data } });
});

export const updateStatus: RequestHandler = asyncHandler(async (request, response) => {
  const role = staffRole(request);
  const { issueId } = request.params;
  if (typeof issueId !== 'string') throw new ApiError(400, 'Invalid issue identifier.');
  const issue = await updateIssueStatus(issueId, request.body as UpdateIssueStatusInput, request.auth!.userId, role, request.auth!.department);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

const issueIdFrom = (request: Parameters<RequestHandler>[0]): string => {
  const { issueId } = request.params;
  if (typeof issueId !== 'string') throw new ApiError(400, 'Invalid issue identifier.');
  return issueId;
};

const staffRole = (request: Parameters<RequestHandler>[0]): 'authority' | 'admin' => {
  if (!request.auth) throw new ApiError(401, 'Authentication is required.');
  if (request.auth.role !== 'authority' && request.auth.role !== 'admin') throw new ApiError(403, 'You do not have permission to access this complaint workflow.');
  return request.auth.role;
};

const listQueryFrom = (request: Parameters<RequestHandler>[0]): IssueListQuery => {
  const queryString = (key: string): string | undefined => typeof request.query[key] === 'string' ? request.query[key] as string : undefined;
  const queryInteger = (key: string, fallback: number): number => {
    const value = queryString(key);
    return value === undefined ? fallback : Number.parseInt(value, 10);
  };
  const status = queryString('status');
  const priority = queryString('priority');
  const category = queryString('category');
  const search = queryString('search');
  const department = queryString('department');
  const sort = queryString('sort');
  return {
    page: queryInteger('page', 1),
    pageSize: queryInteger('pageSize', 20),
    sort: sort === 'oldest' || sort === 'priority' ? sort : 'newest',
    ...(status ? { status: status as IssueListQuery['status'] } : {}),
    ...(priority ? { priority: priority as IssueListQuery['priority'] } : {}),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    ...(department ? { department } : {}),
  };
};

export const getOne: RequestHandler = asyncHandler(async (request, response) => {
  const role = staffRole(request);
  const issue = await getIssueById(issueIdFrom(request), role, request.auth!.department);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

export const update: RequestHandler = asyncHandler(async (request, response) => {
  const role = staffRole(request);
  const issue = await updateIssue(issueIdFrom(request), request.body as UpdateIssueInput, request.auth!.userId, role, request.auth!.department);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', data: { issue } });
});

export const remove: RequestHandler = asyncHandler(async (request, response) => {
  const issue = await deleteIssue(issueIdFrom(request));
  if (!issue) throw new ApiError(404, 'Issue not found.');
  response.status(200).json({ status: 'success', message: 'Issue deleted successfully.' });
});
