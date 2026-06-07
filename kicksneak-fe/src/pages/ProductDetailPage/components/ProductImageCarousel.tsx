import { useState } from 'react';
import styles from './ProductImageCarousel.module.css';

interface ProductImageCarouselProps {
    images: string[];
    name: string;
}

export const ProductImageCarousel = ({ images, name }: ProductImageCarouselProps) => {
    const [active, setActive] = useState(0);
    const [zoomed, setZoomed] = useState(false);

    const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
    const next = () => setActive((i) => (i + 1) % images.length);

    return (
        <div className={styles.wrapper}>
            <div
                className={`${styles.main} ${zoomed ? styles.zoomed : ''}`}
                onClick={() => setZoomed((z) => !z)}
            >
                <img
                    src={images[active]}
                    alt={`${name} - view ${active + 1}`}
                    className={styles.mainImg}
                    draggable={false}
                />
                {images.length > 1 && (
                    <>
                        <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={(e) => { e.stopPropagation(); prev(); }}>
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={(e) => { e.stopPropagation(); next(); }}>
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </>
                )}
                <div className={styles.dots}>
                    {images.map((_, i) => (
                        <button
                            key={i}
                            className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActive(i); }}
                        />
                    ))}
                </div>
            </div>

            <div className={styles.thumbs}>
                {images.map((img, i) => (
                    <button
                        key={i}
                        className={`${styles.thumb} ${i === active ? styles.thumbActive : ''}`}
                        onClick={() => setActive(i)}
                    >
                        <img src={img} alt={`thumb ${i + 1}`} />
                    </button>
                ))}
            </div>
        </div>
    );
};