import { useEffect, useState } from 'react';
import { localStorageService } from '../../../services/localStorageService';
import styles from './ThemeTutorialOverlay.module.css';

export const ThemeTutorialOverlay = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const seen = localStorageService.get<boolean>('theme_tutorial_seen');
        if (!seen) setVisible(true);
    }, []);

    const dismiss = () => {
        localStorageService.set('theme_tutorial_seen', true);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={styles.backdrop} onClick={dismiss}>
            <div className={styles.spotlight} />
            <div className={styles.tooltip}>
                <p>Toggle between <strong>Dark</strong> and <strong>Light</strong> theme</p>
                <span className={styles.hint}>Tap anywhere to dismiss</span>
            </div>
        </div>
    );
};