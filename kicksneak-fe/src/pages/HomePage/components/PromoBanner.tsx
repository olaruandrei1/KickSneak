import { useNavigate } from 'react-router-dom';
import styles from './PromoBanner.module.css';

interface PromoBannerProps {
    type: 'image' | 'video';
    src: string;
    title: string;
    subtitle?: string;
    href: string;
}

export const PromoBanner = ({
    type,
    src,
    title,
    subtitle,
    href,
}: PromoBannerProps) => {
    const navigate = useNavigate();

    return (
        <div className={styles.banner} onClick={() => navigate(href)}>
            {type === 'video' ? (
                <video
                    className={styles.media}
                    src={src}
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            ) : (
                <img className={styles.media} src={src} alt={title} />
            )}
            <div className={styles.overlay}>
                <div className={styles.content}>
                    <h3 className={styles.title}>{title}</h3>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    <span className={styles.cta}>Shop Now →</span>
                </div>
            </div>
        </div>
    );
};