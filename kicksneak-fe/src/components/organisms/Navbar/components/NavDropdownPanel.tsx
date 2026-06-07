import type { ReactNode } from 'react';
import styles from './NavDropdownPanel.module.css';

interface NavDropdownPanelProps {
    children: ReactNode;
    onClose: () => void;
    title: string;
}

export const NavDropdownPanel = ({ children, title }: NavDropdownPanelProps) => {
    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
            </div>
            <div className={styles.body}>{children}</div>
        </div>
    );
};