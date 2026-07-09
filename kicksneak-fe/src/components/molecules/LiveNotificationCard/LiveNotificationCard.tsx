import React, { useEffect, useState } from 'react';
import styles from './LiveNotificationCard.module.css';

interface LiveNotificationCardProps {
    title: string;
    message: string;
    onClick?: () => void;
    onClose: () => void;
}

export const LiveNotificationCard: React.FC<LiveNotificationCardProps> = ({ title, message, onClick, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setVisible(true));

        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // Wait for exit animation
        }, 6000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`${styles.card} ${visible ? styles.visible : styles.hidden}`} onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }}>
            <div className={styles.header}>
                <div className={styles.brand}>
                    <div className={styles.dot}></div>
                    <span>KICKSNEAK APP</span>
                </div>
                <span className={styles.time}>acum</span>
            </div>
            <div className={styles.content}>
                <h4 className={styles.title}>{title}</h4>
                <p className={styles.message}>{message}</p>
            </div>
        </div>
    );
};
