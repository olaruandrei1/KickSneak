import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import styles from './CheckoutPage.module.css';

const CheckoutSuccessPage = () => {
    const navigate = useNavigate();
    const { clearCart } = useCartStore();

    useEffect(() => {
        clearCart();
    }, []);

    return (
        <div className={styles.successPage}>
            <div className={styles.successCard}>
                <span className={styles.successIcon}>✓</span>
                <h2 className={styles.successTitle}>Payment Successful!</h2>
                <p className={styles.successMsg}>
                    Your order is confirmed and being processed.
                    You'll receive a confirmation email shortly.
                </p>
                <div className={styles.successActions}>
                    <button className={styles.continueBtn} onClick={() => navigate('/')}>
                        Continue Shopping
                    </button>
                    <button className={styles.ordersBtn} onClick={() => navigate('/profile?section=orders')}>
                        View Orders
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccessPage;