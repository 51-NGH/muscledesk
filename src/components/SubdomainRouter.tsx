interface SubdomainRouterProps {
  children: React.ReactNode;
}

// For now, just pass through - subdomain routing will be enabled when custom domains are added
// Current routing: /member/* → Member Portal, everything else → Admin
export const SubdomainRouter = ({ children }: SubdomainRouterProps) => {
  return <>{children}</>;
};
