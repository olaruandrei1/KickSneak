import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { useAuthStore } from '../store/authStore';
import { ProtectedRoute } from './ProtectedRoute';
import { Navbar } from '../components/organisms/Navbar/Navbar';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { HomePage } from '../pages/HomePage/HomePage';
import { CartPage } from '../pages/CartPage/CartPage';
import { FavoritesPage } from '../pages/FavoritesPage/FavoritesPage';
import { SearchResultsPage } from '../pages/SearchResultsPage/SearchResultsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage/ProductDetailPage';
import { Footer } from '../components/organisms/Footer/Footer';
import { NotificationToast } from '../components/atoms/NotificationsToast/NotificationsToast';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { ThemeToggle } from '../components/atoms/ThemeToggle/ThemmeToggle';
import AuctionsPage from '../pages/AuctionsPage/AuctionsPage';
import AuctionDetailPage from '../pages/AuctionDetailPage/AuctionDetailPage';
import CheckoutPage from '../pages/CheckoutPage/CheckoutPage';
import { BrandsPage } from '../pages/BrandsPage/BrandsPage';
import { useFavoritesStore } from '../store/favoritesStore';
import CheckoutSuccessPage from '../pages/CheckoutPage/CheckoutSuccessPage';

const PublicLayout = () => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Navbar />
    <div style={{ flex: 1 }}>
      <Outlet />
    </div>
    <Footer />
    <ThemeToggle />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

const AuthWatcher = () => {
    const { setUser, setInitialized } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = firebaseService.onAuthChanged((user) => {
            setUser(user);
            setInitialized(true);
            if (user) {
                useFavoritesStore.getState().fetchFavorites();
                if (window.location.pathname === '/login') {
                    navigate('/', { replace: true });
                }
            }
        });
        return unsub;
    }, []);

    return null;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <AuthWatcher />
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/sneakers" element={<SearchResultsPage />} />
          <Route path="/new" element={<SearchResultsPage />} />
          <Route path="/deals" element={<SearchResultsPage />} />
          <Route path="/deals/*" element={<SearchResultsPage />} />
          <Route path="/brand/:slug" element={<SearchResultsPage />} />
          <Route path="/category/:slug" element={<SearchResultsPage />} />
          <Route path="/men" element={<SearchResultsPage />} />
          <Route path="/women" element={<SearchResultsPage />} />
          <Route path="/kids" element={<SearchResultsPage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/terms" element={<div style={{ padding: '80px 32px', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>Terms & Conditions — coming soon.</div>} />
          <Route path="/about" element={<div style={{ padding: '80px 32px', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>About KickSneak — coming soon.</div>} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationToast />
    </BrowserRouter>
  );
};