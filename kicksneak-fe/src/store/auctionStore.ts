import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    AuctionListItem,
    AuctionDetail,
    Bid,
    AutoBid,
    MyBidEntry,
    AuctionFilters,
    AuctionNotificationSettings,
} from '../types/auction';

interface AuctionState {
    auctions: AuctionListItem[];
    filters: AuctionFilters;
    isLoadingList: boolean;

    currentAuction: AuctionDetail | null;
    isLoadingDetail: boolean;

    myBids: MyBidEntry[];
    myAutoBids: Record<string, AutoBid>; 
    watchedAuctionIds: string[];

    notificationSettings: AuctionNotificationSettings;

    recentlyOutbidIds: string[]; 

    setAuctions: (items: AuctionListItem[]) => void;
    setFilters: (filters: Partial<AuctionFilters>) => void;
    resetFilters: () => void;
    setLoadingList: (loading: boolean) => void;

    setCurrentAuction: (auction: AuctionDetail | null) => void;
    setLoadingDetail: (loading: boolean) => void;
    updateCurrentPriceLive: (auctionId: string, newPrice: number, bid: Bid) => void;
    extendAuctionLive: (auctionId: string, newEndsAt: string) => void;
    endAuctionLive: (auctionId: string) => void;

    setMyBids: (bids: MyBidEntry[]) => void;
    upsertMyBid: (entry: MyBidEntry) => void;
    setAutoBid: (autoBid: AutoBid) => void;
    cancelAutoBid: (auctionId: string) => void;
    toggleWatch: (auctionId: string) => void;

    setNotificationSettings: (settings: Partial<AuctionNotificationSettings>) => void;

    markOutbid: (auctionId: string) => void;
    clearOutbid: (auctionId: string) => void;
}

const defaultFilters: AuctionFilters = {
    sortBy: 'ending_soon',
};

const defaultNotificationSettings: AuctionNotificationSettings = {
    preference: 'essentials',
    emailNotifications: true,
    pushNotifications: true,
};

export const useAuctionStore = create<AuctionState>()(
    persist(
        (set, get) => ({
            auctions: [],
            filters: defaultFilters,
            isLoadingList: false,
            currentAuction: null,
            isLoadingDetail: false,
            myBids: [],
            myAutoBids: {},
            watchedAuctionIds: [],
            notificationSettings: defaultNotificationSettings,
            recentlyOutbidIds: [],

            setAuctions: (items) => set({ auctions: items }),
            setFilters: (filters) =>
                set((state) => ({ filters: { ...state.filters, ...filters } })),
            resetFilters: () => set({ filters: defaultFilters }),
            setLoadingList: (loading) => set({ isLoadingList: loading }),

            setCurrentAuction: (auction) => set({ currentAuction: auction }),
            setLoadingDetail: (loading) => set({ isLoadingDetail: loading }),

            updateCurrentPriceLive: (auctionId, newPrice, bid) => {
                const { currentAuction, auctions } = get();

                if (currentAuction && currentAuction.id === auctionId) {
                    set({
                        currentAuction: {
                            ...currentAuction,
                            currentPrice: newPrice,
                            bidCount: currentAuction.bidCount + 1,
                            highestBidderId: bid.bidderId,
                            highestBidderUsername: bid.bidderUsername,
                            recentBids: [bid, ...currentAuction.recentBids].slice(0, 50),
                        },
                    });
                }

                // Update list dacă e prezent
                set({
                    auctions: auctions.map((a) =>
                        a.id === auctionId
                            ? { ...a, currentPrice: newPrice, bidCount: a.bidCount + 1 }
                            : a
                    ),
                });
            },

            extendAuctionLive: (auctionId, newEndsAt) => {
                const { currentAuction, auctions } = get();

                if (currentAuction && currentAuction.id === auctionId) {
                    set({
                        currentAuction: {
                            ...currentAuction,
                            endsAt: newEndsAt,
                            extensionCount: currentAuction.extensionCount + 1,
                        },
                    });
                }

                set({
                    auctions: auctions.map((a) =>
                        a.id === auctionId ? { ...a, endsAt: newEndsAt } : a
                    ),
                });
            },

            endAuctionLive: (auctionId) => {
                const { currentAuction, auctions } = get();

                if (currentAuction && currentAuction.id === auctionId) {
                    set({
                        currentAuction: { ...currentAuction, status: 'ended' },
                    });
                }

                set({
                    auctions: auctions.map((a) =>
                        a.id === auctionId ? { ...a, status: 'ended' } : a
                    ),
                });
            },

            setMyBids: (bids) => set({ myBids: bids }),
            upsertMyBid: (entry) => {
                const { myBids } = get();
                const idx = myBids.findIndex((b) => b.auctionId === entry.auctionId);
                if (idx >= 0) {
                    const updated = [...myBids];
                    updated[idx] = entry;
                    set({ myBids: updated });
                } else {
                    set({ myBids: [entry, ...myBids] });
                }
            },

            setAutoBid: (autoBid) =>
                set((state) => ({
                    myAutoBids: { ...state.myAutoBids, [autoBid.auctionId]: autoBid },
                })),

            cancelAutoBid: (auctionId) =>
                set((state) => {
                    const newAutoBids = { ...state.myAutoBids };
                    delete newAutoBids[auctionId];
                    return { myAutoBids: newAutoBids };
                }),

            toggleWatch: (auctionId) =>
                set((state) => ({
                    watchedAuctionIds: state.watchedAuctionIds.includes(auctionId)
                        ? state.watchedAuctionIds.filter((id) => id !== auctionId)
                        : [...state.watchedAuctionIds, auctionId],
                })),

            setNotificationSettings: (settings) =>
                set((state) => ({
                    notificationSettings: { ...state.notificationSettings, ...settings },
                })),

            markOutbid: (auctionId) =>
                set((state) => ({
                    recentlyOutbidIds: state.recentlyOutbidIds.includes(auctionId)
                        ? state.recentlyOutbidIds
                        : [...state.recentlyOutbidIds, auctionId],
                })),

            clearOutbid: (auctionId) =>
                set((state) => ({
                    recentlyOutbidIds: state.recentlyOutbidIds.filter((id) => id !== auctionId),
                })),
        }),
        {
            name: 'kicksneak-auction-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                watchedAuctionIds: state.watchedAuctionIds,
                notificationSettings: state.notificationSettings,
                myAutoBids: state.myAutoBids,
            }),
        }
    )
);