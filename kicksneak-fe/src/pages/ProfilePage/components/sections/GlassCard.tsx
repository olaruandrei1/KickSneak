import type { ReactNode } from 'react';
import styles from './GlassCard.module.css';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    noPadding?: boolean;
    onClick?: () => void;
}

export const GlassCard = ({ children, className = '', noPadding = false, onClick }: GlassCardProps) => (
    <div
        className={`${styles.card} ${noPadding ? styles.noPadding : ''} ${className} ${onClick ? styles.clickable : ''}`}
        onClick={onClick}
    >
        {children}
    </div>
);