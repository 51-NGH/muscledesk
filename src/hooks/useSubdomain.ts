import { useMemo } from 'react';

export type SubdomainType = 'admin' | 'member' | 'unknown';

// Custom domain configurations
const MEMBER_DOMAINS = ['members.muscledesk.online', 'member.muscledesk.online'];
const ADMIN_DOMAINS = ['admin.muscledesk.online', 'app.muscledesk.online'];

export const useSubdomain = (): SubdomainType => {
  return useMemo(() => {
    return getSubdomainType();
  }, []);
};

export const getSubdomainType = (): SubdomainType => {
  const hostname = window.location.hostname.toLowerCase();
  
  // Check for member custom domains
  if (MEMBER_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
    return 'member';
  }
  
  // Check for member subdomain pattern
  if (hostname.startsWith('member.') || hostname.startsWith('members.')) {
    return 'member';
  }
  
  // Check for admin custom domains
  if (ADMIN_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
    return 'admin';
  }
  
  // Check for admin subdomain (app.) or localhost for development
  if (hostname.startsWith('app.') || hostname.startsWith('admin.')) {
    return 'admin';
  }
  
  // Development environments
  if (hostname === 'localhost' || hostname.includes('lovable.app')) {
    return 'admin';
  }
  
  // Default to admin for unknown subdomains
  return 'admin';
};

export const isMemberDomain = (): boolean => {
  return getSubdomainType() === 'member';
};

export const isAdminDomain = (): boolean => {
  return getSubdomainType() === 'admin';
};
