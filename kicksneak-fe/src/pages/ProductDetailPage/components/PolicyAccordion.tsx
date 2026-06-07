import { useState } from 'react';
import { Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import type { ProductDetail } from '../../../types/product';
import styles from './PolicyAccordion.module.css';

interface PolicyAccordionProps {
    policies: ProductDetail['policies'];
}

type PolicyKey = 'returnPolicy' | 'buyerPromise' | 'ourProcess';

const ICONS: Record<PolicyKey, string> = {
    returnPolicy: '↩',
    buyerPromise: '🛡',
    ourProcess: '⚙',
};

export const PolicyAccordion = ({ policies }: PolicyAccordionProps) => {
    const [open, setOpen] = useState<PolicyKey | null>(null);

    const toggle = (key: PolicyKey) =>
        setOpen((prev) => (prev === key ? null : key));

    const entries: { key: PolicyKey; title: string; badge?: string; content: string }[] = [
        { key: 'returnPolicy', title: policies.returnPolicy.title, badge: policies.returnPolicy.badge, content: policies.returnPolicy.content },
        { key: 'buyerPromise', title: policies.buyerPromise.title, content: policies.buyerPromise.content },
        { key: 'ourProcess', title: policies.ourProcess.title, badge: `Condition: ${policies.ourProcess.condition}`, content: policies.ourProcess.content },
    ];

    return (
        <div className={styles.wrapper}>
            {entries.map(({ key, title, badge, content }) => (
                <div key={key} className={styles.item}>
                    <button className={styles.header} onClick={() => toggle(key)}>
                        <span className={styles.icon}>{ICONS[key]}</span>
                        <span className={styles.title}>{title}</span>
                        <span className={styles.badge}>{badge}</span>
                        {open === key
                            ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)', ml: 'auto' }} />
                            : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)', ml: 'auto' }} />
                        }
                    </button>
                    <Collapse in={open === key}>
                        <div className={styles.content}>
                            <p>{content}</p>
                        </div>
                    </Collapse>
                </div>
            ))}
        </div>
    );
};