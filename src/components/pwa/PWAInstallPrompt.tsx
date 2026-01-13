import { X, Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

export function PWAInstallPrompt() {
  const { 
    showPrompt, 
    isIOS, 
    appName, 
    appType,
    promptInstall, 
    dismissPrompt,
    isInstalled 
  } = usePWAInstall();
  
  // Don't render if already installed or shouldn't show
  if (!showPrompt || isInstalled) {
    return null;
  }
  
  const isMember = appType === "member";
  
  return (
    <div 
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300",
        "md:left-auto md:right-4 md:bottom-4 md:max-w-sm"
      )}
    >
      <div 
        className={cn(
          "rounded-xl border shadow-lg backdrop-blur-sm p-4",
          isMember 
            ? "bg-emerald-950/95 border-emerald-800/50" 
            : "bg-background/95 border-border"
        )}
      >
        {/* Close button */}
        <button
          onClick={dismissPrompt}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-full transition-colors",
            isMember 
              ? "text-emerald-400 hover:bg-emerald-800/50" 
              : "text-muted-foreground hover:bg-muted"
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3 pr-6">
          {/* App icon */}
          <div 
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              isMember 
                ? "bg-emerald-500" 
                : "bg-primary"
            )}
          >
            <Download className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 
              className={cn(
                "font-semibold text-sm",
                isMember ? "text-white" : "text-foreground"
              )}
            >
              Install {appName}
            </h3>
            <p 
              className={cn(
                "text-xs mt-0.5",
                isMember ? "text-emerald-200/80" : "text-muted-foreground"
              )}
            >
              {isMember 
                ? "Quick access to your gym membership" 
                : "Manage your gym on the go"
              }
            </p>
          </div>
        </div>
        
        {isIOS ? (
          // iOS instructions
          <div className={cn(
            "mt-3 pt-3 border-t text-xs",
            isMember ? "border-emerald-800/50 text-emerald-200/80" : "border-border text-muted-foreground"
          )}>
            <p className="flex items-center gap-2">
              <span>Tap</span>
              <Share className="h-4 w-4" />
              <span>then</span>
              <span className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                <span>"Add to Home Screen"</span>
              </span>
            </p>
          </div>
        ) : (
          // Android/Desktop install button
          <Button
            onClick={promptInstall}
            size="sm"
            className={cn(
              "w-full mt-3",
              isMember 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                : ""
            )}
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </div>
    </div>
  );
}
