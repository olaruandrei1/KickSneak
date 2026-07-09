export interface ProductItem {
    id: string;
    name: string;
    brand: string;
    price: number;
    image: string;
    category: string;
    sold?: number;
    isNew?: boolean;
    isFavorite?: boolean;
}

export interface CartItem {
    id: string;
    name: string;
    brand: string;
    price: number;
    image: string;
    category: string;
    size: string;
    quantity: number;
    productId?: string;      
    stockItemId?: string;
    usedItemId?: string;
}

export interface NavbarCategory {
    id: string;
    label: string;
    highlight: boolean;
    columns: {
        title: string;
        items: { label: string; href: string }[];
    }[];
}

export interface SizeOption {
  sizeId?:    string;
  system?:    string;
  label:      string;
  price:      number | null;
  us?:        string;
  eu?:        string;
  uk?:        string;
  cm?:        string;
  kr?:        string;
  available?: boolean;
}

export interface ColorwayOption {
  id:    string;
  name:  string;
  image: string;
  price: number;
}

export interface PriceHistoryPoint {
  date:  string;
  price: number;
}

export interface ProductDetail {
  id:           string;
  name:         string;
  subtitle:     string;
  brand:        string;
  price:        number;
  lastSale:     number;
  retailPrice:  number;
  images:       string[];
  category:     string;
  sold:         number;
  isNew:        boolean;
  breadcrumbs:  { label: string; href: string }[];
  colorways:    ColorwayOption[];
  sizes:        SizeOption[];
  preferredSizeId?: string;
  priceHistory: PriceHistoryPoint[];
  relatedProducts: ProductItem[];
  recentlyViewed:  ProductItem[];
  details: {
    style:        string;
    colorway:     string;
    retailPrice:  number;
    releaseDate:  string;
    accessories:  string;
    description:  string;
  };
  policies: {
    returnPolicy:   { title: string; badge: string; content: string };
    buyerPromise:   { title: string; content: string };
    ourProcess:     { title: string; condition: string; content: string };
  };
  historicalData: {
    priceRange12m:  string;
    priceRange3m:   string;
    volatility:     string;
    numberOfSales:  number;
    pricePremium:   string;
    avgSalePrice:   number;
  };
}