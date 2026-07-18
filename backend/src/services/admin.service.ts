import { IssueModel } from '../models/Issue.js';
import { UserModel } from '../models/User.js';

export interface DistributionItem { label: string; count: number; }

const distribution = async (field: 'category' | 'priority' | 'status'): Promise<DistributionItem[]> =>
  IssueModel.aggregate<DistributionItem>([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $project: { _id: 0, label: '$_id', count: 1 } },
    { $sort: { count: -1, label: 1 } },
  ]);

export const getDashboardStatistics = async () => {
  const [totalUsers, totalIssues, pendingIssues, inProgressIssues, resolvedIssues, categories, priorities, statuses] = await Promise.all([
    UserModel.countDocuments(),
    IssueModel.countDocuments(),
    IssueModel.countDocuments({ status: 'Pending' }),
    IssueModel.countDocuments({ status: 'In Progress' }),
    IssueModel.countDocuments({ status: 'Resolved' }),
    distribution('category'),
    distribution('priority'),
    distribution('status'),
  ]);
  return { totalUsers, totalIssues, pendingIssues, inProgressIssues, resolvedIssues, categories, priorities, statuses };
};

export const getRecentActivity = () => IssueModel.find()
  .sort({ updatedAt: -1 })
  .limit(10)
  .select('title status category assignedDepartment updatedAt createdAt');

export const getAdminNotifications = () => IssueModel.find({ status: { $in: ['Pending', 'In Progress'] } })
  .sort({ updatedAt: -1 })
  .limit(10)
  .select('title status priority updatedAt createdAt');
