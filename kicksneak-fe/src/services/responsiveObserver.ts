import { create } from 'zustand';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const getBreakpoint = (): Breakpoint => {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
};

interface ResponsiveState {
    breakpoint: Breakpoint;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
}

export const useResponsiveStore = create<ResponsiveState>(() => {
    const bp = getBreakpoint();
    return {
        breakpoint: bp,
        isMobile: bp === 'mobile',
        isTablet: bp === 'tablet',
        isDesktop: bp === 'desktop',
    };
});

export function initResponsiveObserver(): () => void {
    const handler = () => {
        const bp = getBreakpoint();
        useResponsiveStore.setState({
            breakpoint: bp,
            isMobile: bp === 'mobile',
            isTablet: bp === 'tablet',
            isDesktop: bp === 'desktop',
        });
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
}