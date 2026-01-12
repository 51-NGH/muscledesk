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
  
  // Debug logging - will help us see what domain is being detected
  console.log('[SubdomainRouter] Hostname detected:', hostname);
  console.log('[SubdomainRouter] Full URL:', window.location.href);
  
  // Check for member custom domains - exact match
  if (MEMBER_DOMAINS.includes(hostname)) {
    console.log('[SubdomainRouter] Matched MEMBER domain');
    return 'member';
  }
  
  // Check for member subdomain pattern
  if (hostname.startsWith('member.') || hostname.startsWith('members.')) {
    console.log('[SubdomainRouter] Matched member subdomain pattern');
    return 'member';
  }
  
  // Check for admin custom domains - exact match
  if (ADMIN_DOMAINS.includes(hostname)) {
    console.log('[SubdomainRouter] Matched ADMIN domain');
    return 'admin';
  }
  
  // Check for admin subdomain (app.) or localhost for development
  if (hostname.startsWith('app.') || hostname.startsWith('admin.')) {
    console.log('[SubdomainRouter] Matched admin subdomain pattern');
    return 'admin';
  }
  
  // Development environments - default to admin
  if (hostname === 'localhost' || hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
    console.log('[SubdomainRouter] Development environment - defaulting to admin');
    return 'admin';
  }
  
  console.log('[SubdomainRouter] No match - defaulting to admin');
  // Default to admin for unknown subdomains
  return 'admin';
};

export const isMemberDomain = (): boolean => {
  return getSubdomainType() === 'member';
};

export const isAdminDomain = (): boolean => {
  return getSubdomainType() === 'admin';
};
