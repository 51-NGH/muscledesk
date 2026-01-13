import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that manages PWA manifest and meta tags based on current route
 * - /member/* routes → Member Portal manifest (emerald green theme)
 * - All other routes → Admin manifest (dark theme)
 * 
 * CRITICAL: The manifest MUST be set before the browser checks for PWA installability.
 * We force a manifest reload by removing and re-adding the link element.
 */
export function ManifestManager() {
  const location = useLocation();
  const lastManifestRef = useRef<string | null>(null);
  
  useEffect(() => {
    const isMemberPortal = location.pathname.startsWith("/member");
    const manifestPath = isMemberPortal ? "/manifest-member.json" : "/manifest-admin.json";
    
    // Skip if manifest hasn't changed
    if (lastManifestRef.current === manifestPath) {
      return;
    }
    lastManifestRef.current = manifestPath;
    
    // CRITICAL: Remove existing manifest link completely to force browser to re-read
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }
    
    // Create and append new manifest link with cache-busting
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = `${manifestPath}?v=${Date.now()}`;
    document.head.appendChild(manifestLink);
    
    console.log(`[ManifestManager] Switched to ${isMemberPortal ? "member" : "admin"} manifest:`, manifestPath);
    
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
    
    // Update apple touch icon - also remove and re-add to force refresh
    const existingAppleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (existingAppleTouchIcon) {
      existingAppleTouchIcon.remove();
    }
    const appleTouchIcon = document.createElement("link");
    appleTouchIcon.rel = "apple-touch-icon";
    appleTouchIcon.href = isMemberPortal ? "/member-apple-touch-icon.png" : "/apple-touch-icon.png";
    document.head.appendChild(appleTouchIcon);
    
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
    
    // Update favicon for member portal
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = isMemberPortal ? "/member-icon-192.png" : "/pwa-192x192.png";
    }
    
  }, [location.pathname]);
  
  return null; // This component doesn't render anything
}
