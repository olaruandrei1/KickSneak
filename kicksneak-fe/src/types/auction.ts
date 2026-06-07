export type AuctionStatus = 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'cancelled';

export type AuctionDuration = '1d' | '3d' | '7d';

export interface AuctionSeller {
  id: string;
  username: string;
  avatarUrl?: string;
  rating: number;
  totalSales: number;
  isVerified: boolean;
}

export interface AuctionProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  colorway: string;
  size: string;
  sizeSystem: string;
  condition: 'new' | 'used_excellent' | 'used_good' | 'used_fair';
  images: string[];
  retailPrice: number;
  estimatedMarketValue: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderUsername: string;
  bidderAvatarUrl?: string;
  amount: number;
  placedAt: string; // ISO
  isAutoBid: boolean;
  triggeredExtension: boolean;
}

export interface AutoBid {
  id: string;
  auctionId: string;
  userId: string;
  maxAmount: number;
  currentBidPlaced: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Auction {
  id: string;
  product: AuctionProduct;
  seller: AuctionSeller;
  status: AuctionStatus;
  startPrice: number;
  currentPrice: number;
  reservePrice?: number;
  reserveMet: boolean;
  bidCount: number;
  uniqueBidders: number;
  startsAt: string; // ISO
  endsAt: string; // ISO
  originalEndsAt: string; // ISO — pre-extension
  extensionCount: number;
  highestBidderId?: string;
  highestBidderUsername?: string;
  duration: AuctionDuration;
  views: number;
  watchers: number;
}

export interface AuctionListItem {
  id: string;
  productName: string;
  productBrand: string;
  productImage: string;
  colorway: string;
  size: string;
  sizeSystem: string;
  currentPrice: number;
  startPrice: number;
  bidCount: number;
  endsAt: string;
  status: AuctionStatus;
  reserveMet: boolean;
  hasReserve: boolean;
  watchers: number;
}

export interface AuctionDetail extends Auction {
  description?: string;
  recentBids: Bid[];
  myCurrentBid?: Bid;
  myAutoBid?: AutoBid;
  isWatching: boolean;
}

export interface MyBidEntry {
  auctionId: string;
  productName: string;
  productImage: string;
  myBidAmount: number;
  currentPrice: number;
  isWinning: boolean;
  status: AuctionStatus;
  endsAt: string;
  bidPlacedAt: string;
}

export interface PlaceBidRequest {
  auctionId: string;
  amount: number;
}

export interface PlaceBidResponse {
  success: boolean;
  bid?: Bid;
  newCurrentPrice: number;
  triggeredExtension: boolean;
  newEndsAt: string;
  errorReason?: 'too_low' | 'auction_ended' | 'outbid_during_request' | 'self_bid' | 'unauthorized';
}

export interface SetAutoBidRequest {
  auctionId: string;
  maxAmount: number;
}

export interface AuctionFilters {
  category?: string[];
  brand?: string[];
  endingWithin?: '1h' | '6h' | '24h' | '3d';
  priceMin?: number;
  priceMax?: number;
  hasReserve?: boolean;
  reserveMet?: boolean;
  sortBy?: 'ending_soon' | 'just_started' | 'most_bids' | 'highest_price' | 'lowest_price';
}

export type NotificationPreference = 'all' | 'essentials';

export interface AuctionNotificationSettings {
  preference: NotificationPreference;
  emailNotifications: boolean;
  pushNotifications: boolean;
}