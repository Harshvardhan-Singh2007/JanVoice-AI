import type { IssuePriority, IssueStatus } from '../models/Issue.js';

export interface CreateIssueInput {
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous?: boolean;
  emergency?: boolean;
  image?: string;
}

export interface UpdateIssueStatusInput {
  status: Extract<IssueStatus, 'Pending' | 'In Progress' | 'Resolved'>;
}

export interface UpdateIssueInput {
  status?: Extract<IssueStatus, 'Pending' | 'In Progress' | 'Resolved'>;
  assignedDepartment?: string;
  remarks?: string;
}
