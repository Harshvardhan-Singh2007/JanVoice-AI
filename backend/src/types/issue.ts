import type { IssuePriority } from '../models/Issue.js';

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
