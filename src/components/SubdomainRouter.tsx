import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSubdomainType } from '@/hooks/useSubdomain';

interface SubdomainRouterProps {
  children: ReactNode;
}

// Routes users based on their domain
// members.muscledesk.online → Member Portal routes only
// admin.muscledesk.online → Admin Portal routes only
export const SubdomainRouter = ({ children }: SubdomainRouterProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const subdomainType = getSubdomainType();
  const path = location.pathname;

  useEffect(() => {
    // Check if path is a member portal route (not /members which is admin)
    const isMemberPortalRoute = path === '/member' || path.startsWith('/member/');
    
    // On member domain, redirect non-member routes to member login
    if (subdomainType === 'member') {
      if (!isMemberPortalRoute) {
        navigate('/member/login', { replace: true });
        return;
      }
    }

    // On admin domain, redirect member portal routes to admin login
    if (subdomainType === 'admin') {
      if (isMemberPortalRoute) {
        navigate('/login', { replace: true });
        return;
      }
    }

    setIsReady(true);
  }, [subdomainType, path, navigate]);

  const isMemberPortalRoute = path === '/member' || path.startsWith('/member/');

  // Show loading while redirecting
  if (!isReady && subdomainType === 'member' && !isMemberPortalRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading Member Portal...</p>
        </div>
      </div>
    );
  }

  if (!isReady && subdomainType === 'admin' && isMemberPortalRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
