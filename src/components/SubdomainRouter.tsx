import { Navigate, useLocation } from 'react-router-dom';
import { getSubdomainType } from '@/hooks/useSubdomain';

interface SubdomainRouterProps {
  children: React.ReactNode;
}

// Routes users based on their domain
// members.muscledesk.online → Member Portal routes only
// admin.muscledesk.online → Admin Portal routes only
export const SubdomainRouter = ({ children }: SubdomainRouterProps) => {
  const location = useLocation();
  const subdomainType = getSubdomainType();
  const path = location.pathname;

  // On member domain, redirect non-member routes to member dashboard
  if (subdomainType === 'member') {
    if (!path.startsWith('/member')) {
      return <Navigate to="/member" replace />;
    }
  }

  // On admin domain, redirect member routes to admin dashboard
  if (subdomainType === 'admin') {
    if (path.startsWith('/member')) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
