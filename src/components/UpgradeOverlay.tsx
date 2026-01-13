import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UpgradeOverlayProps {
  feature: string;
  description?: string;
  recommendedPlan?: "standard" | "pro";
  className?: string;
  children?: React.ReactNode;
  minHeight?: string;
}

export function UpgradeOverlay({ 
  feature, 
  description,
  recommendedPlan = "standard",
  className,
  children,
  minHeight
}: UpgradeOverlayProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("relative", className)} style={minHeight ? { minHeight } : undefined}>
      {/* Blurred content behind */}
      {children && (
        <div className="pointer-events-none select-none blur-sm opacity-40">
          {children}
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] z-10">
        <div className="text-center max-w-md px-6 py-8 animate-fade-in">
          {/* Lock Icon with glow effect */}
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 via-purple-500/30 to-primary/30 rounded-full scale-150" />
            <div className="relative h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Text */}
          <h3 className="text-xl font-bold text-foreground mb-2">
            {feature}
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">
            {description || `This feature is not available on the Lite plan. Upgrade to ${recommendedPlan === "pro" ? "Pro" : "Standard"} to unlock.`}
          </p>

          {/* Upgrade Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Available in {recommendedPlan === "pro" ? "Pro" : "Standard & Pro"}
            </span>
          </div>

          {/* CTA Button */}
          <div>
            <Button 
              onClick={() => navigate("/settings")}
              className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20"
            >
              Upgrade Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Contact admin to upgrade your plan
          </p>
        </div>
      </div>
    </div>
  );
}

interface UpgradeRequiredPageProps {
  feature: string;
  description?: string;
  recommendedPlan?: "standard" | "pro";
  benefits?: string[];
}

// Full page upgrade overlay for completely restricted pages
export function UpgradeRequiredPage({ 
  feature, 
  description,
  recommendedPlan = "standard",
  benefits
}: UpgradeRequiredPageProps) {
  const navigate = useNavigate();

  // Default benefits if none provided
  const defaultBenefits = [
    "Unlimited membership plans",
    "QR code attendance scanning",
    "Payment tracking & history",
    "Advanced analytics & charts",
    "Member portal with QR codes",
    "Automated renewal reminders"
  ];

  const displayBenefits = benefits || defaultBenefits;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        {/* Gradient header background */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-muted/50 to-transparent pointer-events-none" />
        
        {/* Lock Icon */}
        <div className="relative mx-auto mb-8">
          <div className="relative h-20 w-20 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {feature}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
          {description || `This feature is not available on the Lite plan. Upgrade to unlock powerful capabilities.`}
        </p>

        {/* Benefits Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8 text-left shadow-sm">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade to {recommendedPlan === "pro" ? "Pro" : "Standard"} for:
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {displayBenefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/70 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button 
          size="lg"
          onClick={() => navigate("/settings")}
          className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 px-8"
        >
          Upgrade Your Plan
          <ArrowRight className="h-4 w-4" />
        </Button>
        
        <p className="text-sm text-muted-foreground mt-4">
          Contact your admin to upgrade your gym's plan
        </p>
      </div>
    </div>
  );
}
