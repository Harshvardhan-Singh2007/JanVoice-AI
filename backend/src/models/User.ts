import { Schema, model, type HydratedDocument } from 'mongoose';

export const userRoles = ['citizen', 'authority', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export interface User {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, default: 'citizen', required: true },
    department: { type: String, trim: true, minlength: 2, maxlength: 120 },
  },
  { timestamps: true },
);

export const UserModel = model<User>('User', userSchema);
