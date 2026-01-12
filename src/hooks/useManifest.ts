import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to dynamically load the appropriate PWA manifest based on current route
 * - /member/* routes → Member Portal manifest
 * - All other routes → Admin manifest
 */
export function useManifest() {
  const location = useLocation();
  
  useEffect(() => {
    const isMemberPortal = location.pathname.startsWith("/member");
    const manifestPath = isMemberPortal ? "/manifest-member.json" : "/manifest-admin.json";
    
    // Find existing manifest link or create new one
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    
    // Only update if different
    if (!manifestLink.href.endsWith(manifestPath)) {
      manifestLink.href = manifestPath;
    }
    
    // Update theme color based on portal
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (themeColorMeta) {
      themeColorMeta.content = isMemberPortal ? "#10b981" : "#1c1c1e";
    }
    
    // Update apple-mobile-web-app-title
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    if (appleTitle) {
      appleTitle.content = isMemberPortal ? "My Gym" : "MuscleDesk";
    }
    
  }, [location.pathname]);
}
