import { IssueModel, type IssueDocument } from '../models/Issue.js';
import type { CreateIssueInput } from '../types/issue.js';

export const createIssue = (input: CreateIssueInput, reporter: string): Promise<IssueDocument> =>
  IssueModel.create({ ...input, reporter, anonymous: input.anonymous ?? false, emergency: input.emergency ?? false });

export const getIssuesForReporter = (reporter: string): Promise<IssueDocument[]> =>
  IssueModel.find({ reporter }).sort({ createdAt: -1 });
