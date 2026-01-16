import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export type AppType = "admin" | "member";

interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  appType: AppType;
  appName: string;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  showPrompt: boolean;
}

const DISMISSED_KEY_PREFIX = "pwa-install-dismissed-";

export function usePWAInstall(): PWAInstallState {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  
  // Determine app type based on route
  // IMPORTANT: Check for exact "/member" path or "/member/" prefix to avoid matching "/members" (admin route)
  const isMemberPortal = location.pathname === "/member" || 
                         location.pathname.startsWith("/member/");
  const appType: AppType = isMemberPortal ? "member" : "admin";
  const appName = isMemberPortal ? "My Gym" : "MuscleDesk";
  
  // Only show install prompt on specific pages
  const isInstallPage = isMemberPortal 
    ? (location.pathname === "/member" || location.pathname === "/member/dashboard" || location.pathname === "/member/")
    : location.pathname === "/";
  
  // Check if iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Check if already dismissed for this app type
  const getDismissedKey = useCallback(() => `${DISMISSED_KEY_PREFIX}${appType}`, [appType]);
  
  // Check if app is installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
        || (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    
    checkInstalled();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", checkInstalled);
    
    return () => mediaQuery.removeEventListener("change", checkInstalled);
  }, []);
  
  // Capture the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event for later use
      setDeferredPrompt(e);
      
      // Don't auto-show here - let the isInstallPage effect handle it
    };
    
    window.addEventListener("beforeinstallprompt", handler);
    
    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });
    
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [getDismissedKey]);
  
  // Only show prompt on designated install pages
  useEffect(() => {
    if (!isInstallPage) {
      setShowPrompt(false);
      return;
    }
    
    if (deferredPrompt || isIOS) {
      const dismissed = localStorage.getItem(getDismissedKey());
      const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      if (!dismissed || daysSinceDismissed > 7) {
        // Delay showing prompt for better UX
        const timer = setTimeout(() => setShowPrompt(true), 2000);
        return () => clearTimeout(timer);
      } else {
        setShowPrompt(false);
      }
    }
  }, [appType, deferredPrompt, getDismissedKey, isInstallPage, isIOS]);
  
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // For iOS, we can't programmatically trigger install
      if (isIOS) {
        setShowPrompt(true);
        return false;
      }
      return false;
    }
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowPrompt(false);
      }
      
      // Clear the prompt - can only be used once
      setDeferredPrompt(null);
      return outcome === "accepted";
    } catch (error) {
      console.error("Error showing install prompt:", error);
      return false;
    }
  }, [deferredPrompt, isIOS]);
  
  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(getDismissedKey(), Date.now().toString());
  }, [getDismissedKey]);
  
  return {
    canInstall: !!deferredPrompt || isIOS,
    isInstalled,
    isIOS,
    appType,
    appName,
    promptInstall,
    dismissPrompt,
    showPrompt: showPrompt && !isInstalled,
  };
}
