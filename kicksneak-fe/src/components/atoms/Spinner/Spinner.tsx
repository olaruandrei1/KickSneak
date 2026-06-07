import styles from './Spinner.module.css';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    fullPage?: boolean;
}

export const Spinner = ({ size = 'md', fullPage = false }: SpinnerProps) => {
    return (
        <div className={`${styles.wrapper} ${fullPage ? styles.fullPage : ''}`}>
            <div className={`${styles.ring} ${styles[size]}`}>
                <div /><div /><div /><div />
            </div>
        </div>
    );
};