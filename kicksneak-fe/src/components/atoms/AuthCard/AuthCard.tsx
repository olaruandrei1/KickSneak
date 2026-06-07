import type { ReactNode } from 'react';
import styles from './AuthCard.module.css';

interface AuthCardProps {
    children: ReactNode;
    provider?: string;
    avatarUrl?: string | null;
    email?: string | null;
    displayName?: string | null;
}

export const AuthCard = ({
    children,
    provider,
    avatarUrl,
    email,
    displayName,
}: AuthCardProps) => {
    return (
        <div className={styles.card}>
            {avatarUrl && (
                <img src={avatarUrl} alt="avatar" className={styles.avatar} referrerPolicy="no-referrer"/>
            )}
            {displayName && <p className={styles.name}>{displayName}</p>}
            {email && <p className={styles.email}>{email}</p>}
            {provider && (
                <span className={styles.badge}>{provider}</span>
            )}
            <div className={styles.content}>{children}</div>
        </div>
    );
};