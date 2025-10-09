export interface Message {
  _id: string;
  senderId: string | any; // Can be string or populated User object
  receiverId: string | any;
  content: string;
  read: boolean;
  productId?: string;
  messageType?: 'text' | 'image' | 'file';
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface Conversation {
  _id: string;
  id: string;
  participants: string[];
  otherUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  lastMessage: {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    read: boolean;
    createdAt: Date | string;
  };
  unreadCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
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