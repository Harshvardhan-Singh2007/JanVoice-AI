import { Types } from 'mongoose';
import { IssueModel, type IssueDocument, type IssueUpdateKind, type IssueCoordinates } from '../models/Issue.js';
import type { AuthorityDashboardData, CitizenIssueStatistics, CreateIssueInput, IssueListQuery, IssueMapMarker, PaginatedIssues, PotentialDuplicate, UpdateCitizenIssueInput, UpdateIssueInput, UpdateIssueStatusInput } from '../types/issue.js';
import type { IssueStatus } from '../models/Issue.js';
import { ApiError } from '../utils/ApiError.js';

export const createIssue = (input: CreateIssueInput, reporter: string): Promise<IssueDocument> =>
  IssueModel.create({
    ...input,
    reporter,
    anonymous: input.anonymous ?? false,
    emergency: input.emergency ?? false,
    updates: [{ kind: 'submitted', message: 'Report submitted.', actor: reporter, createdAt: new Date() }],
  });

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildListFilter = (base: Record<string, unknown>, query: IssueListQuery): Record<string, unknown> => ({
  ...base,
  ...(query.status ? { status: query.status } : {}),
  ...(query.category ? { category: query.category } : {}),
  ...(query.priority ? { priority: query.priority } : {}),
  ...(query.search ? { $or: [
    { title: { $regex: escapeRegex(query.search), $options: 'i' } },
    { description: { $regex: escapeRegex(query.search), $options: 'i' } },
    { location: { $regex: escapeRegex(query.search), $options: 'i' } },
  ] } : {}),
});

