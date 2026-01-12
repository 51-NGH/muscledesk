import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that manages PWA manifest and meta tags based on current route
 * - /member/* routes → Member Portal manifest (emerald green theme)
 * - All other routes → Admin manifest (dark theme)
 */
export function ManifestManager() {
  const location = useLocation();
  
  useEffect(() => {
    const isMemberPortal = location.pathname.startsWith("/member");
    const manifestPath = isMemberPortal ? "/manifest-member.json" : "/manifest-admin.json";
    
    // Update manifest link
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    
    if (!manifestLink.href.endsWith(manifestPath)) {
      manifestLink.href = manifestPath;
    }
    
    // Update theme color for both light and dark modes
    const themeColors = document.querySelectorAll('meta[name="theme-color"]');
    const memberColor = "#10b981";
    const adminColorDark = "#1c1c1e";
    const adminColorLight = "#fafafa";
    
    themeColors.forEach((meta) => {
      const htmlMeta = meta as HTMLMetaElement;
      const mediaQuery = htmlMeta.getAttribute("media");
      
      if (isMemberPortal) {
        // Member portal uses same color for both themes
        htmlMeta.content = memberColor;
      } else {
        // Admin uses different colors based on preference
        if (mediaQuery?.includes("dark")) {
          htmlMeta.content = adminColorDark;
        } else {
          htmlMeta.content = adminColorLight;
        }
      }
    });
    
    // Update apple touch icon
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (appleTouchIcon) {
      appleTouchIcon.href = isMemberPortal ? "/member-apple-touch-icon.png" : "/apple-touch-icon.png";
    }
    
    // Update apple-mobile-web-app-title
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    if (appleTitle) {
      appleTitle.content = isMemberPortal ? "My Gym" : "MuscleDesk";
    }
    
    // Update application-name
    const appName = document.querySelector('meta[name="application-name"]') as HTMLMetaElement | null;
    if (appName) {
      appName.content = isMemberPortal ? "My Gym" : "MuscleDesk";
    }
    
    // Update page title
    document.title = isMemberPortal ? "My Gym - Member Portal" : "MuscleDesk - Gym Management";
    
  }, [location.pathname]);
  
  return null; // This component doesn't render anything
}
