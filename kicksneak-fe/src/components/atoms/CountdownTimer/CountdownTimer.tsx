import { useEffect, useState, type CSSProperties } from 'react';
import { formatTimeRemaining } from '../../../services/bidIncrementService';
import styles from './CountdownTimer.module.css';

interface CountdownTimerProps {
    endsAt: string;
    size?: 'sm' | 'md' | 'lg';
    showPrefix?: boolean;
    onEnd?: () => void;
    className?: string;
    style?: CSSProperties;
}

const CountdownTimer = ({
    endsAt,
    size = 'md',
    showPrefix = false,
    onEnd,
    className,
    style,
}: CountdownTimerProps) => {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const { text, isUrgent, isFinalMinute, hasEnded } = formatTimeRemaining(endsAt);

    useEffect(() => {
        if (hasEnded) onEnd?.();
    }, [hasEnded, onEnd]);

    void tick;

    const classes = [
        styles.timer,
        styles[`size-${size}`],
        isUrgent && styles.urgent,
        isFinalMinute && styles.finalMinute,
        hasEnded && styles.ended,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes} style={style} aria-live={isFinalMinute ? 'polite' : 'off'}>
            {showPrefix && !hasEnded && <span className={styles.prefix}>Ends in</span>}
            <span className={styles.value}>{text}</span>
        </span>
    );
};

export default CountdownTimer;