const fetchPage = async (filter: Record<string, unknown>, query: IssueListQuery, projection?: string): Promise<PaginatedIssues> => {
  const skip = (query.page - 1) * query.pageSize;
  const [total, issues] = await Promise.all([
    IssueModel.countDocuments(filter),
    query.sort === 'priority'
      ? IssueModel.aggregate<IssueDocument>([
        { $match: filter },
        { $addFields: { __priorityOrder: { $switch: { branches: [
          { case: { $eq: ['$priority', 'Critical'] }, then: 4 },
          { case: { $eq: ['$priority', 'High'] }, then: 3 },
          { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
          { case: { $eq: ['$priority', 'Low'] }, then: 1 },
        ], default: 0 } } } },
        { $sort: { __priorityOrder: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: query.pageSize },
        ...(projection ? [{ $project: { reporter: 0, __priorityOrder: 0 } }] : [{ $project: { __priorityOrder: 0 } }]),
      ])
      : (() => {
        let cursor = IssueModel.find(filter);
        if (projection) cursor = cursor.select(projection);
        return cursor.sort({ createdAt: query.sort === 'newest' ? -1 : 1 }).skip(skip).limit(query.pageSize);
      })(),
  ]);
  const totalPages = Math.ceil(total / query.pageSize);
  return {
    issues,
    pagination: {
      page: query.page, pageSize: query.pageSize, total, totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1 && total > 0,
    },
  };
};

export const getIssuesForReporter = (reporter: string, query: IssueListQuery): Promise<PaginatedIssues> =>
  fetchPage(buildListFilter({ reporter: new Types.ObjectId(reporter) }, query), query);

export const getAllIssues = (role: 'authority' | 'admin', department: string | undefined, query: IssueListQuery): Promise<PaginatedIssues> => {
  if (role === 'authority' && (!department || (query.department && query.department !== department))) {
    return Promise.resolve({ issues: [], pagination: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } });
  }
  const base = role === 'admin' ? (query.department ? { assignedDepartment: query.department } : {}) : { assignedDepartment: department };
  return fetchPage(buildListFilter(base, query), query, '-reporter');
};

export const getAuthorityDashboard = async (role: 'authority' | 'admin', department?: string): Promise<AuthorityDashboardData> => {
  const scopeConfigured = role === 'admin' || Boolean(department);
  const filter = role === 'admin' ? {} : department ? { assignedDepartment: department } : { _id: { $exists: false } };
  const [total, pending, assigned, inProgress, resolved, rejected, groupedDepartments, recent] = await Promise.all([
    IssueModel.countDocuments(filter),
    IssueModel.countDocuments({ ...filter, status: 'Pending' }),
    IssueModel.countDocuments({ ...filter, status: 'Assigned' }),
    IssueModel.countDocuments({ ...filter, status: 'In Progress' }),
    IssueModel.countDocuments({ ...filter, status: 'Resolved' }),
    IssueModel.countDocuments({ ...filter, status: 'Rejected' }),
    IssueModel.aggregate<{ _id: string; count: number }>([
      { $match: filter },
      { $group: { _id: { $ifNull: ['$assignedDepartment', 'Unassigned'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    IssueModel.find(filter).select('title category status priority updatedAt updates').sort({ updatedAt: -1 }).limit(8),
  ]);
  return {
    scopeConfigured, total, pending, assigned, inProgress, resolved, rejected,
    departments: groupedDepartments.map(({ _id, count }) => ({ department: _id, count })),
    recentActivity: recent.flatMap((issue) => {
      const latest = [...(issue.updates ?? [])].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return latest ? [{ issueId: String(issue._id), title: issue.title, category: issue.category, status: issue.status, priority: issue.priority, updatedAt: latest.createdAt, message: latest.message, actor: String(latest.actor) }] : [];
    }),
  };
};

export const getIssueStatisticsForReporter = async (reporter: string): Promise<CitizenIssueStatistics> => {
  const [total, pending, inProgress, resolved] = await Promise.all([
    IssueModel.countDocuments({ reporter }),
    IssueModel.countDocuments({ reporter, status: 'Pending' }),
    IssueModel.countDocuments({ reporter, status: 'In Progress' }),
    IssueModel.countDocuments({ reporter, status: 'Resolved' }),
  ]);
  return { total, pending, inProgress, resolved };
};

export interface CitizenIssueUpdate {
  _id: Types.ObjectId;
  issueId: Types.ObjectId;
  issueTitle: string;
  kind: IssueUpdateKind;
  message: string;
  status: string;
  createdAt: Date;
}

export const getIssueUpdatesForReporter = (reporter: string): Promise<CitizenIssueUpdate[]> =>
  IssueModel.aggregate<CitizenIssueUpdate>([
    { $match: { reporter: new Types.ObjectId(reporter) } },
    { $unwind: { path: '$updates', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: { $ifNull: ['$updates._id', '$_id'] },
        issueId: '$_id',
        issueTitle: '$title',
        kind: { $ifNull: ['$updates.kind', 'status'] },
        message: { $ifNull: ['$updates.message', { $concat: ['Current status: ', '$status'] }] },
        status: '$status',
        createdAt: { $ifNull: ['$updates.createdAt', { $ifNull: ['$updatedAt', '$createdAt'] }] },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
  ]);

const commonWords = new Set(['about', 'after', 'again', 'area', 'been', 'being', 'from', 'have', 'here', 'issue', 'near', 'that', 'there', 'this', 'were', 'with', 'would', 'your', 'the', 'and', 'for', 'was', 'are', 'has', 'had', 'not', 'but', 'our', 'its']);

const complaintTokens = (text: string): Set<string> => new Set(
  (text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((word) => !commonWords.has(word)),
);

const textSimilarity = (first: string, second: string): number => {
  const left = complaintTokens(first);
  const right = complaintTokens(second);
  if (left.size < 3 || right.size < 3) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
};

const distanceInMeters = (first: IssueCoordinates, second: IssueCoordinates): number => {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const hasValidCoordinates = (coordinates: IssueCoordinates | undefined): coordinates is IssueCoordinates => {
  if (!coordinates) return false;
  return Number.isFinite(coordinates.latitude)
    && Number.isFinite(coordinates.longitude)
    && coordinates.latitude >= -90 && coordinates.latitude <= 90
    && coordinates.longitude >= -180 && coordinates.longitude <= 180;
};

export const findPotentialDuplicates = async (
  input: { title: string; description: string; category: string; coordinates?: IssueCoordinates },
): Promise<PotentialDuplicate[]> => {
  const candidates = await IssueModel.find({ category: input.category })
    .select('_id title description category status coordinates createdAt')
    .sort({ createdAt: -1 })
    .limit(500);
  const submittedText = `${input.title} ${input.description}`;
  return candidates.flatMap((candidate) => {
    const score = textSimilarity(submittedText, `${candidate.title} ${candidate.description}`);
    if (score < 0.42) return [];
    let distanceMeters: number | undefined;
    if (hasValidCoordinates(input.coordinates) && hasValidCoordinates(candidate.coordinates)) {
      distanceMeters = distanceInMeters(input.coordinates, candidate.coordinates);
      if (distanceMeters > 700) return [];
    }
    return [{
      reference: String(candidate._id),
      category: candidate.category,
      status: candidate.status,
      createdAt: candidate.createdAt,
      ...(distanceMeters !== undefined ? { distanceMeters: Math.round(distanceMeters) } : {}),
    }];
  });
};

export const getIssueMapMarkers = async (role: 'citizen' | 'authority' | 'admin', department?: string): Promise<IssueMapMarker[]> => {
  if (role === 'authority' && !department) return [];
  const scope = role === 'authority' ? { assignedDepartment: department } : {};
  const issues = await IssueModel.find({ ...scope, 'coordinates.latitude': { $exists: true }, 'coordinates.longitude': { $exists: true } })
    .select('_id category status coordinates createdAt')
    .sort({ createdAt: -1 })
    .limit(500);
  return issues.flatMap((issue) => {
    const coordinates = issue.coordinates;
    if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) return [];
    return [{
      reference: String(issue._id),
      category: issue.category,
      status: issue.status,
      coordinates: {
        latitude: Math.round(coordinates.latitude * 1000) / 1000,
        longitude: Math.round(coordinates.longitude * 1000) / 1000,
      },
      createdAt: issue.createdAt,
    }];
  });
};

export const updateIssueStatus = (issueId: string, input: UpdateIssueStatusInput, actor: string, role: 'authority' | 'admin', department?: string): Promise<IssueDocument | null> =>
  updateIssue(issueId, input, actor, role, department);

export const getIssueById = (issueId: string, role: 'authority' | 'admin', department?: string): Promise<IssueDocument | null> => {
  if (role === 'authority' && !department) return Promise.resolve(null);
  const filter = role === 'admin' ? { _id: issueId } : { _id: issueId, assignedDepartment: department };
  return IssueModel.findOne(filter).select('-reporter');
};

export const updateIssue = async (issueId: string, input: UpdateIssueInput, actor: string, role: 'authority' | 'admin', department?: string): Promise<IssueDocument | null> => {
  if (role === 'authority' && !department) return null;
  const filter = role === 'admin' ? { _id: issueId } : { _id: issueId, assignedDepartment: department };
  const current = await IssueModel.findOne(filter).select('status assignedDepartment remarks');
  if (!current) return null;

  const allowedTransitions: Record<IssueStatus, IssueStatus[]> = {
    Pending: ['Assigned', 'In Progress', 'Rejected'],
    Assigned: ['In Progress', 'Rejected'],
    'In Progress': ['Resolved', 'Rejected'],
    Resolved: [],
    Rejected: [],
  };
  if (input.status && input.status !== current.status && !allowedTransitions[current.status].includes(input.status)) {
    throw new ApiError(422, `Status cannot change from ${current.status} to ${input.status}.`);
  }
  if (input.status === 'Assigned' && !input.assignedDepartment && !current.assignedDepartment) {
    throw new ApiError(422, 'Assign a department before moving a complaint to Assigned.');
  }
  if (input.assignedDepartment !== undefined && role !== 'admin') {
    throw new ApiError(403, 'Only administrators can change department assignments.');
  }

  const updates: Array<{ kind: IssueUpdateKind; message: string; actor: string; createdAt: Date }> = [];
  const changes: { status?: IssueStatus; assignedDepartment?: string; remarks?: string } = {};
  const createdAt = new Date();
  if (input.status && input.status !== current.status) {
    changes.status = input.status;
    updates.push({ kind: 'status', message: `Status changed to ${input.status}.`, actor, createdAt });
  }
  if (input.assignedDepartment !== undefined && input.assignedDepartment !== current.assignedDepartment) {
    changes.assignedDepartment = input.assignedDepartment;
    updates.push({ kind: 'assignment', message: input.assignedDepartment ? `Assigned to ${input.assignedDepartment}.` : 'Department assignment cleared.', actor, createdAt });
    if (input.assignedDepartment && current.status === 'Pending' && input.status === undefined) {
      changes.status = 'Assigned';
      updates.push({ kind: 'status', message: 'Status changed to Assigned.', actor, createdAt });
    }
  }
  if (input.remarks !== undefined && input.remarks !== current.remarks) {
    changes.remarks = input.remarks;
    updates.push({ kind: 'remarks', message: input.remarks ? `Authority update: ${input.remarks}` : 'Authority remarks cleared.', actor, createdAt });
  }

  return IssueModel.findOneAndUpdate(
    filter,
    { ...(Object.keys(changes).length ? { $set: changes } : {}), ...(updates.length ? { $push: { updates: { $each: updates } } } : {}) },
    { new: true, runValidators: true },
  );
};

export const updateIssueForReporter = (
  issueId: string,
  reporter: string,
  input: UpdateCitizenIssueInput,
): Promise<IssueDocument | null> => IssueModel.findOneAndUpdate(
  { _id: issueId, reporter },
  { $set: input },
  { new: true, runValidators: true },
);

export const deleteIssue = (issueId: string): Promise<IssueDocument | null> =>
  IssueModel.findByIdAndDelete(issueId);
