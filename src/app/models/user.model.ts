// src/app/models/user.model.ts

export interface User {
  id?: string;
  _id?: string;  // MongoDB-ს ID ველი
  name: string;
  secondName: string;
  email: string;
  phone: string | number;
  dateOfBirth: string | Date;
  personalNumber: string | number;
  profileImage?: string;
  isVerified: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  role?: string;
}
export interface UserResponse {
  success: boolean;
  message?: string;
  users?: User[];
  user?: User;
}