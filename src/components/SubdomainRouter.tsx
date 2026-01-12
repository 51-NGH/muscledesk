import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSubdomainType } from '@/hooks/useSubdomain';

interface SubdomainRouterProps {
  children: React.ReactNode;
}

export const SubdomainRouter = ({ children }: SubdomainRouterProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const subdomainType = getSubdomainType();

  useEffect(() => {
    const path = location.pathname;

    // If on member subdomain and not on a member route, redirect to member portal
    if (subdomainType === 'member') {
      if (!path.startsWith('/member')) {
        navigate('/member/login', { replace: true });
      }
    }
    
    // If on admin subdomain and trying to access member routes, redirect to admin
    if (subdomainType === 'admin') {
      if (path.startsWith('/member')) {
        // Allow member routes on admin domain for testing purposes
        // Remove this condition if you want strict separation
      }
    }
  }, [subdomainType, location.pathname, navigate]);

  return <>{children}</>;
};
