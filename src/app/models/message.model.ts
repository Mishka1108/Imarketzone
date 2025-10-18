// src/app/models/message.model.ts - CORRECTED

export interface Message {
  _id?: string;              // ✅ Optional MongoDB ID
  id?: string;               // ✅ Optional alternative ID  
  senderId: string | any;    // Can be string or populated User object
  receiverId: string | any;
  content: string;
  read: boolean;
  productId?: string;
  messageType?: 'text' | 'image' | 'file';
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface Conversation {
  _id?: string;              // ✅ Optional
  id?: string;               // ✅ Optional
  participants: string[];
  otherUser: {
    _id?: string;            // ✅ Optional
    id?: string;             // ✅ Optional
    name: string;
    email?: string;          // ✅ Optional
    avatar?: string;
  };
  lastMessage?: {            // ✅ Optional - თუ ახალი conversation არის
    _id?: string;
    id?: string;
    senderId: string;
    receiverId: string;
    content: string;
    read: boolean;
    createdAt: Date | string;
  };
  unreadCount?: number;      // ✅ Optional
  createdAt?: Date | string; // ✅ Optional
  updatedAt?: Date | string; // ✅ Optional
}

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  productId?: string;
}

export interface MessageResponse {
  success: boolean;
  data?: Message;
  message?: string;
  error?: string;
}

export interface ConversationsResponse {
  success: boolean;
  data?: Conversation[];
  conversations?: Conversation[];
}

export interface UnreadCountResponse {
  success: boolean;
  unreadCount?: number;
  count?: number;
}