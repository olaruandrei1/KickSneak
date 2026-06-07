import { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import type { UserProfile } from '../../../../types/profile';
import styles from './SellerReturnsSection.module.css';

interface SellerReturn {
    id: string; orderId: string; buyerName: string;
    itemName: string; size: string; price: number;
    reason: string; description?: string; status: string;
    date: string; isUsedItem: boolean;
}

interface Props {
    profile: UserProfile;
    onProfileUpdate: (p: UserProfile) => void;
}

const STATUS_COLOR: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#22c55e',
    rejected: '#ef4444',
};

export const SellerReturnsSection = ({ }: Props) => {
    const [returns, setReturns] = useState<SellerReturn[]>([]);

    useEffect(() => {
        httpClient.get<{ items: SellerReturn[] }>(ApiRoutes.sellerReturns)
            .then(r => setReturns(r.data.items))
            .catch(() => {});
    }, []);

    const handleReturn = async (returnId: string, approve: boolean) => {
        try {
            await httpClient.post(ApiRoutes.sellerHandleReturn(returnId), { approve });
            setReturns(prev => prev.map(r =>
                r.id === returnId
                    ? { ...r, status: approve ? 'approved' : 'rejected' }
                    : r
            ));
        } catch { }
    };

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>Seller Returns</h2>
            {returns.length === 0 ? (
                <GlassCard>
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                        No returns to review
                    </p>
                </GlassCard>
            ) : (
                <div className={styles.list}>
                    {returns.map(r => (
                        <GlassCard key={r.id}>
                            <div className={styles.returnHeader}>
                                <div>
                                    <span className={styles.itemName}>
                                        {r.itemName}
                                        {r.isUsedItem && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginLeft: 6 }}>(Used)</span>}
                                    </span>
                                    <span className={styles.itemMeta}>
                                        Size: {r.size} · ${r.price} · {new Date(r.date).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                                <span className={styles.status} style={{
                                    color: STATUS_COLOR[r.status],
                                    background: `${STATUS_COLOR[r.status]}18`
                                }}>
                                    {r.status}
                                </span>
                            </div>
                            <div className={styles.returnBody}>
                                <span className={styles.buyerLabel}>Buyer: <strong>{r.buyerName}</strong></span>
                                <span className={styles.reasonLabel}>Reason: <strong>{r.reason}</strong></span>
                            </div>
                            {r.status === 'pending' && (
                                <div className={styles.returnActions}>
                                    <button className={`${styles.actionBtn} ${styles.approveBtn}`}
                                        onClick={() => handleReturn(r.id, true)}>
                                        Approve Return
                                    </button>
                                    <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                        onClick={() => handleReturn(r.id, false)}>
                                        Reject
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};