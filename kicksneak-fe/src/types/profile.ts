export interface Address {
    id: string;
    label: string;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    county: string;
    zip: string;
    country: string;
    phone: string;
    alternateEmail?: string;
    isDefault: boolean;
}

export interface SizePreferences {
    footwearEU: string;
    footwearUS: string;
    footwearUK: string;
    tops: string;
    bottoms: string;
    preferredSystem: 'EU' | 'US' | 'UK';
}

export interface SellerInfo {
    storeName: string;
    joinedAt: string;
    totalSales: number;
    rating: number;
    verified: boolean;
    phone?: string;
    city?: string;
    sellType?: string;
    productType?: string;
    hasCompany: boolean;
    companyName?: string;
    vatNumber?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    isSeller: boolean;
    joinedAt: string;
    totalSpent: number;
    totalOrders: number;
    addresses: Address[];
    sizePreferences: SizePreferences;
    seller?: SellerInfo | null;
}

export interface OrderItem {
    name: string;
    brand: string;
    size: string;
    price: number;
    image: string;
}

export interface OrderDto {
    id: string;
    date: string;
    status: string;
    total: number;
    items: OrderItem[];
    tracking?: string;
    address?: string;
}

export interface Order {
    id: string;
    date: string;
    status: 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
    total: number;
    items: OrderItem[];
    tracking: string;
    address: string;
}

export interface ReturnRequest {
    id: string;
    orderId: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    reason: string;
    items: OrderItem[];
    images: string[];
}

export type ProfileSection =
    | 'overview'
    | 'orders'
    | 'addresses'
    | 'sizes'
    | 'returns'
    | 'watched-auctions'
    | 'my-auctions'    
    | 'chat'
    | 'settings'
    | 'seller-listings'
    | 'seller-sales'
    | 'seller-returns'
    | 'seller-chat';