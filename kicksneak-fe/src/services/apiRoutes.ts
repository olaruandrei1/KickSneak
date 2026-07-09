const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const MOCK_BASE = '/mocks';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const base = USE_MOCKS ? MOCK_BASE : API_BASE;

export const ApiRoutes = {
    profile: USE_MOCKS ? `${MOCK_BASE}/profile.json` : `${API_BASE}/profile`,

    navbarCategories: USE_MOCKS ? `${MOCK_BASE}/navbar-categories.json` : `${API_BASE}/navbar-categories`,
    footerData: USE_MOCKS ? `${MOCK_BASE}/footer.json` : `${API_BASE}/footer`,

    productsNew: USE_MOCKS ? `${MOCK_BASE}/products-new.json` : `${API_BASE}/products/new`,
    productsTrending: USE_MOCKS ? `${MOCK_BASE}/products-trending.json` : `${API_BASE}/products/trending`,
    productsRecommended: USE_MOCKS ? `${MOCK_BASE}/products-recommended.json` : `${API_BASE}/products/recommended`,
    productsRecentlyViewed: USE_MOCKS ? `${MOCK_BASE}/products-recently-viewed.json` : `${API_BASE}/products/recently-viewed`,
    searchResultsPaged: USE_MOCKS ? `${MOCK_BASE}/search-results-paged.json` : `${API_BASE}/products/search-paged`,

    becomeSeller: '/seller/become',

    searchProducts: (query: string) =>
        USE_MOCKS
            ? `${MOCK_BASE}/search-results.json`
            : `${API_BASE}/products/search?q=${encodeURIComponent(query)}`,

    hasReview: (orderId: string) => `/reviews/has-review/${orderId}`,

    productDetail: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/product-detail.json` : `${API_BASE}/products/${id}`,

    favorites: USE_MOCKS ? `${MOCK_BASE}/favorites.json` : `${API_BASE}/favorites`,
    favoritesToggle: () => '/favorites/toggle',
    cart: USE_MOCKS ? `${MOCK_BASE}/cart.json` : `${API_BASE}/cart`,
    cartAdd: USE_MOCKS ? `${MOCK_BASE}/cart.json` : `${API_BASE}/cart/add`,

    notifications: USE_MOCKS ? `${MOCK_BASE}/notifications.json` : `${API_BASE}/notifications`,
    notificationRead: (id: string) => `${API_BASE}/notifications/${id}/read`,
    notificationsReadAll: `${API_BASE}/notifications/read-all`,
    notificationSettings: USE_MOCKS ? `${MOCK_BASE}/notification-settings.json` : `${API_BASE}/profile/notification-settings`,
    vapidPublicKey: `${API_BASE}/notifications/vapid-public-key`,
    subscribePush: `${API_BASE}/notifications/subscribe`,
    orders: USE_MOCKS ? `${MOCK_BASE}/orders.json` : `${API_BASE}/orders`,

    orderConfirmation: (orderId: string) =>
        USE_MOCKS ? `${MOCK_BASE}/order-confirmation.json` : `${API_BASE}/orders/${orderId}/confirmation`,

    sellerListings: USE_MOCKS ? `${MOCK_BASE}/seller-listings.json` : `${API_BASE}/seller/listings`,
    sellerSales: USE_MOCKS ? `${MOCK_BASE}/seller-sales.json` : `${API_BASE}/seller/sales`,
    sellerAuctions: USE_MOCKS ? `${MOCK_BASE}/seller-auctions.json` : `${API_BASE}/seller/auctions`,

    createAuction: USE_MOCKS ? `${MOCK_BASE}/auction-create-response.json` : `${API_BASE}/seller/auctions/create`,

    cancelAuction: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-cancel-response.json` : `${API_BASE}/seller/auctions/${id}/cancel`,

    auctionsList: USE_MOCKS ? `${MOCK_BASE}/auctions-list.json` : `${API_BASE}/auctions`,

    auctionDetail: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-detail.json` : `${API_BASE}/auctions/${id}`,

    placeBid: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-bids.json` : `${API_BASE}/auctions/${id}/bids`,

    auctionMyBids: USE_MOCKS ? `${MOCK_BASE}/auction-my-bids.json` : `${API_BASE}/auctions/my-bids`,
    auctionMyWon: USE_MOCKS ? `${MOCK_BASE}/auction-my-won.json` : `${API_BASE}/auctions/my-won`,

    setAutoBid: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-auto-bid.json` : `${API_BASE}/auctions/${id}/auto-bid`,

    cancelAutoBid: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-auto-bid.json` : `${API_BASE}/auctions/${id}/auto-bid`,

    watchAuction: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-watch.json` : `${API_BASE}/auctions/${id}/watch`,

    unwatchAuction: (id: string) =>
        USE_MOCKS ? `${MOCK_BASE}/auction-watch.json` : `${API_BASE}/auctions/${id}/watch`,

    auctionNotificationSettings: USE_MOCKS
        ? `${MOCK_BASE}/auction-notification-settings.json`
        : `${API_BASE}/notifications/auction-settings`,

    checkoutSession: USE_MOCKS ? `${MOCK_BASE}/checkout-session.json` : `${API_BASE}/checkout/session`,
    checkoutAddresses: USE_MOCKS ? `${MOCK_BASE}/checkout-addresses.json` : `${API_BASE}/profile`,
    stripePaymentIntent: USE_MOCKS ? `${MOCK_BASE}/stripe-payment-intent.json` : `${API_BASE}/checkout/stripe/payment-intent`,

    brands: USE_MOCKS ? `${MOCK_BASE}/brands.json` : `${API_BASE}/brands`,

    policies: `${base}/policies.json`,

    auctionBids: (id: string) => USE_MOCKS ? `${MOCK_BASE}/auction-bids.json` : `${API_BASE}/auctions/${id}/bids`,

    reviews: () => '/reviews',

    profileAddresses: () => '/profile/addresses',
    profileAddress: (id: string) => `/profile/addresses/${id}`,
    profileAddressDefault: (id: string) => `/profile/addresses/${id}/default`,

    authLogin: () => '/auth/login',
    authDeleteAccount: () => '/auth/account',

    profileMe: () => '/profile/me',
    profileGenders: () => '/profile/genders',
    profileSizes: () => '/profile/sizes',

    cartRemove: (id: string) => `/cart/${id}`,

    returns: () => '/returns',
    cancelOrder: (id: string) => `/orders/${id}/cancel`,

    sellerCatalogSearch: (q: string) => `${API_BASE}/seller/catalog/search?q=${encodeURIComponent(q)}`,
    
    sellerCreateUsedListing: `${API_BASE}/seller/listings/used`,

    sellerUploadPhotos: (id: string) => `${API_BASE}/seller/listings/${id}/photos`,

    sellerReturns: `${API_BASE}/seller/returns`,

    sellerHandleReturn: (id: string) => `${API_BASE}/seller/returns/${id}/handle`,
} as const;