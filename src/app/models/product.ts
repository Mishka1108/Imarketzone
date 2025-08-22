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
  userName?: string;
  userEmail?: string;
  userPhone?: string;

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