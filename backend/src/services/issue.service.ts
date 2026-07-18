import { IssueModel, type IssueDocument } from '../models/Issue.js';
import type { CreateIssueInput, UpdateIssueInput, UpdateIssueStatusInput } from '../types/issue.js';

export const createIssue = (input: CreateIssueInput, reporter: string): Promise<IssueDocument> =>
  IssueModel.create({ ...input, reporter, anonymous: input.anonymous ?? false, emergency: input.emergency ?? false });

export const getIssuesForReporter = (reporter: string): Promise<IssueDocument[]> =>
  IssueModel.find({ reporter }).sort({ createdAt: -1 });

export const getAllIssues = (): Promise<IssueDocument[]> =>
  IssueModel.find().sort({ createdAt: -1 });

export const updateIssueStatus = (issueId: string, input: UpdateIssueStatusInput): Promise<IssueDocument | null> =>
  IssueModel.findByIdAndUpdate(issueId, { status: input.status }, { new: true, runValidators: true });

export const getIssueById = (issueId: string): Promise<IssueDocument | null> =>
  IssueModel.findById(issueId);

export const updateIssue = (issueId: string, input: UpdateIssueInput): Promise<IssueDocument | null> =>
  IssueModel.findByIdAndUpdate(issueId, input, { new: true, runValidators: true });

export const deleteIssue = (issueId: string): Promise<IssueDocument | null> =>
  IssueModel.findByIdAndDelete(issueId);
