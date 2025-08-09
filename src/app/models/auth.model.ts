// src/app/models/auth.model.ts
import { User } from './user.model';

export interface RegisterRequest {
  name: string;
  secondName: string;
  email: string;
  password: string;
  phone: string | number;
  dateOfBirth: string | Date;
  personalNumber: string | number;
}
  
export interface LoginRequest {
  email: string;
  password: string;
}
  
export interface AuthResponse {
  message: string;
  token?: string;
  user?: User;
}