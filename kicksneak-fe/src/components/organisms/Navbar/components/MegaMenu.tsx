import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavbarCategory } from '../../../../types/product';
import styles from './MegaMenu.module.css';

interface MegaMenuProps {
    category: NavbarCategory;
    onClose: () => void;
}

export const MegaMenu = ({ category, onClose }: MegaMenuProps) => {
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div ref={ref} className={styles.menu}>
            <div className={styles.grid}>
                {category.columns.map((col) => (
                    <div key={col.title} className={styles.column}>
                        <span className={styles.colTitle}>{col.title}</span>
                        <ul className={styles.list}>
                            {col.items.map((item) => (
                                <li key={item.href}>
                                    <button
                                        className={styles.link}
                                        onClick={() => { navigate(item.href); onClose(); }}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};