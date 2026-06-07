import { useEffect, useState } from 'react';
import { useResponsiveStore } from '../../../services/responsiveObserver';
import { cachedFetch } from '../../../services/cachedFetchService';
import { ApiRoutes } from '../../../services/apiRoutes';
import type { NavbarCategory } from '../../../types/product';
import { NavDesktop } from './components/NavDesktop';
import { NavMobile } from './components/NavMobile';
import { NavTablet } from './components/NavTablet';

export const Navbar = () => {
    const { isMobile, isTablet } = useResponsiveStore();
    const [categories, setCategories] = useState<NavbarCategory[]>([]);

    useEffect(() => {
        cachedFetch<NavbarCategory[]>({
            key: 'navbar_categories',
            url: ApiRoutes.navbarCategories,
            onData: (data) => setCategories(data),
        });
    }, []);

    if (isMobile) return <NavMobile categories={categories} />;
    if (isTablet) return <NavTablet categories={categories} />;
    return <NavDesktop categories={categories} />;
};