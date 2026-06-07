export interface FilterState {
    availableNow: boolean;
    categories: string[];
    genders: string[];
    brands: string[];
    activities: string[];
    colors: string[];
    priceMin: number;
    priceMax: number;
}

export const DEFAULT_FILTERS: FilterState = {
    availableNow: false,
    categories: [],
    genders: [],
    brands: [],
    activities: [],
    colors: [],
    priceMin: 0,
    priceMax: 10000,
};

export const FILTER_OPTIONS = {
    categories: ['Sneakers', 'Apparel', 'Accessories', 'Shoes', 'Collectibles', 'Trading Cards', 'Electronics'],
    genders: ['Men', 'Kids', 'Women', 'Unisex'],
    brands: ['Jordan', 'Alexander McQueen', 'Nike', 'Louis Vuitton', 'adidas', 'BAPE', 'Puma', 'Travis Scott', 'AMIRI', 'Funko', 'Pop Mart', 'Union', 'Supreme', 'Cactus Jack', 'New Balance', 'ASICS', 'Yeezy', 'Converse', 'Vans', 'Salomon'],
    activities: ['Basketball', 'Soccer', 'Golf', 'Running', 'Football', 'Skateboarding', 'Hiking', 'Baseball'],
    colors: [
        { label: 'White', hex: '#FFFFFF' },
        { label: 'Black', hex: '#000000' },
        { label: 'Multi', hex: 'linear-gradient(135deg,red,yellow,green,blue)' },
        { label: 'Blue', hex: '#2563EB' },
        { label: 'Red', hex: '#DC2626' },
        { label: 'Pink', hex: '#F9A8D4' },
        { label: 'Grey', hex: '#9CA3AF' },
        { label: 'Purple', hex: '#7C3AED' },
        { label: 'Brown', hex: '#92400E' },
        { label: 'Yellow', hex: '#FBBF24' },
        { label: 'Green', hex: '#166534' },
        { label: 'Orange', hex: '#EA580C' },
    ],
};