import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductItem } from '../../../types/product';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { useCartStore } from '../../../store/cartStore';
import { Tooltip, Chip } from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ShoppingBag as ShoppingBagIcon,
  DeleteOutlined as DeleteOutlineIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import styles from './ProductCard.module.css';

interface ProductCardProps {
    item: ProductItem;
    mode?: 'grid' | 'list';
    showCartAction?: boolean;
    showDeleteAction?: boolean;
    onDelete?: (id: string) => void;
    onCartAdd?: () => void; 
}

export const ProductCard = ({
    item,
    mode = 'grid',
    showCartAction = false,
    showDeleteAction = false,
    onDelete,
    onCartAdd
}: ProductCardProps) => {
    const navigate = useNavigate();
    const { toggleFavorite, isFavorite } = useFavoritesStore();
    const { addItem } = useCartStore();
    const [imgLoaded, setImgLoaded] = useState(false);
    const [hovered, setHovered] = useState(false);
    const fav = isFavorite(item.id);

    const handleCardClick = () => navigate(`/product/${item.id}`);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCartAdd) {
            onCartAdd();
        } else {
            navigate(`/product/${item.id}`);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        // The page callback (e.g. FavoritesPage) already toggles the favorite —
        // calling both would toggle twice and instantly re-add the item.
        if (onDelete) onDelete(item.id);
        else toggleFavorite(item);
    };

    if (mode === 'list') {
        return (
            <div
                className={`${styles.card} ${styles.listCard}`}
                onClick={handleCardClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
            >
                <div className={styles.listImageWrap}>
                    {!imgLoaded && <div className={styles.imageSkeleton} />}
                    <img
                        src={item.image}
                        alt={item.name}
                        className={`${styles.image} ${imgLoaded ? styles.imageLoaded : ''}`}
                        onLoad={() => setImgLoaded(true)}
                    />
                    {item.isNew && <span className={styles.badgeNew}>NEW</span>}
                </div>

                <div className={styles.listInfo}>
                    <span className={styles.brand}>{item.brand}</span>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.category}>{item.category}</span>
                    <div className={styles.footer}>
                        <div>
                            <span className={styles.priceLabel}>Lowest Ask</span>
                            <span className={styles.price}>${item.price}</span>
                        </div>
                        {item.sold != null && (
                            <span className={styles.sold}>{item.sold.toLocaleString()} sold</span>
                        )}
                    </div>
                </div>

                {/* Actions overlay — list mode */}
                <div className={`${styles.listActions} ${hovered ? styles.listActionsVisible : ''}`}>
                    {showCartAction && (
                        <Tooltip title="Add to cart">
                            <button className={styles.actionBtn} onClick={handleAddToCart}>
                                <ShoppingBagIcon fontSize="small" />
                            </button>
                        </Tooltip>
                    )}
                    {showDeleteAction && (
                        <Tooltip title="Remove from favorites">
                            <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} onClick={handleDelete}>
                                <DeleteOutlineIcon fontSize="small" />
                            </button>
                        </Tooltip>
                    )}
                    {!showCartAction && !showDeleteAction && (
                        <Tooltip title={fav ? 'Remove from favorites' : 'Add to favorites'}>
                            <button
                                className={`${styles.actionBtn} ${fav ? styles.favActive : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                            >
                                {fav ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>
        );
    }

    // Grid mode
    return (
        <div
            className={styles.card}
            onClick={handleCardClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        >
            <div className={styles.imageWrap}>
                {!imgLoaded && <div className={styles.imageSkeleton} />}
                <img
                    src={item.image}
                    alt={item.name}
                    className={`${styles.image} ${imgLoaded ? styles.imageLoaded : ''}`}
                    onLoad={() => setImgLoaded(true)}
                />
                {item.isNew && <span className={styles.badgeNew}>NEW</span>}

                {/* Hover overlay cu actiuni (favorites page) */}
                {(showCartAction || showDeleteAction) && (
                    <div className={`${styles.gridOverlay} ${hovered ? styles.gridOverlayVisible : ''}`}>
                        {showCartAction && (
                            <Tooltip title="Add to cart">
                                <button className={styles.overlayBtn} onClick={handleAddToCart}>
                                    <ShoppingBagIcon />
                                </button>
                            </Tooltip>
                        )}
                        {showDeleteAction && (
                            <Tooltip title="Remove from favorites">
                                <button className={`${styles.overlayBtn} ${styles.overlayBtnDelete}`} onClick={handleDelete}>
                                    <DeleteOutlineIcon />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                )}

                {!showCartAction && !showDeleteAction && (
                    <button
                        className={`${styles.favBtn} ${fav ? styles.favActive : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        {fav ? <FavoriteIcon sx={{ fontSize: 16 }} /> : <FavoriteBorderIcon sx={{ fontSize: 16 }} />}
                    </button>
                )}
            </div>

            <div className={`${styles.info} ${(showCartAction || showDeleteAction) && hovered ? styles.infoHidden : ''}`}>
                <span className={styles.brand}>{item.brand}</span>
                <span className={styles.name}>{item.name}</span>
                <div className={styles.footer}>
                    <span className={styles.priceLabel}>Lowest Ask</span>
                    <span className={styles.price}>${item.price}</span>
                </div>
                {item.sold != null && (
                    <span className={styles.sold}>{item.sold.toLocaleString()} sold</span>
                )}
            </div>
        </div>
    );
};