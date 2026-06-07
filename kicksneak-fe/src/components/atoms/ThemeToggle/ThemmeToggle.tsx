import { useThemeStore } from '../../../store/themeStore';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
    onFirstToggle?: () => void;
}

export const ThemeToggle = ({ onFirstToggle }: ThemeToggleProps) => {
    const { theme, toggleTheme } = useThemeStore();

    const handleClick = () => {
        toggleTheme();
        onFirstToggle?.();
    };

    return (
        <button
            className={styles.toggle}
            onClick={handleClick}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        >
            <span className={styles.icon}>
                {theme === 'dark' ? '☀️' : '🌙'}
            </span>
        </button>
    );
};