import type { ReactNode } from 'react';
import { Carousel } from '../../../components/molecules/Carousel/Carousel';
import { PromoBanner } from './PromoBanner';
import styles from './CarouselSection.module.css';

interface CarouselSectionProps {
    title: string;
    children: ReactNode[];
    sectionIndex: number; 
}

const PROMOS = [
    {
        type: 'image' as const,
        src: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1400&q=80',
        title: 'New Season Drops',
        subtitle: 'The freshest kicks, just landed.',
        href: '/new',
    },
    {
        type: 'image' as const,
        src: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1400&q=80',
        title: 'Steals & Deals',
        subtitle: 'Premium sneakers below retail.',
        href: '/deals',
    },
    {
        type: 'image' as const,
        src: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1400&q=80',
        title: 'Become a Seller',
        subtitle: 'Turn your collection into cash.',
        href: '/become-seller',
    },
];

export const CarouselSection = ({
    title,
    children,
    sectionIndex,
}: CarouselSectionProps) => {
    const showBanner = (sectionIndex + 1) % 3 === 0;
    const promoIndex = Math.floor(sectionIndex / 3) % PROMOS.length;

    return (
        <div className={styles.wrapper}>
            <Carousel title={title}>
                {children}
            </Carousel>
            {showBanner && (
                <PromoBanner {...PROMOS[promoIndex]} />
            )}
        </div>
    );
};