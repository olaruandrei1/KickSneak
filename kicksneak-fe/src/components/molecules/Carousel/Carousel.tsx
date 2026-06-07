import {
    useRef,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import styles from './Carousel.module.css';

interface CarouselProps {
    children: ReactNode[];
    title?: string;
}

export const Carousel = ({ children, title }: CarouselProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollStart = useRef(0);

    const updateArrows = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        updateArrows();
        el.addEventListener('scroll', updateArrows, { passive: true });
        const ro = new ResizeObserver(updateArrows);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', updateArrows);
            ro.disconnect();
        };
    }, [children, updateArrows]);

    const scroll = (dir: 'left' | 'right') => {
        const el = trackRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.75;
        el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        startX.current = e.pageX;
        scrollStart.current = trackRef.current?.scrollLeft ?? 0;
        trackRef.current?.classList.add(styles.dragging);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.pageX - startX.current;
        if (trackRef.current) trackRef.current.scrollLeft = scrollStart.current - dx;
    };

    const onMouseUp = () => {
        isDragging.current = false;
        trackRef.current?.classList.remove(styles.dragging);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].pageX;
        scrollStart.current = trackRef.current?.scrollLeft ?? 0;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        const dx = e.touches[0].pageX - startX.current;
        if (trackRef.current) trackRef.current.scrollLeft = scrollStart.current - dx;
    };

    const showArrows = canLeft || canRight;

    return (
        <div className={styles.wrapper}>
            {title && <h2 className={styles.title}>{title}</h2>}

            <div className={styles.inner}>
                {showArrows && (
                    <button
                        className={`${styles.arrow} ${styles.arrowLeft} ${!canLeft ? styles.arrowHidden : ''}`}
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M15 18l-6-6 6-6" stroke="currentColor"
                                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}

                <div
                    ref={trackRef}
                    className={styles.track}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                >
                    {children.map((child, i) => (
                        <div key={i} className={styles.item}>
                            {child}
                        </div>
                    ))}
                </div>

                {showArrows && (
                    <button
                        className={`${styles.arrow} ${styles.arrowRight} ${!canRight ? styles.arrowHidden : ''}`}
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M9 18l6-6-6-6" stroke="currentColor"
                                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};