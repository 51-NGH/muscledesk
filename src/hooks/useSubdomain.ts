import { useMemo } from 'react';

export type SubdomainType = 'admin' | 'member' | 'unknown';

export const useSubdomain = (): SubdomainType => {
  return useMemo(() => {
    const hostname = window.location.hostname;
    
    // Check for member subdomain
    if (hostname.startsWith('member.')) {
      return 'member';
    }
    
    // Check for admin subdomain (app.) or localhost for development
    if (hostname.startsWith('app.') || hostname === 'localhost' || hostname.includes('lovable.app')) {
      return 'admin';
    }
    
    // Default to admin for unknown subdomains
    return 'admin';
  }, []);
};

export const getSubdomainType = (): SubdomainType => {
  const hostname = window.location.hostname;
  
  if (hostname.startsWith('member.')) {
    return 'member';
  }
  
  if (hostname.startsWith('app.') || hostname === 'localhost' || hostname.includes('lovable.app')) {
    return 'admin';
  }
  
  return 'admin';
};
