import { create } from 'zustand';

interface NavState {
    favoritesOpen: boolean;
    cartOpen: boolean;
    notificationsOpen: boolean;
    searchOpenMobile: boolean;
    megaMenuOpenMobile: boolean;
    activeMegaMenu: string | null;
    setFavoritesOpen: (v: boolean) => void;
    setCartOpen: (v: boolean) => void;
    setNotificationsOpen: (v: boolean) => void;
    setSearchOpenMobile: (v: boolean) => void;
    setMegaMenuOpenMobile: (v: boolean) => void;
    setActiveMegaMenu: (id: string | null) => void;
}

export const useNavStore = create<NavState>((set) => ({
    favoritesOpen: false,
    cartOpen: false,
    notificationsOpen: false,
    searchOpenMobile: false,
    megaMenuOpenMobile: false,
    activeMegaMenu: null,
    setFavoritesOpen: (v) => set({ favoritesOpen: v, cartOpen: false, notificationsOpen: false }),
    setCartOpen: (v) => set({ cartOpen: v, favoritesOpen: false, notificationsOpen: false }),
    setNotificationsOpen: (v) => set({ notificationsOpen: v, favoritesOpen: false, cartOpen: false }),
    setSearchOpenMobile: (v) => set({ searchOpenMobile: v }),
    setMegaMenuOpenMobile: (v) => set({ megaMenuOpenMobile: v }),
    setActiveMegaMenu: (id) => set({ activeMegaMenu: id }),
}));