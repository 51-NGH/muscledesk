import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
  shouldTrigger: boolean;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing, 
  progress,
  shouldTrigger 
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="absolute left-0 right-0 flex items-center justify-center z-40 pointer-events-none"
      style={{ 
        top: 0,
        height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px`,
        transition: !isRefreshing && pullDistance === 0 ? "height 0.2s ease-out" : "none"
      }}
    >
      <div 
        className={`flex items-center justify-center transition-all duration-200 ${
          shouldTrigger || isRefreshing ? "text-primary" : "text-muted-foreground"
        }`}
        style={{
          opacity: Math.min(progress * 1.5, 1),
          transform: `scale(${0.6 + progress * 0.4})`
        }}
      >
        <RefreshCw 
          className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
          style={{
            transform: !isRefreshing ? `rotate(${progress * 180}deg)` : undefined,
            transition: "transform 0.1s ease-out"
          }}
        />
      </div>
    </div>
  );
}
