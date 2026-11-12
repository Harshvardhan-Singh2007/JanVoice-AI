import type { IssueAiAnalysis, IssueCoordinates, IssueDocument, IssuePriority, IssueStatus } from '../models/Issue.js';

export interface CreateIssueInput {
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous?: boolean;
  emergency?: boolean;
  image?: string;
  aiAnalysis?: IssueAiAnalysis;
  coordinates?: IssueCoordinates;
}

export interface UpdateIssueStatusInput {
  status: Extract<IssueStatus, 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected'>;
}

export interface UpdateIssueInput {
  status?: Extract<IssueStatus, 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected'>;
  assignedDepartment?: string;
  remarks?: string;
}

export interface UpdateCitizenIssueInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: IssuePriority;
  location?: string;
  anonymous?: boolean;
  emergency?: boolean;
}

export interface CitizenIssueStatistics {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export interface PotentialDuplicate {
  reference: string;
  category: string;
  status: IssueStatus;
  createdAt: Date;
  distanceMeters?: number;
}

export interface IssueMapMarker {
  reference: string;
  category: string;
  status: IssueStatus;
  coordinates: IssueCoordinates;
  createdAt: Date;
}

export interface AuthorityDashboardData {
  scopeConfigured: boolean;
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  recentActivity: Array<{ issueId: string; title: string; category: string; status: IssueStatus; priority: IssuePriority; updatedAt: Date; message: string; actor?: string }>;
  departments: Array<{ department: string; count: number }>;
}

export interface IssueListQuery {
  page: number;
  pageSize: number;
  status?: IssueStatus;
  category?: string;
  priority?: IssuePriority;
  search?: string;
  sort: 'newest' | 'oldest' | 'priority';
  department?: string;
}

export interface PaginatedIssues {
  issues: IssueDocument[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
