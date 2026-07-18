export type IssueStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AiAnalysis {
  category: string;
  priorityScore: number;
  severityScore: number;
  department: string;
  eta: string;
  confidence: number;
  improvedComplaint: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  pincode: string;
  landmark: string;
  priority: IssuePriority;
  anonymous: boolean;
  emergency: boolean;
  status: IssueStatus;
  createdAt: string;
  imageUrl?: string;
  analysis: AiAnalysis;
}

export interface AppNotification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}
