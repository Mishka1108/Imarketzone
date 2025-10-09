// src/app/models/auth.model.ts

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
// src/app/models/user.model.ts

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email: string;
  password?: string;
  profileImage?: string;
  phone?: string;
  city?: string;
  address?: string;
  role?: 'user' | 'admin' | 'seller';
  isVerified?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // დამატებითი ინფორმაცია
  bio?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // სტატისტიკა
  totalProducts?: number;
  totalSales?: number;
  rating?: number;
  reviewsCount?: number;
}

// ✅ ახალი - Simple User ინფორმაცია message dialog-ისთვის
export interface SimpleUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

// ✅ Login Response
export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

// ✅ Register Response
export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

// ✅ Auth State
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}