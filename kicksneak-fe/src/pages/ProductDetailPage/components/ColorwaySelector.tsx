import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColorwayOption } from '../../../types/product';
import { AppModal } from '../../../components/molecules/AppModal/AppModal';
import { Check } from '@mui/icons-material';
import styles from './ColorwaySelector.module.css';

interface ColorwaySelectorProps {
    colorways: ColorwayOption[];
    activeId: string;
}

const VISIBLE = 5;

export const ColorwaySelector = ({ colorways, activeId }: ColorwaySelectorProps) => {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);

    const visible = colorways.slice(0, VISIBLE);

    return (
        <div className={styles.wrapper}>
            <div className={styles.chips}>
                {visible.map((c) => (
                    <button
                        key={c.id}
                        className={`${styles.chip} ${c.id === activeId ? styles.chipActive : ''}`}
                        onClick={() => navigate(`/product/${c.id}`)}
                        title={c.name}
                    >
                        <img src={c.image} alt={c.name} className={styles.chipImg} />
                    </button>
                ))}
                {colorways.length > VISIBLE && (
                    <button className={styles.seeAll} onClick={() => setModalOpen(true)}>
                        See All
                    </button>
                )}
            </div>

            <AppModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Select a Style"
                maxWidth="xs"
                fullHeight
            >
                <div className={styles.modalList}>
                    {colorways.map((c) => (
                        <button
                            key={c.id}
                            className={`${styles.modalItem} ${c.id === activeId ? styles.modalItemActive : ''}`}
                            onClick={() => { navigate(`/product/${c.id}`); setModalOpen(false); }}
                        >
                            <img src={c.image} alt={c.name} className={styles.modalImg} />
                            <div className={styles.modalInfo}>
                                <span className={styles.modalName}>{c.name}</span>
                                <span className={styles.modalPrice}>${c.price}</span>
                            </div>
                            {c.id === activeId && (
                                <Check sx={{ fontSize: 18, color: 'var(--color-accent)', ml: 'auto' }} />
                            )}
                        </button>
                    ))}
                </div>
            </AppModal>
        </div>
    );
};