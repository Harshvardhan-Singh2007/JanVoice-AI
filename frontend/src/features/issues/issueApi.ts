import { apiClient } from '../../lib/api/client';
import type { IssuePriority, IssueStatus } from '../../types/issue';

export interface CreateIssueRequest {
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous: boolean;
  emergency: boolean;
  image?: string;
}

export interface ApiIssue {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous: boolean;
  emergency: boolean;
  image?: string;
  status: IssueStatus;
  createdAt: string;
}

export async function createIssue(input: CreateIssueRequest): Promise<ApiIssue> {
  const { data } = await apiClient.post<{ status: string; data: { issue: ApiIssue } }>('/api/issues', input);
  return data.data.issue;
}

export async function getMyIssues(): Promise<ApiIssue[]> {
  const { data } = await apiClient.get<{ status: string; data: { issues: ApiIssue[] } }>('/api/issues/mine');
  return data.data.issues;
}
