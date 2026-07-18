import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export const issuePriorities = ['Low', 'Medium', 'High', 'Critical'] as const;
export const issueStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'] as const;
export type IssuePriority = (typeof issuePriorities)[number];
export type IssueStatus = (typeof issueStatuses)[number];

export interface Issue {
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous: boolean;
  emergency: boolean;
  image?: string;
  reporter: Types.ObjectId;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type IssueDocument = HydratedDocument<Issue>;

const issueSchema = new Schema<Issue>(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 160 },
    description: { type: String, required: true, trim: true, minlength: 15, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    priority: { type: String, enum: issuePriorities, required: true },
    location: { type: String, required: true, trim: true, maxlength: 250 },
    anonymous: { type: Boolean, default: false },
    emergency: { type: Boolean, default: false },
    image: { type: String, trim: true },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: issueStatuses, default: 'Pending', required: true },
  },
  { timestamps: true },
);

issueSchema.index({ reporter: 1, createdAt: -1 });

export const IssueModel = model<Issue>('Issue', issueSchema);
