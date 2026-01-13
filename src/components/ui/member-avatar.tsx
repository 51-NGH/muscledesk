import * as React from "react";
import { cn } from "@/lib/utils";

interface MemberAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const MemberAvatar = React.forwardRef<HTMLDivElement, MemberAvatarProps>(
  ({ name, size = "md", className, ...props }, ref) => {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const sizeClasses = {
      sm: "h-8 w-8 text-xs",
      md: "h-12 w-12 text-sm",
      lg: "h-16 w-16 text-lg",
      xl: "h-24 w-24 text-2xl",
    };

    return (
      <div
        ref={ref}
        className={cn("member-avatar", sizeClasses[size], className)}
        {...props}
      >
        {initials}
      </div>
    );
  }
);

MemberAvatar.displayName = "MemberAvatar";
