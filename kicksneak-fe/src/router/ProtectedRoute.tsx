import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/atoms/Spinner/Spinner';

const GUARDS_ENABLED = import.meta.env.VITE_GUARDS_ENABLED === 'true';

export const ProtectedRoute = () => {
  const { user, initialized } = useAuthStore();

  if (!GUARDS_ENABLED) return <Outlet />;
  if (!initialized)   return <Spinner fullPage size="lg" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};