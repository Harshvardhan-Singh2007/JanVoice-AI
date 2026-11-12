import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export const issuePriorities = ['Low', 'Medium', 'High', 'Critical'] as const;
export const issueStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'] as const;
export type IssuePriority = (typeof issuePriorities)[number];
export type IssueStatus = (typeof issueStatuses)[number];
export const issueUpdateKinds = ['submitted', 'status', 'assignment', 'remarks'] as const;
export type IssueUpdateKind = (typeof issueUpdateKinds)[number];
export const aiReviewStates = ['accepted', 'edited', 'rejected'] as const;
export type AiReviewState = (typeof aiReviewStates)[number];

export interface IssueAiAnalysis {
  category: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  language: string;
  explanation: string;
  analyzedAt: Date;
  model: string;
  reviewState: AiReviewState;
  reviewedSummary?: string;
}

export interface IssueCoordinates {
  latitude: number;
  longitude: number;
}

export interface IssueUpdate {
  kind: IssueUpdateKind;
  message: string;
  actor: Types.ObjectId;
  createdAt: Date;
}

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
  assignedDepartment?: string;
  remarks?: string;
  updates: IssueUpdate[];
  aiAnalysis?: IssueAiAnalysis;
  coordinates?: IssueCoordinates;
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
    assignedDepartment: { type: String, trim: true, maxlength: 120 },
    remarks: { type: String, trim: true, maxlength: 2000 },
    updates: {
      type: [{
        kind: { type: String, enum: issueUpdateKinds, required: true },
        message: { type: String, required: true, trim: true, maxlength: 2100 },
        actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, required: true, default: Date.now },
      }],
      default: [],
    },
    aiAnalysis: {
      category: { type: String, required: true, trim: true, maxlength: 80 },
      department: { type: String, required: true, trim: true, maxlength: 120 },
      priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
      summary: { type: String, required: true, trim: true, maxlength: 2000 },
      language: { type: String, required: true, trim: true, maxlength: 80 },
      explanation: { type: String, required: true, trim: true, maxlength: 500 },
      analyzedAt: { type: Date, required: true },
      model: { type: String, required: true, trim: true, maxlength: 100 },
      reviewState: { type: String, enum: aiReviewStates, required: true },
      reviewedSummary: { type: String, trim: true, maxlength: 2000 },
    },
    coordinates: {
      type: new Schema({
        latitude: { type: Number, min: -90, max: 90, required: true },
        longitude: { type: Number, min: -180, max: 180, required: true },
      }, { _id: false }),
      required: false,
    },
  },
  { timestamps: true },
);

issueSchema.index({ reporter: 1, createdAt: -1 });
issueSchema.index({ reporter: 1, status: 1, createdAt: -1 });
issueSchema.index({ category: 1, createdAt: -1 });
issueSchema.index({ assignedDepartment: 1, createdAt: -1 });
issueSchema.index({ assignedDepartment: 1, status: 1, createdAt: -1 });
issueSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1, createdAt: -1 });

export const IssueModel = model<Issue>('Issue', issueSchema);
