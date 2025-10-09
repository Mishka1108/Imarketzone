export interface Product {
date: string;
  id?: string;
  _id?: string;
  productId?: string;
  product_id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  year: number;
  cities: string;
  phone?: string;
  email?: string;
  slug?: string; // slug ველი, რომელიც გამოიყენება URL-ებისთვის

  //ნახვები
   viewCount?: number;
   views?: number; // ალტერნატიული ველი


  // ახალი images array - მთავარი სურათების ველი
  images?: string[];
  
  // backward compatibility-ისთვის ძველი image ველი
  image?: string;

  // გამყიდველის/მომხმარებლის ინფორმაცია
  userEmail?: string;
  userPhone?: string;
  userId?: string;      // seller-ის ID
  sellerId?: string;    // ალტერნატივა
  userName?: string;    // seller-ის სახელი
  userAvatar?: string;
  // სხვადასხვა API სტრუქტურის მხარდაჭერა
  user?: {
    name?: string;
    firstName?: string;
    email?: string;
    phone?: string;
  };

  seller?: {
    name?: string;
    firstName?: string;
    email?: string;
    phone?: string;
  };

  owner?: {
    name?: string;
    firstName?: string;
    email?: string;
    phone?: string;
  };

  // ძველი ველები უკანასკნელი თავსებადობისთვის
  productImage1?: string;
  productImage2?: string;
  productImage3?: string;

  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;

  // API პასუხის დამატებითი მეტა-ინფორმაცია
  createdAt?: string;
  updatedAt?: string;

  // Helper methods
  primaryImage?: string;
  allImages?: string[];
}
// src/app/models/product.ts

export interface Product {
  // ძირითადი ველები
  _id?: string;
  id?: string;
  title: string;
  price: number;
 
  
  // სურათები
  image?: string;
  images?: string[];
  productImage1?: string;
  productImage2?: string;
  productImage3?: string;
  
  // დამატებითი ინფორმაცია
  city?: string;
  location?: string;
  condition?: 'new' | 'used' | 'excellent' | 'good' | 'fair';
  brand?: string;
  model?: string;
  
  // ✅ Seller ინფორმაცია - MESSAGE SYSTEM-ისთვის
  userId?: string;           // Seller-ის ID (მთავარი)
  sellerId?: string;         // ალტერნატივა
  userName?: string;         // Seller-ის სახელი
  sellerName?: string;       // ალტერნატივა
  userAvatar?: string;       // Seller-ის ავატარი
  sellerAvatar?: string;     // ალტერნატივა
  email?: string;            // Seller-ის email
  phone?: string;            // Seller-ის ტელეფონი
  
  // მეტამონაცემები
  status?: 'active' | 'sold' | 'pending' | 'deleted';
  featured?: boolean;
  slug?: string;
  
  // ნახვები
  views?: number;
  viewCount?: number;
  totalViews?: number;
  todayViews?: number;
  weekViews?: number;
  monthViews?: number;
  
  // სტატისტიკა
  likes?: number;
  favorites?: number;
  shares?: number;
  
  // Tags
  tags?: string[];
  
  // Stock
  stock?: number;
  inStock?: boolean;
  
  // Delivery
  deliveryAvailable?: boolean;
  deliveryPrice?: number;
  deliveryTime?: string;
  
  // Rating
  rating?: number;
  reviewsCount?: number;
}

// ✅ Product Response
export interface ProductResponse {
  success: boolean;
  product?: Product;
  products?: Product[];
  data?: Product | Product[];
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// ✅ Product Filter
export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  search?: string;
  year?: string;
  condition?: string;
  sortBy?: 'price' | 'date' | 'views' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  userId?: string; // მომხმარებლის პროდუქტების ფილტრაციისთვის
}

// ✅ Product Create/Update
export interface ProductFormData {
  title: string;
  description?: string;
  price: number;
  category?: string;
  year?: string;
  city?: string;
  condition?: string;
  phone?: string;
  email?: string;
  images?: File[];
}

// ✅ Product Stats
export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  soldProducts: number;
  totalViews: number;
  totalRevenue: number;
}